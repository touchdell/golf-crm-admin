import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/dashboard/DashboardPage';
import MembersListPage from '../pages/members/MembersListPage';
import MemberDetailPage from '../pages/members/MemberDetailPage';
import CreateMemberPage from '../pages/members/CreateMemberPage';
import EditMemberPage from '../pages/members/EditMemberPage';
import TeeSheetPage from '../pages/tee-sheet/TeeSheetPage';
import BookingListPage from '../pages/bookings/BookingListPage';
import LoginPage from '../pages/auth/LoginPage';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';
import SettingsLayout from '../pages/settings/SettingsLayout';
import PricesPage from '../pages/settings/PricesPage';
import MembershipTypesPage from '../pages/settings/MembershipTypesPage';
import TeeTimeConfigPage from '../pages/settings/TeeTimeConfigPage';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/members" element={<MembersListPage />} />
        <Route path="/members/new" element={<CreateMemberPage />} />
        <Route path="/members/:id" element={<MemberDetailPage />} />
        <Route path="/members/:id/edit" element={<EditMemberPage />} />
        <Route path="/tee-sheet" element={<TeeSheetPage />} />
        <Route path="/bookings" element={<BookingListPage />} />
        
        {/* Admin-only Settings routes */}
        <Route
          path="/settings"
          element={
            <AdminRoute>
              <SettingsLayout />
            </AdminRoute>
          }
        >
          <Route path="prices" element={<PricesPage />} />
          <Route path="membership-types" element={<MembershipTypesPage />} />
          <Route path="tee-times" element={<TeeTimeConfigPage />} />
          <Route index element={<Navigate to="/settings/prices" replace />} />
        </Route>
        {/* add more: /payments, /reports */}
      </Route>

      {/* Redirect unknown routes to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRouter;