import React, { useState } from 'react';
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
} from '@mui/material';
import { useMembers } from '../hooks/useMembers';
import type { Member } from '../services/memberService';

interface MemberSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onMemberSelected: (member: Member) => void;
  title?: string;
  excludedMemberIds?: number[]; // Members to exclude from selection (e.g., already main members in this slot)
}

const MemberSelectionModal: React.FC<MemberSelectionModalProps> = ({
  open,
  onClose,
  onMemberSelected,
  title = 'Select Main Member',
  excludedMemberIds = [],
}) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [search, setSearch] = useState('');

  const { data: membersData, isLoading } = useMembers(1, 50, search);
  
  // ✅ FIXED: Filter out members who are already main members in this slot
  const excludedSet = new Set(excludedMemberIds || []);
  const availableMembers = (membersData?.items || []).filter(
    (member) => !excludedSet.has(member.id)
  );
  
  // ✅ NEW: Check if selected member is excluded (shouldn't happen, but safety check)
  const isSelectedMemberExcluded = selectedMember && excludedSet.has(selectedMember.id);

  const handleSubmit = () => {
    if (selectedMember) {
      onMemberSelected(selectedMember);
      setSelectedMember(null);
      setSearch('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedMember(null);
    setSearch('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Please select the main member for this booking. This member will be the booking owner and cannot be changed later.
          </Typography>

          {excludedMemberIds && excludedMemberIds.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              Note: {excludedMemberIds.length} member(s) already booked as main members in this slot are excluded.
            </Typography>
          )}
          
          {isSelectedMemberExcluded && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              ⚠️ This member is already a main member in another booking for this slot. Please select a different member.
            </Typography>
          )}
          
          <Autocomplete
            options={availableMembers}
            getOptionLabel={(option) => {
              const isExcluded = excludedSet.has(option.id);
              return `${option.firstName} ${option.lastName} (${option.memberCode})${isExcluded ? ' - Already booked' : ''}`;
            }}
            value={selectedMember}
            onChange={(_, newValue) => {
              // ✅ NEW: Prevent selecting excluded members
              if (newValue && excludedSet.has(newValue.id)) {
                console.warn('Cannot select member:', newValue.id, 'already excluded');
                return; // Don't update selection
              }
              setSelectedMember(newValue);
            }}
            getOptionDisabled={(option: Member) => excludedSet.has(option.id)}
            onInputChange={(_, newInputValue) => {
              setSearch(newInputValue);
            }}
            loading={isLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Member"
                placeholder="Search by name or member code..."
                required
              />
            )}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedMember || (isSelectedMemberExcluded ?? false)}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberSelectionModal;

