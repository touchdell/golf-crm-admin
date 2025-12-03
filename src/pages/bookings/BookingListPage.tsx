import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useBookings } from '../../hooks/useBooking';
import type { BookingListItem } from '../../services/bookingService';
import BookingDetailDrawer from '../../components/BookingDetailDrawer';

const BookingListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [status, setStatus] = useState<BookingListItem['status'] | ''>('');
  const [search, setSearch] = useState<string>('');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useBookings({
    page,
    pageSize,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: (status as BookingListItem['status']) || undefined,
    search: search || undefined,
  });

  // Debug logging (remove in production)
  useEffect(() => {
    if (data) {
      console.log('Bookings data:', data);
    }
    if (error) {
      console.error('Bookings error:', error);
    }
  }, [data, error]);

  const handleRowClick = (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedBookingId(null);
  };

  const handleBookingChanged = () => {
    refetch();
  };

  const getStatusColor = (status: BookingListItem['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warning';
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
    <Box>
      <Typography variant="h5" gutterBottom>
        Bookings
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            size="small"
            label="Search"
            placeholder="Member name or booking ID"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 200 }}
          />

          <TextField
            size="small"
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => {
                setStatus(e.target.value as BookingListItem['status'] | '');
                setPage(1);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="CONFIRMED">Confirmed</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
              <MenuItem value="NO_SHOW">No Show</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">
              Error loading bookings. Please try again.
              {error && <Box sx={{ mt: 1, fontSize: '0.875rem' }}>{String(error)}</Box>}
            </Alert>
          </Box>
        )}

        {!isLoading && !isError && (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Member</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!data || !data.items || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {!data ? 'No booking data available.' : 'No bookings found matching your criteria.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((booking) => (
                    <TableRow
                      key={booking.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(booking.id)}
                    >
                      <TableCell>
                        {booking.teeTimeDate
                          ? dayjs(booking.teeTimeDate).format('MMM D, YYYY')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {booking.teeTimeStartTime && booking.teeTimeEndTime
                          ? `${booking.teeTimeStartTime} - ${booking.teeTimeEndTime}`
                          : '-'}
                      </TableCell>
                      <TableCell>{booking.mainMemberName || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={booking.status}
                          size="small"
                          color={getStatusColor(booking.status)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(booking.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data && data.total > pageSize && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <Pagination
                  count={Math.ceil(data.total / pageSize)}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </TableContainer>

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        bookingId={selectedBookingId}
        onChanged={handleBookingChanged}
      />
    </Box>
  );
};

export default BookingListPage;

