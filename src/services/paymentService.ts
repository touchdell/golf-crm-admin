import { supabase } from '../lib/supabase';

export type PaymentMethod = 'CASH' | 'CARD' | 'CHECK' | 'TRANSFER' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface CreatePaymentRequest {
  bookingId: number;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    name: string;
  };
}

// Database row interface
interface DbPaymentRow {
  id: number;
  booking_id: number;
  amount: number;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to map database row to Payment interface
const mapDbRowToPayment = (row: DbPaymentRow): Payment => {
  return {
    id: row.id,
    bookingId: row.booking_id,
    amount: Number(row.amount),
    currency: 'USD', // Default, can be extended if needed
    paymentMethod: row.payment_method as PaymentMethod,
    status: row.payment_status as PaymentStatus,
    referenceNumber: row.transaction_id || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // createdBy can be added if user tracking is needed
  };
};

export const createPayment = async (payload: CreatePaymentRequest): Promise<Payment> => {
  try {
    const paymentData = {
      booking_id: payload.bookingId,
      amount: payload.amount,
      payment_method: payload.paymentMethod,
      payment_status: 'PENDING' as const,
      transaction_id: payload.referenceNumber || null,
      notes: payload.notes || null,
    };

    const { data, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (error || !data) {
      throw error || new Error('Failed to create payment');
    }

    return mapDbRowToPayment(data);
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

export const getPaymentsByBooking = async (bookingId: number): Promise<Payment[]> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapDbRowToPayment);
  } catch (error) {
    console.error('Error fetching payments by booking:', error);
    return [];
  }
};

export const getPaymentsByMemberId = async (memberId: number): Promise<Payment[]> => {
  try {
    // Get payments through bookings
    const { data, error } = await supabase
      .from('payments')
      .select(
        `
        *,
        bookings!payments_booking_id_fkey (
          member_id
        )
      `,
      )
      .eq('bookings.member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter and map payments
    const payments: Payment[] = [];
    if (data) {
      for (const row of data) {
        const booking = row.bookings;
        if (booking && booking.member_id === memberId) {
          payments.push(mapDbRowToPayment(row));
        }
      }
    }

    return payments;
  } catch (error) {
    console.error('Error fetching payments by member:', error);
    // Fallback: query bookings first, then payments
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('member_id', memberId);

      if (!bookings || bookings.length === 0) {
        return [];
      }

      const bookingIds = bookings.map((b) => b.id);
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      return (payments || []).map(mapDbRowToPayment);
    } catch (fallbackError) {
      console.error('Fallback error fetching payments:', fallbackError);
      return [];
    }
  }
};
