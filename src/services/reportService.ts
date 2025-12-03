import { apiClient } from './apiClient';

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

// Generate dummy summary report (amounts in THB)
const generateDummySummaryReport = (): SummaryReport => {
  return {
    todayBookings: 12 + Math.floor(Math.random() * 10),
    todayRevenue: 8500 + Math.floor(Math.random() * 5000), // THB
    activeMembers: 245 + Math.floor(Math.random() * 50),
    monthlyRevenue: 150000 + Math.floor(Math.random() * 50000), // THB
    totalBookings: 1250 + Math.floor(Math.random() * 200),
    totalRevenue: 950000 + Math.floor(Math.random() * 100000), // THB
  };
};

// Generate dummy daily bookings (revenue in THB)
const generateDummyDailyBookings = (from: string, to: string): DailyBooking[] => {
  const bookings: DailyBooking[] = [];
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    bookings.push({
      date: dateStr,
      bookings: 5 + Math.floor(Math.random() * 20),
      revenue: 3000 + Math.floor(Math.random() * 8000), // THB
    });
  }
  
  return bookings;
};

export const getSummaryReport = async (
  from?: string,
  to?: string,
): Promise<SummaryReport> => {
  // For development: always use dummy data
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.get<SummaryReport>('/reports/summary', {
        params: { from, to },
      });
      return res.data;
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy data
  const report = generateDummySummaryReport();
  console.log('Returning dummy summary report:', report);
  return report;
};

export const getDailyBookings = async (
  from: string,
  to: string,
): Promise<DailyBookingsResponse> => {
  // For development: always use dummy data
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.get<DailyBookingsResponse>('/reports/daily-bookings', {
        params: { from, to },
      });
      return res.data;
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy data
  const items = generateDummyDailyBookings(from, to);
  console.log(`Returning ${items.length} days of dummy booking data`);
  
  return {
    items,
    from,
    to,
  };
};

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface DailyRevenueResponse {
  items: DailyRevenue[];
  from: string;
  to: string;
}

// Generate dummy daily revenue
const generateDummyDailyRevenue = (from: string, to: string): DailyRevenue[] => {
  const revenue: DailyRevenue[] = [];
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    revenue.push({
      date: dateStr,
      revenue: 5000 + Math.floor(Math.random() * 15000), // THB
    });
  }
  
  return revenue;
};

export const getDailyRevenue = async (
  from: string,
  to: string,
): Promise<DailyRevenueResponse> => {
  // For development: always use dummy data
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.get<DailyRevenueResponse>('/reports/daily-revenue', {
        params: { from, to },
      });
      return res.data;
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy data
  const items = generateDummyDailyRevenue(from, to);
  console.log(`Returning ${items.length} days of dummy revenue data`);
  
  return {
    items,
    from,
    to,
  };
};

