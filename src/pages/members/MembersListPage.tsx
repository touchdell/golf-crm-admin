import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TablePagination,
  Chip,
  Button,
  MenuItem,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useMembers } from '../../hooks/useMembers';

const MembersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0); // 0-based for MUI
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data, isLoading, isError } = useMembers(page + 1, pageSize, search, statusFilter);

  const handleRowClick = (memberId: number) => {
    navigate(`/members/${memberId}`);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Members</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/members/new')}
        >
          Add Member
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="Search member"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 200 }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="EXPIRED">Expired</MenuItem>
          <MenuItem value="SUSPENDED">Suspended</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
        </TextField>
      </Box>

      <Paper>
        {isLoading && (
          <Box p={3} textAlign="center">
            Loading...
          </Box>
        )}
        {isError && (
          <Box p={3} textAlign="center" color="error">
            Error loading members
          </Box>
        )}

        {data && data.items && (
          <>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Period</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((m) => (
                      <TableRow
                        key={m.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(m.id)}
                      >
                        <TableCell>{m.memberCode}</TableCell>
                        <TableCell>
                          {m.firstName} {m.lastName}
                        </TableCell>
                        <TableCell>{m.phone || '-'}</TableCell>
                        <TableCell>{m.email || '-'}</TableCell>
                        <TableCell>{m.membershipType}</TableCell>
                        <TableCell>
                          <Chip
                            label={m.membershipStatus}
                            color={
                              m.membershipStatus === 'ACTIVE'
                                ? 'success'
                                : m.membershipStatus === 'EXPIRED'
                                ? 'warning'
                                : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {m.startDate || '-'} → {m.endDate || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {data.items.length > 0 && (
              <TablePagination
                component="div"
                count={data.total || 0}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={pageSize}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 20, 50]}
              />
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default MembersListPage;