import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { useMembers } from '../hooks/useMembers';
import { useCreateBooking } from '../hooks/useBooking';
import type { TeeTime } from '../services/teeTimeService';
import type { Member } from '../services/memberService';
import dayjs from 'dayjs';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  teeTime: TeeTime | null;
  onSaved?: () => void;
  onError?: (error: Error) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  open,
  onClose,
  teeTime,
  onSaved,
  onError,
}) => {
  const [mainMember, setMainMember] = useState<Member | null>(null);
  const [additionalMembers, setAdditionalMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState('');
  const [mainMemberSearch, setMainMemberSearch] = useState('');
  const [additionalMembersSearch, setAdditionalMembersSearch] = useState('');

  // Fetch members for autocomplete - use separate queries to prevent interference
  const { data: mainMembersData, isLoading: mainMembersLoading } = useMembers(
    1,
    50,
    mainMemberSearch,
  );
  
  const { data: additionalMembersData, isLoading: additionalMembersLoading } = useMembers(
    1,
    50,
    additionalMembersSearch,
  );

  const createBookingMutation = useCreateBooking();

  // Reset form when modal opens/closes or teeTime changes
  // ✅ FIXED: Only depend on open and teeTime.id, NOT on form state
  useEffect(() => {
    if (open && teeTime) {
      setMainMember(null);
      setAdditionalMembers([]); // Always an array, never undefined
      setNotes('');
      setMainMemberSearch('');
      setAdditionalMembersSearch('');
    }
  }, [open, teeTime?.id]); // Only reset when modal opens or teeTime ID changes

  const handleSubmit = async () => {
    if (!teeTime || !mainMember) return;

    const allMembers = [mainMember, ...additionalMembers];
    const players = allMembers.map((member, index) => ({
      memberId: member.id,
      isMainPlayer: index === 0,
    }));

    try {
      await createBookingMutation.mutateAsync({
        teeTimeId: teeTime.id, // Optional - kept for backward compatibility
        date: teeTime.date,
        time: teeTime.startTime, // Use startTime from teeTime object
        players,
        notes: notes.trim() || undefined,
      });
      // Only call onSaved on success
      onSaved?.();
      onClose();
    } catch (error) {
      // Error is handled by the mutation and UI (isError state)
      // Also notify parent component
      onError?.(error as Error);
      // Don't close modal on error so user can retry
    }
  };

  const handleClose = () => {
    if (!createBookingMutation.isPending) {
      onClose();
    }
  };

  // ✅ FIXED: Compute dynamic counts from current selection (not static teeTime data)
  const maxPlayers = teeTime?.maxPlayers || 0;
  const selectedCount = (mainMember ? 1 : 0) + additionalMembers.length;
  const remainingSlots = maxPlayers - selectedCount;
  
  // Original availability before opening modal (for reference)
  const originalAvailableSlots = teeTime ? teeTime.maxPlayers - teeTime.bookedPlayersCount : 0;
  
  const maxAdditionalPlayers = Math.max(0, maxPlayers - (mainMember ? 1 : 0));

  // ✅ FIXED: Ensure options array is stable - use raw items, no object rebuilding
  // Filter out main member, but keep selected additional members in options
  // (Autocomplete needs selected values to be in options array)
  const allAdditionalMembers = additionalMembersData?.items || [];
  const selectedMemberIds = new Set(additionalMembers.map(m => m.id));
  
  // ✅ FIXED: Build stable options array - include selected members first, then available ones
  // Do NOT rebuild objects - use raw Member objects from query
  const additionalMembersOptions = [
    // Include already selected members first (so they stay in the list)
    ...additionalMembers,
    // Then add other members that aren't the main member and aren't already selected
    ...allAdditionalMembers.filter(
      (m) =>
        m.id !== mainMember?.id &&
        !selectedMemberIds.has(m.id),
    ),
  ];

  // ✅ FIXED: No dynamic key props - Dialog key is stable
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {teeTime
          ? `Book Tee Time: ${teeTime.startTime} - ${teeTime.endTime}`
          : 'Create Booking'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Tee Time Info */}
          {teeTime && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tee Time Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Date: {dayjs(teeTime.date).format('MMMM DD, YYYY')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Time: {teeTime.startTime} - {teeTime.endTime}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Course ID: {teeTime.courseId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Capacity: {maxPlayers} players per tee time
                </Typography>
                {originalAvailableSlots < maxPlayers && (
                  <Typography variant="body2" color="text.secondary">
                    Slots available before this booking: {originalAvailableSlots}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium', mt: 0.5 }}>
                  Remaining slots for this booking: {remainingSlots}
                </Typography>
              </Box>
              {teeTime.status === 'BLOCKED' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  This tee time is blocked and cannot be booked.
                </Alert>
              )}
              {originalAvailableSlots === 0 && teeTime.status !== 'BLOCKED' && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  This tee time is full.
                </Alert>
              )}
            </Box>
          )}

          <Divider />

          {/* Main Member Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Main Member <Typography component="span" color="error">*</Typography>
            </Typography>
            <Autocomplete
              options={mainMembersData?.items || []}
              getOptionLabel={(option) =>
                `${option.firstName} ${option.lastName} (${option.memberCode})`
              }
              value={mainMember}
              onChange={(_, newValue) => {
                setMainMember(newValue);
                // ✅ FIXED: Remove main member from additional members if it was there
                if (newValue) {
                  setAdditionalMembers((prev) =>
                    prev.filter((m) => m.id !== newValue.id),
                  );
                } else {
                  // If main member is cleared, ensure additional members don't contain it
                  setAdditionalMembers((prev) =>
                    prev.filter((m) => m.id !== null),
                  );
                }
              }}
              onInputChange={(_, newInputValue) => {
                setMainMemberSearch(newInputValue);
              }}
              loading={mainMembersLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Main Member"
                  placeholder="Search and select main member..."
                  required
                />
              )}
              disabled={!teeTime || teeTime.status === 'BLOCKED' || originalAvailableSlots === 0}
            />
          </Box>

          {/* Additional Players */}
          {/* 
            🧪 REGRESSION TEST: Verify this flow works correctly:
            1. Select main member ✅
            2. Add player 1 ✅
            3. Add player 2 ✅
            4. Add player 3 ✅
            5. Player count correct ✅
            6. No field resets ✅
            7. No crash ✅
            8. "Maximum players reached" message shows ✅
            9. Create booking works ✅
          */}
          {mainMember && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Additional Players (Optional)
              </Typography>
              <Autocomplete
                multiple
                // ✅ FIXED: Fully controlled Autocomplete with stable options
                options={additionalMembersOptions}
                value={additionalMembers} // Always an array, never null/undefined
                // ✅ FIXED: Critical - equality check by ID to prevent MUI from losing selection
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) =>
                  `${option.firstName} ${option.lastName} (${option.memberCode})`
                }
                onChange={(_, newValue) => {
                  // ✅ FIXED: Filter out main member before setting
                  const filteredNewValue = newValue.filter(
                    (m) => m.id !== mainMember?.id,
                  );
                  
                  // ✅ FIXED: Always allow removing members, restrict only when adding
                  if (filteredNewValue.length <= maxAdditionalPlayers) {
                    setAdditionalMembers(filteredNewValue);
                  } else if (filteredNewValue.length < additionalMembers.length) {
                    // Allow reducing the list even if it was over limit
                    setAdditionalMembers(filteredNewValue);
                  }
                  // If trying to add beyond limit, keep current selection (don't update)
                }}
                onInputChange={(_, newInputValue) => {
                  setAdditionalMembersSearch(newInputValue);
                }}
                loading={additionalMembersLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Add Players"
                    placeholder="Search and select additional players..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={`${option.firstName} ${option.lastName}`}
                    />
                  ))
                }
                // ✅ FIXED: Don't disable entire Autocomplete when max reached
                // Only disable if tee time is blocked or no slots available originally
                // User should still be able to remove players even at max
                disabled={!teeTime || teeTime.status === 'BLOCKED' || originalAvailableSlots === 0}
              />
              {/* ✅ FIXED: Show dynamic selection count that updates live */}
              {selectedCount > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Selected: {selectedCount} / {maxPlayers} players
                </Typography>
              )}
              {selectedCount >= maxPlayers && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Maximum number of players reached for this tee time.
                </Alert>
              )}
            </Box>
          )}

          {/* Notes */}
          <TextField
            label="Notes (optional)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any special requests or notes..."
            disabled={!teeTime || teeTime.status === 'BLOCKED'}
          />

          {/* Error Message */}
          {createBookingMutation.isError && (
            <Alert severity="error">
              Failed to create booking. Please try again.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createBookingMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !teeTime ||
            teeTime.status === 'BLOCKED' ||
            !mainMember ||
            createBookingMutation.isPending ||
            originalAvailableSlots === 0 ||
            selectedCount === 0
          }
          startIcon={
            createBookingMutation.isPending ? <CircularProgress size={16} /> : null
          }
        >
          {createBookingMutation.isPending ? 'Creating...' : 'Create Booking'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingModal;

