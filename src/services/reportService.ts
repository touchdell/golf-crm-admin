import { supabase } from '../lib/supabase';

export interface SummaryReport {
  todayBookings: number;
  todayRevenue: number;
  activeMembers: number;
  monthlyRevenue: number;
  totalBookings: number;
  totalRevenue: number;
}

export interface DailyBooking {
  date: string;
  bookings: number;
  revenue: number;
}

export interface DailyBookingsResponse {
  items: DailyBooking[];
  from: string;
  to: string;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface DailyRevenueResponse {
  items: DailyRevenue[];
  from: string;
  to: string;
}

export const getSummaryReport = async (): Promise<SummaryReport> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    // Get today's bookings count
    const { count: todayBookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('booking_date', today)
      .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']);

    // Get today's revenue (sum of total_amount from bookings)
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('total_amount')
      .eq('booking_date', today)
      .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']);

    const todayRevenue =
      todayBookings?.reduce((sum, b) => sum + Number(b.total_amount || 0), 0) || 0;

    // Get active members count (members with ACTIVE status)
    const { count: activeMembersCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('membership_status', 'ACTIVE');

    // Get monthly revenue (sum of total_amount from bookings this month)
    const { data: monthlyBookings } = await supabase
      .from('bookings')
      .select('total_amount')
      .gte('booking_date', startOfMonth)
      .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']);

    const monthlyRevenue =
      monthlyBookings?.reduce((sum, b) => sum + Number(b.total_amount || 0), 0) || 0;

    // Get total bookings count
    const { count: totalBookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']);

    // Get total revenue (sum of all bookings)
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('total_amount')
      .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']);

    const totalRevenue =
      allBookings?.reduce((sum, b) => sum + Number(b.total_amount || 0), 0) || 0;

    return {
      todayBookings: todayBookingsCount || 0,
      todayRevenue,
      activeMembers: activeMembersCount || 0,
      monthlyRevenue,
      totalBookings: totalBookingsCount || 0,
      totalRevenue,
    };
  } catch (error) {
    console.error('Error fetching summary report:', error);
    // Return zeros on error
    return {
      todayBookings: 0,
      todayRevenue: 0,
      activeMembers: 0,
      monthlyRevenue: 0,
      totalBookings: 0,
      totalRevenue: 0,
    };
  }
};

export const getDailyBookings = async (
  from: string,
  to: string,
): Promise<DailyBookingsResponse> => {
  try {
    // Get all bookings in date range
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('booking_date, total_amount')
      .gte('booking_date', from)
      .lte('booking_date', to)
      .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED'])
      .order('booking_date', { ascending: true });

    if (error) throw error;

    // Group by date
    const dailyMap = new Map<string, { bookings: number; revenue: number }>();

    // Initialize all dates in range with zeros
    const fromDate = new Date(from);
    const toDate = new Date(to);
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, { bookings: 0, revenue: 0 });
    }

    // Aggregate bookings by date
    if (bookings) {
      for (const booking of bookings) {
        const date = booking.booking_date;
        const existing = dailyMap.get(date) || { bookings: 0, revenue: 0 };
        dailyMap.set(date, {
          bookings: existing.bookings + 1,
          revenue: existing.revenue + Number(booking.total_amount || 0),
        });
      }
    }

    // Convert map to array
    const items: DailyBooking[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        bookings: data.bookings,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      items,
      from,
      to,
    };
  } catch (error) {
    console.error('Error fetching daily bookings:', error);
    return {
      items: [],
      from,
      to,
    };
  }
};

export const getDailyRevenue = async (
  from: string,
  to: string,
): Promise<DailyRevenueResponse> => {
  try {
    // Get all bookings in date range with total_amount
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('booking_date, total_amount')
      .gte('booking_date', from)
      .lte('booking_date', to)
      .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED'])
      .order('booking_date', { ascending: true });

    if (error) throw error;

    // Group by date
    const dailyMap = new Map<string, number>();

    // Initialize all dates in range with zeros
    const fromDate = new Date(from);
    const toDate = new Date(to);
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, 0);
    }

    // Aggregate revenue by date
    if (bookings) {
      for (const booking of bookings) {
        const date = booking.booking_date;
        const existing = dailyMap.get(date) || 0;
        dailyMap.set(date, existing + Number(booking.total_amount || 0));
      }
    }

    // Convert map to array
    const items: DailyRevenue[] = Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({
        date,
        revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      items,
      from,
      to,
    };
  } catch (error) {
    console.error('Error fetching daily revenue:', error);
    return {
      items: [],
      from,
      to,
    };
  }
};
