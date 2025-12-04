# Final Test Checklist - Golf CRM Admin

## ✅ Pre-Test Setup
- [ ] Ensure Supabase database schema is deployed (`supabase-schema.sql`)
- [ ] Ensure RLS policies are configured (`fix-rls-policies.sql`)
- [ ] Ensure admin user exists in Supabase Auth and `user_profiles` table
- [ ] Ensure all SQL functions are created:
  - [ ] `generate_member_code()`
  - [ ] `generate_booking_number()`
  - [ ] `generate_price_item_code(category_prefix)`
  - [ ] `generate_membership_type_code()`
- [ ] Environment variables are set (`.env` file):
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`

---

## 🔐 1. Authentication
- [ ] **Login**
  - [ ] Can log in with admin credentials
  - [ ] Redirects to dashboard after login
  - [ ] User info displays correctly in UI
- [ ] **Logout**
  - [ ] Logout button works
  - [ ] Redirects to login page
  - [ ] Session is cleared

---

## 👥 2. Member Management
- [ ] **View Members List**
  - [ ] Members list loads correctly
  - [ ] Pagination works (if applicable)
  - [ ] Search/filter works
- [ ] **Create Member**
  - [ ] "Add Member" button works
  - [ ] Form validation works
  - [ ] Member code is auto-generated (GC0001, GC0002, etc.)
  - [ ] Member is created successfully
  - [ ] Redirects to members list
- [ ] **View Member Detail**
  - [ ] Can click on member to view details
  - [ ] All member info displays correctly
- [ ] **Edit Member**
  - [ ] Edit button works
  - [ ] Can update member info
  - [ ] Member code is read-only (cannot be changed)
  - [ ] Changes save successfully
- [ ] **Deactivate/Activate Member**
  - [ ] Status toggle works
  - [ ] Status updates in database

---

## 💰 3. Price Items Management
- [ ] **View Price Items**
  - [ ] Price items list loads correctly
  - [ ] All columns display correctly
- [ ] **Create Price Item**
  - [ ] "Add Price Item" button works
  - [ ] Code is auto-generated (GF0001, CT0001, etc.)
  - [ ] Code field is read-only
  - [ ] Can select category
  - [ ] Unit price input works correctly (no "0" prefix issue)
  - [ ] Price item is created successfully
- [ ] **Edit Price Item**
  - [ ] Edit button works
  - [ ] Code field is read-only
  - [ ] Can update other fields
  - [ ] Changes save successfully
- [ ] **Toggle Price Item Status**
  - [ ] Status toggle switch works
  - [ ] Status updates in database
- [ ] **Delete Price Item**
  - [ ] Delete button works
  - [ ] Confirmation dialog appears
  - [ ] Item is deleted successfully

---

## 🎫 4. Membership Types Management
- [ ] **View Membership Types**
  - [ ] Membership types list loads correctly
- [ ] **Create Membership Type**
  - [ ] "Add Membership Type" button works
  - [ ] Code is auto-generated (MT0001, MT0002, etc.)
  - [ ] Code field is read-only
  - [ ] Membership type is created successfully
- [ ] **Edit Membership Type**
  - [ ] Edit button works
  - [ ] Code field is read-only
  - [ ] Can update other fields
  - [ ] Changes save successfully
- [ ] **Toggle Membership Type Status**
  - [ ] Status toggle switch works
  - [ ] Status updates in database
- [ ] **Delete Membership Type**
  - [ ] Delete button works
  - [ ] Confirmation dialog appears
  - [ ] Type is deleted successfully

---

## ⏰ 5. Tee Time Configuration
- [ ] **View Configuration**
  - [ ] Configuration page loads
  - [ ] Current settings display correctly
- [ ] **Update Configuration**
  - [ ] Can change start time
  - [ ] Can change end time
  - [ ] Can change interval minutes
  - [ ] Can change max players per slot
  - [ ] Save button works
  - [ ] Configuration saves successfully
  - [ ] Success message appears

---

## 🏌️ 6. Tee Sheet
- [ ] **View Tee Sheet**
  - [ ] Tee sheet page loads
  - [ ] Date selector works (prev/next day)
  - [ ] Tee time slots display correctly
  - [ ] Time column shows correct format: "06:00 - 06:15" (not NaN:NaN)
  - [ ] Status chips display correctly (Open, Full, Blocked, Partial)
  - [ ] Player count displays correctly
- [ ] **Book Tee Time**
  - [ ] Can click on available tee time slot
  - [ ] Booking modal opens
  - [ ] Can search and select main member
  - [ ] Can add additional members
  - [ ] Can add notes
  - [ ] "Book" button works
  - [ ] Booking is created successfully
  - [ ] Modal closes after booking
  - [ ] Tee sheet refreshes to show updated status
  - [ ] Success message appears

---

## 📅 7. Bookings Management
- [ ] **View Bookings List**
  - [ ] Bookings list page loads
  - [ ] All bookings display correctly
  - [ ] Pagination works
  - [ ] Date filters work
  - [ ] Status filters work
  - [ ] Search works
- [ ] **View Booking Detail**
  - [ ] Can click on booking to view details
  - [ ] All booking info displays correctly
  - [ ] Member info displays correctly
  - [ ] Charges/items display correctly
- [ ] **Cancel Booking**
  - [ ] Cancel button works
  - [ ] Confirmation dialog appears
  - [ ] Booking status updates to CANCELLED
  - [ ] Booking list refreshes

---

## 💳 8. Payments
- [ ] **Create Payment**
  - [ ] Can create payment for a booking
  - [ ] Payment method selection works
  - [ ] Amount input works
  - [ ] Payment is created successfully
- [ ] **View Payments by Booking**
  - [ ] Payments list loads for a booking
  - [ ] All payment details display correctly
- [ ] **View Payments by Member**
  - [ ] Payments list loads for a member
  - [ ] All payments display correctly

---

## 📊 9. Dashboard & Reports
- [ ] **Dashboard Loads**
  - [ ] Dashboard page loads without errors
  - [ ] All KPI cards display:
    - [ ] Today's Bookings
    - [ ] Today's Revenue
    - [ ] Active Members
    - [ ] This Month's Revenue
    - [ ] Total Bookings
    - [ ] Total Revenue
- [ ] **Charts Display**
  - [ ] Bookings trend chart displays
  - [ ] Chart shows data for last 30 days
  - [ ] Chart is interactive (tooltips work)
- [ ] **Quick Actions**
  - [ ] All quick action buttons work
  - [ ] Navigation works correctly

---

## 🔧 10. Error Handling
- [ ] **Network Errors**
  - [ ] Error messages display when API fails
  - [ ] App doesn't crash on errors
- [ ] **Validation Errors**
  - [ ] Form validation errors display correctly
  - [ ] Required fields are enforced
- [ ] **Empty States**
  - [ ] Empty states display when no data
  - [ ] "No data" messages are user-friendly

---

## 🐛 Common Issues to Check
- [ ] No console errors in browser DevTools
- [ ] No infinite loading states
- [ ] No "NaN" or "undefined" values displayed
- [ ] All auto-generated codes work correctly
- [ ] All status toggles work
- [ ] All CRUD operations work
- [ ] Data persists after page refresh
- [ ] Navigation between pages works smoothly

---

## 📝 Test Results
**Date:** _______________
**Tester:** _______________

### Summary
- Total Tests: ___
- Passed: ___
- Failed: ___
- Notes: 

### Failed Tests (if any)
1. 
2. 
3. 

### Browser/Environment
- Browser: _______________
- OS: _______________
- Supabase Project: _______________

---

## ✅ Sign-off
- [ ] All critical tests passed
- [ ] Ready for next improvement phase
- [ ] Issues documented (if any)


