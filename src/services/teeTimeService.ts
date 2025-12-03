import { supabase } from '../lib/supabase';
import { getTeeTimeConfig } from './teeTimeConfigService';

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
  bookingStatus?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED' | null;
  members?: {
    memberId: number;
    name: string;
  }[];
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

    // Get existing tee times for this date
    const { data: existingTeeTimes, error: teeTimesError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('date', date);

    if (teeTimesError) throw teeTimesError;

    // Get bookings for this date with member info
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        tee_time_id,
        booking_time,
        player_count,
        status,
        member_id,
        members!bookings_member_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('booking_date', date)
      .in('status', ['PENDING', 'CONFIRMED']);

    if (bookingsError) throw bookingsError;

    // Create a map of time -> booking info
    const bookingMap = new Map<string, any>();
    if (bookings) {
      bookings.forEach((booking: any) => {
        const time = booking.booking_time.substring(0, 5); // Extract HH:mm from HH:mm:ss
        if (!bookingMap.has(time)) {
          bookingMap.set(time, []);
        }
        bookingMap.get(time)!.push({
          bookingId: booking.id,
          bookingStatus: booking.status,
          playerCount: booking.player_count,
          member: booking.members
            ? {
                memberId: booking.members.id,
                name: `${booking.members.first_name} ${booking.members.last_name}`,
              }
            : null,
        });
      });
    }

    // Generate tee times for all slots
    const teeTimes: TeeTime[] = timeSlots.map((startTime, index) => {
      const endTime = calculateEndTime(startTime, config.intervalMinutes);
      const bookingInfo = bookingMap.get(startTime) || [];
      const bookedPlayersCount = bookingInfo.reduce((sum: number, b: any) => sum + (b.playerCount || 0), 0);
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
          bookingInfo.length > 0
            ? bookingInfo
                .map((b: any) => b.member)
                .filter((m: any) => m !== null)
            : undefined,
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
        courseId: courseId || 1,
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
