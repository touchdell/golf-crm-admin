import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import MemberForm from '../../components/MemberForm';
import { useCreateMember } from '../../hooks/useMembers';
import type { CreateMemberRequest } from '../../services/memberService';

const CreateMemberPage: React.FC = () => {
  const navigate = useNavigate();
  const createMemberMutation = useCreateMember();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: CreateMemberRequest) => {
    try {
      setError(null);
      await createMemberMutation.mutateAsync(values);
      navigate('/members');
    } catch (err: any) {
      setError(err?.message || 'Failed to create member');
    }
  };

  const handleCancel = () => {
    navigate('/members');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={handleCancel} sx={{ mr: 2 }}>
          Back to Members
        </Button>
        <Typography variant="h5">Add New Member</Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <MemberForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createMemberMutation.isPending}
          error={error}
        />
      </Paper>
    </Box>
  );
};

export default CreateMemberPage;

