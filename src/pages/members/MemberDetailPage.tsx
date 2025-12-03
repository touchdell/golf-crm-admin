import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { ArrowBack, Edit, Block } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useMember, useUpdateMemberStatus } from '../../hooks/useMembers';
import { useBookingsByMember } from '../../hooks/useBooking';
import { usePaymentsByMember } from '../../hooks/usePayment';
import type { BookingListItem } from '../../services/bookingService';

const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const memberId = id ? parseInt(id, 10) : null;

  const { data: member, isLoading: memberLoading, isError: memberError } = useMember(memberId);
  const { data: bookingsData, isLoading: bookingsLoading } = useBookingsByMember(memberId);
  const { data: payments, isLoading: paymentsLoading } = usePaymentsByMember(memberId);
  const updateStatusMutation = useUpdateMemberStatus();

  const handleBack = () => {
    navigate('/members');
  };

  const handleEdit = () => {
    if (memberId) {
      navigate(`/members/${memberId}/edit`);
    }
  };

  const handleDeactivate = async () => {
    if (!memberId || !window.confirm('Are you sure you want to deactivate this member?')) {
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({ id: memberId, status: 'SUSPENDED' });
    } catch (error) {
      console.error('Failed to deactivate member:', error);
      alert('Failed to deactivate member. Please try again.');
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return `$${amount.toFixed(2)}`;
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

  // Calculate stats
  const totalRounds = bookingsData?.items.filter(b => 
    b.status === 'COMPLETED' || b.status === 'CONFIRMED'
  ).length || 0;

  const lastVisit = bookingsData?.items
    .filter(b => b.status === 'COMPLETED' || b.status === 'CONFIRMED')
    .sort((a, b) => {
      const dateA = a.teeTimeDate || '';
      const dateB = b.teeTimeDate || '';
      return dateB.localeCompare(dateA);
    })[0]?.teeTimeDate;

  const totalRevenue = payments?.reduce((sum, payment) => {
    return sum + (payment.status === 'COMPLETED' ? payment.amount : 0);
  }, 0) || 0;

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
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 2 }}>
          Back to Members
        </Button>
        <Alert severity="error">Member not found or error loading member data.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mr: 2 }}>
            Back to Members
          </Button>
          <Typography variant="h5">
            {member.firstName} {member.lastName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEdit}
          >
            Edit
          </Button>
          {member.membershipStatus === 'ACTIVE' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Block />}
              onClick={handleDeactivate}
              disabled={updateStatusMutation.isPending}
            >
              Deactivate
            </Button>
          )}
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(25% - 12px)' }, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Rounds
              </Typography>
              <Typography variant="h4">{totalRounds}</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(25% - 12px)' }, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Last Visit
              </Typography>
              <Typography variant="h4">
                {lastVisit ? dayjs(lastVisit).format('MMM D, YYYY') : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(25% - 12px)' }, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Revenue
              </Typography>
              <Typography variant="h4">{formatCurrency(totalRevenue)}</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(25% - 12px)' }, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Membership Status
              </Typography>
              <Chip
                label={member.membershipStatus}
                color={member.membershipStatus === 'ACTIVE' ? 'success' : 'default'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Member Profile */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Member Profile
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
            <Typography variant="body2" color="text.secondary">
              Member Code
            </Typography>
            <Typography variant="body1" gutterBottom>
              {member.memberCode}
            </Typography>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
            <Typography variant="body2" color="text.secondary">
              Membership Type
            </Typography>
            <Typography variant="body1" gutterBottom>
              {member.membershipType}
            </Typography>
          </Box>
          {member.email && (
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
              <Typography variant="body2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1" gutterBottom>
                {member.email}
              </Typography>
            </Box>
          )}
          {member.phone && (
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
              <Typography variant="body2" color="text.secondary">
                Phone
              </Typography>
              <Typography variant="body1" gutterBottom>
                {member.phone}
              </Typography>
            </Box>
          )}
          {member.startDate && (
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
              <Typography variant="body2" color="text.secondary">
                Start Date
              </Typography>
              <Typography variant="body1" gutterBottom>
                {dayjs(member.startDate).format('MMM D, YYYY')}
              </Typography>
            </Box>
          )}
          {member.endDate && (
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
              <Typography variant="body2" color="text.secondary">
                End Date
              </Typography>
              <Typography variant="body1" gutterBottom>
                {dayjs(member.endDate).format('MMM D, YYYY')}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Booking History */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Booking History</Typography>
        </Box>
        <TableContainer>
          {bookingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : !bookingsData || bookingsData.items.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No bookings found.</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookingsData.items.map((booking) => (
                  <TableRow key={booking.id} hover>
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
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>

      {/* Payment History */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Payment History</Typography>
        </Box>
        <TableContainer>
          {paymentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : !payments || payments.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No payments found.</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>
                      {dayjs(payment.createdAt).format('MMM D, YYYY')}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(payment.amount)} {payment.currency}
                    </TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell>{payment.referenceNumber || '-'}</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default MemberDetailPage;

