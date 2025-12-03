import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTeeTimes } from '../../hooks/useTeeTimes';
import type { TeeTime } from '../../services/teeTimeService';
import BookingModal from '../../components/BookingModal';

const TeeSheetPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [courseId] = useState<number | undefined>(undefined); // extend later
  const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTime | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const { data: teeTimes, isLoading, isError, refetch } = useTeeTimes(
    selectedDate,
    courseId,
  );

  const handlePrevDay = () => {
    setSelectedDate((prev: string) => dayjs(prev).subtract(1, 'day').format('YYYY-MM-DD'));
  };

  const handleNextDay = () => {
    setSelectedDate((prev: string) => dayjs(prev).add(1, 'day').format('YYYY-MM-DD'));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const formatPlayers = (members?: { memberId: number; name: string }[]) => {
    if (!members || members.length === 0) return '-';
    if (members.length <= 2) return members.map((m) => m.name).join(', ');
    return `${members[0].name} +${members.length - 1}`;
  };

  const getStatusChip = (tt: TeeTime) => {
    if (tt.status === 'BLOCKED') {
      return <Chip label="Blocked" size="small" color="default" />;
    }

    const remaining = tt.maxPlayers - tt.bookedPlayersCount;

    if (remaining <= 0) {
      return <Chip label="Full" size="small" color="error" />;
    }

    if (tt.bookedPlayersCount === 0) {
      return <Chip label="Open" size="small" color="success" />;
    }

    return (
      <Chip
        label={`Partial (${remaining} left)`}
        size="small"
        color="warning"
      />
    );
  };

  const handleSlotClick = (teeTime: TeeTime) => {
    if (teeTime.status === 'BLOCKED') return;
    setSelectedTeeTime(teeTime);
    setIsBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedTeeTime(null);
  };

  const handleBookingSaved = async () => {
    // Refresh tee times after successful booking
    await refetch();
    setSnackbar({
      open: true,
      message: 'Booking created successfully!',
      severity: 'success',
    });
  };

  const handleBookingError = (error: Error) => {
    setSnackbar({
      open: true,
      message: error.message || 'Failed to create booking. Please try again.',
      severity: 'error',
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Tee Sheet
      </Typography>

      {/* Controls */}
      <Box
        mb={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        flexWrap="wrap"
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={handlePrevDay} size="small">
            <ArrowBack />
          </IconButton>
          <TextField
            type="date"
            size="small"
            value={selectedDate}
            onChange={handleDateChange}
          />
          <IconButton onClick={handleNextDay} size="small">
            <ArrowForward />
          </IconButton>
        </Box>

        {/* Later: course selector, filters */}
      </Box>

      <Paper>
        <Box p={2}>
          {isLoading && <Box>Loading tee times...</Box>}
          {isError && <Box>Error loading tee times.</Box>}

          {!isLoading && !isError && (!teeTimes || teeTimes.length === 0) && (
            <Box>No tee times configured for this date.</Box>
          )}

          {!isLoading && teeTimes && Array.isArray(teeTimes) && teeTimes.length > 0 && (
            <Box>
              {/* Header row */}
              <Box
                sx={{
                  display: 'flex',
                  fontWeight: 600,
                  mb: 1,
                  pb: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: '1 1 25%' }}>Time</Box>
                <Box sx={{ flex: '1 1 25%' }}>Status</Box>
                <Box sx={{ flex: '1 1 25%' }}>Players</Box>
                <Box sx={{ flex: '1 1 25%' }}>Notes</Box>
              </Box>

              {/* Slots */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {teeTimes.map((tt) => (
                  <Paper
                    key={tt.id}
                    variant="outlined"
                    sx={{
                      p: 1,
                      cursor: tt.status === 'BLOCKED' ? 'not-allowed' : 'pointer',
                      opacity: tt.status === 'BLOCKED' ? 0.6 : 1,
                      '&:hover': tt.status !== 'BLOCKED' ? { bgcolor: 'action.hover' } : {},
                    }}
                    onClick={() =>
                      tt.status !== 'BLOCKED' && handleSlotClick(tt)
                    }
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ flex: '1 1 25%' }}>
                        <Typography>
                          {tt.startTime} - {tt.endTime}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: '1 1 25%' }}>{getStatusChip(tt)}</Box>
                      <Box sx={{ flex: '1 1 25%' }}>
                        <Typography variant="body2">
                          {formatPlayers(tt.members)}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: '1 1 25%' }}>
                        {tt.bookingStatus && tt.bookingStatus !== 'CONFIRMED' && (
                          <Tooltip title={`Booking status: ${tt.bookingStatus}`}>
                            <Chip
                              label={tt.bookingStatus}
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      <BookingModal
        open={isBookingModalOpen}
        onClose={handleCloseBookingModal}
        teeTime={selectedTeeTime}
        onSaved={handleBookingSaved}
        onError={handleBookingError}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeeSheetPage;

