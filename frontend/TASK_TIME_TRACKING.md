# Task Time Tracking System

## Overview
The CRM system now includes a comprehensive task time tracking feature that allows employees to track time spent on tasks using Play/Pause functionality. Admins and HR can view the total time spent on each task to monitor productivity and project progress.

## Features

### For Employees

#### Play/Pause Timer
- **Start Timer**: Click the "Start" button to begin tracking time on a task
- **Pause Timer**: Click the "Pause" button to stop the timer and save the time entry
- **One Active Timer**: Only one timer can be active at a time per user
- **Real-time Display**: See the running timer update every second
- **Total Time Display**: View cumulative time spent on each task

#### Timer Display
- **Total Time**: Shows the total time spent on the task (all sessions combined)
- **Running Time**: Shows the current session time when timer is active
- **Format**: Time is displayed as hours, minutes, and seconds (e.g., "2h 35m 42s")

#### Restrictions
- Cannot start a new timer if another task timer is already running
- Must pause the current timer before starting a new one
- Timer automatically calculates duration when paused

### For Admin & HR

#### Time Tracking Visibility
- **Task List View**: See total time spent on each task in the task management table
- **Time Column**: New "Time Spent" column shows cumulative time for each task
- **Format**: Time is displayed as hours and minutes (e.g., "2h 35m")
- **Real-time Updates**: Time updates automatically when employees pause timers

#### Benefits
- Monitor employee productivity
- Track project time allocation
- Identify time-consuming tasks
- Better project estimation for future tasks
- Transparent time tracking for billing/reporting

## Database Schema

### task_time_logs Table
```sql
CREATE TABLE task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,  -- Duration in seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields**:
- `id`: Unique identifier for the time log entry
- `task_id`: Reference to the task being tracked
- `user_id`: Reference to the user tracking time
- `start_time`: When the timer was started
- `end_time`: When the timer was paused (NULL if timer is active)
- `duration`: Calculated duration in seconds (auto-calculated by trigger)
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

### tasks Table Update
```sql
ALTER TABLE tasks 
ADD COLUMN total_time_spent INTEGER DEFAULT 0;
```

**New Field**:
- `total_time_spent`: Cumulative time spent on task in seconds (auto-updated by trigger)

## Database Functions & Triggers

### 1. calculate_time_log_duration()
Automatically calculates the duration when a timer is paused.

**Trigger**: `trigger_calculate_time_log_duration`
- Runs: BEFORE UPDATE on task_time_logs
- When: end_time is set
- Action: Calculates duration = end_time - start_time (in seconds)

### 2. update_task_total_time()
Automatically updates the task's total_time_spent when a time log is completed.

**Trigger**: `trigger_update_task_total_time`
- Runs: AFTER UPDATE on task_time_logs
- When: end_time changes from NULL to a value
- Action: Adds the duration to task's total_time_spent

## API Functions

### Employee Functions

#### startTaskTimer(taskId, userId)
Starts a new timer for a task.

**Validation**:
- Checks if user already has an active timer
- Throws error if another timer is running

**Returns**: TaskTimeLog object with start_time

**Example**:
```typescript
const timer = await startTaskTimer(taskId, userId);
```

#### pauseTaskTimer(taskId, userId)
Pauses the active timer for a task.

**Validation**:
- Finds the active timer for the task and user
- Throws error if no active timer found

**Returns**: TaskTimeLog object with end_time and calculated duration

**Example**:
```typescript
const completedLog = await pauseTaskTimer(taskId, userId);
```

#### getActiveTimer(userId)
Gets the currently active timer for a user.

**Returns**: TaskTimeLog with task title, or null if no active timer

**Example**:
```typescript
const activeTimer = await getActiveTimer(userId);
if (activeTimer) {
  console.log(`Timer running for: ${activeTimer.tasks.title}`);
}
```

### Admin/HR Functions

#### getTaskTimeLogs(taskId)
Gets all time log entries for a specific task.

**Returns**: Array of TaskTimeLog objects with user information

**Example**:
```typescript
const logs = await getTaskTimeLogs(taskId);
logs.forEach(log => {
  console.log(`${log.profiles.username}: ${log.duration}s`);
});
```

#### getUserTaskTimeLogs(userId, taskId)
Gets all time log entries for a specific user on a specific task.

**Returns**: Array of TaskTimeLog objects

**Example**:
```typescript
const userLogs = await getUserTaskTimeLogs(userId, taskId);
```

#### getTotalTaskTime(taskId)
Gets the total time spent on a task.

**Returns**: Total time in seconds

**Example**:
```typescript
const totalSeconds = await getTotalTaskTime(taskId);
const hours = Math.floor(totalSeconds / 3600);
const minutes = Math.floor((totalSeconds % 3600) / 60);
```

## RLS Policies

### task_time_logs Table Policies

1. **Users can view their own time logs**
   - SELECT: `user_id = auth.uid()`

2. **Users can insert their own time logs**
   - INSERT: `user_id = auth.uid()`

3. **Users can update their own time logs**
   - UPDATE: `user_id = auth.uid()`

4. **Admins and HR can view all time logs**
   - SELECT: `is_admin_or_hr(auth.uid())`

5. **Admins and HR can manage all time logs**
   - ALL: `is_admin_or_hr(auth.uid())`

## Usage Examples

### Example 1: Employee Starts and Pauses Timer

**Scenario**: Employee starts working on a task at 10:00 AM and pauses at 11:30 AM

1. Employee clicks "Start" button at 10:00 AM
   - Creates time log: `{ task_id, user_id, start_time: "10:00:00", end_time: null }`
   - Timer starts counting: "0s", "1s", "2s"...

2. Employee clicks "Pause" button at 11:30 AM
   - Updates time log: `{ end_time: "11:30:00" }`
   - Trigger calculates: `duration = 5400 seconds (1.5 hours)`
   - Trigger updates task: `total_time_spent += 5400`

3. Display shows:
   - Total: "1h 30m"
   - Timer stops

### Example 2: Multiple Sessions on Same Task

**Scenario**: Employee works on task in multiple sessions

**Session 1**: 10:00 AM - 11:00 AM (1 hour)
- Duration: 3600 seconds
- Task total_time_spent: 3600 seconds

**Session 2**: 2:00 PM - 3:30 PM (1.5 hours)
- Duration: 5400 seconds
- Task total_time_spent: 9000 seconds (2.5 hours)

**Session 3**: 4:00 PM - 5:00 PM (1 hour)
- Duration: 3600 seconds
- Task total_time_spent: 12600 seconds (3.5 hours)

**Final Display**: "3h 30m"

### Example 3: Admin Views Time Spent

**Scenario**: Admin checks task management page

Admin sees task list with Time Spent column:
```
Task Title          | Assigned To | Status      | Time Spent
--------------------|-------------|-------------|------------
Build Login Page    | John Doe    | Completed   | 5h 30m
Fix Bug #123        | Jane Smith  | In Progress | 2h 15m
Design Dashboard    | Bob Johnson | Pending     | -
```

## Time Display Formats

### Employee View (Running Timer)
- Format: `Xh Ym Zs`
- Examples:
  - "5s" (less than 1 minute)
  - "2m 30s" (less than 1 hour)
  - "1h 15m 45s" (1+ hours)

### Employee View (Total Time)
- Format: `Xh Ym` or `Ym` or `Zs`
- Examples:
  - "30s" (less than 1 minute)
  - "45m" (less than 1 hour)
  - "3h 20m" (1+ hours)

### Admin/HR View
- Format: `Xh Ym` or `Ym` or `-`
- Examples:
  - "-" (no time tracked)
  - "15m" (less than 1 hour)
  - "8h 45m" (1+ hours)

## Benefits

### For Employees
- ✅ Easy time tracking with one-click start/pause
- ✅ Visual feedback with real-time timer
- ✅ See total time invested in each task
- ✅ No manual time entry required
- ✅ Automatic calculation of work duration

### For Managers (Admin/HR)
- ✅ Monitor task progress and time allocation
- ✅ Identify time-consuming tasks
- ✅ Better project estimation
- ✅ Transparent productivity tracking
- ✅ Data for billing and reporting
- ✅ Identify bottlenecks and inefficiencies

### For Organization
- ✅ Accurate time tracking for projects
- ✅ Better resource allocation
- ✅ Improved project planning
- ✅ Data-driven decision making
- ✅ Enhanced accountability

## Best Practices

### For Employees
1. **Start timer when beginning work** on a task
2. **Pause timer** when taking breaks or switching tasks
3. **Only one timer** should be active at a time
4. **Update task status** when completing work
5. **Be consistent** with time tracking for accurate data

### For Managers
1. **Review time data regularly** to identify patterns
2. **Use time data** for better task estimation
3. **Don't micromanage** - trust the time tracking system
4. **Provide feedback** based on time data insights
5. **Use data** to improve processes and workflows

## Troubleshooting

### Issue: Cannot start timer
**Cause**: Another timer is already running
**Solution**: Pause the active timer before starting a new one

### Issue: Timer not updating
**Cause**: Page needs refresh or connection issue
**Solution**: Refresh the page to reload timer state

### Issue: Time not showing in admin view
**Cause**: No time has been tracked yet, or page needs refresh
**Solution**: Ensure employee has paused timer (not just started), then refresh admin page

### Issue: Timer shows incorrect time
**Cause**: Browser timezone or clock sync issue
**Solution**: Check system time and timezone settings

## Future Enhancements

Potential future improvements:
- Time log history view for employees
- Detailed time breakdown by date
- Export time reports to CSV/PDF
- Time tracking analytics and charts
- Automatic timer pause after inactivity
- Timer reminders and notifications
- Weekly/monthly time summaries
- Billable vs non-billable time tracking
- Time tracking goals and targets

## Technical Notes

- All times are stored in UTC in the database
- Times are displayed in user's local timezone
- Duration calculations are performed server-side for accuracy
- Triggers ensure data consistency
- RLS policies ensure data security
- Real-time updates use React state management
- Timer updates every second using setInterval
- Cleanup functions prevent memory leaks
