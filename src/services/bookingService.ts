import { apiClient } from './apiClient';

export interface BookingPlayer {
  memberId: number;
  isMainPlayer?: boolean;
}

export interface CreateBookingRequest {
  teeTimeId: number;
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

// Generate dummy bookings for development (consistent data)
const generateAllDummyBookings = (): BookingListItem[] => {
  const bookings: BookingListItem[] = [];
  const statuses: Booking['status'][] = ['CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'];
  const memberNames = [
    'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis',
    'David Wilson', 'Jessica Martinez', 'Robert Taylor', 'Amanda Anderson',
  ];

  // Use a fixed seed for consistent data generation
  for (let i = 0; i < 50; i++) {
    const date = new Date();
    date.setDate(date.getDate() + (i % 30) - 10); // More predictable dates
    const status = statuses[i % statuses.length];
    
    bookings.push({
      id: 1000 + i,
      teeTimeId: 1 + i,
      players: [{ memberId: 1 + i, isMainPlayer: true }],
      status,
      createdAt: new Date(date.getTime() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      teeTimeDate: date.toISOString().split('T')[0],
      teeTimeStartTime: `${String(6 + (i % 12)).padStart(2, '0')}:${['00', '15', '30', '45'][i % 4]}`,
      teeTimeEndTime: `${String(6 + (i % 12)).padStart(2, '0')}:${['15', '30', '45', '00'][(i + 1) % 4]}`,
      mainMemberName: memberNames[i % memberNames.length],
      totalAmount: 50 + (i % 200),
    });
  }

  return bookings;
};

export const createBooking = async (
  payload: CreateBookingRequest,
): Promise<Booking> => {
  try {
    const res = await apiClient.post<Booking>('/bookings', payload);
    return res.data;
  } catch {
    // Fallback to dummy booking for development
    // In production, remove this and let the error propagate
    return {
      id: Date.now(),
      teeTimeId: payload.teeTimeId,
      players: payload.players,
      notes: payload.notes,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

export const getBookings = async (
  params: BookingListParams = {},
): Promise<BookingListResponse> => {
  // For development: always use dummy data
  // In production, uncomment the API call below
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.get<BookingListResponse>('/bookings', { params });
      // If API returns data, use it
      if (res.data && res.data.items && res.data.items.length > 0) {
        return res.data;
      }
      // If API returns but no items, fall through to dummy data
    } catch (error) {
      // Fallback to dummy data for development
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy data for development (always return dummy data if no backend)
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  
  // Generate all bookings once
  const allBookings = generateAllDummyBookings();
  
  // Apply filters
  let filtered = allBookings;
  
  if (params.fromDate) {
    filtered = filtered.filter(b => b.teeTimeDate && b.teeTimeDate >= params.fromDate!);
  }
  if (params.toDate) {
    filtered = filtered.filter(b => b.teeTimeDate && b.teeTimeDate <= params.toDate!);
  }
  if (params.status) {
    filtered = filtered.filter(b => b.status === params.status);
  }
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filtered = filtered.filter(b => 
      b.mainMemberName?.toLowerCase().includes(searchLower) ||
      b.id.toString().includes(searchLower)
    );
  }
  
  // Calculate total before pagination
  const total = filtered.length;
  
  // Apply pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = filtered.slice(start, end);
  
  console.log('Returning dummy bookings:', { items: items.length, total, page, pageSize, filteredCount: filtered.length });
  
  return {
    items,
    page,
    pageSize,
    total,
  };
};

export const getBookingsByMemberId = async (
  memberId: number,
  params: BookingListParams = {},
): Promise<BookingListResponse> => {
  // For development: always use dummy data
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.get<BookingListResponse>(`/members/${memberId}/bookings`, { params });
      if (res.data) {
        return res.data;
      }
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy data - filter by memberId
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  
  // Generate all bookings and filter by memberId
  const allBookings = generateAllDummyBookings();
  
  // Filter bookings where memberId is in the players array
  let filtered = allBookings.filter(b => 
    b.players.some(p => p.memberId === memberId)
  );
  
  // Apply additional filters
  if (params.fromDate) {
    filtered = filtered.filter(b => b.teeTimeDate && b.teeTimeDate >= params.fromDate!);
  }
  if (params.toDate) {
    filtered = filtered.filter(b => b.teeTimeDate && b.teeTimeDate <= params.toDate!);
  }
  if (params.status) {
    filtered = filtered.filter(b => b.status === params.status);
  }
  
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = filtered.slice(start, end);
  
  return {
    items,
    page,
    pageSize,
    total,
  };
};

export const getBookingById = async (id: number): Promise<BookingDetail> => {
  // For development: always use dummy data
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.get<BookingDetail>(`/bookings/${id}`);
      if (res.data) {
        return res.data;
      }
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy data for development
  const memberNames = [
    'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis',
  ];
  
  const bookingDetail: BookingDetail = {
    id,
    teeTimeId: 1,
    players: [
      { memberId: 1, memberName: memberNames[0], memberCode: 'M001', isMainPlayer: true },
      { memberId: 2, memberName: memberNames[1], memberCode: 'M002', isMainPlayer: false },
    ],
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    teeTime: {
      id: 1,
      courseId: 1,
      courseName: 'Main Course',
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '08:15',
      maxPlayers: 4,
    },
    charges: [
      { id: 1, description: 'Green Fee', amount: 50, type: 'FEE' },
      { id: 2, description: 'Cart Rental', amount: 25, type: 'FEE' },
    ],
    totalAmount: 75,
  };
  
  console.log('Returning dummy booking detail:', bookingDetail);
  return bookingDetail;
};

export const cancelBooking = async (
  id: number,
  reason?: string,
): Promise<Booking> => {
  try {
    const res = await apiClient.post<Booking>(`/bookings/${id}/cancel`, { reason });
    return res.data;
  } catch {
    // Fallback to dummy response for development
    return {
      id,
      teeTimeId: 1,
      players: [{ memberId: 1, isMainPlayer: true }],
      status: 'CANCELLED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

export const updateBooking = async (
  id: number,
  payload: UpdateBookingRequest,
): Promise<Booking> => {
  try {
    const res = await apiClient.put<Booking>(`/bookings/${id}`, payload);
    return res.data;
  } catch {
    // Fallback to dummy response for development
    return {
      id,
      teeTimeId: 1,
      players: payload.players || [{ memberId: 1, isMainPlayer: true }],
      notes: payload.notes,
      status: payload.status || 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

