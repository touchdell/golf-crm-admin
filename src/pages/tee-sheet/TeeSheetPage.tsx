import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { ArrowBack, ArrowForward, Delete as DeleteIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTeeTimes } from '../../hooks/useTeeTimes';
import { useCancelBooking } from '../../hooks/useBooking';
import { getActiveCourses, type Course } from '../../services/courseService';
import type { TeeTime } from '../../services/teeTimeService';
import type { Member } from '../../services/memberService';
import BookingModal from '../../components/BookingModal';
import MemberSelectionModal from '../../components/MemberSelectionModal';

const TeeSheetPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTime | null>(null);
  const [selectedMainMember, setSelectedMainMember] = useState<Member | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [isMemberSelectionModalOpen, setIsMemberSelectionModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isBookingsListDialogOpen, setIsBookingsListDialogOpen] = useState(false);
  const [bookingsToDelete, setBookingsToDelete] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  
  const cancelBookingMutation = useCancelBooking();

  // Load active courses on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        const activeCourses = await getActiveCourses();
        setCourses(activeCourses);
        // Auto-select first course if available and no course is selected
        if (activeCourses.length > 0 && selectedCourseId === null) {
          setSelectedCourseId(activeCourses[0].id);
        }
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const { data: teeTimes, isLoading, isError, refetch } = useTeeTimes(
    selectedDate,
    selectedCourseId || undefined,
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

  const hasDuplicateMainMembers = (teeTime: TeeTime | null | undefined): boolean => {
    if (!teeTime || !teeTime.bookings || teeTime.bookings.length < 2) return false;
    
    const mainMemberIds = teeTime.bookings
      .map((b) => b.mainMember?.memberId)
      .filter((id): id is number => id !== undefined && id !== null);
    
    const uniqueIds = new Set(mainMemberIds);
    return mainMemberIds.length !== uniqueIds.size;
  };

  const formatPlayers = (teeTime: TeeTime) => {
    // If no bookings, show empty
    if (!teeTime.bookings || teeTime.bookings.length === 0) {
      return '-';
    }

    // Format each booking: "Main Member (Code) (X players)" or "Main Member (Code) + X others"
    const bookingDisplays = teeTime.bookings.map((booking) => {
      if (!booking.mainMember) {
        // Use actual players array if available, otherwise fallback to playerCount
        const totalPlayers = booking.players?.length || booking.playerCount || 0;
        return `Booking #${booking.bookingId} (${totalPlayers} players)`;
      }

      const mainMemberName = booking.mainMember.name;
      const memberCode = booking.mainMember.memberCode || '';
      const codeDisplay = memberCode ? ` (${memberCode})` : '';
      
      // ✅ FIXED: Use actual players array if available (from booking_players table)
      // Otherwise fallback to playerCount from bookings table
      const totalPlayers = booking.players?.length || booking.playerCount || 0;

      if (totalPlayers === 1) {
        return `${mainMemberName}${codeDisplay} (1 player)`;
      } else if (totalPlayers === 2) {
        return `${mainMemberName}${codeDisplay} + 1 other`;
      } else {
        return `${mainMemberName}${codeDisplay} + ${totalPlayers - 1} others`;
      }
    });

    return bookingDisplays.join(' | ');
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

    // Check if there are multiple bookings - if so, show bookings list dialog
    if (teeTime.bookings && teeTime.bookings.length > 1) {
      setIsBookingsListDialogOpen(true);
      return;
    }

    // Check if there's exactly one booking - if so, open in edit mode
    if (teeTime.bookings && teeTime.bookings.length === 1) {
      const booking = teeTime.bookings[0];
      const primary = booking.mainMember;
      
      if (primary) {
        // Split name into first and last (best-effort)
        const nameParts = primary.name.split(' ');
        const firstName = nameParts[0] || primary.name;
        const lastName = nameParts.slice(1).join(' ') || '';

        const prefilledMember: Member = {
          id: primary.memberId,
          firstName,
          lastName,
          memberCode: primary.memberCode || '', // Use memberCode from booking if available
          membershipType: '',
          membershipStatus: 'ACTIVE',
        };

        setSelectedMainMember(prefilledMember);
        setSelectedBookingId(booking.bookingId); // Set booking ID for edit mode
        setIsBookingModalOpen(true);
        return;
      }
    }

    // If there are no bookings, use create mode
    // If there are members but no bookings, prefill with first member for creating new booking
    if (teeTime.members && teeTime.members.length > 0) {
      const primary = teeTime.members[0];
      // Split name into first and last (best-effort)
      const nameParts = primary.name.split(' ');
      const firstName = nameParts[0] || primary.name;
      const lastName = nameParts.slice(1).join(' ') || '';

      const prefilledMember: Member = {
        id: primary.memberId,
        firstName,
        lastName,
        memberCode: '', // Unknown here; can be filled by separate fetch if needed
        membershipType: '',
        membershipStatus: 'ACTIVE',
      };

      setSelectedMainMember(prefilledMember);
      setSelectedBookingId(null); // Clear booking ID for create mode
      setIsBookingModalOpen(true);
      return;
    }

    // For new bookings (no existing member), open member selection modal first
    setSelectedBookingId(null); // Clear booking ID
    setIsMemberSelectionModalOpen(true);
  };

  const handleMemberSelected = (member: Member) => {
    // Store the selected main member
    setSelectedMainMember(member);
    // Close member selection modal
    setIsMemberSelectionModalOpen(false);
    // Clear booking ID for new booking
    setSelectedBookingId(null);
    // Open booking modal with the fixed main member
    setIsBookingModalOpen(true);
  };

  const handleCloseMemberSelectionModal = () => {
    // Just close the member selection modal.
    // Do NOT clear selectedMainMember or selectedTeeTime here,
    // so that when a member is selected, the booking modal receives it correctly.
    setIsMemberSelectionModalOpen(false);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedTeeTime(null);
    setSelectedMainMember(null);
    setSelectedBookingId(null);
  };

  const handleBookingSaved = async () => {
    // Refresh tee times after successful booking
    await refetch();
    const isEdit = !!selectedBookingId;
    setSnackbar({
      open: true,
      message: isEdit ? 'Booking updated successfully!' : 'Booking created successfully!',
      severity: 'success',
    });
    // Reset selected member and booking ID after successful booking
    setSelectedMainMember(null);
    setSelectedBookingId(null);
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

  const handleDeleteBooking = async (bookingId: number) => {
    setBookingsToDelete(bookingId);
    try {
      await cancelBookingMutation.mutateAsync({
        id: bookingId,
        reason: 'Deleted from tee sheet',
      });
      setSnackbar({
        open: true,
        message: 'Booking deleted successfully!',
        severity: 'success',
      });
      await refetch();
      setBookingsToDelete(null);
      // If no more bookings, close the dialog
      if (selectedTeeTime && selectedTeeTime.bookings && selectedTeeTime.bookings.length <= 1) {
        setIsBookingsListDialogOpen(false);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete booking. Please try again.',
        severity: 'error',
      });
      setBookingsToDelete(null);
    }
  };

  const handleCloseBookingsListDialog = () => {
    setIsBookingsListDialogOpen(false);
    setSelectedTeeTime(null);
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
        <Box display="flex" alignItems="center" gap={2}>
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
          
          {/* Course Selection */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Course</InputLabel>
            <Select
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value as number)}
              label="Course"
              disabled={loadingCourses}
            >
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name} {course.holeCount ? `(${course.holeCount} holes)` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Course Info Display */}
      {selectedCourseId && courses.length > 0 && (
        <Box mb={2}>
          {(() => {
            const selectedCourse = courses.find(c => c.id === selectedCourseId);
            if (!selectedCourse) return null;
            return (
              <Paper sx={{ p: 1.5, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="subtitle2" fontWeight="medium">
                  {selectedCourse.name}
                  {selectedCourse.parTotal && ` • Par ${selectedCourse.parTotal}`}
                  {selectedCourse.yardageTotal && ` • ${selectedCourse.yardageTotal} yards`}
                </Typography>
                {selectedCourse.description && (
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
                    {selectedCourse.description}
                  </Typography>
                )}
              </Paper>
            );
          })()}
        </Box>
      )}

      <Paper>
        <Box p={2}>
          {loadingCourses && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Loading courses...</Typography>
            </Box>
          )}
          {!loadingCourses && courses.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No active courses found. Please add courses in Settings → Courses.
            </Alert>
          )}
          {!loadingCourses && courses.length > 0 && !selectedCourseId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Please select a course to view tee times.
            </Alert>
          )}
          {isLoading && selectedCourseId && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Loading tee times...</Typography>
            </Box>
          )}
          {isError && <Alert severity="error" sx={{ mb: 2 }}>Error loading tee times.</Alert>}

          {!isLoading && !isError && selectedCourseId && (!teeTimes || teeTimes.length === 0) && (
            <Box>No tee times configured for this date and course.</Box>
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
                        <Typography variant="body2" color={hasDuplicateMainMembers(tt) ? 'error' : 'inherit'}>
                          {formatPlayers(tt)}
                        </Typography>
                        {hasDuplicateMainMembers(tt) && (
                          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                            ⚠️ Duplicate main members detected
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ flex: '1 1 25%' }}>
                        {tt.bookingStatus && tt.bookingStatus !== 'BOOKED' && (
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

      {/* Member Selection Modal - Opens first when slot is clicked */}
      <MemberSelectionModal
        open={isMemberSelectionModalOpen}
        onClose={handleCloseMemberSelectionModal}
        onMemberSelected={handleMemberSelected}
        title="Select Main Member for Booking"
        excludedMemberIds={selectedTeeTime?.allMainMemberIds ?? []}
      />

      {/* Booking Modal - Opens after member is selected or when editing existing booking */}
      <BookingModal
        open={isBookingModalOpen && !!selectedMainMember}
        onClose={handleCloseBookingModal}
        teeTime={selectedTeeTime}
        mainMember={selectedMainMember}
        bookingId={selectedBookingId} // Pass booking ID for edit mode
        // Pass all already-booked member IDs for this tee time so they
        // cannot be added again to the same group (same slot).
        existingMemberIds={
          // ✅ FIXED: Include ALL main member IDs from ALL bookings in this slot
          // This prevents adding a member who is already a main member in another booking
          // In edit mode, exclude current booking's players from this list
          selectedTeeTime?.allMainMemberIds?.filter(id => {
            // If editing, exclude current booking's main member from exclusion list
            if (selectedBookingId && selectedTeeTime?.bookings) {
              const currentBooking = selectedTeeTime.bookings.find(b => b.bookingId === selectedBookingId);
              return currentBooking?.mainMember?.memberId !== id;
            }
            return true;
          }) ?? []
        }
        onSaved={handleBookingSaved}
        onError={handleBookingError}
      />

      {/* Bookings List Dialog - Shows when multiple bookings exist */}
      <Dialog
        open={isBookingsListDialogOpen}
        onClose={handleCloseBookingsListDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box>
            <Typography variant="h6">
              Bookings for {selectedTeeTime?.startTime} - {selectedTeeTime?.endTime}
            </Typography>
            {selectedCourseId && courses.length > 0 && (() => {
              const selectedCourse = courses.find(c => c.id === selectedCourseId);
              return selectedCourse ? (
                <Typography variant="caption" color="text.secondary">
                  Course: {selectedCourse.name} ({selectedCourse.code})
                </Typography>
              ) : null;
            })()}
            {selectedTeeTime && hasDuplicateMainMembers(selectedTeeTime) && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                ⚠️ Duplicate main members detected
              </Alert>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTeeTime?.bookings && selectedTeeTime.bookings.length > 0 ? (
            <List>
              {selectedTeeTime.bookings.map((booking) => {
                const totalPlayers = booking.players?.length || booking.playerCount || 0;
                const mainMemberName = booking.mainMember?.name || 'Unknown';
                const memberCode = booking.mainMember?.memberCode || '';
                const codeDisplay = memberCode ? ` (${memberCode})` : '';
                
                return (
                  <ListItem
                    key={booking.bookingId}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: 'background.paper',
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleDeleteBooking(booking.bookingId)}
                        disabled={cancelBookingMutation.isPending && bookingsToDelete === booking.bookingId}
                      >
                        {cancelBookingMutation.isPending && bookingsToDelete === booking.bookingId ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="medium">
                          {mainMemberName}{codeDisplay}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Booking #{booking.bookingId} • {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'}
                          </Typography>
                          <Chip
                            label={booking.bookingStatus}
                            size="small"
                            color={
                              booking.bookingStatus === 'BOOKED'
                                ? 'primary'
                                : booking.bookingStatus === 'CHECKED_IN'
                                ? 'success'
                                : 'default'
                            }
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Typography>No bookings found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBookingsListDialog}>Close</Button>
        </DialogActions>
      </Dialog>

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

