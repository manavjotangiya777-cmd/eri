# RLS Policy Fix - Client Creation Error Resolution

## Problem
Users were experiencing "failed to save error" when trying to create clients, and potentially other records like tasks, holidays, and announcements.

## Root Cause
The issue was caused by missing `WITH CHECK` clauses in Row Level Security (RLS) policies for multiple tables. 

### Understanding RLS Clauses
PostgreSQL RLS policies use two types of clauses:
- **USING clause** (qual): Checked for SELECT, UPDATE, and DELETE operations
- **WITH CHECK clause**: Checked for INSERT and UPDATE operations

When a policy is created with `FOR ALL` command but only has a USING clause, INSERT operations will fail because PostgreSQL requires a WITH CHECK clause to validate the data being inserted.

## Tables Affected
The following tables had missing WITH CHECK clauses:
1. `clients` - Client management
2. `announcements` - Company announcements
3. `holidays` - Holiday calendar
4. `tasks` - Task management
5. `leaves` - Leave requests
6. `client_notes` - Client notes
7. `documents` - Document management
8. `chats` - Chat conversations
9. `messages` - Chat messages
10. `profiles` - User profiles
11. `system_settings` - System configuration
12. `attendance` - Attendance records (needed HR management policy)

## Solution Applied

### 1. Fixed Clients Table Policy
```sql
DROP POLICY IF EXISTS "Admins and HR have full access to clients" ON clients;
CREATE POLICY "Admins and HR have full access to clients"
ON clients FOR ALL TO authenticated
USING (is_admin_or_hr(auth.uid()))
WITH CHECK (is_admin_or_hr(auth.uid()));
```

### 2. Fixed All Other Tables
Applied the same fix pattern to all affected tables:
- Added WITH CHECK clauses matching the USING clauses
- Ensured both clauses use the same permission check function
- Maintained role-based access control integrity

### 3. Added HR Attendance Management
```sql
CREATE POLICY "HR can manage all attendance"
ON attendance FOR ALL TO authenticated
USING (is_admin_or_hr(auth.uid()))
WITH CHECK (is_admin_or_hr(auth.uid()));
```

## Verification
After applying the fixes, all policies now have proper WITH CHECK clauses:
- ✅ Clients: Can be created by Admin and HR
- ✅ Tasks: Can be created by Admin and HR
- ✅ Holidays: Can be created by Admin and HR
- ✅ Announcements: Can be created by Admin and HR
- ✅ Leaves: Can be managed by Admin and HR
- ✅ Attendance: Can be managed by Admin and HR
- ✅ All other tables: Proper INSERT/UPDATE permissions

## Testing
To verify the fix works:
1. Login as Admin or HR user
2. Try to create a new client
3. Fill in required fields (company name, contact person)
4. Click Save
5. **Expected Result**: Client is created successfully with "Client created successfully" toast message

## Impact
- **Before**: Users could not create clients, tasks, holidays, or announcements
- **After**: All CRUD operations work correctly for authorized users
- **Security**: Role-based access control remains intact
- **Performance**: No performance impact, policies are evaluated at database level

## Prevention
To prevent this issue in the future:
1. Always include WITH CHECK clause when creating policies with INSERT or UPDATE permissions
2. Use the same permission check in both USING and WITH CHECK clauses
3. Test INSERT operations after creating new RLS policies
4. Run the verification query to check for missing WITH CHECK clauses:
```sql
SELECT tablename, policyname, cmd, 
  CASE WHEN with_check IS NULL AND cmd IN ('ALL', 'INSERT', 'UPDATE') 
    THEN 'MISSING WITH CHECK' 
    ELSE 'OK' 
  END as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Related Documentation
- PostgreSQL RLS Documentation: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
