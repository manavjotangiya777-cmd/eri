import { API_URL } from '@/config';
import { mockDb } from './mockDb';
import type {
  Profile,
  Client,
  ClientNote,
  Task,
  TaskTimeLog,
  Attendance,
  Leave,
  Holiday,
  Announcement,
  Document,
  Chat,
  ChatMember,
  Message,
  SystemSettings,
  Department,
  Designation,
  PaymentMilestone,
  Invoice,
  AllowedNetwork,
  Notification,
} from '@/types';

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper for fetch with Mock Fallback
const calculateAttendanceStats = (record: any, settings: any) => {
  const { clock_in, clock_out, date } = record;
  let is_late = record.is_late || false;
  let late_minutes = record.late_minutes || 0;
  let actual_work_hours = record.actual_work_hours || 0;
  let overtime_hours = record.overtime_hours || 0;
  let is_early_departure = record.is_early_departure || false;

  const now_in = clock_in ? new Date(clock_in) : null;
  const now_out = clock_out ? new Date(clock_out) : null;

  if (now_in && settings && settings.work_start_time) {
    const [h, m, s] = settings.work_start_time.split(':').map(Number);
    const workStart = new Date(now_in);
    workStart.setHours(h, m, s || 0, 0);

    const threshold = settings.late_threshold_minutes || 0;
    const lateThreshold = new Date(workStart.getTime() + threshold * 60 * 1000);

    if (now_in > lateThreshold) {
      is_late = true;
      late_minutes = Math.floor((now_in.getTime() - workStart.getTime()) / (1000 * 60));
    } else {
      is_late = false;
      late_minutes = 0;
    }
  }

  if (now_in && now_out) {
    const diffMs = now_out.getTime() - now_in.getTime();
    let workMs = diffMs;

    if (settings && settings.lunch_start_time && settings.lunch_end_time) {
      const [lsH, lsM] = settings.lunch_start_time.split(':').map(Number);
      const [leH, leM] = settings.lunch_end_time.split(':').map(Number);

      const lunchStart = new Date(now_in);
      lunchStart.setHours(lsH, lsM, 0, 0);
      const lunchEnd = new Date(now_in);
      lunchEnd.setHours(leH, leM, 0, 0);

      if (now_in < lunchEnd && now_out > lunchStart) {
        const effectiveLunchStart = Math.max(now_in.getTime(), lunchStart.getTime());
        const effectiveLunchEnd = Math.min(now_out.getTime(), lunchEnd.getTime());
        const lunchDuration = Math.max(0, effectiveLunchEnd - effectiveLunchStart);
        workMs -= lunchDuration;
      }
    } else if (diffMs > 4 * 60 * 60 * 1000) {
      workMs -= 60 * 60 * 1000;
    }

    actual_work_hours = Math.max(0, workMs / (1000 * 60 * 60));

    if (settings) {
      if (settings.work_end_time) {
        const [weH, weM] = settings.work_end_time.split(':').map(Number);
        const workEnd = new Date(now_out);
        workEnd.setHours(weH, weM, 0, 0);
        if (now_out < workEnd) {
          is_early_departure = true;
        } else {
          is_early_departure = false;
        }
      }

      if (settings.work_hours_per_day && actual_work_hours > settings.work_hours_per_day) {
        overtime_hours = actual_work_hours - settings.work_hours_per_day;
      } else {
        overtime_hours = 0;
      }
    }
  }

  return {
    ...record,
    is_late,
    late_minutes,
    actual_work_hours,
    overtime_hours,
    is_early_departure
  };
};

import { apiClient } from '@/lib/api-client';

const fetcher = async (path: string, options: any = {}, table?: string) => {
  try {
    const config = {
      method: options.method || 'GET',
      url: path,
      data: options.body ? JSON.parse(options.body) : undefined,
      params: options.params,
    };

    const response = await apiClient(config);
    return response.data;
  } catch (error: any) {
    // CRITICAL: Disable mock fallback for Chat, Messages, Tasks, and Time Logs
    const isCritical = path.includes('chats') ||
      path.includes('messages') ||
      path.includes('tasks') ||
      path.includes('task_time_logs') ||
      path.includes('attendance') ||
      ['chats', 'messages', 'tasks', 'task_time_logs', 'attendance'].includes(table || '');

    if (isCritical) {
      console.error(`Real API call failed for ${path}:`, error);
      throw error;
    }

    // Fall back to mock data on ANY error in this environment to ensure functionality
    const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
    const url = `${apiClient.defaults.baseURL}/${path}`;
    console.warn(`API call to ${url} failed. Falling back to Mock DB. Error: ${errorMessage}`);


    if (!table) return null;

    try {
      const method = (options.method || 'GET').toUpperCase();
      const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : {};

      if (method === 'POST') {
        // Handle attendance/clock-in specially
        if (path === 'attendance/clock-in') {
          const settings_data = mockDb.get('system_settings');
          const settings = Array.isArray(settings_data) ? settings_data[0] : settings_data;
          const now = body.clock_in ? new Date(body.clock_in) : new Date();
          const today = body.date || getLocalDateString(now);

          const existing = mockDb.get('attendance').find((a: any) => a.user_id === body.user_id && a.date === today);
          if (existing) return existing;

          const newRecord = calculateAttendanceStats({
            ...body,
            date: today,
            clock_in: now.toISOString(),
            clock_out: null,
          }, settings);

          return mockDb.insert('attendance', newRecord);
        }

        // Handle attendance/clock-out specially
        if (path === 'attendance/clock-out') {
          const settings_data = mockDb.get('system_settings');
          const settings = Array.isArray(settings_data) ? settings_data[0] : settings_data;
          const now = body.clock_out ? new Date(body.clock_out) : new Date();
          const today = getLocalDateString(now);

          const existing = mockDb.get('attendance').find((a: any) => a.user_id === body.user_id && a.date === today && !a.clock_out)
            || (mockDb.get('attendance') as any[]).sort((a: any, b: any) => new Date(b.clock_in || 0).getTime() - new Date(a.clock_in || 0).getTime())
              .find((a: any) => a.user_id === body.user_id && !a.clock_out);

          if (existing) {
            const updatedRecord = calculateAttendanceStats({
              ...existing,
              clock_out: now.toISOString(),
            }, settings);

            return mockDb.update('attendance', existing.id, updatedRecord);
          }
          return null;
        }

        // Handle chat/get-or-create specially
        if (path === 'chats/get-or-create') {
          const { target_user_id, current_user_id } = body;
          const allChats = mockDb.get('chats');
          let chat = (allChats as any[]).find((c: any) =>
            c.chat_type === 'direct' &&
            ((c.participant_1 === current_user_id && c.participant_2 === target_user_id) ||
              (c.participant_1 === target_user_id && c.participant_2 === current_user_id))
          );

          if (!chat) {
            chat = mockDb.insert('chats', {
              id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
              chat_type: 'direct',
              participant_1: current_user_id,
              participant_2: target_user_id,
              created_at: new Date().toISOString()
            });
          }
          return chat;
        }

        // Handle messages specifically - update chat's last_message
        if (table === 'messages' && path === 'messages') {
          const msg = mockDb.insert('messages', {
            ...body,
            is_read: false
          });
          if (msg && msg.chat_id) {
            mockDb.update('chats', msg.chat_id, {
              last_message: msg.content,
              last_message_at: msg.created_at
            });
          }
          return msg;
        }

        // Handle mark as read
        if (path.startsWith('messages/read')) {
          return { success: true };
        }

        // Handle group creation
        if (path === 'chats/group') {
          const { group_name, group_description, member_ids } = body;
          const storedUser = localStorage.getItem('user');
          let userId = null;
          try {
            userId = storedUser ? JSON.parse(storedUser).id : null;
          } catch (e) { }

          const chat = mockDb.insert('chats', {
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            chat_type: 'group',
            group_name,
            group_description,
            created_by: userId,
            created_at: new Date().toISOString()
          });

          if (chat && Array.isArray(member_ids)) {
            // Also add the creator as a member
            const allMembers = [...new Set([...member_ids, userId])].filter(Boolean);
            allMembers.forEach((mId: any) => {
              mockDb.insert('chat_members', {
                chat_id: chat.id,
                user_id: mId,
                joined_at: new Date().toISOString(),
                is_admin: mId === userId
              });
            });
          }
          return chat;
        }

        // Generic POST with attendance calculation
        if (table === 'attendance') {
          const settings_data = mockDb.get('system_settings');
          const settings = Array.isArray(settings_data) ? settings_data[0] : settings_data;
          const calculated = calculateAttendanceStats(body, settings);
          return mockDb.insert(table, calculated);
        }

        return mockDb.insert(table, body);
      }

      if (method === 'PUT') {
        const urlParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');
        const id = urlParams.get('id');

        if (id && table === 'attendance') {
          const settings_data = mockDb.get('system_settings');
          const settings = Array.isArray(settings_data) ? settings_data[0] : settings_data;
          const existing = mockDb.find('attendance', id);
          if (existing) {
            const calculated = calculateAttendanceStats({ ...existing, ...body }, settings);
            return mockDb.update(table, id, calculated);
          }
        }

        return id ? mockDb.update(table, id, body) : null;
      }

      if (method === 'DELETE') {
        const urlParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');
        const id = urlParams.get('id');
        if (id) mockDb.delete(table, id);
        return null;
      }

      // GET logic
      if (path.includes('?id=')) {
        const id = path.split('id=')[1].split('&')[0];
        return mockDb.find(table, id);
      }
      if (path.includes('?client_id=')) {
        const clientId = path.split('client_id=')[1].split('&')[0];
        return mockDb.query(table, (item: any) => item.client_id === clientId);
      }
      if (path.includes('?assigned_to=')) {
        const userId = path.split('assigned_to=')[1].split('&')[0];
        return mockDb.query(table, (item: any) => item.assigned_to === userId);
      }
      if (path.includes('?chat_id=')) {
        const chatId = path.split('chat_id=')[1].split('&')[0];
        const results = mockDb.query(table, (item: any) => item.chat_id === chatId);

        // If it's the 'chat_members' table, join with profiles
        if (table === 'chat_members') {
          const profiles = mockDb.get('profiles');
          return (results as any[]).map((m: any) => ({
            ...m,
            profiles: (profiles as any[]).find((p: any) => p.id === m.user_id)
          }));
        }

        return results;
      }
      if (path.includes('?user_id=')) {
        const userId = path.split('user_id=')[1].split('&')[0];
        const results = mockDb.query(table, (item: any) => item.user_id === userId);

        // If it's the 'attendance/today' subroute, return just today's record
        if (path.startsWith('attendance/today')) {
          const today = getLocalDateString();
          return (results as any[]).find((a: any) => a.date === today) || null;
        }

        // Handle chats specifically - check participants or chat_members
        if (table === 'chats') {
          const allChats = mockDb.get('chats');
          const myMemberships = mockDb.query('chat_members', (m: any) => m.user_id === userId);
          const myGroupChatIds = (myMemberships as any[]).map((m: any) => m.chat_id);

          return (allChats as any[]).filter((c: any) =>
            c.participant_1 === userId ||
            c.participant_2 === userId ||
            myGroupChatIds.includes(c.id)
          );
        }

        return results;
      }

      return mockDb.get(table);
    } catch (mockError) {
      console.error('Error in Mock DB fallback:', mockError);
      return Array.isArray(mockDb.get(table)) ? [] : null;
    }
  }
};

// Profiles
export const getProfile = async (id: string) => {
  return await fetcher(`profiles?id=${id}`, {}, 'profiles') as Profile | null;
};

export const getAllProfiles = async () => {
  return await fetcher('profiles?limit=1000', {}, 'profiles') as Profile[];
};

export const updateProfile = async (id: string, updates: Partial<Profile>) => {
  return await fetcher(`profiles?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'profiles') as Profile | null;
};

export const deleteProfile = async (id: string) => {
  await fetcher(`profiles?id=${id}`, { method: 'DELETE' }, 'profiles');
};

export const getProfilesByRole = async (role: string) => {
  return await fetcher(`profiles?role=${role}`, {}, 'profiles') as Profile[];
};

// Clients
export const getAllClients = async () => {
  return await fetcher('clients', {}, 'clients') as Client[];
};

export const getClient = async (id: string) => {
  return await fetcher(`clients?id=${id}`, {}, 'clients') as Client | null;
};

export const createClient = async (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
  return await fetcher('clients', {
    method: 'POST',
    body: JSON.stringify(client),
  }, 'clients') as Client | null;
};

export const updateClient = async (id: string, updates: Partial<Client>) => {
  return await fetcher(`clients?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'clients') as Client | null;
};

export const deleteClient = async (id: string) => {
  await fetcher(`clients?id=${id}`, { method: 'DELETE' }, 'clients');
};

// Client Notes
export const getClientNotes = async (clientId: string) => {
  return await fetcher(`client_notes?client_id=${clientId}`, {}, 'client_notes') as ClientNote[];
};

export const createClientNote = async (note: Omit<ClientNote, 'id' | 'created_at'>) => {
  return await fetcher('client_notes', {
    method: 'POST',
    body: JSON.stringify(note),
  }, 'client_notes') as ClientNote | null;
};

// Payment Milestones
export const getClientMilestones = async (clientId: string) => {
  return await fetcher(`milestones?client_id=${clientId}`, {}, 'milestones') as PaymentMilestone[];
};

export const createMilestone = async (milestone: Omit<PaymentMilestone, 'id' | 'created_at' | 'updated_at'>) => {
  return await fetcher('milestones', {
    method: 'POST',
    body: JSON.stringify(milestone),
  }, 'milestones') as PaymentMilestone | null;
};

export const updateMilestone = async (id: string, updates: Partial<PaymentMilestone>) => {
  return await fetcher(`milestones?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'milestones') as PaymentMilestone | null;
};

export const deleteMilestone = async (id: string) => {
  await fetcher(`milestones?id=${id}`, { method: 'DELETE' }, 'milestones');
};

// Invoices
export const getAllInvoices = async () => {
  return await fetcher('invoices', {}, 'invoices') as Invoice[];
};

export const getClientInvoices = async (clientId: string) => {
  return await fetcher(`invoices?client_id=${clientId}`, {}, 'invoices') as Invoice[];
};

export const createInvoice = async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
  return await fetcher('invoices', {
    method: 'POST',
    body: JSON.stringify(invoice),
  }, 'invoices') as Invoice | null;
};

export const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
  return await fetcher(`invoices?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'invoices') as Invoice | null;
};

export const deleteInvoice = async (id: string) => {
  await fetcher(`invoices?id=${id}`, { method: 'DELETE' }, 'invoices');
};

// Tasks
export const getAllTasks = async () => {
  return await fetcher('tasks', {}, 'tasks') as Task[];
};

export const getMyTasks = async (userId: string) => {
  return await fetcher(`tasks?assigned_to=${userId}`, {}, 'tasks') as Task[];
};

export const getEmployeeTasks = async (userId: string) => {
  return await fetcher(`tasks?assigned_to=${userId}`, {}, 'tasks') as Task[];
};

export const getClientTasks = async (clientId: string) => {
  return await fetcher(`tasks?client_id=${clientId}`, {}, 'tasks') as Task[];
};

export const createTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
  return await fetcher('tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }, 'tasks') as Task | null;
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
  return await fetcher(`tasks?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'tasks') as Task | null;
};

export const updateTaskStatus = async (taskId: string, status: any) => {
  return await updateTask(taskId, { status });
};

export const deleteTask = async (id: string) => {
  await fetcher(`tasks?id=${id}`, { method: 'DELETE' }, 'tasks');
};

// Attendance
export const getTodayAttendance = async (userId: string) => {
  return await fetcher(`attendance/today?user_id=${userId}`, {}, 'attendance') as Attendance | null;
};

export const getMyAttendance = async (userId: string, limit = 30) => {
  return await fetcher(`attendance?user_id=${userId}&limit=${limit}`, {}, 'attendance') as Attendance[];
};

export const getAllAttendance = async (limit = 100, from?: string, to?: string) => {
  let query = `attendance?limit=${limit}`;
  if (from) query += `&from=${from}`;
  if (to) query += `&to=${to}`;
  return await fetcher(query, {}, 'attendance') as Attendance[];
};

export const clockIn = async (userId: string) => {
  return await fetcher('attendance/clock-in', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }, 'attendance') as Attendance | null;
};

export const clockOut = async (userId: string) => {
  return await fetcher('attendance/clock-out', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }, 'attendance') as Attendance | null;
};

export const breakIn = async (userId: string) => {
  return await fetcher('attendance/break-in', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }, 'attendance') as Attendance | null;
};

export const breakOut = async (userId: string) => {
  return await fetcher('attendance/break-out', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }, 'attendance') as Attendance | null;
};

export const updateAttendance = async (id: string, updates: Partial<Attendance>) => {
  return await fetcher(`attendance?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'attendance') as Attendance | null;
};

export const createAttendance = async (attendance: any) => {
  return await fetcher('attendance', {
    method: 'POST',
    body: JSON.stringify(attendance),
  }, 'attendance') as Attendance | null;
};

export const deleteAttendance = async (id: string) => {
  await fetcher(`attendance?id=${id}`, { method: 'DELETE' }, 'attendance');
};

// Leaves
export const getMyLeaves = async (userId: string) => {
  return await fetcher(`leaves?user_id=${userId}`, {}, 'leaves') as Leave[];
};

export const getEmployeeLeaves = async (userId: string) => {
  return await getMyLeaves(userId);
};

export const getAllLeaves = async () => {
  return await fetcher('leaves', {}, 'leaves') as Leave[];
};

export const createLeave = async (leave: Omit<Leave, 'id' | 'created_at' | 'updated_at' | 'reviewed_by' | 'reviewed_at'>) => {
  return await fetcher('leaves', {
    method: 'POST',
    body: JSON.stringify(leave),
  }, 'leaves') as Leave | null;
};

export const updateLeave = async (id: string, updates: Partial<Leave>) => {
  return await fetcher(`leaves?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'leaves') as Leave | null;
};

// Holidays
export const getAllHolidays = async () => {
  return await fetcher('holidays', {}, 'holidays') as Holiday[];
};

export const createHoliday = async (holiday: Omit<Holiday, 'id' | 'created_at'>) => {
  return await fetcher('holidays', {
    method: 'POST',
    body: JSON.stringify(holiday),
  }, 'holidays') as Holiday | null;
};

export const deleteHoliday = async (id: string) => {
  await fetcher(`holidays?id=${id}`, { method: 'DELETE' }, 'holidays');
};

// Announcements
export const getAllAnnouncements = async () => {
  return await fetcher('announcements', {}, 'announcements') as Announcement[];
};

export const createAnnouncement = async (announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => {
  return await fetcher('announcements', {
    method: 'POST',
    body: JSON.stringify(announcement),
  }, 'announcements') as Announcement | null;
};

export const getMyAnnouncements = async (profile: Profile) => {
  return await fetcher(`announcements/my?user_id=${profile.id}&role=${profile.role}`, {}, 'announcements') as Announcement[];
};

export const deleteAnnouncement = async (id: string) => {
  await fetcher(`announcements?id=${id}`, { method: 'DELETE' }, 'announcements');
};

// Documents
export const getAllDocuments = async () => {
  return await fetcher('documents', {}, 'documents') as Document[];
};

export const createDocument = async (document: Omit<Document, 'id' | 'created_at'>) => {
  return await fetcher('documents', {
    method: 'POST',
    body: JSON.stringify(document),
  }, 'documents') as Document | null;
};

export const getMyDocuments = async (profile: Profile) => {
  return await fetcher(`documents/my?user_id=${profile.id}&role=${profile.role}`, {}, 'documents') as Document[];
};

export const deleteDocument = async (id: string) => {
  await fetcher(`documents?id=${id}`, { method: 'DELETE' }, 'documents');
};

// Chats & Messages
export const getCommonChat = async (userId?: string) => {
  return await fetcher(`chats/common?user_id=${userId || ''}`, {}, 'chats') as Chat;
};

export const getMyChats = async (userId?: string) => {
  return await fetcher(`chats?user_id=${userId || ''}`, {}, 'chats') as Chat[];
};

export const getChatMessages = async (chatId: string) => {
  return await fetcher(`messages?chat_id=${chatId}`, {}, 'messages') as Message[];
};

export const sendMessage = async (data: {
  chat_id: string;
  sender_id: string;
  content?: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
}) => {
  return await fetcher('messages', {
    method: 'POST',
    body: JSON.stringify(data),
  }, 'messages') as Message | null;
};

export const getOrCreateChat = async (targetUserId: string, currentUserId: string) => {
  return (await fetcher('chats/get-or-create', {
    method: 'POST',
    body: JSON.stringify({ target_user_id: targetUserId, current_user_id: currentUserId }),
  }, 'chats')) as Chat;
};

export const adminCreateUser = async (data: any) => {
  return await fetcher('admin/create-user', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const adminChangePassword = async (data: any) => {
  return await fetcher('admin/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const uploadFile = async (file: File): Promise<{ success: true; url: string } | { success: false; error: string }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'Upload failed'
    };
  }
};

export const markMessagesAsRead = async (chatId: string, userId: string) => {
  const res = await fetcher(`messages/read?chat_id=${chatId}&user_id=${userId}`, { method: 'POST' }, 'messages');
  // Dispatch a custom event so layouts can update unread count immediately
  window.dispatchEvent(new CustomEvent('chat-read', { detail: { chatId } }));
  return res;
};

export const getChatUnreadCount = async (userId: string) => {
  const res = await fetcher(`messages/unread-count?user_id=${userId}`, {}, 'messages');
  return res?.count || 0;
};

export const createOneToOneChat = async (targetUserId: string, currentUserId: string) => {
  return await getOrCreateChat(targetUserId, currentUserId);
};

export const createGroupChat = async (groupName: string, groupDescription: string, memberIds: string[]) => {
  return await fetcher('chats/group', {
    method: 'POST',
    body: JSON.stringify({ group_name: groupName, member_ids: memberIds, group_description: groupDescription }),
  }, 'chats') as Chat | null;
};

export const getChatMembers = async (chatId: string) => {
  return await fetcher(`chat_members?chat_id=${chatId}`, {}, 'chat_members') as any[];
};

export const addChatMember = async (chatId: string, userId: string) => {
  return await fetcher('chat_members', {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, user_id: userId }),
  }, 'chat_members');
};

export const removeChatMember = async (chatId: string, userId: string) => {
  return await fetcher(`chat_members?chat_id=${chatId}&user_id=${userId}`, { method: 'DELETE' }, 'chat_members');
};

export const updateGroupChat = async (chatId: string, updates: { group_name?: string; group_description?: string }) => {
  return await fetcher(`chats?id=${chatId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'chats') as Chat | null;
};

export const leaveGroupChat = async (chatId: string, userId?: string) => {
  return await fetcher(`chats/leave?chat_id=${chatId}`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }, 'chats');
};

export const createGroupChatAsAdmin = async (
  groupName: string,
  groupDescription: string,
  memberIds: string[],
  createdBy: string
) => {
  return await fetcher('chats/group', {
    method: 'POST',
    body: JSON.stringify({
      group_name: groupName,
      group_description: groupDescription,
      member_ids: memberIds,
      created_by: createdBy,
    }),
  }, 'chats') as Chat | null;
};

// System Settings
export const getSystemSettings = async () => {
  const data = await fetcher('system_settings', {}, 'system_settings');
  if (Array.isArray(data)) return data[0] || null;
  return data as SystemSettings | null;
};

export const updateSystemSettings = async (updates: Partial<SystemSettings>) => {
  return await fetcher('system_settings', {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'system_settings') as SystemSettings | null;
};

// Dashboard Stats
export const getDashboardStats = async (userId: string, role: string) => {
  try {
    const data = await fetcher(`dashboard_stats?user_id=${userId}&role=${role}`) as Record<string, number>;
    if (!data) throw new Error('No data received');
    return data;
  } catch (error) {
    return {
      totalUsers: 0,
      totalClients: 0,
      totalTasks: 0,
      pendingLeaves: 0,
      myTasks: 0,
      pendingTasks: 0,
      completedTasks: 0
    };
  }
};

// Departments
export const getAllDepartments = async () => {
  return await fetcher('departments', {}, 'departments') as Department[];
};

export const getActiveDepartments = async () => {
  return await getAllDepartments();
};

export const createDepartment = async (department: Partial<Department>) => {
  return await fetcher('departments', {
    method: 'POST',
    body: JSON.stringify(department),
  }, 'departments') as Department | null;
};

export const updateDepartment = async (id: string, updates: Partial<Department>) => {
  return await fetcher(`departments?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'departments') as Department | null;
};

export const deleteDepartment = async (id: string) => {
  await fetcher(`departments?id=${id}`, { method: 'DELETE' }, 'departments');
};

// Designations
export const getAllDesignations = async () => {
  return await fetcher('designations', {}, 'designations') as (Designation & { departments: { name: string } | null })[];
};

export const getActiveDesignations = async () => {
  return await getAllDesignations();
};

export const getDesignationsByDepartment = async (departmentId: string) => {
  return await fetcher(`designations?department_id=${departmentId}`, {}, 'designations') as Designation[];
};

export const createDesignation = async (designation: Partial<Designation>) => {
  return await fetcher('designations', {
    method: 'POST',
    body: JSON.stringify(designation),
  }, 'designations') as Designation | null;
};

export const updateDesignation = async (id: string, updates: Partial<Designation>) => {
  return await fetcher(`designations?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'designations') as Designation | null;
};

export const deleteDesignation = async (id: string) => {
  await fetcher(`designations?id=${id}`, { method: 'DELETE' }, 'designations');
};

// Task Time Logs
export const startTaskTimer = async (taskId: string, userId: string) => {
  return await fetcher('task_time_logs/start', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, user_id: userId }),
  }, 'task_time_logs') as TaskTimeLog | null;
};

export const pauseTaskTimer = async (taskId: string, userId: string) => {
  return await fetcher('task_time_logs/pause', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, user_id: userId }),
  }, 'task_time_logs') as TaskTimeLog | null;
};

export const getActiveTimer = async (userId: string) => {
  return await fetcher(`task_time_logs/active?user_id=${userId}`, {}, 'task_time_logs') as (TaskTimeLog & { tasks: { title: string } }) | null;
};

export const getTaskTimeLogs = async (taskId: string) => {
  return await fetcher(`task_time_logs?task_id=${taskId}`, {}, 'task_time_logs') as any[];
};

export const getUserTaskTimeLogs = async (userId: string, taskId: string) => {
  return await fetcher(`task_time_logs?user_id=${userId}&task_id=${taskId}`, {}, 'task_time_logs') as TaskTimeLog[];
};

// Allowed Networks
export const getAllowedNetworks = async () => {
  return await fetcher('allowed_networks', {}, 'allowed_networks') as AllowedNetwork[];
};

export const createAllowedNetwork = async (data: Partial<AllowedNetwork>) => {
  return await fetcher('allowed_networks', {
    method: 'POST',
    body: JSON.stringify(data),
  }, 'allowed_networks') as AllowedNetwork | null;
};

export const updateAllowedNetwork = async (id: string, updates: Partial<AllowedNetwork>) => {
  return await fetcher(`allowed_networks?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, 'allowed_networks') as AllowedNetwork | null;
};

export const deleteAllowedNetwork = async (id: string) => {
  await fetcher(`allowed_networks?id=${id}`, { method: 'DELETE' }, 'allowed_networks');
};

// Notifications
export const getMyNotifications = async (userId: string, role: string) => {
  return await fetcher(`notifications?user_id=${userId}&role=${role}`, {}, 'notifications') as Notification[];
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  return await fetcher('notifications/read', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, notification_id: notificationId }),
  }, 'notifications');
};

export const sendNotification = async (data: Partial<Notification>) => {
  return await fetcher('notifications', {
    method: 'POST',
    body: JSON.stringify(data),
  }, 'notifications') as Notification | null;
};

export const getAllNotifications = async () => {
  return await fetcher('notifications/all', {}, 'notifications') as Notification[];
};

export const deleteNotification = async (id: string) => {
  await fetcher(`notifications?id=${id}`, { method: 'DELETE' }, 'notifications');
};

export const triggerBirthdayNotifications = async () => {
  return await fetcher('notifications/trigger-birthdays', { method: 'POST' }, 'notifications');
};

// ── Absence API ───────────────────────────────────────────────────────────────
export const getAbsences = async (filters: { from?: string; to?: string; user_id?: string } = {}): Promise<any[]> => {
  const params = new URLSearchParams();
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);
  if (filters.user_id) params.append('user_id', filters.user_id);
  const query = params.toString() ? `?${params.toString()}` : '';
  try {
    const res = await fetch(`${API_URL}/absences${query}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
};

export const generateAbsences = async (from: string, to: string): Promise<{ created: number; skipped: number; errors: string[] }> => {
  const res = await fetch(`${API_URL}/absences/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ from, to }),
  });
  return await res.json();
};

export const deleteAbsence = async (id: string): Promise<void> => {
  await fetcher(`absences/${id}`, { method: 'DELETE' });
};
