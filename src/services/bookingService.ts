import { supabase } from '../lib/supabase';

export interface BookingPlayer {
  memberId: number;
  isMainPlayer?: boolean;
}

/**
 * Validates and deduplicates players array to ensure no duplicate members in a booking.
 * Throws an error if duplicates are found, otherwise returns deduplicated array.
 * 
 * @param players - Array of players to validate and deduplicate
 * @returns Deduplicated array of players (first occurrence of each memberId is kept)
 * @throws Error if duplicates are detected
 */
function validateAndDeduplicatePlayers(players: BookingPlayer[]): BookingPlayer[] {
  if (!players || players.length === 0) {
    throw new Error('At least one player is required');
  }

  // Track seen member IDs
  const seenMemberIds = new Set<number>();
  const duplicateMemberIds: number[] = [];
  const deduplicatedPlayers: BookingPlayer[] = [];

  for (const player of players) {
    if (!player.memberId) {
      throw new Error('Invalid player: memberId is required');
    }

    // Check for duplicates
    if (seenMemberIds.has(player.memberId)) {
      duplicateMemberIds.push(player.memberId);
      // Skip duplicate - keep first occurrence only
      continue;
    }

    // Add to seen set and deduplicated array
    seenMemberIds.add(player.memberId);
    deduplicatedPlayers.push(player);
  }

  // If duplicates were found, throw error with details
  if (duplicateMemberIds.length > 0) {
    throw new Error(
      `Duplicate members detected in booking: Member IDs [${duplicateMemberIds.join(', ')}] appear multiple times. ` +
      `Each member can only appear once per booking.`
    );
  }

  // Ensure at least one main player exists
  const hasMainPlayer = deduplicatedPlayers.some(p => p.isMainPlayer);
  if (!hasMainPlayer && deduplicatedPlayers.length > 0) {
    // If no main player specified, make the first one the main player
    deduplicatedPlayers[0].isMainPlayer = true;
  }

  return deduplicatedPlayers;
}

export interface CreateBookingRequest {
  teeTimeId?: number; // Optional - may be a temporary ID
  date: string; // Required: booking date (YYYY-MM-DD)
  time: string; // Required: booking time (HH:mm)
  players: BookingPlayer[];
  notes?: string;
  courseId?: number; // Optional: course ID (will use from tee_time if not provided)
  // Optional: Pricing information from promotion engine
  pricingInfo?: {
    finalPrice: number;
    basePrice: number;
    source: 'PROMOTION' | 'BASE';
    promotionCode?: string | null;
    promotionName?: string | null;
    includesGreenFee: boolean;
    includesCaddy: boolean;
    includesCart: boolean;
    numPlayers: number; // Number of players for this booking
  };
}

export interface UpdateBookingRequest {
  players?: BookingPlayer[];
  notes?: string;
  status?: 'BOOKED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
}

export interface Booking {
  id: number;
  teeTimeId: number;
  players: BookingPlayer[];
  notes?: string;
  status: 'BOOKED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  paymentStatus?: 'UNPAID' | 'PAID';
  createdAt: string;
  updatedAt: string;
}

export interface BookingListItem extends Booking {
  // Extended fields for list view
  teeTimeDate?: string;
  teeTimeStartTime?: string;
  teeTimeEndTime?: string;
  mainMemberName?: string;
  totalAmount?: number;
  courseId?: number;
  courseName?: string;
  courseCode?: string;
}

export interface BookingDetailPlayer {
  memberId: number;
  memberName: string;
  memberCode: string;
  isMainPlayer: boolean;
}

export interface BookingCharge {
  id: number;
  description: string;
  amount: number;
  type: 'FEE' | 'PAYMENT' | 'REFUND';
  quantity?: number;
  unitPrice?: number;
}

export interface BookingDetail extends Booking {
  teeTime: {
    id: number;
    courseId: number;
    courseName?: string;
    date: string;
    startTime: string;
    endTime: string;
    maxPlayers: number;
  };
  players: BookingDetailPlayer[];
  charges?: BookingCharge[];
  totalAmount?: number;
  paymentStatus?: 'UNPAID' | 'PAID';
}

export interface BookingListParams {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  status?: Booking['status'];
  search?: string;
  courseId?: number; // Filter by course
}

export interface BookingListResponse {
  items: BookingListItem[];
  page: number;
  pageSize: number;
  total: number;
}

// Database row interfaces
interface DbBookingRow {
  id: number;
  booking_number: string;
  member_id: number;
  tee_time_id: number;
  booking_date: string;
  booking_time: string;
  player_count: number;
  status: string;
  payment_status?: string;
  total_amount: number;
  notes: string | null;
  course_id?: number | null;
  created_at: string;
  updated_at: string;
  courses?: {
    id: number;
    code: string;
    name: string;
  } | null;
}

// Helper function to calculate end time from start time and interval
const calculateEndTime = (startTime: string, intervalMinutes: number): string => {
  if (!startTime || !intervalMinutes || isNaN(intervalMinutes)) {
    return startTime; // Return start time as fallback
  }
  
  const [hours, minutes] = startTime.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return startTime; // Return start time as fallback
  }
  
  const startDate = new Date(`2000-01-01T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  const endDate = new Date(startDate.getTime() + intervalMinutes * 60 * 1000);
  const endHours = endDate.getHours();
  const endMinutes = endDate.getMinutes();
  
  if (isNaN(endHours) || isNaN(endMinutes)) {
    return startTime; // Return start time as fallback
  }
  
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

// Helper function to calculate payment status dynamically based on actual payments
const calculatePaymentStatus = async (bookingId: number, totalAmount: number): Promise<'UNPAID' | 'PAID'> => {
  try {
    // Get all completed payments for this booking
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('booking_id', bookingId)
      .eq('payment_status', 'COMPLETED');

    if (paymentsError) {
      console.error('Error fetching payments for payment status calculation:', paymentsError);
      return 'UNPAID'; // Default to UNPAID on error
    }

    // Calculate total paid
    const totalPaid = payments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

    // Payment status logic:
    // 1. If totalAmount <= 0: Only PAID if there are actual payments recorded
    // 2. If totalAmount > 0: PAID if totalPaid >= totalAmount (with tolerance)
    let isPaid: boolean;
    
    if (totalAmount <= 0) {
      // If nothing is due, only mark as PAID if there are actual payments
      // Otherwise, mark as UNPAID (even though nothing is due, we want to show unpaid until payment is recorded)
      isPaid = totalPaid > 0;
    } else {
      // If there's an amount due, check if payments cover it
      isPaid = totalPaid >= totalAmount - 0.01; // Allow 1 cent tolerance for rounding
    }
    
    return isPaid ? 'PAID' : 'UNPAID';
  } catch (error) {
    console.error('Error calculating payment status:', error);
    return 'UNPAID'; // Default to UNPAID on error
  }
};

// Batch calculate payment status for multiple bookings (optimized)
const calculatePaymentStatusBatch = async (
  bookingIds: number[],
  bookingTotals: Map<number, number>
): Promise<Map<number, 'UNPAID' | 'PAID'>> => {
  const statusMap = new Map<number, 'UNPAID' | 'PAID'>();
  
  if (bookingIds.length === 0) {
    return statusMap;
  }

  try {
    // Fetch all payments for all bookings in one query
    // Order by created_at desc to get latest payments first
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('booking_id, amount, created_at')
      .in('booking_id', bookingIds)
      .eq('payment_status', 'COMPLETED')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments batch:', paymentsError);
      // Default all to UNPAID on error
      bookingIds.forEach(id => statusMap.set(id, 'UNPAID'));
      return statusMap;
    }

    // Group payments by booking_id and calculate totals
    const paymentsByBooking = new Map<number, number>();
    allPayments?.forEach((payment: any) => {
      const bookingId = payment.booking_id;
      const amount = Number(payment.amount || 0);
      const currentTotal = paymentsByBooking.get(bookingId) || 0;
      paymentsByBooking.set(bookingId, currentTotal + amount);
    });
    
    // Debug: Log payment totals
    console.log('Payment totals by booking:', {
      paymentsCount: allPayments?.length || 0,
      paymentsByBooking: Array.from(paymentsByBooking.entries()).map(([id, total]) => ({
        bookingId: id,
        totalPaid: total,
      })),
    });

    // Calculate status for each booking
    bookingIds.forEach((bookingId) => {
      const totalAmount = bookingTotals.get(bookingId) || 0;
      const totalPaid = paymentsByBooking.get(bookingId) || 0;
      
      // Payment status logic:
      // 1. If totalAmount <= 0: Only PAID if there are actual payments recorded
      // 2. If totalAmount > 0: PAID if totalPaid >= totalAmount (with tolerance)
      let isPaid: boolean;
      
      if (totalAmount <= 0) {
        // If nothing is due, only mark as PAID if there are actual payments
        // Otherwise, mark as UNPAID (even though nothing is due, we want to show unpaid until payment is recorded)
        isPaid = totalPaid > 0;
      } else {
        // If there's an amount due, check if payments cover it
        isPaid = totalPaid >= totalAmount - 0.01; // Allow 1 cent tolerance for rounding
      }
      
      const status = isPaid ? 'PAID' : 'UNPAID';
      statusMap.set(bookingId, status);
      
      // Always log payment status calculation for debugging
      console.log('Payment status calculated:', {
        bookingId,
        totalAmount,
        totalPaid,
        status,
        isPaid,
        difference: totalAmount - totalPaid,
        logic: totalAmount <= 0 ? 'zero-amount' : 'amount-due',
      });
    });

    return statusMap;
  } catch (error) {
    console.error('Error calculating payment status batch:', error);
    // Default all to UNPAID on error
    bookingIds.forEach(id => statusMap.set(id, 'UNPAID'));
    return statusMap;
  }
};

// Helper function to map database row to BookingListItem
const mapDbRowToBookingListItem = (row: DbBookingRow, memberName?: string): BookingListItem => {
  const mainPlayer = { memberId: row.member_id, isMainPlayer: true };
  
  // Extract start time from booking_time (handle both HH:mm:ss and HH:mm formats)
  let startTime = '';
  if (row.booking_time) {
    // If booking_time is in HH:mm:ss format, extract HH:mm
    if (row.booking_time.length >= 5) {
      startTime = row.booking_time.substring(0, 5);
    } else {
      startTime = row.booking_time;
    }
  }
  
  // Calculate end time using default interval (15 minutes)
  // In a real scenario, you might want to fetch this from tee_time_config
  const defaultIntervalMinutes = 15;
  const endTime = startTime ? calculateEndTime(startTime, defaultIntervalMinutes) : '';
  
  // Debug logging to help identify issues
  if (!startTime) {
    console.warn('Booking missing booking_time:', {
      bookingId: row.id,
      booking_time: row.booking_time,
      row: row,
    });
  }
  
  return {
    id: row.id,
    teeTimeId: row.tee_time_id,
    players: [mainPlayer],
    notes: row.notes || undefined,
    status: row.status as Booking['status'],
    paymentStatus: 'UNPAID', // Will be calculated dynamically, default to UNPAID
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    teeTimeDate: row.booking_date,
    teeTimeStartTime: startTime,
    teeTimeEndTime: endTime,
    mainMemberName: memberName,
    totalAmount: Number(row.total_amount),
    courseId: row.course_id || undefined,
    courseName: row.courses?.name || undefined,
    courseCode: row.courses?.code || undefined,
  };
};

// Helper function to map database row to BookingDetail
const mapDbRowToBookingDetail = async (
  row: DbBookingRow,
  members: any[],
  teeTime: any,
  bookingItems: any[],
): Promise<BookingDetail> => {
  const players: BookingDetailPlayer[] = members.map((member, index) => ({
    memberId: member.id,
    memberName: `${member.first_name} ${member.last_name}`,
    memberCode: member.member_code,
    isMainPlayer: index === 0,
  }));

  const charges: BookingCharge[] = bookingItems.map((item) => ({
    id: item.id,
    description: item.price_items?.name || 'Item',
    amount: Number(item.total_price),
    type: 'FEE' as const,
    quantity: item.quantity || 1,
    unitPrice: Number(item.unit_price),
  }));

  // Get course information from row
  const courseId = row.course_id || teeTime?.course_id || null;
  const courseName = row.courses?.name || undefined;

  return {
    id: row.id,
    teeTimeId: row.tee_time_id,
    notes: row.notes || undefined,
    status: row.status as Booking['status'],
    paymentStatus: (row.payment_status as 'UNPAID' | 'PAID' | undefined) || 'UNPAID',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    teeTime: {
      id: teeTime?.id || row.tee_time_id,
      courseId: courseId || 1,
      courseName: courseName,
      date: row.booking_date,
      startTime: row.booking_time.substring(0, 5),
      endTime: '', // Can be calculated from config
      maxPlayers: 4, // Default, can be fetched from config
    },
    players, // BookingDetailPlayer[]
    charges: charges.length > 0 ? charges : undefined,
    totalAmount: Number(row.total_amount),
  };
};

export const createBooking = async (payload: CreateBookingRequest): Promise<Booking> => {
  try {
    // Tee times are dynamically generated, so we need to find or create the tee_time record
    // Convert time from HH:mm to HH:mm:ss format for database
    const timeWithSeconds = payload.time.length === 5 ? `${payload.time}:00` : payload.time;
    
    // Try to find existing tee_time record by date and time
    let actualTeeTimeId: number | null = null;
    
    const { data: existingTeeTime, error: findTeeTimeError } = await supabase
      .from('tee_times')
      .select('id')
      .eq('date', payload.date)
      .eq('time', timeWithSeconds)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error if not found
    
    if (findTeeTimeError && findTeeTimeError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected, ignore it
      console.error('Error finding tee time:', findTeeTimeError);
    }
    
    // Get course_id from payload or default to first active course
    let courseIdForBooking: number | null = payload.courseId || null;
    
    if (existingTeeTime) {
      actualTeeTimeId = existingTeeTime.id;
      // If tee_time exists, try to get course_id from it if not provided in payload
      if (!courseIdForBooking) {
        const { data: teeTimeWithCourse } = await supabase
          .from('tee_times')
          .select('course_id')
          .eq('id', existingTeeTime.id)
          .single();
        courseIdForBooking = teeTimeWithCourse?.course_id || null;
      }
    } else {
      // If tee_time doesn't exist, get course_id from payload or default to first active course
      if (!courseIdForBooking) {
        const { data: defaultCourse } = await supabase
          .from('courses')
          .select('id')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('id', { ascending: true })
          .limit(1)
          .single();
        courseIdForBooking = defaultCourse?.id || null;
      }
      
      // Create new tee_time record if it doesn't exist
      const { data: newTeeTime, error: createTeeTimeError } = await supabase
        .from('tee_times')
        .insert({
          date: payload.date,
          time: timeWithSeconds,
          status: 'BOOKED',
          player_count: payload.players.length,
          course_id: courseIdForBooking,
        })
        .select('id')
        .single();
      
      if (createTeeTimeError || !newTeeTime) {
        throw new Error(`Failed to create tee time: ${createTeeTimeError?.message || 'Unknown error'}`);
      }
      
      actualTeeTimeId = newTeeTime.id;
    }

    // ✅ VALIDATE: Ensure no duplicate members in this booking
    const validatedPlayers = validateAndDeduplicatePlayers(payload.players);

    // Get main player (first player with isMainPlayer flag, or first player)
    const mainPlayer = validatedPlayers.find((p) => p.isMainPlayer) || validatedPlayers[0];
    if (!mainPlayer) {
      throw new Error('At least one player is required');
    }

    // ✅ FIXED: Check if main member is already a main member in another booking for this slot
    // This prevents duplicate main members in the same tee time slot AND same course
    // Members CAN book different courses at the same time
    let duplicateCheckQuery = supabase
      .from('bookings')
      .select('id, member_id, course_id')
      .eq('booking_date', payload.date)
      .eq('booking_time', timeWithSeconds)
      .in('status', ['BOOKED', 'CHECKED_IN'])
      .eq('member_id', mainPlayer.memberId);
    
    // ✅ IMPORTANT: Only check for duplicates in the SAME course
    // Members should be able to book different courses at the same time
    if (courseIdForBooking) {
      duplicateCheckQuery = duplicateCheckQuery.eq('course_id', courseIdForBooking);
    }
    
    const { data: existingBookings, error: checkError } = await duplicateCheckQuery;

    if (checkError) {
      console.error('Error checking for duplicate main member:', checkError);
      // Don't throw - allow booking creation but log the error
    }

    if (existingBookings && existingBookings.length > 0) {
      throw new Error(
        `Member ${mainPlayer.memberId} is already a main member in another booking for this tee time slot on this course. ` +
        `Please select a different member or cancel the existing booking first.`
      );
    }

    // Generate booking number
    const { data: bookingNumber, error: bookingNumberError } = await supabase.rpc(
      'generate_booking_number',
    );

    if (bookingNumberError || !bookingNumber) {
      throw new Error('Failed to generate booking number');
    }

    // Use validated (deduplicated) players
    const uniquePlayerIds = validatedPlayers.map((p) => p.memberId);

    // Create booking
    // Note: payment_status column may not exist if migration hasn't been run yet
    // Try with payment_status first, fallback to without it if column doesn't exist
    const bookingData: any = {
      booking_number: bookingNumber,
      member_id: mainPlayer.memberId,
      tee_time_id: actualTeeTimeId,
      booking_date: payload.date,
      booking_time: timeWithSeconds,
      player_count: uniquePlayerIds.length,
      status: 'BOOKED', // After slot chosen & confirmed
      total_amount: 0, // Will be calculated from booking_items
      notes: payload.notes || null,
      course_id: courseIdForBooking, // Add course_id to booking
    };

    // Add payment_status (will fail gracefully if column doesn't exist)
    bookingData.payment_status = 'UNPAID';

    let { data: createdBooking, error: createError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    // If error is about payment_status column not existing, retry without it
    if (createError && (createError.message?.includes('payment_status') || createError.code === '42703')) {
      console.warn('payment_status column not found, retrying without it. Please run the migration script: update-booking-payment-flow.sql');
      const bookingDataWithoutPaymentStatus = { ...bookingData };
      delete bookingDataWithoutPaymentStatus.payment_status;
      
      const retryResult = await supabase
        .from('bookings')
        .insert(bookingDataWithoutPaymentStatus)
        .select()
        .single();
      
      createdBooking = retryResult.data;
      createError = retryResult.error;
    }

    if (createError || !createdBooking) {
      console.error('Booking creation error:', createError);
      const errorMessage = createError?.message || 'Failed to create booking';
      console.error('Error details:', {
        code: createError?.code,
        message: errorMessage,
        details: createError?.details,
        hint: createError?.hint,
      });
      throw new Error(errorMessage);
    }

    // ✅ NEW: Insert all players into booking_players table
    if (validatedPlayers && validatedPlayers.length > 0) {
      const bookingPlayersData = validatedPlayers.map((player) => ({
        booking_id: createdBooking.id,
        member_id: player.memberId,
        is_main_player: player.isMainPlayer || false,
      }));

      const { error: playersError } = await supabase
        .from('booking_players')
        .insert(bookingPlayersData);

      if (playersError) {
        console.error('Error inserting booking players:', playersError);
        // Don't throw - booking is created, players can be added later
        // But log the error for debugging
      }
    }

    // ✅ SIMPLIFIED PRICING: Main member pays base price + (additional players × base price)
    // Create booking items from pricing information
    if (payload.pricingInfo && payload.pricingInfo.finalPrice > 0) {
      try {
        const totalPlayers = validatedPlayers.length;
        const finalPrice = payload.pricingInfo.finalPrice;
        const basePricePerPlayer = payload.pricingInfo.basePrice;
        
        console.log('[Booking] Creating booking items with simplified pricing:', {
          bookingId: createdBooking.id,
          finalPrice,
          basePricePerPlayer,
          totalPlayers,
          mainMemberPays: finalPrice,
        });

        // Simplified pricing model: Create booking items for each included service
        // Main member pays: base price + (additional players × base price)
        // Total = base price per player × total players
        const { data: priceItems, error: priceItemsError } = await supabase
          .from('price_items')
          .select('id, name, unit_price, category')
          .in('category', ['GREEN_FEE', 'CADDY', 'CART'])
          .eq('is_active', true);

        if (priceItemsError) {
          console.error('Error fetching price items for booking:', priceItemsError);
        } else if (priceItems && priceItems.length > 0) {
          const bookingItemsToInsert: any[] = [];
          
          // Create booking items for each included service
          // Each service is charged: unit_price × total_players
          // This represents: main member pays for all players
          priceItems.forEach((priceItem) => {
            const category = priceItem.category as string;
            const shouldInclude = 
              (category === 'GREEN_FEE' && payload.pricingInfo?.includesGreenFee) ||
              (category === 'CADDY' && payload.pricingInfo?.includesCaddy) ||
              (category === 'CART' && payload.pricingInfo?.includesCart);

            if (shouldInclude) {
              const unitPrice = Number(priceItem.unit_price);
              // Simplified: Main member pays for all players
              // Quantity = total players, unit_price = price per player
              const totalPrice = unitPrice * totalPlayers;
              
              bookingItemsToInsert.push({
                booking_id: createdBooking.id,
                price_item_id: priceItem.id,
              quantity: totalPlayers, // Total players (main + additional)
                unit_price: unitPrice, // Price per player
                total_price: totalPrice, // Total for this service = unit_price × total_players
              });
            }
          });

          // Insert all booking items
          if (bookingItemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
              .from('booking_items')
              .insert(bookingItemsToInsert);

            if (itemsError) {
              console.error('Error creating booking items:', itemsError);
              // Don't throw - booking is created, items can be added manually later
            } else {
              console.log('[Booking] Booking items created successfully:', bookingItemsToInsert.length);
            }
          }
        }

        // Update booking total_amount to the final price
        const { error: updateTotalError } = await supabase
          .from('bookings')
          .update({ total_amount: finalPrice })
          .eq('id', createdBooking.id);

        if (updateTotalError) {
          console.error('Error updating booking total_amount:', updateTotalError);
          // Don't throw - booking is created, total can be recalculated later
        } else {
          console.log('[Booking] Booking total_amount updated to:', finalPrice);
        }
      } catch (pricingError) {
        console.error('Error applying pricing to booking:', pricingError);
        // Don't throw - booking is created, pricing can be added manually later
      }
    }

    // Return mapped booking with validated players
    return {
      id: createdBooking.id,
      teeTimeId: createdBooking.tee_time_id,
      players: validatedPlayers, // Use validated (deduplicated) players
      notes: createdBooking.notes || undefined,
      status: createdBooking.status as Booking['status'],
      createdAt: createdBooking.created_at,
      updatedAt: createdBooking.updated_at,
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const getBookings = async (params: BookingListParams = {}): Promise<BookingListResponse> => {
  try {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    // Build query with course information
    let query = supabase
      .from('bookings')
      .select(
        `
        *,
        members!bookings_member_id_fkey (
          id,
          first_name,
          last_name,
          member_code
        ),
        courses!bookings_course_id_fkey (
          id,
          code,
          name
        )
      `,
      )
      .order('created_at', { ascending: false });

    // Apply filters
    if (params.fromDate) {
      query = query.gte('booking_date', params.fromDate);
    }
    if (params.toDate) {
      query = query.lte('booking_date', params.toDate);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.courseId) {
      query = query.eq('course_id', params.courseId);
    }

    // Get total count with same filters (before pagination)
    let countQuery = supabase.from('bookings').select('*', { count: 'exact', head: true });
    if (params.fromDate) {
      countQuery = countQuery.gte('booking_date', params.fromDate);
    }
    if (params.toDate) {
      countQuery = countQuery.lte('booking_date', params.toDate);
    }
    if (params.status) {
      countQuery = countQuery.eq('status', params.status);
    }
    if (params.courseId) {
      countQuery = countQuery.eq('course_id', params.courseId);
    }
    const { count, error: countError } = await countQuery;

    if (countError) throw countError;

    // Apply pagination
    const { data, error } = await query.range(start, end);

    if (error) throw error;

    // Debug: Log first booking to check data structure
    if (data && data.length > 0) {
      console.log('Sample booking data from database:', {
        bookingId: data[0].id,
        booking_time: data[0].booking_time,
        booking_date: data[0].booking_date,
        hasBookingTime: !!data[0].booking_time,
      });
    }

    // Map to BookingListItem first (without payment status)
    const mappedItems: BookingListItem[] = (data || []).map((row: any) => {
      const member = row.members;
      const memberName = member ? `${member.first_name} ${member.last_name}` : undefined;
      const mapped = mapDbRowToBookingListItem(row, memberName);
      
      // Debug: Log if time is missing
      if (!mapped.teeTimeStartTime) {
        console.warn('Mapped booking missing teeTimeStartTime:', {
          bookingId: mapped.id,
          originalBookingTime: row.booking_time,
          mapped,
        });
      }
      
      return mapped;
    });

    // Batch calculate payment status for all bookings (more efficient)
    // IMPORTANT: Always calculate dynamically from actual payments, never use stored value
    if (mappedItems.length > 0) {
      const bookingIds = mappedItems.map(item => item.id);
      const bookingTotals = new Map(mappedItems.map(item => [item.id, item.totalAmount || 0]));
      
      console.log('[Payment Status] Calculating payment status for bookings:', {
        bookingIds,
        bookingCount: bookingIds.length,
        timestamp: new Date().toISOString(),
      });
      
      const paymentStatusMap = await calculatePaymentStatusBatch(bookingIds, bookingTotals);

      // Apply payment status to each item (always use calculated value)
      mappedItems.forEach(item => {
        const calculatedStatus = paymentStatusMap.get(item.id) || 'UNPAID';
        item.paymentStatus = calculatedStatus;
        
        // Log status for debugging
        console.log(`[Payment Status] Booking ${item.id}:`, {
          bookingId: item.id,
          totalAmount: item.totalAmount,
          calculatedStatus,
        });
      });
    } else {
      console.log('[Payment Status] No bookings to calculate status for');
    }

    const items = mappedItems;

    // Apply search filter if provided
    let filteredItems = items;
    let finalCount = count || 0;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredItems = items.filter(
        (b) =>
          b.mainMemberName?.toLowerCase().includes(searchLower) ||
          b.id.toString().includes(searchLower) ||
          b.teeTimeDate?.includes(searchLower) ||
          b.courseName?.toLowerCase().includes(searchLower) ||
          b.courseCode?.toLowerCase().includes(searchLower),
      );
      // If search filter is applied, we need to recalculate count
      // Since search is done client-side, we use the filtered items length
      // For accurate count with search, we'd need to do it server-side
      finalCount = filteredItems.length;
    }

    return {
      items: filteredItems,
      page,
      pageSize,
      total: finalCount,
    };
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return {
      items: [],
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      total: 0,
    };
  }
};

export const getBookingsByMemberId = async (
  memberId: number,
  params: BookingListParams = {},
): Promise<BookingListResponse> => {
  try {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    // Build query with course information
    let query = supabase
      .from('bookings')
      .select(
        `
        *,
        members!bookings_member_id_fkey (
          id,
          first_name,
          last_name,
          member_code
        ),
        courses!bookings_course_id_fkey (
          id,
          code,
          name
        )
      `,
        { count: 'exact' },
      )
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (params.fromDate) {
      query = query.gte('booking_date', params.fromDate);
    }
    if (params.toDate) {
      query = query.lte('booking_date', params.toDate);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.courseId) {
      query = query.eq('course_id', params.courseId);
    }

    // Get count
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', memberId);

    // Apply pagination
    const { data, error } = await query.range(start, end);

    if (error) throw error;

    // Map to BookingListItem first (without payment status)
    const mappedItems: BookingListItem[] = (data || []).map((row: any) => {
      const member = row.members;
      const memberName = member ? `${member.first_name} ${member.last_name}` : undefined;
      return mapDbRowToBookingListItem(row, memberName);
    });

    // Batch calculate payment status for all bookings (more efficient)
    if (mappedItems.length > 0) {
      const bookingIds = mappedItems.map(item => item.id);
      const bookingTotals = new Map(mappedItems.map(item => [item.id, item.totalAmount || 0]));
      const paymentStatusMap = await calculatePaymentStatusBatch(bookingIds, bookingTotals);

      // Apply payment status to each item
      mappedItems.forEach(item => {
        item.paymentStatus = paymentStatusMap.get(item.id) || 'UNPAID';
      });
    }

    const items = mappedItems;

    return {
      items,
      page,
      pageSize,
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching bookings by member:', error);
    return {
      items: [],
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      total: 0,
    };
  }
};

export const getBookingById = async (id: number): Promise<BookingDetail> => {
  try {
    // Get booking with member and course information
    // Note: payment_status column may not exist if migration hasn't been run
    // Using * will include it if it exists, or omit it if it doesn't
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        *,
        members!bookings_member_id_fkey (
          id,
          first_name,
          last_name,
          member_code
        ),
        tee_times!bookings_tee_time_id_fkey (
          id,
          date,
          time,
          course_id
        ),
        courses!bookings_course_id_fkey (
          id,
          code,
          name
        )
      `,
      )
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Get booking items (charges)
    const { data: bookingItems, error: itemsError } = await supabase
      .from('booking_items')
      .select(
        `
        *,
        price_items!booking_items_price_item_id_fkey (
          id,
          name,
          description
        )
      `,
      )
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Error fetching booking items:', itemsError);
    }

    // ✅ NEW: Get all players from booking_players table
    const { data: bookingPlayers, error: playersError } = await supabase
      .from('booking_players')
      .select(
        `
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
      .eq('booking_id', id)
      .order('is_main_player', { ascending: false }); // Main player first

    if (playersError) {
      console.error('Error fetching booking players:', playersError);
      // Fallback to main member only if booking_players table doesn't exist or query fails
      const members = booking.members ? [booking.members] : [];
      return await mapDbRowToBookingDetail(booking, members, booking.tee_times, bookingItems || []);
    }

    // Map players from booking_players table, preserving is_main_player flag
    // Sort by is_main_player (main players first) so mapDbRowToBookingDetail works correctly
    const sortedPlayers = (bookingPlayers || []).sort((a: any, b: any) => {
      if (a.is_main_player && !b.is_main_player) return -1;
      if (!a.is_main_player && b.is_main_player) return 1;
      return 0;
    });

    const members = sortedPlayers.map((bp: any) => ({
      id: bp.member_id,
      first_name: bp.members?.first_name || '',
      last_name: bp.members?.last_name || '',
      member_code: bp.members?.member_code || '',
      is_main_player: bp.is_main_player, // Preserve flag for mapping
    }));

    // If no players found in booking_players, fallback to main member
    if (members.length === 0 && booking.members) {
      const fallbackMembers = [booking.members];
      return await mapDbRowToBookingDetail(booking, fallbackMembers, booking.tee_times, bookingItems || []);
    }

    // Update mapDbRowToBookingDetail to use is_main_player if available
    const players: BookingDetailPlayer[] = members.map((member: any) => ({
      memberId: member.id,
      memberName: `${member.first_name} ${member.last_name}`,
      memberCode: member.member_code,
      isMainPlayer: member.is_main_player !== undefined ? member.is_main_player : false,
    }));

    const charges: BookingCharge[] = (bookingItems || []).map((item) => ({
      id: item.id,
      description: item.price_items?.name || 'Item',
      amount: Number(item.total_price),
      type: 'FEE' as const,
      quantity: item.quantity || 1,
      unitPrice: Number(item.unit_price),
    }));

    // Calculate payment status dynamically based on actual payments
    const totalAmount = Number(booking.total_amount || 0);
    const dynamicPaymentStatus = await calculatePaymentStatus(booking.id, totalAmount);
    
    // Debug logging
    console.log('Booking detail payment status calculated:', {
      bookingId: booking.id,
      totalAmount,
      dynamicPaymentStatus,
    });

    // Get course information from booking or tee_time
    const courseId = booking.course_id || booking.tee_times?.course_id || null;
    const courseName = booking.courses?.name || undefined;
    
    return {
      id: booking.id,
      teeTimeId: booking.tee_time_id,
      notes: booking.notes || undefined,
      status: booking.status as Booking['status'],
      paymentStatus: dynamicPaymentStatus,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      teeTime: {
        id: booking.tee_times?.id || booking.tee_time_id,
        courseId: courseId || 1,
        courseName: courseName,
        date: booking.booking_date,
        startTime: booking.booking_time.substring(0, 5),
        endTime: '',
        maxPlayers: 4,
      },
      players,
      charges: charges.length > 0 ? charges : undefined,
      totalAmount,
    };
  } catch (error) {
    console.error('Error fetching booking detail:', error);
    throw error;
  }
};

export const cancelBooking = async (id: number, reason?: string): Promise<Booking> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED', notes: reason || null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw error || new Error('Failed to cancel booking');
    }

    return {
      id: data.id,
      teeTimeId: data.tee_time_id,
      players: [{ memberId: data.member_id, isMainPlayer: true }],
      notes: data.notes || undefined,
      status: data.status as Booking['status'],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
};

export const updateBooking = async (
  id: number,
  payload: UpdateBookingRequest,
): Promise<Booking> => {
  try {
    const updateData: any = {};
    if (payload.status) {
      updateData.status = payload.status;
    }
    if (payload.notes !== undefined) {
      updateData.notes = payload.notes || null;
    }
    
    // ✅ VALIDATE: Ensure no duplicate members in this booking
    let validatedPlayers: BookingPlayer[] | undefined;
    if (payload.players && payload.players.length > 0) {
      validatedPlayers = validateAndDeduplicatePlayers(payload.players);
      const mainPlayer = validatedPlayers.find((p) => p.isMainPlayer) || validatedPlayers[0];
      updateData.member_id = mainPlayer.memberId;
      updateData.player_count = validatedPlayers.length;
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw error || new Error('Failed to update booking');
    }

    // ✅ NEW: Update booking_players table if players are provided
    if (validatedPlayers && validatedPlayers.length > 0) {
      // Delete existing players for this booking
      const { error: deleteError } = await supabase
        .from('booking_players')
        .delete()
        .eq('booking_id', id);

      if (deleteError) {
        console.error('Error deleting existing booking players:', deleteError);
        // Continue anyway - try to insert new players
      }

      // Insert new players
      const bookingPlayersData = validatedPlayers.map((player) => ({
        booking_id: id,
        member_id: player.memberId,
        is_main_player: player.isMainPlayer || false,
      }));

      const { error: insertError } = await supabase
        .from('booking_players')
        .insert(bookingPlayersData);

      if (insertError) {
        console.error('Error inserting booking players:', insertError);
        // Don't throw - booking is updated, players update can be retried
        // But log the error for debugging
      }
    }

    return {
      id: data.id,
      teeTimeId: data.tee_time_id,
      players: validatedPlayers || [{ memberId: data.member_id, isMainPlayer: true }],
      notes: data.notes || undefined,
      status: data.status as Booking['status'],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
};

// Add booking item (product/charge)
export interface AddBookingItemRequest {
  bookingId: number;
  priceItemId: number;
  quantity?: number;
}

export const addBookingItem = async (payload: AddBookingItemRequest): Promise<void> => {
  try {
    // Get price item details
    const { data: priceItem, error: priceError } = await supabase
      .from('price_items')
      .select('unit_price')
      .eq('id', payload.priceItemId)
      .single();

    if (priceError || !priceItem) {
      throw new Error('Price item not found');
    }

    const quantity = payload.quantity || 1;
    const unitPrice = Number(priceItem.unit_price);
    const totalPrice = unitPrice * quantity;

    // Insert booking item
    const { error: insertError } = await supabase
      .from('booking_items')
      .insert({
        booking_id: payload.bookingId,
        price_item_id: payload.priceItemId,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });

    if (insertError) throw insertError;

    // Recalculate and update booking total_amount
    await recalculateBookingTotal(payload.bookingId);
    
    // Recalculate payment status after total amount changes
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('id', payload.bookingId)
        .single();
      
      if (booking) {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('booking_id', payload.bookingId)
          .eq('payment_status', 'COMPLETED');
        
        const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
        const totalAmount = Number(booking.total_amount || 0);
        const newPaymentStatus = totalAmount <= 0 || totalPaid >= totalAmount ? 'PAID' : 'UNPAID';
        
        await supabase
          .from('bookings')
          .update({ payment_status: newPaymentStatus })
          .eq('id', payload.bookingId);
      }
    } catch (error) {
      // Don't throw - booking item was added successfully, payment status update is secondary
      console.error('Error updating payment status after adding item:', error);
    }
  } catch (error) {
    console.error('Error adding booking item:', error);
    throw error;
  }
};

// Remove booking item
export const removeBookingItem = async (bookingItemId: number, bookingId: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('booking_items')
      .delete()
      .eq('id', bookingItemId);

    if (error) throw error;

    // Recalculate and update booking total_amount
    await recalculateBookingTotal(bookingId);
    
    // Recalculate payment status after total amount changes
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('id', bookingId)
        .single();
      
      if (booking) {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('booking_id', bookingId)
          .eq('payment_status', 'COMPLETED');
        
        const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
        const totalAmount = Number(booking.total_amount || 0);
        const newPaymentStatus = totalAmount <= 0 || totalPaid >= totalAmount ? 'PAID' : 'UNPAID';
        
        await supabase
          .from('bookings')
          .update({ payment_status: newPaymentStatus })
          .eq('id', bookingId);
      }
    } catch (error) {
      // Don't throw - booking item was removed successfully, payment status update is secondary
      console.error('Error updating payment status after removing item:', error);
    }
  } catch (error) {
    console.error('Error removing booking item:', error);
    throw error;
  }
};

// Recalculate booking total from booking_items
const recalculateBookingTotal = async (bookingId: number): Promise<void> => {
  try {
    // Get all booking items for this booking
    const { data: items, error: itemsError } = await supabase
      .from('booking_items')
      .select('total_price')
      .eq('booking_id', bookingId);

    if (itemsError) throw itemsError;

    // Calculate total
    const totalAmount = items?.reduce((sum, item) => sum + Number(item.total_price || 0), 0) || 0;

    // Update booking total_amount
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ total_amount: totalAmount })
      .eq('id', bookingId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error recalculating booking total:', error);
    throw error;
  }
};
