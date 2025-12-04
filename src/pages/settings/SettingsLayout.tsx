import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Box, Tabs, Tab, Paper } from '@mui/material';

const SettingsLayout: React.FC = () => {
  const location = useLocation();

  const getTabValue = () => {
    if (location.pathname.includes('/membership-types')) return 1;
    if (location.pathname.includes('/tee-times')) return 2;
    if (location.pathname.includes('/promotions')) return 3;
    if (location.pathname.includes('/courses')) return 4;
    return 0; // prices
  };

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={getTabValue()} aria-label="settings tabs">
          <Tab
            label="Prices"
            component={Link}
            to="/settings/prices"
            value={0}
          />
          <Tab
            label="Membership Types"
            component={Link}
            to="/settings/membership-types"
            value={1}
          />
          <Tab
            label="Tee Time Rules"
            component={Link}
            to="/settings/tee-times"
            value={2}
          />
          <Tab
            label="Promotions"
            component={Link}
            to="/settings/promotions"
            value={3}
          />
          <Tab
            label="Courses"
            component={Link}
            to="/settings/courses"
            value={4}
          />
        </Tabs>
      </Paper>
      <Outlet />
    </Box>
  );
};

export default SettingsLayout;

