import { supabase } from '../lib/supabase';
import { getTeeTimeConfig } from './teeTimeConfigService';

export interface TeeTimeBooking {
  bookingId: number;
  bookingStatus: 'BOOKED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  playerCount: number;
  mainMember: {
    memberId: number;
    name: string;
    memberCode?: string;
  } | null;
  players?: Array<{
    memberId: number;
    name: string;
    memberCode?: string;
    isMainPlayer: boolean;
  }>;
}

export interface TeeTime {
  id: number;
  courseId: number;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  maxPlayers: number;
  status: 'OPEN' | 'FULL' | 'BLOCKED';
  bookedPlayersCount: number;
  bookingId?: number | null;
  bookingStatus?: 'BOOKED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED' | null;
  members?: {
    memberId: number;
    name: string;
    memberCode?: string;
  }[];
  bookings?: TeeTimeBooking[]; // All bookings for this tee time slot
  allMainMemberIds?: number[]; // All main member IDs in this slot (for duplicate prevention)
}

// Helper function to generate time slots based on config
const generateTimeSlots = (startTime: string, endTime: string, intervalMinutes: number): string[] => {
  const slots: string[] = [];
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  const interval = intervalMinutes * 60 * 1000; // Convert to milliseconds

  let current = new Date(start);
  while (current < end) {
    const hours = current.getHours().toString().padStart(2, '0');
    const minutes = current.getMinutes().toString().padStart(2, '0');
    slots.push(`${hours}:${minutes}`);
    current = new Date(current.getTime() + interval);
  }

  return slots;
};

// Helper function to calculate end time from start time and interval
const calculateEndTime = (startTime: string, intervalMinutes: number): string => {
  // Validate inputs
  if (!startTime || !intervalMinutes || isNaN(intervalMinutes)) {
    console.error('Invalid inputs to calculateEndTime:', { startTime, intervalMinutes });
    return startTime; // Return start time as fallback
  }
  
  const [hours, minutes] = startTime.split(':').map(Number);
  
  // Validate parsed values
  if (isNaN(hours) || isNaN(minutes)) {
    console.error('Invalid time format:', startTime);
    return startTime; // Return start time as fallback
  }
  
  const startDate = new Date(`2000-01-01T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  const endDate = new Date(startDate.getTime() + intervalMinutes * 60 * 1000);
  const endHours = endDate.getHours();
  const endMinutes = endDate.getMinutes();
  
  // Validate calculated values
  if (isNaN(endHours) || isNaN(endMinutes)) {
    console.error('Failed to calculate end time:', { startTime, intervalMinutes, endHours, endMinutes });
    return startTime; // Return start time as fallback
  }
  
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

export const getTeeTimes = async (date: string, courseId?: number): Promise<TeeTime[]> => {
  try {
    // Get tee time config
    const config = await getTeeTimeConfig();
    
    // Validate config
    if (!config || !config.startTime || !config.endTime || !config.intervalMinutes) {
      console.error('Invalid tee time config:', config);
      throw new Error('Tee time configuration is invalid');
    }
    
    const timeSlots = generateTimeSlots(config.startTime, config.endTime, config.intervalMinutes);

    // Get existing tee times for this date (filter by course_id if provided)
    let teeTimesQuery = supabase
      .from('tee_times')
      .select('*')
      .eq('date', date);
    
    if (courseId) {
      teeTimesQuery = teeTimesQuery.eq('course_id', courseId);
    }
    
    const { data: existingTeeTimes, error: teeTimesError } = await teeTimesQuery;

    if (teeTimesError) throw teeTimesError;

    // Get bookings for this date with member info (including member_code for verification)
    // Filter by course_id if provided
    let bookingsQuery = supabase
      .from('bookings')
      .select(`
        id,
        tee_time_id,
        booking_time,
        player_count,
        status,
        member_id,
        course_id,
        members!bookings_member_id_fkey (
          id,
          first_name,
          last_name,
          member_code
        )
      `)
      .eq('booking_date', date)
      .in('status', ['BOOKED', 'CHECKED_IN']); // Show active bookings (not completed/cancelled)
    
    // Filter by course_id if provided
    if (courseId) {
      bookingsQuery = bookingsQuery.eq('course_id', courseId);
    }
    
    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) throw bookingsError;

    // ✅ NEW: Fetch all players from booking_players table for all bookings
    const bookingIds = bookings?.map((b: any) => b.id) || [];
    let allPlayers: any[] = [];
    if (bookingIds.length > 0) {
      const { data: playersData, error: playersError } = await supabase
        .from('booking_players')
        .select(
          `
          booking_id,
          member_id,
          is_main_player,
          members!booking_players_member_id_fkey (
            id,
            first_name,
            last_name,
            member_code
          )
        `,
        )
        .in('booking_id', bookingIds);

      if (playersError) {
        console.error('Error fetching booking players:', playersError);
        // Continue without players - fallback to old behavior
      } else {
        allPlayers = playersData || [];
      }
    }

    // Group players by booking_id
    const playersByBookingId = new Map<number, any[]>();
    allPlayers.forEach((player: any) => {
      const bookingId = player.booking_id;
      if (!playersByBookingId.has(bookingId)) {
        playersByBookingId.set(bookingId, []);
      }
      playersByBookingId.get(bookingId)!.push({
        memberId: player.member_id,
        name: `${player.members?.first_name || ''} ${player.members?.last_name || ''}`.trim(),
        memberCode: player.members?.member_code || '',
        isMainPlayer: player.is_main_player || false,
      });
    });

    // Debug logging
    if (allPlayers.length > 0) {
      console.log('✅ Fetched booking players:', {
        totalPlayers: allPlayers.length,
        bookingIds: bookingIds,
        playersByBooking: Array.from(playersByBookingId.entries()).map(([id, players]) => ({
          bookingId: id,
          playerCount: players.length,
          players: players.map((p: any) => ({ id: p.memberId, name: p.name, isMain: p.isMainPlayer })),
        })),
      });
    }

    // Create a map of time -> booking info
    const bookingMap = new Map<string, any>();
    if (bookings) {
      bookings.forEach((booking: any) => {
        const time = booking.booking_time.substring(0, 5); // Extract HH:mm from HH:mm:ss
        if (!bookingMap.has(time)) {
          bookingMap.set(time, []);
        }
        
        // Get players for this booking from booking_players table
        const bookingPlayers = playersByBookingId.get(booking.id) || [];
        const mainPlayer = bookingPlayers.find((p: any) => p.isMainPlayer) || 
          (booking.members ? {
            memberId: booking.members.id,
            name: `${booking.members.first_name} ${booking.members.last_name}`,
            memberCode: booking.members.member_code,
          } : null);

        const bookingData = {
          bookingId: booking.id,
          bookingStatus: booking.status,
          playerCount: bookingPlayers.length > 0 ? bookingPlayers.length : booking.player_count, // Use actual count if available
          member: mainPlayer,
          players: bookingPlayers, // Store all players for this booking
        };
        
        // Debug logging for booking 28 (the one we're testing)
        if (booking.id === 28) {
          console.log('🔍 Booking 28 data:', {
            bookingId: booking.id,
            time,
            playerCount: bookingData.playerCount,
            playersCount: bookingPlayers.length,
            players: bookingPlayers,
            mainPlayer,
          });
        }
        
        bookingMap.get(time)!.push(bookingData);
      });
    }

    // Generate tee times for all slots
    const teeTimes: TeeTime[] = timeSlots.map((startTime, index) => {
      const endTime = calculateEndTime(startTime, config.intervalMinutes);
      const bookingInfo = bookingMap.get(startTime) || [];
      
      // ✅ NEW: Count UNIQUE players across all bookings using actual players from booking_players
      const uniquePlayerIds = new Set<number>();
      const uniqueMainMemberIds = new Set<number>();
      const mainMemberCounts = new Map<number, number>(); // Track how many times each main member appears
      
      bookingInfo.forEach((b: any) => {
        // Use actual players from booking_players if available, otherwise fallback to main member
        if (b.players && b.players.length > 0) {
          b.players.forEach((player: any) => {
            uniquePlayerIds.add(player.memberId);
            if (player.isMainPlayer) {
              uniqueMainMemberIds.add(player.memberId);
              mainMemberCounts.set(player.memberId, (mainMemberCounts.get(player.memberId) || 0) + 1);
            }
          });
        } else if (b.member?.memberId) {
          // Fallback: use main member only if players not available
          uniquePlayerIds.add(b.member.memberId);
          uniqueMainMemberIds.add(b.member.memberId);
          mainMemberCounts.set(b.member.memberId, (mainMemberCounts.get(b.member.memberId) || 0) + 1);
        }
      });
      
      // Check for duplicate main members
      const hasDuplicateMainMembers = Array.from(mainMemberCounts.values()).some((count) => count > 1);
      
      // ✅ FIXED: Use actual unique player count from booking_players
      const bookedPlayersCount = uniquePlayerIds.size;
      
      if (hasDuplicateMainMembers) {
        console.warn(
          `Slot ${startTime} has duplicate main members. ` +
          `Total unique players: ${bookedPlayersCount}`
        );
      }
      
      const firstBooking = bookingInfo[0] || null;

      // Determine status
      let status: 'OPEN' | 'FULL' | 'BLOCKED' = 'OPEN';
      if (bookedPlayersCount >= config.maxPlayersPerSlot) {
        status = 'FULL';
      }

      // Check if this slot is blocked (status = 'BLOCKED' in tee_times table)
      const existingTeeTime = existingTeeTimes?.find(
        (tt) => tt.time.substring(0, 5) === startTime && tt.status === 'BLOCKED'
      );
      if (existingTeeTime) {
        status = 'BLOCKED';
      }

      // ✅ NEW: Build a unique list of ALL players for this tee time from booking_players
      // This includes both main members and additional players
      const uniqueMembersMap = new Map<number, { memberId: number; name: string; memberCode?: string }>();
      const duplicateMainMembers: number[] = [];
      
      bookingInfo.forEach((b: any) => {
        // Use actual players from booking_players if available
        if (b.players && b.players.length > 0) {
          b.players.forEach((player: any) => {
            if (!uniqueMembersMap.has(player.memberId)) {
              uniqueMembersMap.set(player.memberId, {
                memberId: player.memberId,
                name: player.name,
                memberCode: player.memberCode,
              });
            } else if (player.isMainPlayer) {
              // This member is already in the list and is also a main member - duplicate main member!
              duplicateMainMembers.push(player.memberId);
            }
          });
        } else if (b.member) {
          // Fallback: use main member only if players not available
          if (uniqueMembersMap.has(b.member.memberId)) {
            // This member is already a main member in another booking - duplicate!
            duplicateMainMembers.push(b.member.memberId);
          } else {
            uniqueMembersMap.set(b.member.memberId, {
              memberId: b.member.memberId,
              name: b.member.name,
              memberCode: b.member.memberCode,
            });
          }
        }
      });
      
      // Log warning if duplicates found
      if (duplicateMainMembers.length > 0) {
        console.warn(`Duplicate main members found in slot ${startTime}:`, duplicateMainMembers);
      }

      // Build booking details array with player counts and actual players
      const bookings: TeeTimeBooking[] = bookingInfo.map((b: any) => ({
        bookingId: b.bookingId,
        bookingStatus: b.bookingStatus,
        playerCount: b.playerCount || 0,
        mainMember: b.member || null,
        players: b.players || undefined, // Include actual players from booking_players
      }));

      return {
        id: index + 1, // Temporary ID, will be replaced with actual tee_time_id if exists
        courseId: courseId || 1,
        date,
        startTime,
        endTime,
        maxPlayers: config.maxPlayersPerSlot,
        status,
        bookedPlayersCount,
        bookingId: firstBooking?.bookingId || null,
        bookingStatus: firstBooking?.bookingStatus || null,
        members:
          uniqueMembersMap.size > 0
            ? Array.from(uniqueMembersMap.values())
            : undefined,
        bookings: bookings.length > 0 ? bookings : undefined,
        // ✅ NEW: Store all main member IDs for duplicate prevention
        allMainMemberIds: Array.from(uniqueMainMemberIds),
      };
    });

    return teeTimes;
  } catch (error) {
    console.error('Error fetching tee times:', error);
    // Fallback: return empty array or generate basic slots
    try {
      const config = await getTeeTimeConfig();
      const timeSlots = generateTimeSlots(config.startTime, config.endTime, config.intervalMinutes);
      return timeSlots.map((startTime, index) => ({
        id: index + 1,
        courseId: courseId || 1, // Use provided courseId or default to 1
        date,
        startTime,
        endTime: calculateEndTime(startTime, config.intervalMinutes),
        maxPlayers: config.maxPlayersPerSlot,
        status: 'OPEN' as const,
        bookedPlayersCount: 0,
        bookingId: null,
        bookingStatus: null,
        members: undefined,
      }));
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return [];
    }
  }
};
