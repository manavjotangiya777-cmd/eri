# Role-Based Access Control - How It Works

## Overview
The CRM system automatically redirects users to their appropriate panel based on their assigned role. The system ensures proper profile loading before redirection to prevent any role mismatch issues.

## User Roles and Access

### 1. Admin Role
- **Access**: Full system control
- **Panel**: `/admin`
- **Badge Color**: Red (Destructive)
- **Features**:
  - User management (create, edit, delete users)
  - Client management
  - Task management
  - Attendance overview
  - System settings
  - Chat with all users

### 2. HR Role
- **Access**: Employee and content management
- **Panel**: `/hr`
- **Badge Color**: Blue (Primary)
- **Features**:
  - Employee management
  - Leave management
  - Client management
  - Task assignment
  - Content management (holidays, announcements)
  - Chat with admin and employees

### 3. Employee Role
- **Access**: Personal work management
- **Panel**: `/employee`
- **Badge Color**: Gray (Secondary)
- **Features**:
  - Clock in/out
  - View assigned tasks
  - Submit leave requests
  - View company information
  - Chat with admin and HR

## How Role Assignment Works

### When Admin Creates a User:
1. Admin goes to User Management page
2. Clicks "Create User" button
3. Fills in the form:
   - Username (required)
   - Password (required)
   - Full Name (optional)
   - **Role** (required - Admin/HR/Employee)
   - Department (optional)
4. System creates the user account with the specified role
5. User can now login with their credentials

### When User Logs In:
1. User enters username and password on login page
2. System authenticates the user
3. **System immediately fetches user profile including role**
4. Profile is loaded and stored in AuthContext
5. **Automatic Redirection** (with 500ms delay to ensure profile is loaded):
   - If role = `admin` → Redirected to `/admin`
   - If role = `hr` → Redirected to `/hr`
   - If role = `employee` → Redirected to `/employee`

## Technical Implementation

### Authentication Flow:
```
Login → Auth Check → Fetch Profile → Wait for Profile Load → Check Role → Redirect to Panel
```

### Key Improvements:
1. **Immediate Profile Fetch**: After successful login, the profile is immediately fetched and set in AuthContext
2. **Loading States**: RoleRedirect component properly waits for profile to load before redirecting
3. **Delay Before Navigation**: 800ms total delay (500ms for profile load + 300ms for state update) ensures smooth redirection
4. **Console Logging**: Debug logs show the role being used for redirection
5. **Visual Feedback**: Login page shows role-based access information

### Components Involved:
- `AuthContext.tsx`: Manages authentication state and profile (now fetches profile immediately after login)
- `RouteGuard.tsx`: Protects routes requiring authentication
- `RoleRedirect.tsx`: Redirects users based on their role (improved with better loading states)
- `LoginPage.tsx`: Handles user login (now with role-based visual feedback)

### Database:
- `profiles` table stores user role
- Role is set when user is created
- Role determines access permissions via RLS policies

## Testing the System

### Test Scenario 1: Create Employee
1. Login as admin (username: admin123)
2. Create user with role "Employee"
3. Logout
4. Login with new employee credentials
5. **Expected**: User is redirected to `/employee` panel
6. **Verify**: Check browser console for "RoleRedirect: Redirecting user with role: employee"

### Test Scenario 2: Create HR
1. Login as admin
2. Create user with role "HR"
3. Logout
4. Login with new HR credentials
5. **Expected**: User is redirected to `/hr` panel
6. **Verify**: Check browser console for "RoleRedirect: Redirecting user with role: hr"

### Test Scenario 3: Create Admin
1. Login as admin
2. Create user with role "Admin"
3. Logout
4. Login with new admin credentials
5. **Expected**: User is redirected to `/admin` panel
6. **Verify**: Check browser console for "RoleRedirect: Redirecting user with role: admin"

### Test Scenario 4: Existing Admin Login
1. Go to login page
2. Enter username: admin123
3. Enter password: (your admin password)
4. Click Login
5. **Expected**: "Logged in successfully. Redirecting..." message appears
6. **Expected**: User is redirected to `/admin` panel
7. **Verify**: Admin dashboard loads with all admin features

## Important Notes

1. **First User**: The very first user to register becomes admin automatically
2. **Role Changes**: Admin can change user roles at any time via User Management
3. **Immediate Effect**: Role changes take effect on next login
4. **Security**: All routes are protected - users can only access their role's features
5. **No Manual Navigation**: Users cannot manually navigate to other role panels - they will be redirected
6. **Profile Loading**: System ensures profile is fully loaded before redirection (prevents role mismatch)
7. **Visual Feedback**: Login page shows role descriptions and access levels

## Troubleshooting

### User Not Redirected Correctly:
- ✅ **FIXED**: Profile is now fetched immediately after login
- ✅ **FIXED**: Added delays to ensure profile is loaded before redirection
- Check browser console for "RoleRedirect: Redirecting user with role: [role]"
- Verify user has logged out and logged back in after role change
- Clear browser cache and cookies if issues persist

### Access Denied:
- Verify user role matches the panel they're trying to access
- Check RLS policies in database
- Ensure user account is active (is_active = true)

### Still Seeing Wrong Panel:
1. Open browser console (F12)
2. Look for "RoleRedirect: Redirecting user with role: [role]" message
3. If role is correct but panel is wrong, clear browser cache
4. If role is incorrect, check database: `SELECT id, username, role FROM profiles WHERE username = 'your_username';`
5. If database role is wrong, admin can update it via User Management page

## Summary

The system ensures that:
- ✅ Employees only see employee panel
- ✅ HR only sees HR panel
- ✅ Admins only see admin panel
- ✅ Automatic redirection on login
- ✅ No manual URL manipulation possible
- ✅ Secure role-based access control
- ✅ Profile loaded before redirection (prevents role mismatch)
- ✅ Visual role indicators on login page
- ✅ Debug logging for troubleshooting
