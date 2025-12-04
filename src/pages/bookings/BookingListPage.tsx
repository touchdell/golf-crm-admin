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
  Snackbar,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useBookings, useUpdateBooking } from '../../hooks/useBooking';
import { getActiveCourses, type Course } from '../../services/courseService';
import type { BookingListItem } from '../../services/bookingService';
import BookingDetailDrawer from '../../components/BookingDetailDrawer';

const BookingListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [status, setStatus] = useState<BookingListItem['status'] | ''>('');
  const [courseId, setCourseId] = useState<number | ''>('');
  const [search, setSearch] = useState<string>('');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const updateBookingMutation = useUpdateBooking();

  // Load courses on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        const activeCourses = await getActiveCourses();
        setCourses(activeCourses);
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };
    loadCourses();
  }, []);

  const { data, isLoading, isError, error, refetch } = useBookings({
    page,
    pageSize,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: (status as BookingListItem['status']) || undefined,
    courseId: courseId ? Number(courseId) : undefined,
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
              <MenuItem value="BOOKED">Booked</MenuItem>
              <MenuItem value="CHECKED_IN">Checked In</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
              <MenuItem value="NO_SHOW">No Show</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Course</InputLabel>
            <Select
              value={courseId}
              label="Course"
              onChange={(e) => {
                setCourseId(e.target.value as number | '');
                setPage(1);
              }}
              disabled={loadingCourses}
            >
              <MenuItem value="">All Courses</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name} ({course.code})
                </MenuItem>
              ))}
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
                  <TableCell>Course</TableCell>
                  <TableCell>Member</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!data || !data.items || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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
                        {booking.teeTimeStartTime
                          ? booking.teeTimeEndTime
                            ? `${booking.teeTimeStartTime} - ${booking.teeTimeEndTime}`
                            : booking.teeTimeStartTime
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {booking.courseName ? (
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {booking.courseName}
                            </Typography>
                            {booking.courseCode && (
                              <Typography variant="caption" color="text.secondary">
                                {booking.courseCode}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{booking.mainMemberName || '-'}</TableCell>
                      <TableCell>
                        <Select
                          value={booking.status || 'BOOKED'}
                          size="small"
                          sx={{ minWidth: 120 }}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            const newStatus = e.target.value as BookingListItem['status'];
                            if (newStatus === booking.status) return;
                            
                            try {
                              await updateBookingMutation.mutateAsync({
                                id: booking.id,
                                payload: { status: newStatus },
                              });
                              setSnackbarMessage(`Booking status updated to ${newStatus} successfully!`);
                              setSnackbarSeverity('success');
                              setSnackbarOpen(true);
                              refetch();
                            } catch (error) {
                              setSnackbarMessage('Failed to update booking status. Please try again.');
                              setSnackbarSeverity('error');
                              setSnackbarOpen(true);
                            }
                          }}
                          disabled={updateBookingMutation.isPending}
                          renderValue={(value) => {
                            const statusValue = value || booking.status || 'BOOKED';
                            return (
                              <Chip
                                label={statusValue}
                                size="small"
                                color={getStatusColor(statusValue as BookingListItem['status'])}
                                sx={{ height: 24 }}
                              />
                            );
                          }}
                        >
                          <MenuItem value="BOOKED">Booked</MenuItem>
                          <MenuItem value="CHECKED_IN">Checked In</MenuItem>
                          <MenuItem value="COMPLETED">Completed</MenuItem>
                          <MenuItem value="NO_SHOW">No Show</MenuItem>
                          <MenuItem value="CANCELLED">Cancelled</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={booking.paymentStatus || 'UNPAID'}
                          size="small"
                          color={booking.paymentStatus === 'PAID' ? 'success' : 'warning'}
                          variant={booking.paymentStatus === 'PAID' ? 'filled' : 'outlined'}
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

      {/* Snackbar for status update notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BookingListPage;

