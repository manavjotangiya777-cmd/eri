# HR Attendance Management - Troubleshooting Guide

## Overview
This guide helps troubleshoot issues with HR attendance management operations (Create, Update, Delete).

## Common Issues and Solutions

### 1. Cannot Create Attendance Record

**Symptom**: Error message when trying to add a new attendance record.

**Possible Causes**:
- **Duplicate Record**: An attendance record already exists for the selected employee on the selected date
- **Missing Required Fields**: User ID, date, or clock-in time is not filled
- **Permission Issue**: User is not logged in as HR or Admin

**Solutions**:
1. Check if a record already exists for that employee on that date
2. If record exists, use the Edit function instead
3. Ensure all required fields are filled (Employee, Date, Clock In Time)
4. Verify you're logged in as an HR user

**Technical Details**:
- The attendance table has a unique constraint on `(user_id, date)`
- Only one attendance record per employee per day is allowed
- This prevents duplicate entries and ensures data integrity

### 2. Cannot Update Attendance Record

**Symptom**: Changes to clock-in/out times are not saved.

**Possible Causes**:
- **Invalid Time Format**: Time values are not in correct format
- **Permission Issue**: User doesn't have HR or Admin role
- **Network Error**: Connection to database failed

**Solutions**:
1. Ensure times are entered in HH:MM format (24-hour)
2. Check browser console for error messages
3. Verify you're logged in as HR or Admin
4. Try refreshing the page and attempting again

**Technical Details**:
- Times are converted to timestamps: `YYYY-MM-DDTHH:MM:SS`
- Database trigger automatically recalculates work hours, overtime, and late status
- RLS policy checks: `is_admin_or_hr(auth.uid())`

### 3. Cannot Delete Attendance Record

**Symptom**: Delete button doesn't work or shows error.

**Possible Causes**:
- **Permission Issue**: User doesn't have HR or Admin role
- **Foreign Key Constraint**: Record is referenced by other tables (unlikely)
- **Network Error**: Connection to database failed

**Solutions**:
1. Confirm deletion when prompted
2. Check browser console for error messages
3. Verify you're logged in as HR or Admin
4. Try refreshing the page and attempting again

**Technical Details**:
- Delete operation requires HR or Admin role
- RLS policy: `is_admin_or_hr(auth.uid())`
- Deletion is permanent and cannot be undone

## Verification Steps

### Step 1: Check User Role
```sql
-- Run this query to verify your role
SELECT id, username, email, role 
FROM profiles 
WHERE email = 'your-email@example.com';
```
Expected result: `role` should be `'hr'` or `'admin'`

### Step 2: Check RLS Policies
```sql
-- Verify RLS policies are active
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'attendance'
ORDER BY policyname;
```
Expected: Should see "HR can manage all attendance" policy with cmd='ALL'

### Step 3: Test is_admin_or_hr Function
```sql
-- Test if function recognizes your role
SELECT 
  id,
  username,
  role,
  is_admin_or_hr(id) as has_access
FROM profiles 
WHERE email = 'your-email@example.com';
```
Expected: `has_access` should be `true` for HR and Admin users

### Step 4: Check Existing Records
```sql
-- Check if record already exists
SELECT * FROM attendance 
WHERE user_id = 'employee-user-id' 
AND date = '2026-02-10';
```
If record exists, use Edit instead of Create

## Browser Console Debugging

### Enable Console Logging
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Perform the operation (Create/Update/Delete)
4. Look for error messages

### Common Console Messages

**Success Messages**:
```
Loaded attendance data: {totalRecords: X, employeeRecords: Y, employees: Z}
Saving attendance edit: {recordId: "...", formData: {...}}
Update result: {...}
Create result: {...}
Delete successful
```

**Error Messages**:
```
Failed to update attendance: Error: ...
Failed to add attendance: Error: ...
Failed to delete attendance: Error: ...
```

## Error Messages Explained

### "An attendance record already exists for this employee on this date"
- **Cause**: Trying to create a duplicate record
- **Solution**: Edit the existing record instead of creating a new one

### "Please fill in all required fields"
- **Cause**: Employee, Date, or Clock In time is missing
- **Solution**: Fill in all required fields before submitting

### "Failed to update attendance record"
- **Cause**: Permission issue or network error
- **Solution**: Check user role and network connection

### "Failed to delete attendance record"
- **Cause**: Permission issue or network error
- **Solution**: Check user role and network connection

## Features Working Correctly

### Create Operation
- ✅ Validates required fields (user_id, date, clock_in)
- ✅ Checks for duplicate records before creating
- ✅ Converts time inputs to proper timestamps
- ✅ Automatically calculates work hours, overtime, late status via database trigger
- ✅ Shows success/error toast notifications
- ✅ Refreshes data after successful creation

### Update Operation
- ✅ Pre-fills form with existing data
- ✅ Converts timestamps to time format for editing
- ✅ Updates clock-in and clock-out times
- ✅ Automatically recalculates all metrics via database trigger
- ✅ Shows success/error toast notifications
- ✅ Refreshes data after successful update

### Delete Operation
- ✅ Shows confirmation dialog before deleting
- ✅ Permanently removes the record
- ✅ Shows success/error toast notifications
- ✅ Refreshes data after successful deletion

## Database Schema

### Attendance Table Structure
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to profiles)
- date: DATE (Part of unique constraint)
- clock_in: TIMESTAMPTZ
- clock_out: TIMESTAMPTZ
- work_hours: NUMERIC (legacy field)
- is_late: BOOLEAN (auto-calculated)
- is_early_departure: BOOLEAN (auto-calculated)
- actual_work_hours: NUMERIC (auto-calculated)
- overtime_hours: NUMERIC (auto-calculated)
- late_minutes: INTEGER (auto-calculated)
- notes: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

UNIQUE CONSTRAINT: (user_id, date)
```

### RLS Policies
1. **HR can manage all attendance** (cmd: ALL)
   - Allows HR and Admin to SELECT, INSERT, UPDATE, DELETE
   - Check: `is_admin_or_hr(auth.uid())`

2. **Users can view their own attendance** (cmd: SELECT)
   - Allows employees to view their own records
   - Check: `user_id = auth.uid()`

3. **Users can insert their own attendance** (cmd: INSERT)
   - Allows employees to clock in/out
   - Check: `user_id = auth.uid()`

4. **Users can update their own attendance** (cmd: UPDATE)
   - Allows employees to update their own records
   - Check: `user_id = auth.uid()`

## Contact Support

If issues persist after following this guide:
1. Check browser console for detailed error messages
2. Verify database connection is working
3. Ensure you're using the latest version of the application
4. Contact system administrator with:
   - Your username and role
   - The operation you're trying to perform
   - Any error messages from the console
   - Screenshots if applicable
