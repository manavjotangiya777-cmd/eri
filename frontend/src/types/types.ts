export type UserRole = 'admin' | 'hr' | 'employee' | 'client' | 'bde';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type ClientStatus = 'active' | 'inactive';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Designation {
  id: string;
  department_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: UserRole;
  department: string | null;
  designation_id: string | null;
  date_of_birth: string | null;
  hire_date: string | null;
  avatar_url: string | null;
  is_active: boolean;
  skip_ip_restriction: boolean;
  client_id: string | null;
  shift_type: 'full_day' | 'half_day';
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_name: string;
  contact_person: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: ClientStatus;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  assigned_to: string | null;
  client_id: string | null;
  created_by: string | null;
  total_time_spent: number; // in seconds
  created_at: string;
  updated_at: string;
}

export interface TaskTimeLog {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration: number; // in seconds
  created_at: string;
  updated_at: string;
}

export interface AttendanceSession {
  clockInAt: string;
  clockOutAt: string | null;
  durationSeconds: number;
}

export interface AttendanceBreak {
  breakInAt: string;
  breakOutAt: string | null;
  durationSeconds: number;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  status: 'working' | 'on_break' | 'clocked_out';
  sessions: AttendanceSession[];
  breaks: AttendanceBreak[];
  totals: {
    totalClockSeconds: number;
    totalBreakSeconds: number;
    workSeconds: number;
  };
  lastClockInAt: string | null;
  currentSessionOpen: boolean;
  currentBreakOpen: boolean;
  is_late: boolean;
  late_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Leave {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  client_id?: string | null;
  visibility: 'employees' | 'clients' | 'public';
  created_at: string;
}


export interface PaymentMilestone {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  amount: number;
  status: 'pending' | 'completed' | 'paid';
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  milestone_id: string | null;
  invoice_number: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  participant_1: string | null;
  participant_2: string | null;
  chat_type: 'direct' | 'group';
  group_name: string | null;
  group_description: string | null;
  created_by: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: string;
  is_admin: boolean;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  is_read: boolean;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  company_name: string;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  work_start_time: string;
  work_end_time: string;
  lunch_start_time: string;
  lunch_end_time: string;
  work_hours_per_day: number;
  late_threshold_minutes: number;
  half_day_start_time: string;
  half_day_end_time: string;
  half_day_late_threshold: number;
  half_day_work_hours: number;
  invoice_template: string | null;
  updated_at: string;
}

export interface AllowedNetwork {
  id: string;
  ip_address: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalUsers?: number;
  totalClients?: number;
  totalTasks?: number;
  pendingLeaves?: number;
  todayAttendance?: number;
  myTasks?: number;
  pendingTasks?: number;
  completedTasks?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  target_role: 'all' | 'admin' | 'hr' | 'employee' | 'client';
  target_user: string | null;
  type: 'system' | 'announcement' | 'birthday' | 'task' | 'attendance' | 'leave';
  is_read_by: string[];
  created_at: string;
  created_by: string | null;
}
