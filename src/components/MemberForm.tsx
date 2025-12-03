import React, { useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useMembershipTypes } from '../hooks/useMembershipTypes';
import type { Member, CreateMemberRequest, UpdateMemberRequest } from '../services/memberService';

// Validation schema for create mode (memberCode not required)
const createValidationSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email address'),
  phone: yup.string(),
  address: yup.string(),
  membershipType: yup.string().required('Membership type is required'),
  membershipStatus: yup.string().required('Membership status is required'),
  startDate: yup.string(),
  endDate: yup.string(),
  notes: yup.string(),
});

// Validation schema for edit mode (memberCode required and read-only)
const editValidationSchema = yup.object({
  memberCode: yup.string().required('Member code is required'),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email address'),
  phone: yup.string(),
  address: yup.string(),
  membershipType: yup.string().required('Membership type is required'),
  membershipStatus: yup.string().required('Membership status is required'),
  startDate: yup.string(),
  endDate: yup.string(),
  notes: yup.string(),
});

interface MemberFormProps {
  member?: Member;
  onSubmit: (values: CreateMemberRequest | UpdateMemberRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const MEMBERSHIP_STATUSES = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING'];

const MemberForm: React.FC<MemberFormProps> = ({
  member,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
}) => {
  const { data: membershipTypes, isLoading: typesLoading } = useMembershipTypes();

  const isEditMode = !!member;
  
  const formik = useFormik<CreateMemberRequest>({
    initialValues: {
      memberCode: member?.memberCode || '',
      firstName: member?.firstName || '',
      lastName: member?.lastName || '',
      phone: member?.phone || '',
      email: member?.email || '',
      address: member?.address || '',
      membershipType: member?.membershipType || '',
      membershipStatus: member?.membershipStatus || 'ACTIVE',
      startDate: member?.startDate || '',
      endDate: member?.endDate || '',
      notes: member?.notes || '',
    },
    validationSchema: isEditMode ? editValidationSchema : createValidationSchema,
    onSubmit: async (values) => {
      // Remove memberCode from create requests (will be auto-generated)
      if (!isEditMode) {
        const { memberCode, ...createValues } = values;
        await onSubmit(createValues);
      } else {
        await onSubmit(values);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => {}}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {/* Member Code - only shown in edit mode, read-only */}
          {isEditMode && (
            <TextField
              fullWidth
              id="memberCode"
              name="memberCode"
              label="Member Code"
              value={formik.values.memberCode}
              disabled
              sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}
              helperText="Member code is auto-generated and cannot be changed"
            />
          )}

          <TextField
            fullWidth
            id="firstName"
            name="firstName"
            label="First Name"
            value={formik.values.firstName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.firstName && Boolean(formik.errors.firstName)}
            helperText={formik.touched.firstName && formik.errors.firstName}
            required
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}
          />

          <TextField
            fullWidth
            id="lastName"
            name="lastName"
            label="Last Name"
            value={formik.values.lastName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.lastName && Boolean(formik.errors.lastName)}
            helperText={formik.touched.lastName && formik.errors.lastName}
            required
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}
          />

          <TextField
            fullWidth
            id="phone"
            name="phone"
            label="Phone"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.phone && Boolean(formik.errors.phone)}
            helperText={formik.touched.phone && formik.errors.phone}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}
          />

          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}
          />

          <TextField
            fullWidth
            id="address"
            name="address"
            label="Address"
            multiline
            rows={2}
            value={formik.values.address}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.address && Boolean(formik.errors.address)}
            helperText={formik.touched.address && formik.errors.address}
            sx={{ flex: { xs: '1 1 100%' } }}
          />

          <TextField
            fullWidth
            select
            id="membershipType"
            name="membershipType"
            label="Membership Type"
            value={formik.values.membershipType}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.membershipType && Boolean(formik.errors.membershipType)}
            helperText={formik.touched.membershipType && formik.errors.membershipType}
            required
            disabled={typesLoading}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}
          >
            {membershipTypes?.map((type) => (
              <MenuItem key={type.id} value={type.code}>
                {type.name}
              </MenuItem>
            ))}
            {/* Fallback for existing members with old membership types */}
            {member && !membershipTypes?.some((type) => type.code === member.membershipType) && (
              <MenuItem value={member.membershipType}>
                {member.membershipType}
              </MenuItem>
            )}
          </TextField>

          <TextField
            fullWidth
            select
            id="membershipStatus"
            name="membershipStatus"
            label="Membership Status"
            value={formik.values.membershipStatus}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.membershipStatus && Boolean(formik.errors.membershipStatus)}
            helperText={formik.touched.membershipStatus && formik.errors.membershipStatus}
            required
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}
          >
            {MEMBERSHIP_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            id="startDate"
            name="startDate"
            label="Start Date"
            type="date"
            value={formik.values.startDate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.startDate && Boolean(formik.errors.startDate)}
            helperText={formik.touched.startDate && formik.errors.startDate}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}
          />

          <TextField
            fullWidth
            id="endDate"
            name="endDate"
            label="End Date"
            type="date"
            value={formik.values.endDate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.endDate && Boolean(formik.errors.endDate)}
            helperText={formik.touched.endDate && formik.errors.endDate}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}
          />

          <TextField
            fullWidth
            id="notes"
            name="notes"
            label="Notes"
            multiline
            rows={3}
            value={formik.values.notes}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.notes && Boolean(formik.errors.notes)}
            helperText={formik.touched.notes && formik.errors.notes}
            sx={{ flex: { xs: '1 1 100%' } }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !formik.isValid}
          >
            {isLoading ? <CircularProgress size={24} /> : member ? 'Update' : 'Create'}
          </Button>
        </Box>
      </Box>
    </form>
  );
};

export default MemberForm;

