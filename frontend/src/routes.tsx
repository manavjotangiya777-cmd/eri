import type { ReactNode } from 'react';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import RoleRedirect from './pages/RoleRedirect';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import ClientManagement from './pages/admin/ClientManagement';
import TaskManagement from './pages/admin/TaskManagement';
import InvoiceManagement from './pages/admin/InvoiceManagement';
import AttendanceOverview from './pages/admin/AttendanceOverview';
import SystemSettings from './pages/admin/SystemSettings';
import NetworkSecurity from './pages/admin/NetworkSecurity';
import ChatPage from './pages/admin/ChatPage';
import ClientSupportChatPage from './pages/admin/ClientSupportChatPage';
import AbsenceRecordPage from './pages/admin/AbsenceRecordPage';
import AdminLeaveRequests from './pages/admin/AdminLeaveRequests';
import AdminLayout from './components/layouts/AdminLayout';
import HRLayout from './components/layouts/HRLayout';
import BDELayout from './components/layouts/BDELayout';
import AiAssistantPage from './pages/AiAssistantPage';

import HRDashboard from './pages/hr/HRDashboard';
import HREmployeeManagement from './pages/hr/HREmployeeManagement';
import HRClientManagement from './pages/hr/HRClientManagement';
import HRTaskManagement from './pages/hr/HRTaskManagement';
import HRLeaveManagement from './pages/hr/HRLeaveManagement';
import HRContentManagement from './pages/hr/HRContentManagement';
import HRAttendanceManagement from './pages/hr/HRAttendanceManagement';
import HRChatPage from './pages/hr/HRChatPage';

import BDEDashboard from './pages/bde/BDEDashboard';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeAttendanceReport from './pages/employee/EmployeeAttendanceReport';
import EmployeeTasks from './pages/employee/EmployeeTasks';
import EmployeeLeave from './pages/employee/EmployeeLeave';
import EmployeeInfo from './pages/employee/EmployeeInfo';
import EmployeeChat from './pages/employee/EmployeeChat';

import ClientDashboard from './pages/client/ClientDashboard';
import ClientTasksPage from './pages/client/ClientTasksPage';
import ClientBillingPage from './pages/client/ClientBillingPage';
import ClientChatPage from './pages/client/ClientChatPage';
import ClientDocumentsPage from './pages/client/ClientDocumentsPage';
import ProfilePage from './pages/ProfilePage';

interface RouteConfig {
  name?: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    path: '/',
    element: <RoleRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  // Admin routes - only accessible by admin role
  {
    name: 'Admin Dashboard',
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>,
  },
  {
    name: 'User Management',
    path: '/admin/users',
    element: <ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>,
  },
  {
    name: 'Department Management',
    path: '/admin/departments',
    element: <ProtectedRoute allowedRoles={['admin']}><DepartmentManagement /></ProtectedRoute>,
  },
  {
    name: 'Client Management',
    path: '/admin/clients',
    element: <ProtectedRoute allowedRoles={['admin']}><ClientManagement /></ProtectedRoute>,
  },
  {
    name: 'Task Management',
    path: '/admin/tasks',
    element: <ProtectedRoute allowedRoles={['admin']}><TaskManagement /></ProtectedRoute>,
  },
  {
    name: 'Invoice Management',
    path: '/admin/invoices',
    element: <ProtectedRoute allowedRoles={['admin']}><InvoiceManagement /></ProtectedRoute>,
  },
  {
    name: 'Attendance Overview',
    path: '/admin/attendance',
    element: <ProtectedRoute allowedRoles={['admin']}><AttendanceOverview /></ProtectedRoute>,
  },
  {
    name: 'Network Security',
    path: '/admin/network-security',
    element: <ProtectedRoute allowedRoles={['admin']}><NetworkSecurity /></ProtectedRoute>,
  },
  {
    name: 'Chat',
    path: '/admin/chat',
    element: <ProtectedRoute allowedRoles={['admin']}><ChatPage /></ProtectedRoute>,
  },
  {
    name: 'HR Leave Requests',
    path: '/admin/hr-leaves',
    element: <ProtectedRoute allowedRoles={['admin']}><AdminLeaveRequests /></ProtectedRoute>,
  },
  {
    name: 'Settings',
    path: '/admin/settings',
    element: <ProtectedRoute allowedRoles={['admin']}><SystemSettings /></ProtectedRoute>,
  },
  {
    name: 'AI Assistant',
    path: '/admin/ai-assistant',
    element: <ProtectedRoute allowedRoles={['admin']}><AiAssistantPage /></ProtectedRoute>,
  },
  {
    name: 'Client Support',
    path: '/admin/client-support',
    element: <ProtectedRoute allowedRoles={['admin']}><ClientSupportChatPage Layout={AdminLayout} /></ProtectedRoute>,
  },
  {
    name: 'Absence Records',
    path: '/admin/absences',
    element: <ProtectedRoute allowedRoles={['admin']}><AbsenceRecordPage Layout={AdminLayout} /></ProtectedRoute>,
  },
  {
    path: '/admin/profile',
    element: <ProtectedRoute allowedRoles={['admin']}><ProfilePage /></ProtectedRoute>,
  },
  // HR routes - only accessible by hr role
  {
    name: 'HR Dashboard',
    path: '/hr',
    element: <ProtectedRoute allowedRoles={['hr']}><HRDashboard /></ProtectedRoute>,
  },
  {
    name: 'Employee Management',
    path: '/hr/employees',
    element: <ProtectedRoute allowedRoles={['hr']}><HREmployeeManagement /></ProtectedRoute>,
  },
  {
    name: 'Client Management',
    path: '/hr/clients',
    element: <ProtectedRoute allowedRoles={['hr']}><HRClientManagement /></ProtectedRoute>,
  },
  {
    name: 'Task Management',
    path: '/hr/tasks',
    element: <ProtectedRoute allowedRoles={['hr']}><HRTaskManagement /></ProtectedRoute>,
  },
  {
    name: 'Leave Management',
    path: '/hr/leaves',
    element: <ProtectedRoute allowedRoles={['hr']}><HRLeaveManagement /></ProtectedRoute>,
  },
  {
    name: 'Attendance Management',
    path: '/hr/attendance',
    element: <ProtectedRoute allowedRoles={['hr']}><HRAttendanceManagement /></ProtectedRoute>,
  },
  {
    name: 'Content Management',
    path: '/hr/content',
    element: <ProtectedRoute allowedRoles={['hr']}><HRContentManagement /></ProtectedRoute>,
  },
  {
    name: 'Chat',
    path: '/hr/chat',
    element: <ProtectedRoute allowedRoles={['hr']}><HRChatPage /></ProtectedRoute>,
  },
  {
    name: 'AI Assistant',
    path: '/hr/ai-assistant',
    element: <ProtectedRoute allowedRoles={['hr']}><AiAssistantPage /></ProtectedRoute>,
  },
  {
    name: 'Absence Records',
    path: '/hr/absences',
    element: <ProtectedRoute allowedRoles={['hr']}><AbsenceRecordPage Layout={HRLayout} /></ProtectedRoute>,
  },
  {
    path: '/hr/profile',
    element: <ProtectedRoute allowedRoles={['hr']}><ProfilePage /></ProtectedRoute>,
  },
  // Employee routes - only accessible by employee role
  {
    name: 'Employee Dashboard',
    path: '/employee',
    element: <ProtectedRoute allowedRoles={['employee']}><EmployeeDashboard /></ProtectedRoute>,
  },
  {
    name: 'Attendance Report',
    path: '/employee/attendance-report',
    element: <ProtectedRoute allowedRoles={['employee']}><EmployeeAttendanceReport /></ProtectedRoute>,
  },
  {
    path: '/employee/tasks',
    element: <ProtectedRoute allowedRoles={['employee']}><EmployeeTasks /></ProtectedRoute>,
  },
  {
    path: '/employee/leave',
    element: <ProtectedRoute allowedRoles={['employee']}><EmployeeLeave /></ProtectedRoute>,
  },
  {
    path: '/employee/info',
    element: <ProtectedRoute allowedRoles={['employee']}><EmployeeInfo /></ProtectedRoute>,
  },
  {
    path: '/employee/chat',
    element: <ProtectedRoute allowedRoles={['employee']}><EmployeeChat /></ProtectedRoute>,
  },
  {
    name: 'AI Assistant',
    path: '/employee/ai-assistant',
    element: <ProtectedRoute allowedRoles={['employee']}><AiAssistantPage /></ProtectedRoute>,
  },
  {
    path: '/employee/profile',
    element: <ProtectedRoute allowedRoles={['employee']}><ProfilePage /></ProtectedRoute>,
  },
  // Client routes - only accessible by client role
  {
    name: 'Client Dashboard',
    path: '/client',
    element: <ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>,
  },
  {
    name: 'My Projects',
    path: '/client/projects',
    element: <ProtectedRoute allowedRoles={['client']}><ClientTasksPage /></ProtectedRoute>,
  },
  {
    name: 'Billing',
    path: '/client/billing',
    element: <ProtectedRoute allowedRoles={['client']}><ClientBillingPage /></ProtectedRoute>,
  },
  {
    name: 'Documents',
    path: '/client/documents',
    element: <ProtectedRoute allowedRoles={['client']}><ClientDocumentsPage /></ProtectedRoute>,
  },
  {
    name: 'Support Chat',
    path: '/client/chat',
    element: <ProtectedRoute allowedRoles={['client']}><ClientChatPage /></ProtectedRoute>,
  },
  {
    name: 'AI Assistant',
    path: '/client/ai-assistant',
    element: <ProtectedRoute allowedRoles={['client']}><AiAssistantPage /></ProtectedRoute>,
  },
  {
    path: '/client/profile',
    element: <ProtectedRoute allowedRoles={['client']}><ProfilePage /></ProtectedRoute>,
  },
  // BDE routes
  {
    name: 'BDE Dashboard',
    path: '/bde',
    element: <ProtectedRoute allowedRoles={['bde']}><BDEDashboard /></ProtectedRoute>,
  },
  {
    name: 'Client Management',
    path: '/bde/clients',
    element: <ProtectedRoute allowedRoles={['bde']}><ClientManagement Layout={BDELayout} /></ProtectedRoute>,
  },
  {
    name: 'Invoice Management',
    path: '/bde/invoices',
    element: <ProtectedRoute allowedRoles={['bde']}><InvoiceManagement Layout={BDELayout} /></ProtectedRoute>,
  },
  {
    name: 'Client Support',
    path: '/bde/client-support',
    element: <ProtectedRoute allowedRoles={['bde']}><ClientSupportChatPage Layout={BDELayout} /></ProtectedRoute>,
  },
  {
    name: 'My Tasks',
    path: '/bde/tasks',
    element: <ProtectedRoute allowedRoles={['bde']}><EmployeeTasks Layout={BDELayout} /></ProtectedRoute>,
  },
  {
    name: 'Attendance Report',
    path: '/bde/attendance-report',
    element: <ProtectedRoute allowedRoles={['bde']}><EmployeeAttendanceReport Layout={BDELayout} /></ProtectedRoute>,
  },
  {
    name: 'Chat',
    path: '/bde/chat',
    element: <ProtectedRoute allowedRoles={['bde']}><EmployeeChat Layout={BDELayout} /></ProtectedRoute>,
  },
  {
    name: 'AI Assistant',
    path: '/bde/ai-assistant',
    element: <ProtectedRoute allowedRoles={['bde']}><AiAssistantPage /></ProtectedRoute>,
  },
  {
    path: '/bde/profile',
    element: <ProtectedRoute allowedRoles={['bde']}><ProfilePage /></ProtectedRoute>,
  },
  {
    path: '/404',
    element: <NotFound />,
  },
];

export default routes;
