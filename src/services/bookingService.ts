import { supabase } from '../lib/supabase';

export interface BookingPlayer {
  memberId: number;
  isMainPlayer?: boolean;
}

export interface CreateBookingRequest {
  teeTimeId?: number; // Optional - may be a temporary ID
  date: string; // Required: booking date (YYYY-MM-DD)
  time: string; // Required: booking time (HH:mm)
  players: BookingPlayer[];
  notes?: string;
}

export interface UpdateBookingRequest {
  players?: BookingPlayer[];
  notes?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
}

export interface Booking {
  id: number;
  teeTimeId: number;
  players: BookingPlayer[];
  notes?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
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
}

export interface BookingListParams {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  status?: Booking['status'];
  search?: string;
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
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to map database row to BookingListItem
const mapDbRowToBookingListItem = (row: DbBookingRow, memberName?: string): BookingListItem => {
  const mainPlayer = { memberId: row.member_id, isMainPlayer: true };
  return {
    id: row.id,
    teeTimeId: row.tee_time_id,
    players: [mainPlayer],
    notes: row.notes || undefined,
    status: row.status as Booking['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    teeTimeDate: row.booking_date,
    teeTimeStartTime: row.booking_time.substring(0, 5), // Extract HH:mm from HH:mm:ss
    teeTimeEndTime: '', // Will be calculated if needed
    mainMemberName: memberName,
    totalAmount: Number(row.total_amount),
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
  }));

  return {
    id: row.id,
    teeTimeId: row.tee_time_id,
    notes: row.notes || undefined,
    status: row.status as Booking['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    teeTime: {
      id: teeTime?.id || row.tee_time_id,
      courseId: 1, // Default, can be extended
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
    
    const { data: existingTeeTime } = await supabase
      .from('tee_times')
      .select('id')
      .eq('date', payload.date)
      .eq('time', timeWithSeconds)
      .single();
    
    if (existingTeeTime) {
      actualTeeTimeId = existingTeeTime.id;
    } else {
      // Create new tee_time record if it doesn't exist
      const { data: newTeeTime, error: createTeeTimeError } = await supabase
        .from('tee_times')
        .insert({
          date: payload.date,
          time: timeWithSeconds,
          status: 'BOOKED',
          player_count: payload.players.length,
        })
        .select('id')
        .single();
      
      if (createTeeTimeError || !newTeeTime) {
        throw new Error(`Failed to create tee time: ${createTeeTimeError?.message || 'Unknown error'}`);
      }
      
      actualTeeTimeId = newTeeTime.id;
    }

    // Get main player (first player)
    const mainPlayer = payload.players.find((p) => p.isMainPlayer) || payload.players[0];
    if (!mainPlayer) {
      throw new Error('At least one player is required');
    }

    // Generate booking number
    const { data: bookingNumber, error: bookingNumberError } = await supabase.rpc(
      'generate_booking_number',
    );

    if (bookingNumberError || !bookingNumber) {
      throw new Error('Failed to generate booking number');
    }

    // Create booking
    const bookingData = {
      booking_number: bookingNumber,
      member_id: mainPlayer.memberId,
      tee_time_id: actualTeeTimeId,
      booking_date: payload.date,
      booking_time: timeWithSeconds,
      player_count: payload.players.length,
      status: 'PENDING',
      total_amount: 0, // Will be calculated from booking_items
      notes: payload.notes || null,
    };

    const { data: createdBooking, error: createError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (createError || !createdBooking) {
      throw createError || new Error('Failed to create booking');
    }

    // Return mapped booking
    return {
      id: createdBooking.id,
      teeTimeId: createdBooking.tee_time_id,
      players: payload.players,
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

    // Build query
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

    // Get total count first (before pagination)
    const { count, error: countError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Apply pagination
    const { data, error } = await query.range(start, end);

    if (error) throw error;

    // Map to BookingListItem
    const items: BookingListItem[] =
      data?.map((row: any) => {
        const member = row.members;
        const memberName = member ? `${member.first_name} ${member.last_name}` : undefined;
        return mapDbRowToBookingListItem(row, memberName);
      }) || [];

    // Apply search filter if provided
    let filteredItems = items;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredItems = items.filter(
        (b) =>
          b.mainMemberName?.toLowerCase().includes(searchLower) ||
          b.id.toString().includes(searchLower) ||
          b.teeTimeDate?.includes(searchLower),
      );
    }

    return {
      items: filteredItems,
      page,
      pageSize,
      total: count || 0,
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

    // Build query
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

    // Get count
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', memberId);

    // Apply pagination
    const { data, error } = await query.range(start, end);

    if (error) throw error;

    // Map to BookingListItem
    const items: BookingListItem[] =
      data?.map((row: any) => {
        const member = row.members;
        const memberName = member ? `${member.first_name} ${member.last_name}` : undefined;
        return mapDbRowToBookingListItem(row, memberName);
      }) || [];

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
    // Get booking with member
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
          time
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
      .eq('booking_id', id);

    if (itemsError) {
      console.error('Error fetching booking items:', itemsError);
    }

    // Map members (for now, just the main member)
    const members = booking.members ? [booking.members] : [];

    return await mapDbRowToBookingDetail(booking, members, booking.tee_times, bookingItems || []);
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
    if (payload.players && payload.players.length > 0) {
      const mainPlayer = payload.players.find((p) => p.isMainPlayer) || payload.players[0];
      updateData.member_id = mainPlayer.memberId;
      updateData.player_count = payload.players.length;
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

    return {
      id: data.id,
      teeTimeId: data.tee_time_id,
      players: payload.players || [{ memberId: data.member_id, isMainPlayer: true }],
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
