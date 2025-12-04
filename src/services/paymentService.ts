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
    // Payment is created as COMPLETED by default (since admin is recording it)
    const paymentData = {
      booking_id: payload.bookingId,
      amount: payload.amount,
      payment_method: payload.paymentMethod,
      payment_status: 'COMPLETED' as const,
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

    // Check if booking is fully paid and update status accordingly
    // Add a small delay to ensure payment is fully committed before calculating status
    await new Promise(resolve => setTimeout(resolve, 100));
    await checkAndUpdateBookingStatus(payload.bookingId);

    return mapDbRowToPayment(data);
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

// Check if booking is fully paid and update payment_status
// According to business flow: When payment is recorded → payment_status = PAID
const checkAndUpdateBookingStatus = async (bookingId: number): Promise<void> => {
  try {
    // Get booking total amount
    // Note: payment_status column may not exist if migration hasn't been run
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('total_amount, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return;
    }

    // Get all completed payments for this booking
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('booking_id', bookingId)
      .eq('payment_status', 'COMPLETED');

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return;
    }

    // Calculate total paid
    const totalPaid = payments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
    const totalAmount = Number(booking.total_amount || 0);

    // Update payment_status dynamically based on actual payments
    // Payment status logic:
    // 1. If totalAmount <= 0: Only PAID if there are actual payments recorded
    // 2. If totalAmount > 0: PAID if totalPaid >= totalAmount (with tolerance)
    let isPaid: boolean;
    
    if (totalAmount <= 0) {
      // If nothing is due, only mark as PAID if there are actual payments
      isPaid = totalPaid > 0;
    } else {
      // If there's an amount due, check if payments cover it
      isPaid = totalPaid >= totalAmount - 0.01; // Allow 1 cent tolerance for rounding
    }
    
    const newPaymentStatus = isPaid ? 'PAID' : 'UNPAID';
    
    // Debug logging
    console.log('Updating payment status:', {
      bookingId,
      totalAmount,
      totalPaid,
      paymentsCount: payments?.length || 0,
      isPaid,
      newPaymentStatus,
    });
    
    // Update payment_status in database (for backward compatibility and caching)
    // Note: The UI will calculate this dynamically, but we still update the DB for consistency
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ payment_status: newPaymentStatus })
      .eq('id', bookingId);

    if (updateError) {
      // If error is about payment_status column not existing, just log and continue
      // Payment was successful, status update is optional
      if (updateError.message?.includes('payment_status') || updateError.code === '42703') {
        console.warn('payment_status column not found. Payment recorded successfully, but payment_status not updated. Please run migration: update-booking-payment-flow.sql');
      } else {
        console.error('Error updating booking payment status:', updateError);
      }
    }
  } catch (error) {
    console.error('Error checking booking status:', error);
    // Don't throw - payment was successful, status update is secondary
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
