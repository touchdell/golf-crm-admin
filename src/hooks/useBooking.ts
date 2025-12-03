import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBooking,
  getBookings,
  getBookingById,
  getBookingsByMemberId,
  cancelBooking,
  updateBooking,
  type CreateBookingRequest,
  type BookingListParams,
  type UpdateBookingRequest,
} from '../services/bookingService';

export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingRequest) => createBooking(data),
    onSuccess: () => {
      // Invalidate tee times queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['tee-times'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useBookings = (params: BookingListParams = {}) => {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => getBookings(params),
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useBookingsByMember = (memberId: number | null, params: BookingListParams = {}) => {
  return useQuery({
    queryKey: ['bookings', 'member', memberId, params],
    queryFn: () => getBookingsByMemberId(memberId!, params),
    enabled: !!memberId,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useBooking = (id: number | null) => {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBookingById(id!),
    enabled: !!id,
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      cancelBooking(id, reason),
    onSuccess: () => {
      // Invalidate bookings and tee times queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking'] });
      queryClient.invalidateQueries({ queryKey: ['tee-times'] });
    },
  });
};

export const useUpdateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateBookingRequest }) =>
      updateBooking(id, payload),
    onSuccess: (data) => {
      // Invalidate bookings and tee times queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tee-times'] });
    },
  });
};

