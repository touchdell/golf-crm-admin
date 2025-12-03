import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  People,
  CalendarToday,
  AttachMoney,
  GolfCourse,
  Event,
  PersonAdd,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useSummaryReport, useDailyBookings } from '../../hooks/useReports';
import dayjs from 'dayjs';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const today = dayjs().format('YYYY-MM-DD');
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
  const thirtyDaysAgo = dayjs().subtract(30, 'days').format('YYYY-MM-DD');

  // Fetch today's summary
  const { data: todayReport, isLoading: todayLoading, isError: todayError } = useSummaryReport(today, today);
  
  // Fetch last 30 days summary
  const { data: monthlyReport, isLoading: monthlyLoading, isError: monthlyError } = useSummaryReport(startOfMonth, today);
  
  // Fetch daily bookings for chart (last 30 days)
  const { data: dailyBookingsData, isLoading: chartLoading } = useDailyBookings(thirtyDaysAgo, today);

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('MMM D');
  };

  // Prepare chart data
  const chartData = dailyBookingsData?.items.map((item) => ({
    date: formatDate(item.date),
    fullDate: item.date,
    bookings: item.bookings,
    revenue: item.revenue,
  })) || [];

  const isLoading = todayLoading || monthlyLoading || chartLoading;
  const isError = todayError || monthlyError;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !todayReport || !monthlyReport) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Dashboard
        </Typography>
        <Alert severity="error">Error loading dashboard data. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Dashboard
      </Typography>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Today's Bookings
                  </Typography>
                  <Typography variant="h4">{todayReport.todayBookings}</Typography>
                </Box>
                <CalendarToday sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Today's Revenue
                  </Typography>
                  <Typography variant="h4">{formatCurrency(todayReport.todayRevenue)}</Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Active Members
                  </Typography>
                  <Typography variant="h4">{todayReport.activeMembers}</Typography>
                </Box>
                <People sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' }, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    This Month's Revenue
                  </Typography>
                  <Typography variant="h4">{formatCurrency(monthlyReport.monthlyRevenue)}</Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Chart and Quick Actions Row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        {/* Trend Chart */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(66.666% - 12px)' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bookings Trend (Last 30 Days)
            </Typography>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name="Bookings"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 12px)' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<GolfCourse />}
                onClick={() => navigate('/tee-sheet')}
                fullWidth
                size="large"
              >
                Tee Sheet
              </Button>
              <Button
                variant="contained"
                startIcon={<Event />}
                onClick={() => navigate('/bookings')}
                fullWidth
                size="large"
                color="secondary"
              >
                Bookings
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/members')}
                fullWidth
                size="large"
                color="success"
              >
                Add Member
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Additional Stats */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Overall Statistics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Total Bookings</Typography>
                <Typography variant="h6">{monthlyReport.totalBookings}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Total Revenue</Typography>
                <Typography variant="h6">{formatCurrency(monthlyReport.totalRevenue)}</Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;
