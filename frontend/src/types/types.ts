export type UserRole = 'admin' | 'hr' | 'employee' | 'client' | 'bde';
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'on_hold' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WarningSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Warning {
  id: string;
  title: string;
  message: string;
  severity: WarningSeverity;
  target_role: 'all' | 'employee' | 'bde' | 'hr' | 'individual';
  user_id: string | null;
  created_by: any | null; // Profile object if populated
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskWorkUpdate {
  _id?: string;
  text: string;
  updated_by?: string | null;
  updated_at?: string;
}

export interface TaskAttachment {
  _id?: string;
  name: string;
  url: string;
  type: 'file' | 'link';
}

export type FollowUpStatus = 'pending' | 'in_followup' | 'waiting_client' | 'completed';
export type FollowUpTaskType =
  | 'update_levanu'
  | 'work_karavanu'
  | 'document_collect'
  | 'client_followup'
  | 'payment_followup'
  | 'internal_coordination';
export type FollowUpCommunicationMethod = 'call' | 'whatsapp' | 'email' | 'meeting' | 'other';
export type FollowUpRelatedType = 'client' | 'employee' | 'vendor' | 'department' | 'other';

export interface FollowUpUpdateNote {
  _id?: string;
  text: string;
  noted_by?: string | null;
  noted_at?: string;
}

export interface FollowUp {
  id: string;
  followup_id: string | null;
  title: string;
  task_type: FollowUpTaskType;
  related_name: string | null;
  related_type: FollowUpRelatedType;
  assigned_to: string | null;
  assigned_by: string | null;
  description: string | null;
  required_items: string[];
  communication_method: FollowUpCommunicationMethod;
  deadline: string | null;
  next_action_date: string | null;
  status: FollowUpStatus;
  update_notes: FollowUpUpdateNote[];
  related_task_id: string | null;
  created_at: string;
  updated_at: string;
}
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
  salary_per_month: number;
  created_at: string;
  updated_at: string;
}

export interface Salary {
  id: string;
  user_id: string;
  user?: Profile;
  month: number;
  year: number;

  // Earnings
  basic_salary: number;
  hra: number;
  allowances: number;
  bonus: number;
  incentives: number;

  // Attendance
  total_working_days: number;
  leave_days: number;
  late_entries: number;

  // Deductions
  leave_deductions: number;
  late_penalty: number;
  pf: number;
  other_deductions: number;

  // Summaries
  gross_salary: number;
  total_deductions: number;
  net_salary: number;

  status: 'pending' | 'paid' | 'cancelled';
  payment_method: 'bank_transfer' | 'cash' | 'cheque' | 'other';
  payment_date: string | null;
  transaction_id: string | null;
  notes: string | null;
  pdf_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientSector = 'B2B' | 'B2C' | 'D2C' | 'Other';
export type ClientIndustry = 'Government' | 'Institutional' | 'Private' | 'Other';

export interface Client {
  id: string;
  company_name: string;
  contact_person: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  sector: ClientSector;
  industry: ClientIndustry;
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
  task_id: string | null;
  title: string;
  description: string | null;
  department: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  start_date: string | null;
  deadline: string | null;
  completion_date: string | null;
  estimated_time: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  client_id: string | null;
  created_by: string | null;
  requirements: string[];
  attachments: TaskAttachment[];
  work_updates: TaskWorkUpdate[];
  review_notes: string | null;
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
  day_type?: 'full_day' | 'half_day';
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  hr_comment?: string | null;
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
  company_logo: string | null;
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
export interface CashFlow {
  id: string;
  type: 'inflow' | 'outflow';
  category: string;
  amount: number;
  date: string;
  payment_mode: 'Cash' | 'Bank' | 'UPI' | 'Other';
  client_id?: string | { id: string, company_name: string };
  invoice_id?: string | { id: string, invoice_number: string };
  salary_id?: string;
  paid_to?: string;
  received_by?: string | Profile;
  approved_by?: string | Profile;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CashFlowDashboardStats {
  total_inflow: number;
  total_outflow: number;
  net_cash: number;
}
