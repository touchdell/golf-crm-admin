import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import MemberForm from '../../components/MemberForm';
import { useMember, useUpdateMember } from '../../hooks/useMembers';
import type { UpdateMemberRequest } from '../../services/memberService';

const EditMemberPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const memberId = id ? parseInt(id, 10) : null;
  const { data: member, isLoading: memberLoading, isError: memberError } = useMember(memberId);
  const updateMemberMutation = useUpdateMember();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: UpdateMemberRequest) => {
    if (!memberId) return;
    try {
      setError(null);
      await updateMemberMutation.mutateAsync({ id: memberId, data: values });
      navigate(`/members/${memberId}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to update member');
    }
  };

  const handleCancel = () => {
    if (memberId) {
      navigate(`/members/${memberId}`);
    } else {
      navigate('/members');
    }
  };

  if (memberLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (memberError || !member) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/members')} sx={{ mb: 2 }}>
          Back to Members
        </Button>
        <Alert severity="error">Member not found or error loading member data.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={handleCancel} sx={{ mr: 2 }}>
          Back to Member Detail
        </Button>
        <Typography variant="h5">Edit Member</Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <MemberForm
          member={member}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={updateMemberMutation.isPending}
          error={error}
        />
      </Paper>
    </Box>
  );
};

export default EditMemberPage;

