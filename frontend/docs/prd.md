# CRM System Requirements Document

## 1. Application Overview

### 1.1 Application Name
IT Company CRM System

### 1.2 Application Description
A comprehensive web-based Customer Relationship Management (CRM) system designed for IT companies, featuring role-based access control with three distinct user levels: Admin (Super Admin with full control), HR (Management role), and Employee (View and limited interaction role). The system provides secure, modular, and scalable solutions for client management, task tracking with time logging, attendance monitoring, internal communication, employee management, department/designation management, an integrated AI Assistant accessible to all users, and a payroll system with achievement-based payment levels. Admin has exclusive access to create client accounts and share project updates through a dedicated client panel interface, where clients can view invoices and make payments according to achievement-based levels.

## 2. Core Functionalities

### 2.1 Authentication & Security
- Secure login and logout functionality
- JWT-based authentication system
- Role-based authorization (RBAC)
- Password encryption
- Session timeout management

### 2.2 AI Assistant Module
- AI Assistant icon displayed in the header of the admin panel
- Clicking the icon opens a dedicated AI Assistant page
- ChatGPT-like conversational interface
- Available to all user roles (Admin, HR, Employee)
- Real-time AI-powered responses using integrated API key
- Universal secret API key integration for AI service authentication
- Chat history storage per user
- Context-aware assistance for CRM-related queries
- Natural language interaction capability
- Real-time response streaming from AI service

### 2.3 Admin Module
**Dashboard:**
- Company overview and analytics display
- System-wide statistics and metrics

**Department & Designation Management:**
- Create, edit, and delete departments
- Create, edit, and delete designations
- Assign designations to specific departments
- View all departments and their associated designations
- Department hierarchy management

**User Management:**
- Create, edit, and delete HR and Employee accounts
- Assign employees to departments and designations
- Department-wise user filtering
- Filter users by department for easy management
- Role management
- Access control configuration
- Change user passwords with view/hide toggle option during password entry
- Password visibility toggle (eye icon) when filling password fields

**Client Account Management:**
- Create client accounts with username and password
- Edit and delete client accounts
- Manage client credentials
- View all client accounts
- Client status management (Active/Inactive)

**Client Panel Access:**
- Admin can access and view the client panel interface
- Share project updates through client panel
- Manage client-visible content
- Control project information shared with clients
- Update project status and details for client view

**Payroll System Management:**
- Create and configure achievement-based payment levels
- Define level criteria and corresponding payment amounts
- Set multiple achievement levels for different payment tiers
- Edit and update payment level configurations
- Assign payment levels to specific clients or projects
- View payment level assignments
- Generate invoices based on achievement levels
- Track invoice status (Pending, Paid, Overdue)
- View payment history and records

**System Configuration:**
- Company profile and settings management
- Working hours and shift settings
- Holiday calendar management
- Birthday management system
- Announcement creation and management

**Client Management:**
- Add, edit, and delete client records
- Client details: company name, contact person, email, phone, address
- Assign clients to HR or departments
- Client notes and interaction history
- Assign projects to clients

**Task Management:**
- Create and assign tasks to employees or departments
- Set task priority, deadline, and status
- Monitor task progress and completion
- View task time tracking logs for each employee
- View total time spent on each task by employees
- Analyze employee productivity based on task completion time

**Attendance Overview:**
- View all employee attendance records
- View all employee clock-in/clock-out logs
- Generate monthly attendance summaries
- Late arrival detection and reporting
- View attendance reports for all employees

**Internal Communication:**
- Chat with HR and Employees
- Department group chat functionality
- Create and manage custom group chats
- Add or remove members from group chats
- Chat history access

### 2.4 HR Module
**Dashboard:**
- HR-specific analytics and overview
- Department performance metrics

**Employee Management:**
- Manage employee records within assigned scope
- View employees by department
- Monitor employee attendance
- Supervise clock-in/clock-out activities

**Attendance Management:**
- View all employee attendance records
- Edit and manage employee attendance
- Modify clock-in/clock-out times
- Add manual attendance entries
- Approve or adjust attendance records
- Generate attendance reports
- Export attendance data

**Leave Management:**
- Review and approve/reject leave applications
- View leave history and balance

**Content Management:**
- Holiday calendar management
- Birthday announcements
- Create and publish announcements
- Upload and manage documents

**Client Management:**
- Add and manage assigned clients
- Update client details and information
- Add follow-up notes
- View client interaction history
- Assign projects to clients

**Task Management:**
- Create and assign tasks to employees
- Track task progress
- Update task status and details
- View task time tracking logs for assigned employees
- Monitor time spent on tasks

**Communication:**
- Chat with Admin and Employees
- Department communication
- Create and manage custom group chats
- Add or remove members from group chats

**Restrictions:**
- Cannot manage Admin accounts
- Cannot modify system-level configurations
- Cannot create or delete departments/designations
- Cannot access client panel interface
- Cannot create client accounts
- Cannot configure payroll system or payment levels

### 2.5 Employee Module
**Dashboard:**
- Personal work overview
- Task summary and notifications

**Attendance Management:**
- One-click clock-in functionality
- One-click clock-out functionality
- View personal attendance history
- View personal attendance report
- Daily and monthly work hour tracking

**Task Management:**
- View assigned tasks
- View task deadlines and priorities
- Task completion status tracking
- Play/Pause task timer functionality
- Track time spent on each task
- View personal task time logs

**Leave Management:**
- Submit leave applications
- View leave status and history

**Information Access:**
- View holiday calendar
- View birthday list
- View company announcements
- Download shared documents
- View own department and designation

**Communication:**
- Chat with HR and Admin
- Participate in group chats
- Receive notifications

**Restrictions:**
- No task creation capability
- No system data modification rights
- No attendance editing rights
- Can only view own attendance report
- Cannot modify department or designation assignments
- Cannot create or manage group chats
- Cannot access client panel interface
- Cannot access payroll system

### 2.6 Client Panel (Admin Access Only)
**Project View:**
- View all assigned projects
- View project details and status
- View project progress and milestones
- View project timeline
- Track project completion status
- View project history and updates

**Project Updates:**
- Admin can post project updates
- Admin can share project progress
- Admin can upload project-related documents
- Admin can add project notes and comments

**Task View:**
- View all project-related tasks
- View task assignments and details
- View task deadlines and priorities
- Track task completion status
- View task progress updates

**Document Access:**
- View project documents
- Download shared files
- View document history

**Payroll & Invoice Management:**
- View assigned achievement-based payment levels
- View current achievement level and corresponding payment amount
- View all generated invoices
- View invoice details (invoice number, date, amount, payment level, status)
- Download invoices in PDF format
- Make payments for invoices
- View payment history
- Track invoice status (Pending, Paid, Overdue)
- View payment receipts

**Note:**
- Client panel is accessible only through Admin login
- No separate client login exists
- Admin manages all client-facing content through this interface

### 2.7 Clock-In/Clock-Out System
- Automatic timestamp recording
- On-time clock-in: 10:00 AM or earlier
- Late arrival detection: clock-in after 10:00 AM
- Standard shift duration: 8 hours
- Lunch break: 1:00 PM to 2:00 PM (1 hour, excluded from work hours)
- Expected clock-out time: 7:00 PM
- Daily work hour calculation based on clock-in/clock-out times minus lunch break
- Monthly work hour summary
- Attendance reports for HR and Admin
- HR can edit and manage all attendance records
- Employees can only view their own attendance
- Attendance status calculation:
  - On-time: Clock-in at or before 10:00 AM, clock-out at or after 7:00 PM
  - Late: Clock-in after 10:00 AM
  - Early departure: Clock-out before 7:00 PM
  - Work hours = (Clock-out time - Clock-in time) - 1 hour lunch break

### 2.8 Task Management System
**For Admin & HR:**
- Task creation interface
- Employee/Department assignment
- Priority level setting
- Deadline configuration
- Completion tracking
- View task time tracking data for all employees
- View total time spent on each task
- Analyze task completion efficiency

**For Employees:**
- View assigned tasks
- Task detail display
- Status updates (if permitted)
- Play button to start task timer
- Pause button to stop task timer
- Automatic time logging when play/pause is used
- View accumulated time spent on each task
- Task timer runs independently for each task

**Task Timer Features:**
- Play/Pause controls on each task card
- Real-time timer display showing elapsed time
- Automatic timestamp recording for play and pause actions
- Cumulative time calculation across multiple play/pause sessions
- Task time logs stored in database
- Admin and HR can view detailed time logs per employee per task

### 2.9 Holiday & Birthday System
- Holiday calendar managed by Admin/HR
- Automatic display to all employees
- Birthday auto-detection from date of birth
- Birthday notifications and announcements

### 2.10 Internal Chat System
- Role-based messaging
- One-on-one chat (Admin ↔ HR ↔ Employee)
- Department group chat
- Custom group chat functionality
- Real-time message delivery
- Chat history storage
- Message notifications

**Group Chat Features:**
- Admin and HR can create custom group chats
- Add multiple members to group chats
- Remove members from group chats
- Group chat naming
- Group member list display
- Group message history
- Group notifications
- Employees can participate in group chats they are added to

### 2.11 Payroll System
**Achievement-Based Payment Levels:**
- Admin defines multiple achievement levels
- Each level has specific criteria and payment amount
- Levels can be based on project milestones, deliverables, or performance metrics
- Admin assigns payment levels to clients or projects
- System tracks achievement progress
- Automatic level calculation based on defined criteria

**Invoice Generation:**
- Admin generates invoices based on achievement levels
- Invoice includes: invoice number, date, client details, project details, achievement level, payment amount, due date
- Invoice status tracking (Pending, Paid, Overdue)
- PDF invoice generation
- Invoice history and records

**Payment Processing:**
- Clients view invoices in client panel
- Clients make payments according to assigned achievement level
- Payment confirmation and receipt generation
- Payment history tracking
- Admin views all payment records

### 2.12 Dashboard & UI Features
- Clean and modern interface design
- Responsive layout for all devices
- Role-based widget display
- Task statistics visualization
- Attendance metrics display
- Client management statistics
- Notification bell with alerts
- AI Assistant icon in header for quick access

### 2.13 Data Migration from Supabase
- Import existing data from Supabase to MySQL database
- Migrate all tables and records from Supabase
- Preserve data integrity during migration
- Map Supabase schema to MySQL schema
- Convert data types as needed for MySQL compatibility
- Maintain relationships and foreign keys
- Verify data completeness after migration
- Provide migration script or tool for data transfer

## 3. Database Structure

The system requires the following database tables:
- users
- roles
- permissions
- departments
- designations
- employees
- clients
- client_accounts
- projects
- project_assignments
- attendance
- clock_logs
- leaves
- tasks
- task_assignments
- task_time_logs
- client_notes
- holidays
- birthdays
- announcements
- chats
- messages
- documents
- group_chats
- group_chat_members
- ai_chat_history
- project_updates
- project_documents
- payment_levels
- invoices
- payments
- payment_receipts

## 4. Technical Requirements

### 4.1 Frontend
- React.js framework
- Tailwind CSS for styling
- Role-based routing implementation
- Responsive UI design
- Real-time timer component for task tracking
- Password visibility toggle component (eye icon) for password input fields
- Department filter dropdown component for user management
- Group chat interface component
- Group member management component
- AI Assistant icon component in header
- AI Assistant chat interface component
- AI Assistant dedicated page with conversational UI
- Real-time streaming response display for AI Assistant
- Client panel interface component (Admin access only)
- Client account management component
- Project update interface component
- Client-facing project view component
- Payment level configuration component
- Invoice generation and management component
- Payment processing interface component
- Invoice viewing and payment component for client panel

### 4.2 Backend
- PHP backend implementation with MySQL database
- RESTful API architecture
- JWT authentication
- Role-based access control
- Input validation
- Error handling
- Secure endpoint protection
- Task timer API endpoints for play/pause actions
- Admin password change API endpoint
- Department and designation management API endpoints
- User filtering by department API endpoint
- Group chat creation and management API endpoints
- Group member management API endpoints
- AI Assistant API integration endpoints with universal secret API key authentication
- Real-time AI response streaming endpoints
- AI chat history storage and retrieval endpoints
- Secure API key management and environment variable configuration
- Client account creation and management API endpoints
- Client panel access control API endpoints
- Project update API endpoints
- Client-facing project data API endpoints
- Payment level configuration API endpoints
- Invoice generation and management API endpoints
- Payment processing API endpoints
- Invoice retrieval API endpoints for client panel
- Direct MySQL database connection using PHP mysqli or PDO
- No external database services or third-party database platforms
- Data migration API endpoints or scripts for Supabase to MySQL transfer

### 4.3 Database
- MySQL database with .sql file format
- Normalized relational schema
- Optimized queries and indexes
- Task time logs table with timestamps
- Departments table with department details
- Designations table with designation details and department relationships
- Group chats table with group details
- Group chat members table with member relationships
- AI chat history table for storing user conversations with AI Assistant
- Projects table with project details
- Project assignments table linking clients to projects
- Client accounts table with credentials
- Project updates table for admin-posted updates
- Project documents table for file management
- Payment levels table with level criteria and amounts
- Invoices table with invoice details and status
- Payments table with payment records
- Payment receipts table with receipt details
- Database schema provided as .sql file for easy import and setup
- Direct MySQL connection configuration
- No Supabase or external database service integration

### 4.4 Data Migration
- Supabase data export functionality
- Data transformation scripts to convert Supabase format to MySQL format
- Migration script or tool to transfer data from Supabase to MySQL
- Data validation and verification after migration
- Backup mechanism before migration
- Rollback capability in case of migration failure
- Migration documentation with step-by-step instructions

## 5. Development Deliverables
- Complete frontend admin panel
- Complete frontend HR panel
- Complete frontend Employee panel
- Client panel interface (accessible through Admin login)
- Backend API implementation in PHP with direct MySQL connection
- MySQL database schema design in .sql file format
- Sample seed data
- Environment setup documentation
- Deployment-ready codebase
- AI Assistant integration documentation with API key configuration guide
- Universal secret API key setup instructions
- Client account management implementation
- Client panel access control implementation
- Payroll system implementation with achievement-based payment levels
- Invoice generation and management implementation
- Payment processing implementation
- PHP MySQL connection configuration guide
- Database connection setup instructions without Supabase
- Data migration script or tool for importing Supabase data to MySQL
- Data migration documentation and guide