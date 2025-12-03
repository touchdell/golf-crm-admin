import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPayment,
  getPaymentsByBooking,
  getPaymentsByMemberId,
  type CreatePaymentRequest,
} from '../services/paymentService';

export const usePaymentsByBooking = (bookingId: number | null) => {
  return useQuery({
    queryKey: ['payments', 'booking', bookingId],
    queryFn: () => getPaymentsByBooking(bookingId!),
    enabled: !!bookingId,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const usePaymentsByMember = (memberId: number | null) => {
  return useQuery({
    queryKey: ['payments', 'member', memberId],
    queryFn: () => getPaymentsByMemberId(memberId!),
    enabled: !!memberId,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => createPayment(data),
    onSuccess: (data) => {
      // Invalidate payments queries for this booking
      queryClient.invalidateQueries({ queryKey: ['payments', 'booking', data.bookingId] });
      // Invalidate booking detail query
      queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
      // Invalidate bookings list
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

