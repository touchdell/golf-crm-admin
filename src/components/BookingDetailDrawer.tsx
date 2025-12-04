import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { Close, Cancel, Payment, Add, Delete } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useBooking, useCancelBooking, useUpdateBooking } from '../hooks/useBooking';
import { usePaymentsByBooking } from '../hooks/usePayment';
import PaymentModal from './PaymentModal';
import { getPriceItems, type PriceItem } from '../services/priceService';
import { addBookingItem, removeBookingItem } from '../services/bookingService';
import type { BookingDetail } from '../services/bookingService';
import { Autocomplete, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

interface BookingDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  bookingId: number | null;
  onChanged?: () => void;
}

const BookingDetailDrawer: React.FC<BookingDetailDrawerProps> = ({
  open,
  onClose,
  bookingId,
  onChanged,
}) => {
  const { data: booking, isLoading, isError, refetch: refetchBooking } = useBooking(bookingId);
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = usePaymentsByBooking(bookingId);
  const cancelBookingMutation = useCancelBooking();
  const updateBookingMutation = useUpdateBooking();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [selectedPriceItem, setSelectedPriceItem] = useState<PriceItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [addingItem, setAddingItem] = useState(false);

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!bookingId) return;

    try {
      await cancelBookingMutation.mutateAsync({
        id: bookingId,
        reason: cancelReason.trim() || undefined,
      });
      setSnackbarMessage('Booking cancelled successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setCancelDialogOpen(false);
      setCancelReason('');
      onChanged?.();
      // Close drawer after successful cancellation
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setSnackbarMessage('Failed to cancel booking. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCancelDialogClose = () => {
    if (!cancelBookingMutation.isPending) {
      setCancelDialogOpen(false);
      setCancelReason('');
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handlePaymentSuccess = () => {
    refetchPayments();
    refetchBooking();
    onChanged?.();
    setSnackbarMessage('Payment recorded successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleRecordPaymentClick = () => {
    console.log('Record Payment button clicked');
    console.log('Outstanding amount:', outstandingAmount);
    console.log('Booking:', booking);
    setPaymentModalOpen(true);
  };

  // Calculate payment totals
  const totalCharges = booking?.totalAmount || 0;
  const totalPaid = payments?.reduce((sum, payment) => {
    return sum + (payment.status === 'COMPLETED' ? payment.amount : 0);
  }, 0) || 0;
  const outstandingAmount = totalCharges - totalPaid;

  const canCancel =
    booking &&
    booking.status !== 'CANCELLED' &&
    booking.status !== 'COMPLETED';

  // Load price items when drawer opens
  useEffect(() => {
    if (open) {
      loadPriceItems();
    }
  }, [open]);

  const loadPriceItems = async () => {
    try {
      const items = await getPriceItems();
      // Filter only active items
      setPriceItems(items.filter(item => item.isActive));
    } catch (error) {
      console.error('Error loading price items:', error);
    }
  };

  const handleAddItem = async () => {
    if (!bookingId || !selectedPriceItem) return;

    try {
      setAddingItem(true);
      await addBookingItem({
        bookingId,
        priceItemId: selectedPriceItem.id,
        quantity,
      });
      setSnackbarMessage('Product added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setSelectedPriceItem(null);
      setQuantity(1);
      refetchBooking();
      onChanged?.();
    } catch (error: any) {
      setSnackbarMessage(error?.message || 'Failed to add product');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setAddingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!bookingId) return;

    if (!window.confirm('Are you sure you want to remove this item?')) {
      return;
    }

    try {
      await removeBookingItem(itemId, bookingId);
      setSnackbarMessage('Product removed successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      refetchBooking();
      onChanged?.();
    } catch (error: any) {
      setSnackbarMessage(error?.message || 'Failed to remove product');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Debug logging
  useEffect(() => {
    if (booking) {
      console.log('BookingDetailDrawer - Booking:', booking.id);
      console.log('Total charges:', totalCharges);
      console.log('Total paid:', totalPaid);
      console.log('Outstanding:', outstandingAmount);
      console.log('Can cancel:', canCancel);
      console.log('Payment modal open:', paymentModalOpen);
    }
  }, [booking, totalCharges, totalPaid, outstandingAmount, canCancel, paymentModalOpen]);

  const getStatusColor = (status?: BookingDetail['status']) => {
    switch (status) {
      case 'BOOKED':
        return 'primary';
      case 'CHECKED_IN':
        return 'success';
      case 'CANCELLED':
        return 'error';
      case 'COMPLETED':
        return 'info';
      case 'NO_SHOW':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return `$${amount.toFixed(2)}`;
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 500,
            maxWidth: '90vw',
          },
        }}
        ModalProps={{
          keepMounted: false,
        }}
      >
        <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Booking Details</Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Loading State */}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <CircularProgress />
            </Box>
          )}

          {/* Error State */}
          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error loading booking details. Please try again.
              <Button onClick={() => refetchBooking()} sx={{ mt: 1 }} size="small">
                Retry
              </Button>
            </Alert>
          )}

          {/* No Booking State */}
          {!isLoading && !isError && !booking && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No booking data available.
            </Alert>
          )}

          {/* Booking Details */}
          {!isLoading && !isError && booking && (
            <>
              {/* Booking Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Booking ID
                </Typography>
                <Typography variant="body1" gutterBottom>
                  #{booking.id}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Chip
                    label={booking.status}
                    size="small"
                    color={getStatusColor(booking.status)}
                  />
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Change Status</InputLabel>
                    <Select
                      value={booking.status}
                      label="Change Status"
                      onChange={async (e) => {
                        const newStatus = e.target.value as BookingDetail['status'];
                        if (!bookingId || newStatus === booking.status) return;
                        
                        try {
                          await updateBookingMutation.mutateAsync({
                            id: bookingId,
                            payload: { status: newStatus },
                          });
                          setSnackbarMessage(`Booking status updated to ${newStatus} successfully!`);
                          setSnackbarSeverity('success');
                          setSnackbarOpen(true);
                          refetchBooking();
                          onChanged?.();
                        } catch (error) {
                          setSnackbarMessage('Failed to update booking status. Please try again.');
                          setSnackbarSeverity('error');
                          setSnackbarOpen(true);
                        }
                      }}
                      disabled={updateBookingMutation.isPending || cancelBookingMutation.isPending}
                    >
                      <MenuItem value="BOOKED">Booked</MenuItem>
                      <MenuItem value="CHECKED_IN">Checked In</MenuItem>
                      <MenuItem value="COMPLETED">Completed</MenuItem>
                      <MenuItem value="NO_SHOW">No Show</MenuItem>
                      <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Created At
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {dayjs(booking.createdAt).format('MMM D, YYYY h:mm A')}
                </Typography>

                {booking.updatedAt !== booking.createdAt && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                      Last Updated
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      {dayjs(booking.updatedAt).format('MMM D, YYYY h:mm A')}
                    </Typography>
                  </>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Tee Time Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Tee Time
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Date: {dayjs(booking.teeTime.date).format('MMMM D, YYYY')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Time: {booking.teeTime.startTime} - {booking.teeTime.endTime}
                  </Typography>
                  {booking.teeTime.courseName && (
                    <Typography variant="body2" color="text.secondary">
                      Course: {booking.teeTime.courseName}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Max Players: {booking.teeTime.maxPlayers}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Players */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Players ({booking.players.length})
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {booking.players.map((player, index) => (
                    <Box key={player.memberId} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {index + 1}. {player.memberName} ({player.memberCode})
                        {player.isMainPlayer && (
                          <Chip label="Main" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Notes */}
              {booking.notes && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                      {booking.notes}
                    </Typography>
                  </Box>
                </>
              )}

              {/* Charges/Products */}
              <Divider sx={{ my: 3 }} />
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Products & Charges
                </Typography>

                {/* Add Product Section */}
                {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Add Product/Service
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <Autocomplete
                        options={priceItems}
                        getOptionLabel={(option) => `${option.name} - ${formatCurrency(option.unitPrice)}`}
                        value={selectedPriceItem}
                        onChange={(_, newValue) => setSelectedPriceItem(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Product"
                            size="small"
                            sx={{ flex: '1 1 200px', minWidth: 200 }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            <Box>
                              <Typography variant="body2">{option.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.code} • {formatCurrency(option.unitPrice)}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      />
                      <TextField
                        label="Quantity"
                        type="number"
                        size="small"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        inputProps={{ min: 1 }}
                        sx={{ width: 100 }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleAddItem}
                        disabled={!selectedPriceItem || addingItem}
                        startIcon={addingItem ? <CircularProgress size={16} /> : <Add />}
                      >
                        {addingItem ? 'Adding...' : 'Add'}
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Charges List */}
                {booking.charges && booking.charges.length > 0 ? (
                  <Box sx={{ pl: 2 }}>
                    {booking.charges.map((charge) => (
                      <Box
                        key={charge.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                          p: 1,
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <Box>
                          <Typography variant="body2">{charge.description}</Typography>
                          {charge.quantity && charge.quantity > 1 && charge.unitPrice && (
                            <Typography variant="caption" color="text.secondary">
                              {charge.quantity} × {formatCurrency(charge.unitPrice)}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {charge.type === 'REFUND' ? '-' : ''}
                            {formatCurrency(charge.amount)}
                          </Typography>
                          {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveItem(charge.id)}
                              sx={{ ml: 1 }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    ))}
                    {booking.totalAmount !== undefined && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontWeight: 'bold',
                          }}
                        >
                          <Typography variant="body1">Total</Typography>
                          <Typography variant="body1">
                            {formatCurrency(booking.totalAmount)}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No products/charges added yet
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Payment Summary */}
              <Divider sx={{ my: 3 }} />
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Payment Summary
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">Total Charges:</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(totalCharges)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">Total Paid:</Typography>
                    <Typography variant="body2" color="success.main" fontWeight="medium">
                      {formatCurrency(totalPaid)}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 'bold',
                    }}
                  >
                    <Typography variant="body1">Outstanding:</Typography>
                    <Typography
                      variant="body1"
                      color={outstandingAmount > 0 ? 'error.main' : 'success.main'}
                    >
                      {formatCurrency(outstandingAmount)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Payments List */}
              {paymentsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {!paymentsLoading && payments && payments.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Payments ({payments.length})
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      {payments.map((payment) => (
                        <Box
                          key={payment.id}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2,
                            p: 1,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                          }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(payment.amount)} {payment.currency}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {payment.paymentMethod} • {dayjs(payment.createdAt).format('MMM D, YYYY')}
                            </Typography>
                            {payment.referenceNumber && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Ref: {payment.referenceNumber}
                              </Typography>
                            )}
                          </Box>
                          <Chip
                            label={payment.status}
                            size="small"
                            color={
                              payment.status === 'COMPLETED'
                                ? 'success'
                                : payment.status === 'FAILED'
                                  ? 'error'
                                  : 'default'
                            }
                          />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </>
              )}

              {/* Action Buttons */}
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Show Mark as Paid button if booking exists and not cancelled */}
                {booking && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Payment />}
                    onClick={handleRecordPaymentClick}
                    fullWidth
                    disabled={updateBookingMutation.isPending || cancelBookingMutation.isPending}
                  >
                    {outstandingAmount > 0 
                      ? `Mark as Paid (${formatCurrency(outstandingAmount)} outstanding)`
                      : 'Record Payment'
                    }
                  </Button>
                )}
                {/* Show payment status if fully paid */}
                {booking && booking.paymentStatus === 'PAID' && outstandingAmount <= 0 && (
                  <Chip
                    label="PAID"
                    color="success"
                    sx={{ alignSelf: 'center' }}
                  />
                )}
                {canCancel && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={handleCancelClick}
                    fullWidth
                    disabled={updateBookingMutation.isPending || cancelBookingMutation.isPending}
                  >
                    Cancel Booking
                  </Button>
                )}
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={handleCancelDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to cancel this booking? This action cannot be undone.
          </Alert>
          <TextField
            label="Reason (optional)"
            multiline
            rows={3}
            fullWidth
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Enter cancellation reason..."
            disabled={cancelBookingMutation.isPending}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialogClose} disabled={cancelBookingMutation.isPending}>
            Keep Booking
          </Button>
          <Button
            onClick={handleCancelConfirm}
            variant="contained"
            color="error"
            disabled={cancelBookingMutation.isPending}
            startIcon={
              cancelBookingMutation.isPending ? <CircularProgress size={16} /> : null
            }
          >
            {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        booking={booking || null}
        outstandingAmount={outstandingAmount}
        onSuccess={handlePaymentSuccess}
      />

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BookingDetailDrawer;

