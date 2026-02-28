# Role-Based Route Protection - Troubleshooting Guide

## Overview
The CRM system now implements strict role-based route protection to ensure users can only access panels and features appropriate for their role.

## How It Works

### 1. ProtectedRoute Component
Every role-specific route is wrapped with a `ProtectedRoute` component that:
- Checks if the user is authenticated
- Verifies the user's role matches the allowed roles for that route
- Automatically redirects users to their correct panel if they try to access unauthorized routes

### 2. Route Protection Structure
```typescript
// Admin routes - only accessible by admin role
<ProtectedRoute allowedRoles={['admin']}>
  <AdminDashboard />
</ProtectedRoute>

// HR routes - only accessible by hr role
<ProtectedRoute allowedRoles={['hr']}>
  <HRDashboard />
</ProtectedRoute>

// Employee routes - only accessible by employee role
<ProtectedRoute allowedRoles={['employee']}>
  <EmployeeDashboard />
</ProtectedRoute>
```

### 3. Automatic Redirection
If a user tries to access a route they don't have permission for:
- **HR user tries to access `/admin`** → Automatically redirected to `/hr`
- **Employee tries to access `/admin`** → Automatically redirected to `/employee`
- **Admin tries to access `/hr`** → Automatically redirected to `/admin`

## Debugging with Console Logs

### What to Check
Open your browser's Developer Console (F12) and look for these log messages:

#### 1. During Login
```
RoleRedirect: User profile loaded: {username: "hemal", role: "hr", id: "..."}
RoleRedirect: Redirecting to /hr
```

#### 2. When Accessing Routes
```
ProtectedRoute: Checking access {userRole: "hr", allowedRoles: ["hr"], hasAccess: true}
ProtectedRoute: Access granted
```

#### 3. When Access is Denied
```
ProtectedRoute: Access denied - User role "hr" not in allowed roles: ["admin"]
ProtectedRoute: Redirecting to /hr
```

## Common Issues and Solutions

### Issue 1: HR User Sees Admin Panel
**Symptoms:**
- HR user logs in but sees admin panel
- Navigation shows admin menu items

**Diagnosis:**
1. Open browser console (F12)
2. Look for log messages starting with "RoleRedirect:" and "ProtectedRoute:"
3. Check what role is being detected

**Possible Causes:**
- **Cached profile data**: Browser may have cached old profile data
- **Database role mismatch**: User's role in database may be incorrect
- **Multiple tabs**: User may have logged in as admin in another tab

**Solutions:**
1. **Clear browser cache and cookies**:
   - Chrome: Ctrl+Shift+Delete → Clear browsing data
   - Firefox: Ctrl+Shift+Delete → Clear cookies and cache
   
2. **Verify user role in database**:
   ```sql
   SELECT username, role FROM profiles WHERE username = 'hemal';
   ```
   Expected result: `role: "hr"`

3. **Force logout and login**:
   - Click logout
   - Close all browser tabs
   - Open new tab and login again

4. **Check console logs**:
   - Should see: `RoleRedirect: Redirecting to /hr`
   - Should NOT see: `RoleRedirect: Redirecting to /admin`

### Issue 2: User Can Manually Navigate to Wrong Panel
**Symptoms:**
- User types `/admin` in URL bar and can access it

**This should NOT happen** - ProtectedRoute will automatically redirect them. If this happens:

1. **Check if ProtectedRoute is working**:
   - Open console
   - Navigate to unauthorized route
   - Should see: "ProtectedRoute: Access denied"
   - Should be automatically redirected

2. **Verify route configuration**:
   - All admin routes should be wrapped with `<ProtectedRoute allowedRoles={['admin']}>`
   - All HR routes should be wrapped with `<ProtectedRoute allowedRoles={['hr']}>`
   - All employee routes should be wrapped with `<ProtectedRoute allowedRoles={['employee']}>`

### Issue 3: Infinite Redirect Loop
**Symptoms:**
- Page keeps refreshing
- Console shows repeated redirect messages

**Causes:**
- Profile not loading correctly
- Role not matching any allowed roles

**Solutions:**
1. **Check profile loading**:
   ```
   RoleRedirect: User profile loaded: {...}
   ```
   If you see "Still loading..." repeatedly, there's a profile fetch issue

2. **Verify role value**:
   - Role must be exactly: `'admin'`, `'hr'`, or `'employee'`
   - Check for typos or extra spaces

3. **Clear application state**:
   - Logout
   - Clear browser storage (F12 → Application → Clear storage)
   - Login again

### Issue 4: Role Not Updating After Admin Changes It
**Symptoms:**
- Admin changes user's role in User Management
- User still sees old panel after login

**Solution:**
User must logout and login again for role changes to take effect.

**Steps:**
1. Admin changes role in User Management
2. User clicks logout
3. User logs in again
4. User should now see correct panel

## Testing Role-Based Access

### Test Scenario 1: HR User Cannot Access Admin Panel
1. Login as HR user (username: hemal)
2. Check console: Should see "Redirecting to /hr"
3. Try to manually navigate to `/admin` in URL bar
4. Check console: Should see "Access denied" and redirect to `/hr`
5. **Expected**: HR panel loads, admin panel never shows

### Test Scenario 2: Employee Cannot Access HR Panel
1. Login as Employee user
2. Check console: Should see "Redirecting to /employee"
3. Try to manually navigate to `/hr` in URL bar
4. Check console: Should see "Access denied" and redirect to `/employee`
5. **Expected**: Employee panel loads, HR panel never shows

### Test Scenario 3: Admin Can Only Access Admin Panel
1. Login as Admin user
2. Check console: Should see "Redirecting to /admin"
3. Try to manually navigate to `/hr` in URL bar
4. Check console: Should see "Access denied" and redirect to `/admin`
5. **Expected**: Admin panel loads, HR panel never shows

## Console Log Reference

### Normal Flow (HR User)
```
AuthContext: Fetching profile for user: 5c9cd0ae-be7e-42d4-a2ee-f983dca19d40
RoleRedirect: User profile loaded: {username: "hemal", role: "hr", id: "5c9cd0ae-be7e-42d4-a2ee-f983dca19d40"}
RoleRedirect: Redirecting to /hr
ProtectedRoute: Checking access {userRole: "hr", allowedRoles: ["hr"], hasAccess: true}
ProtectedRoute: Access granted
```

### Access Denied Flow (HR User Trying to Access Admin)
```
ProtectedRoute: Checking access {userRole: "hr", allowedRoles: ["admin"], hasAccess: false}
ProtectedRoute: Access denied - User role "hr" not in allowed roles: ["admin"]
ProtectedRoute: Redirecting to /hr
```

## Prevention Tips

1. **Always logout before closing browser** - Prevents cached session issues
2. **Use incognito/private mode for testing** - Ensures clean state
3. **Check console logs regularly** - Helps identify issues early
4. **Verify role in database after creation** - Ensures correct role assignment
5. **Test role changes immediately** - Logout and login to verify changes

## Summary

✅ **What's Protected:**
- All admin routes require `admin` role
- All HR routes require `hr` role
- All employee routes require `employee` role

✅ **What Happens on Unauthorized Access:**
- User is automatically redirected to their correct panel
- Console logs show access denied message
- No error shown to user (seamless redirect)

✅ **How to Verify It's Working:**
- Check browser console for "ProtectedRoute" messages
- Try accessing unauthorized routes
- Verify automatic redirection occurs

❌ **What Won't Work:**
- Manual URL manipulation to access unauthorized panels
- Cached sessions with wrong roles
- Accessing routes without proper authentication
