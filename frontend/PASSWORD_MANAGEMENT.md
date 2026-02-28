# Password Management Features

## Overview
The CRM system now includes comprehensive password management features that allow administrators to change user passwords and provide password visibility toggles across all password input fields for better user experience.

## Features

### 1. Admin Change User Password

#### Access
- **Location**: Admin Panel → User Management
- **Permission**: Admin only
- **Action Button**: Key icon (🔑) next to each user in the user list

#### How to Use
1. Navigate to User Management page
2. Find the user whose password you want to change
3. Click the Key icon button in the Actions column
4. Enter the new password (minimum 6 characters)
5. Confirm the new password
6. Click "Change Password" button

#### Features
- **Password Validation**: Minimum 6 characters required
- **Confirmation**: Must enter password twice to prevent typos
- **Visibility Toggle**: Eye icon to show/hide password while typing
- **Real-time Feedback**: Success/error messages via toast notifications
- **Secure Processing**: Password change handled via Edge Function with service role key

#### Use Cases
- User forgot their password
- Security requirement to reset compromised password
- Initial password setup for new users
- Periodic password rotation policy

### 2. Password Visibility Toggle

#### Available On
- **Login Page**: Both login and signup forms
- **User Management**: Create new user dialog
- **Change Password Dialog**: Admin password change form

#### How to Use
1. Locate the eye icon on the right side of any password field
2. Click the eye icon to toggle between:
   - **Eye icon (👁️)**: Password is hidden (shows dots/asterisks)
   - **Eye-off icon (👁️‍🗨️)**: Password is visible (shows plain text)
3. Toggle as needed while typing or reviewing

#### Benefits
- **Reduce Typos**: See what you're typing to avoid mistakes
- **Verify Password**: Confirm you entered the correct password
- **Better UX**: Especially helpful on mobile devices
- **Accessibility**: Helps users with visual or motor impairments

## Technical Implementation

### Edge Function: change-user-password

**Endpoint**: `/functions/v1/change-user-password`

**Method**: POST

**Request Body**:
```json
{
  "userId": "uuid-string",
  "newPassword": "new-password-string"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response**:
```json
{
  "error": "Error message"
}
```

**Validation**:
- User ID must be provided
- Password must be at least 6 characters
- Uses Supabase Admin API to update password
- Requires service role key (admin only)

### Frontend Components

#### UserManagement.tsx Updates

**New State Variables**:
```typescript
const [changePasswordOpen, setChangePasswordOpen] = useState(false);
const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
const [changingPassword, setChangingPassword] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [showNewPassword, setShowNewPassword] = useState(false);
const [passwordData, setPasswordData] = useState({
  newPassword: '',
  confirmPassword: '',
});
```

**New Functions**:
- `handleChangePassword(user)`: Opens change password dialog
- `handleSubmitPasswordChange(e)`: Submits password change request

**UI Components**:
- Change Password Dialog with form
- Password visibility toggle buttons
- Validation and error handling

#### LoginPage.tsx Updates

**New State Variable**:
```typescript
const [showPassword, setShowPassword] = useState(false);
```

**UI Updates**:
- Password input wrapped in relative div
- Eye/EyeOff icon button positioned absolutely
- Toggle functionality on both login and signup forms

### Password Input Pattern

**Standard Pattern for All Password Fields**:
```tsx
<div className="relative">
  <Input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="pr-10"
  />
  <Button
    type="button"
    variant="ghost"
    size="sm"
    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? (
      <EyeOff className="h-4 w-4 text-muted-foreground" />
    ) : (
      <Eye className="h-4 w-4 text-muted-foreground" />
    )}
  </Button>
</div>
```

**Key Elements**:
- `relative` container for absolute positioning
- `pr-10` padding on input to prevent text overlap with icon
- `absolute right-0 top-0` positioning for icon button
- `hover:bg-transparent` to prevent background on hover
- Conditional rendering of Eye/EyeOff icons

## Security Considerations

### Password Change Security

1. **Admin Only**: Only administrators can change user passwords
2. **Service Role Key**: Edge Function uses service role key for admin API access
3. **No Old Password Required**: Admin can reset without knowing current password
4. **Immediate Effect**: Password change takes effect immediately
5. **No Email Notification**: Currently no email sent (can be added if needed)

### Password Visibility Toggle Security

1. **Client-Side Only**: Toggle only affects display, not storage
2. **No Logging**: Password visibility state is not logged
3. **Session-Based**: Toggle state resets on page refresh
4. **No Persistence**: Visibility preference is not saved

### Best Practices

**For Admins**:
- Use strong passwords (mix of letters, numbers, symbols)
- Change passwords immediately if compromised
- Don't share passwords verbally or via insecure channels
- Document password changes in audit logs (if required)
- Consider implementing password expiry policies

**For Users**:
- Use the visibility toggle to verify password before submitting
- Don't leave password visible in public spaces
- Clear the field if you need to step away
- Use unique passwords for different systems

## User Experience Enhancements

### Visual Feedback

1. **Loading States**: "Changing..." text while processing
2. **Success Toast**: Green notification on successful change
3. **Error Toast**: Red notification with error message
4. **Disabled States**: Buttons disabled during processing
5. **Icon Tooltips**: Hover titles on action buttons

### Form Validation

1. **Required Fields**: Both password fields must be filled
2. **Minimum Length**: 6 characters minimum
3. **Password Match**: Confirmation must match new password
4. **Real-time Validation**: Errors shown immediately
5. **Clear Error Messages**: Specific validation feedback

### Accessibility

1. **Keyboard Navigation**: Tab through form fields
2. **Enter to Submit**: Press Enter to submit form
3. **Escape to Close**: Press Escape to close dialog
4. **Screen Reader Support**: Proper labels and ARIA attributes
5. **Focus Management**: Auto-focus on first field

## Common Scenarios

### Scenario 1: New Employee Onboarding

**Problem**: New employee needs initial password

**Solution**:
1. Admin creates user account with temporary password
2. Admin shares temporary password securely (encrypted email, password manager)
3. Employee logs in with temporary password
4. Employee changes password on first login (future feature)

### Scenario 2: Forgotten Password

**Problem**: Employee forgot their password

**Solution**:
1. Employee contacts admin/HR
2. Admin navigates to User Management
3. Admin clicks Key icon for the user
4. Admin sets new temporary password
5. Admin shares new password securely
6. Employee logs in and changes password

### Scenario 3: Security Breach

**Problem**: Potential password compromise detected

**Solution**:
1. Admin immediately changes affected user passwords
2. Admin notifies affected users
3. Users log in with new passwords
4. Admin monitors for suspicious activity
5. Admin implements additional security measures

### Scenario 4: Password Policy Compliance

**Problem**: Company requires periodic password changes

**Solution**:
1. Admin reviews user list
2. Admin changes passwords for users due for rotation
3. Admin notifies users of password change
4. Users receive new passwords securely
5. Admin documents changes in compliance log

## Troubleshooting

### Issue: Cannot change password

**Possible Causes**:
- Not logged in as admin
- User ID is invalid
- Network connection issue
- Edge Function not deployed

**Solutions**:
1. Verify admin role in profile
2. Refresh user list
3. Check network connection
4. Verify Edge Function deployment

### Issue: Password validation fails

**Possible Causes**:
- Password too short (< 6 characters)
- Passwords don't match
- Special characters causing issues

**Solutions**:
1. Use at least 6 characters
2. Verify both fields match exactly
3. Try simpler password first, then add complexity

### Issue: Eye icon not working

**Possible Causes**:
- JavaScript error
- Button disabled
- State not updating

**Solutions**:
1. Check browser console for errors
2. Refresh the page
3. Try different browser
4. Clear browser cache

### Issue: Password change succeeds but user can't login

**Possible Causes**:
- Password copied with extra spaces
- Case sensitivity issue
- Browser autofill using old password

**Solutions**:
1. Manually type password (don't copy-paste)
2. Verify caps lock is off
3. Clear browser autofill data
4. Try incognito/private mode

## Future Enhancements

Potential improvements for password management:

1. **Password Strength Meter**: Visual indicator of password strength
2. **Password Requirements**: Configurable complexity rules
3. **Password History**: Prevent reuse of recent passwords
4. **Password Expiry**: Automatic expiration after X days
5. **Self-Service Reset**: Users can reset their own passwords via email
6. **Two-Factor Authentication**: Additional security layer
7. **Password Generator**: Suggest strong random passwords
8. **Audit Log**: Track all password changes with timestamps
9. **Email Notifications**: Notify users when password is changed
10. **Bulk Password Reset**: Change multiple passwords at once
11. **Password Policy Enforcement**: Enforce complexity rules
12. **Session Invalidation**: Force logout on password change

## API Reference

### Change User Password

**Function**: `supabase.functions.invoke('change-user-password')`

**Parameters**:
```typescript
{
  body: {
    userId: string;      // UUID of the user
    newPassword: string; // New password (min 6 chars)
  }
}
```

**Returns**:
```typescript
{
  data: {
    success: boolean;
    message: string;
  } | null;
  error: FunctionsHttpError | null;
}
```

**Example Usage**:
```typescript
const { data, error } = await supabase.functions.invoke('change-user-password', {
  body: {
    userId: 'user-uuid-here',
    newPassword: 'newSecurePassword123',
  },
});

if (error) {
  console.error('Failed to change password:', error);
} else {
  console.log('Password changed successfully');
}
```

## Compliance & Regulations

### GDPR Considerations
- Password changes should be logged for audit purposes
- Users should be notified of password changes
- Implement data retention policies for password history

### Security Standards
- Follow OWASP password guidelines
- Implement rate limiting on password changes
- Use HTTPS for all password transmissions
- Store passwords using bcrypt/scrypt (handled by Supabase)

### Industry Best Practices
- Minimum 8-12 characters recommended (currently 6)
- Mix of uppercase, lowercase, numbers, symbols
- No dictionary words or common patterns
- Regular password rotation (30-90 days)
- Multi-factor authentication for sensitive accounts

## Summary

The password management features provide administrators with powerful tools to manage user access while maintaining security and usability. The password visibility toggle enhances user experience across all password input scenarios, reducing errors and improving accessibility.

**Key Benefits**:
- ✅ Admin can reset any user password
- ✅ No need to know current password
- ✅ Visual password verification with toggle
- ✅ Reduced password entry errors
- ✅ Better mobile experience
- ✅ Improved accessibility
- ✅ Secure implementation with Edge Functions
- ✅ Comprehensive validation and error handling
