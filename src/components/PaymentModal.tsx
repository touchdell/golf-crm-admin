import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useCreatePayment } from '../hooks/usePayment';
import type { BookingDetail } from '../services/bookingService';
import type { PaymentMethod } from '../services/paymentService';
import dayjs from 'dayjs';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  booking: BookingDetail | null;
  outstandingAmount: number;
  onSuccess?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onClose,
  booking,
  outstandingAmount,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const createPaymentMutation = useCreatePayment();

  // Initialize amount with outstanding amount when modal opens
  useEffect(() => {
    console.log('PaymentModal - open:', open, 'outstandingAmount:', outstandingAmount);
    if (open && outstandingAmount > 0) {
      setAmount(outstandingAmount.toFixed(2));
    } else if (open) {
      setAmount('');
    }
  }, [open, outstandingAmount]);

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('PaymentModal opened');
      console.log('Booking:', booking);
      console.log('Outstanding amount:', outstandingAmount);
    }
  }, [open, booking, outstandingAmount]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setAmount('');
      setCurrency('USD');
      setPaymentMethod('CASH');
      setReferenceNumber('');
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!booking) return;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return;
    }

    try {
      await createPaymentMutation.mutateAsync({
        bookingId: booking.id,
        amount: paymentAmount,
        currency,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled by the mutation and UI (isError state)
      console.error('Payment creation error:', error);
    }
  };

  const handleClose = () => {
    console.log('PaymentModal - handleClose called');
    if (!createPaymentMutation.isPending) {
      onClose();
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const amountValue = parseFloat(amount) || 0;
  const isValid = amountValue > 0 && amountValue <= outstandingAmount + 0.01; // Allow small rounding differences

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record Payment</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Booking Summary */}
          {booking && (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Booking Summary
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2">
                    Booking #{booking.id} - {dayjs(booking.teeTime.date).format('MMM D, YYYY')} at{' '}
                    {booking.teeTime.startTime}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Charges: {formatCurrency(booking.totalAmount || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Outstanding: {formatCurrency(outstandingAmount)}
                  </Typography>
                </Box>
              </Box>
              <Divider />
            </>
          )}

          {/* Payment Form */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              required
              inputProps={{ min: 0, max: outstandingAmount, step: 0.01 }}
              error={amountValue > outstandingAmount}
              helperText={
                amountValue > outstandingAmount
                  ? `Amount cannot exceed outstanding balance of ${formatCurrency(outstandingAmount)}`
                  : ''
              }
              disabled={createPaymentMutation.isPending}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={currency}
                  label="Currency"
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={createPaymentMutation.isPending}
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  label="Payment Method"
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  disabled={createPaymentMutation.isPending}
                >
                  <MenuItem value="CASH">Cash</MenuItem>
                  <MenuItem value="CARD">Card</MenuItem>
                  <MenuItem value="CHECK">Check</MenuItem>
                  <MenuItem value="TRANSFER">Transfer</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Reference Number (optional)"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              fullWidth
              placeholder="e.g., Transaction ID, Check number"
              disabled={createPaymentMutation.isPending}
            />

            <TextField
              label="Notes (optional)"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              placeholder="Additional notes about this payment"
              disabled={createPaymentMutation.isPending}
            />
          </Box>

          {/* Error Message */}
          {createPaymentMutation.isError && (
            <Alert severity="error">
              Failed to record payment. Please try again.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createPaymentMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !booking ||
            !isValid ||
            createPaymentMutation.isPending ||
            outstandingAmount <= 0
          }
          startIcon={
            createPaymentMutation.isPending ? <CircularProgress size={16} /> : null
          }
        >
          {createPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentModal;

