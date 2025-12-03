import { apiClient } from './apiClient';

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

// Generate dummy payments for development
const generateDummyPayments = (bookingId: number): Payment[] => {
  const payments: Payment[] = [];
  const methods: PaymentMethod[] = ['CASH', 'CARD', 'CHECK', 'TRANSFER'];
  const statuses: PaymentStatus[] = ['COMPLETED', 'PENDING'];
  
  // Generate 0-3 payments per booking
  const numPayments = bookingId % 4;
  
  for (let i = 0; i < numPayments; i++) {
    payments.push({
      id: bookingId * 100 + i,
      bookingId,
      amount: 25 + (i * 30) + (bookingId % 50),
      currency: 'USD',
      paymentMethod: methods[i % methods.length],
      status: statuses[i % statuses.length],
      referenceNumber: `REF-${bookingId}-${i + 1}`,
      notes: i === 0 ? 'Initial payment' : `Payment ${i + 1}`,
      createdAt: new Date(Date.now() - (i * 86400000)).toISOString(),
      updatedAt: new Date(Date.now() - (i * 86400000)).toISOString(),
      createdBy: {
        id: 1,
        name: 'Admin User',
      },
    });
  }
  
  return payments;
};

export const createPayment = async (
  payload: CreatePaymentRequest,
): Promise<Payment> => {
  // For development: always use dummy data
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.post<Payment>('/payments', payload);
      return res.data;
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy payment for development
  const payment: Payment = {
    id: Date.now(),
    bookingId: payload.bookingId,
    amount: payload.amount,
    currency: payload.currency || 'USD',
    paymentMethod: payload.paymentMethod,
    status: 'COMPLETED',
    referenceNumber: payload.referenceNumber,
    notes: payload.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      id: 1,
      name: 'Admin User',
    },
  };
  
  console.log('Created dummy payment:', payment);
  return payment;
};

export const getPaymentsByBooking = async (
  bookingId: number,
): Promise<Payment[]> => {
  // For development: always use dummy data
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.get<Payment[]>(`/bookings/${bookingId}/payments`);
      return res.data;
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy payments for development
  const payments = generateDummyPayments(bookingId);
  console.log(`Returning ${payments.length} dummy payments for booking ${bookingId}`);
  return payments;
};

export const getPaymentsByMemberId = async (
  memberId: number,
): Promise<Payment[]> => {
  // For development: always use dummy data
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.get<Payment[]>(`/members/${memberId}/payments`);
      return res.data;
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy payments - generate payments for bookings that include this member
  // In a real scenario, we'd query bookings by memberId first, then get payments
  const payments: Payment[] = [];
  const methods: PaymentMethod[] = ['CASH', 'CARD', 'CHECK', 'TRANSFER'];
  
  // Generate payments for bookings where memberId appears (simulate 5-15 bookings)
  const numBookings = 5 + (memberId % 10);
  
  for (let i = 0; i < numBookings; i++) {
    const bookingId = memberId * 100 + i;
    const numPayments = 1 + (i % 3); // 1-3 payments per booking
    
    for (let j = 0; j < numPayments; j++) {
      payments.push({
        id: bookingId * 100 + j,
        bookingId,
        amount: 30 + (j * 25) + (memberId % 100),
        currency: 'USD',
        paymentMethod: methods[j % methods.length],
        status: 'COMPLETED',
        referenceNumber: `REF-${bookingId}-${j + 1}`,
        notes: j === 0 ? 'Initial payment' : `Payment ${j + 1}`,
        createdAt: new Date(Date.now() - (i * 7 + j) * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - (i * 7 + j) * 86400000).toISOString(),
        createdBy: {
          id: 1,
          name: 'Admin User',
        },
      });
    }
  }
  
  // Sort by date descending
  payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  console.log(`Returning ${payments.length} dummy payments for member ${memberId}`);
  return payments;
};

