import { useQuery } from '@tanstack/react-query';
import { getSummaryReport, getDailyBookings, getDailyRevenue, type SummaryReport, type DailyBookingsResponse, type DailyRevenueResponse } from '../services/reportService';

export const useSummaryReport = (from?: string, to?: string) => {
  return useQuery<SummaryReport>({
    queryKey: ['reports', 'summary', from, to],
    queryFn: () => getSummaryReport(from, to),
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useDailyBookings = (from: string, to: string) => {
  return useQuery<DailyBookingsResponse>({
    queryKey: ['reports', 'daily-bookings', from, to],
    queryFn: () => getDailyBookings(from, to),
    enabled: !!from && !!to,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useDailyRevenue = (from: string, to: string) => {
  return useQuery<DailyRevenueResponse>({
    queryKey: ['reports', 'daily-revenue', from, to],
    queryFn: () => getDailyRevenue(from, to),
    enabled: !!from && !!to,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

