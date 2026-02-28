# Attendance System - Work Schedule Configuration

## Overview
The CRM system now includes a comprehensive attendance tracking system with configurable work schedules, automatic late detection, lunch break calculation, and overtime tracking.

## Work Schedule Configuration

### Default Schedule
- **Clock-In Time**: 10:00 AM (On-time arrival)
- **Lunch Break**: 1:00 PM - 2:00 PM (1 hour)
- **Clock-Out Time**: 7:00 PM (Expected departure)
- **Work Hours**: 8 hours per day (excluding lunch break)
- **Total Time at Office**: 9 hours (8 work hours + 1 lunch hour)

### Configurable Settings
Admins can configure the following settings in **System Settings**:
1. **Clock-In Time** - Expected arrival time
2. **Clock-Out Time** - Expected departure time
3. **Lunch Break Start** - When lunch break begins
4. **Lunch Break End** - When lunch break ends
5. **Expected Work Hours** - Required work hours per day (excluding lunch)
6. **Late Threshold** - Grace period for late arrivals (in minutes)

## Automatic Calculations

### 1. Late Detection
- System automatically detects if an employee clocks in after the expected time
- Calculates exact minutes late
- Displays late badge with minutes on attendance records

### 2. Work Hours Calculation
- Automatically calculates actual work hours
- **Excludes lunch break** from total hours
- Formula: `Total Time - Lunch Break (if applicable)`
- Example: Clock in at 10:00 AM, clock out at 7:00 PM = 8 hours work (9 hours - 1 hour lunch)

### 3. Overtime Calculation
- Automatically calculates overtime hours
- Formula: `Actual Work Hours - Expected Work Hours`
- Example: If expected is 8 hours and actual is 9 hours = 1 hour overtime
- Displays overtime badge on attendance records

### 4. Early Departure Detection
- Detects if employee clocks out before expected time
- Displays early departure badge on attendance records

## Features

### For Employees

#### Clock In/Out Page
- **Work Schedule Display**: Shows expected times and current status
- **Real-time Clock**: Updates every second
- **Current Status Indicator**: Shows if it's work hours, lunch break, or overtime
- **Today's Attendance**: Displays clock-in/out times with status badges
- **Attendance History**: Last 30 days with detailed information

#### Attendance Report Page
- **Statistics Cards**:
  - Total Days Worked
  - On-Time Arrivals (count and percentage)
  - Late Arrivals (count and percentage)
  - Average Work Hours per Day
  - Total Overtime Hours
- **Detailed History Table**: 90 days of attendance records

### For HR & Admin

#### Attendance Management
- View all employee attendance records
- Edit attendance records (clock-in/out times)
- Add manual attendance entries
- Delete attendance records
- All calculations update automatically

#### System Settings (Admin Only)
- Configure work schedule
- Set lunch break times
- Define expected work hours
- Adjust late threshold

## Database Schema

### New Fields in `attendance` Table
```sql
- is_late: BOOLEAN - Automatically set if clock-in is after expected time
- is_early_departure: BOOLEAN - Set if clock-out is before expected time
- actual_work_hours: DECIMAL(4,2) - Work hours excluding lunch
- overtime_hours: DECIMAL(4,2) - Hours worked beyond expected
- late_minutes: INTEGER - Minutes late (0 if on time)
```

### New Fields in `system_settings` Table
```sql
- lunch_start_time: TIME - Lunch break start (default: 13:00:00)
- lunch_end_time: TIME - Lunch break end (default: 14:00:00)
- work_hours_per_day: DECIMAL(4,2) - Expected work hours (default: 8.00)
```

## Database Functions

### 1. `calculate_work_hours()`
Calculates actual work hours excluding lunch break.

### 2. `is_clock_in_late()`
Checks if clock-in time is after expected time.

### 3. `calculate_late_minutes()`
Calculates how many minutes late the employee is.

### 4. `is_early_departure()`
Checks if clock-out time is before expected time.

### 5. `calculate_overtime_hours()`
Calculates overtime hours beyond expected work hours.

## Automatic Trigger

A database trigger (`update_attendance_calculations()`) automatically:
- Runs on every INSERT or UPDATE to the attendance table
- Calculates all attendance metrics
- Updates calculated fields before saving
- Ensures data consistency

## Usage Examples

### Example 1: On-Time Full Day
- Clock In: 10:00 AM
- Clock Out: 7:00 PM
- **Result**:
  - Status: On Time ✓
  - Actual Work Hours: 8.00h
  - Overtime: 0h

### Example 2: Late Arrival
- Clock In: 10:30 AM (30 minutes late)
- Clock Out: 7:00 PM
- **Result**:
  - Status: Late (30 minutes)
  - Actual Work Hours: 7.50h
  - Overtime: 0h

### Example 3: Overtime
- Clock In: 10:00 AM
- Clock Out: 8:00 PM
- **Result**:
  - Status: On Time ✓
  - Actual Work Hours: 9.00h
  - Overtime: 1.00h

### Example 4: Early Departure
- Clock In: 10:00 AM
- Clock Out: 6:00 PM
- **Result**:
  - Status: On Time ✓
  - Early Departure: Yes
  - Actual Work Hours: 7.00h
  - Overtime: 0h

## Benefits

1. **Automated Tracking**: No manual calculation needed
2. **Accurate Records**: Lunch breaks automatically excluded
3. **Fair Overtime**: Precise overtime calculation
4. **Transparency**: Employees can see their exact work hours
5. **Configurable**: Admins can adjust schedule as needed
6. **Real-time Status**: Employees know current work period status
7. **Historical Data**: Complete attendance history with statistics

## Notes

- All calculations are performed automatically by the database
- Lunch break is only deducted if the employee is present during lunch hours
- Overtime is calculated based on actual work hours vs expected work hours
- Late detection is based on clock-in time vs expected start time
- All times are stored in UTC and displayed in local timezone
