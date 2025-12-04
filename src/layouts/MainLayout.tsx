import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  IconButton,
} from '@mui/material';
import { Logout } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const drawerWidth = 220;

const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = (isAdmin: boolean) => {
    const items = [
      { label: t('navigation.dashboard'), path: '/dashboard' },
      { label: t('navigation.members'), path: '/members' },
      { label: t('navigation.teeSheet'), path: '/tee-sheet' },
      { label: t('navigation.bookings'), path: '/bookings' },
    ];
    
    if (isAdmin) {
      items.push({ label: t('navigation.settings'), path: '/settings/prices' });
    }
    
    return items;
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Top bar */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('common.appName')}
          </Typography>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LanguageSwitcher />
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {user.name}
              </Typography>
              <IconButton color="inherit" onClick={handleLogout} size="small">
                <Logout />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar /> {/* to offset AppBar height */}
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {getMenuItems(user?.role === 'ADMIN').map((item) => (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                selected={location.pathname.startsWith(item.path)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar /> {/* offset AppBar */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;

