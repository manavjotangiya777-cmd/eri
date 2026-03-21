import { useEffect, useState } from 'react';
import HRLayout from '@/components/layouts/HRLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getAllTasks, createTask, updateTask, deleteTask,
  getAllProfiles, getAllClients, updateTask as apiUpdateTask,
  getEmployeeTasks, updateTaskStatus, startTaskTimer,
  pauseTaskTimer, getActiveTimer
} from '@/db/api';
import type { Task, Profile, Client, TaskWorkUpdate, TaskAttachment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Pencil, Trash2, Eye, X, Paperclip,
  CalendarDays, Clock, User,
  ChevronRight, MessageSquarePlus, Play, Pause, Timer, ListTodo, CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  review: { label: 'Review', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
  on_hold: { label: 'On Hold', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-500 border-red-200' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: 'Low', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
};

type FormData = Partial<Task> & {
  requirements_text?: string;
  new_attachment_name?: string;
  new_attachment_file?: File | null;
  new_attachment_type?: 'file' | 'link';
  uploading?: boolean;
};

export default function HRTaskManagement() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [workUpdateText, setWorkUpdateText] = useState('');
  const [addingUpdate, setAddingUpdate] = useState(false);
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  // My Tasks States
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myTasksLoading, setMyTasksLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<{ task_id: string; start_time: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);

  const emptyForm: FormData = {
    title: '', description: '', department: undefined,
    priority: 'medium', status: 'pending',
    start_date: '', deadline: '', estimated_time: '',
    assigned_to: null, client_id: null,
    requirements_text: '',
    attachments: [],
    review_notes: '',
    new_attachment_name: '', new_attachment_file: null, new_attachment_type: 'file',
    uploading: false,
  };

  const [formData, setFormData] = useState<FormData>(emptyForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, usersData, clientsData] = await Promise.all([
        getAllTasks(), getAllProfiles(), getAllClients(),
      ]);
      setTasks(tasksData);
      setUsers(usersData);
      setClients(clientsData);
    } catch {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadMyTasks = async () => {
    if (!profile) return;
    setMyTasksLoading(true);
    try {
      const data = await getEmployeeTasks(profile.id);
      setMyTasks(data);
      const active = await getActiveTimer(profile.id);
      if (active) {
        setActiveTimer({ task_id: active.task_id, start_time: active.start_time });
        setElapsedTime(Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000));
      }
    } catch { /* silent */ } finally {
      setMyTasksLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadMyTasks();
    return () => { if (timerInterval) clearInterval(timerInterval); };
  }, [profile]);

  useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (timerInterval) { clearInterval(timerInterval); setTimerInterval(null); }
      setElapsedTime(0);
    }
  }, [activeTimer]);

  const handleAdd = () => {
    setEditTask(null);
    setFormData({ ...emptyForm, assigned_by: profile?.id });
    setDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setFormData({
      ...task,
      start_date: task.start_date ? new Date(task.start_date).toISOString().slice(0, 10) : '',
      deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '',
      completion_date: task.completion_date ? new Date(task.completion_date).toISOString().slice(0, 10) : '',
      requirements_text: (task.requirements || []).join('\n'),
      new_attachment_name: '', new_attachment_file: null, new_attachment_type: 'file',
    });
    setDialogOpen(true);
  };

  const handleView = (task: Task) => {
    setViewTask(task);
    setViewDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast({ title: 'Error', description: 'Task title is required', variant: 'destructive' });
      return;
    }
    try {
      const requirements = (formData.requirements_text || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const taskData = {
        ...formData,
        requirements,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        completion_date: formData.completion_date ? new Date(formData.completion_date).toISOString() : null,
        assigned_by: formData.assigned_by || profile?.id,
        created_by: formData.created_by || profile?.id,
      };

      // Clean temp fields
      delete (taskData as any).requirements_text;
      delete (taskData as any).new_attachment_name;
      delete (taskData as any).new_attachment_file;
      delete (taskData as any).new_attachment_type;
      delete (taskData as any).uploading;

      if (editTask) {
        await updateTask(editTask.id, taskData);
        toast({ title: 'Success', description: 'Task updated' });
      } else {
        await createTask(taskData as any);
        toast({ title: 'Success', description: 'Task created' });
      }
      setDialogOpen(false);
      loadData();
      loadMyTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to save task', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      toast({ title: 'Deleted', description: 'Task removed' });
      loadData();
      loadMyTasks();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete task', variant: 'destructive' });
    }
  };

  const handleAddAttachment = async () => {
    if (!formData.new_attachment_file) return;
    setFormData(prev => ({ ...prev, uploading: true }));
    try {
      const fileData = new FormData();
      fileData.append('file', formData.new_attachment_file);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
        method: 'POST',
        body: fileData,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        const newAtt: TaskAttachment = {
          name: formData.new_attachment_name || formData.new_attachment_file.name,
          url: result.url,
          type: 'file',
        };
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), newAtt],
          new_attachment_name: '',
          new_attachment_file: null,
          uploading: false
        }));
      }
    } catch (err) {
      toast({ title: 'Upload Failed', description: 'Could not upload file.', variant: 'destructive' });
      setFormData(prev => ({ ...prev, uploading: false }));
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setFormData(prev => ({ ...prev, attachments: (prev.attachments || []).filter((_, i) => i !== idx) }));
  };

  const handleAddWorkUpdate = async () => {
    if (!workUpdateText.trim() || !viewTask) return;
    setAddingUpdate(true);
    try {
      const newUpdate: TaskWorkUpdate = {
        text: workUpdateText.trim(),
        updated_by: profile?.id,
        updated_at: new Date().toISOString(),
      };
      await apiUpdateTask(viewTask.id, {
        work_updates: [...(viewTask.work_updates || []), newUpdate],
      });
      const updatedTask = { ...viewTask, work_updates: [...(viewTask.work_updates || []), newUpdate] };
      setViewTask(updatedTask);
      setWorkUpdateText('');
      toast({ title: 'Update Added' });
      loadData();
      loadMyTasks();
    } catch {
      toast({ title: 'Error', description: 'Failed to add update', variant: 'destructive' });
    } finally {
      setAddingUpdate(false);
    }
  };

  // My Tasks Logic
  const handleMyTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast({ title: 'Success', description: 'Task status updated' });
      loadMyTasks();
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handlePlayTask = async (taskId: string) => {
    if (!profile) return;
    try {
      await startTaskTimer(taskId, profile.id);
      setActiveTimer({ task_id: taskId, start_time: new Date().toISOString() });
      setElapsedTime(0);
      toast({ title: 'Timer Started' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to start timer', variant: 'destructive' });
    }
  };

  const handlePauseTask = async (taskId: string) => {
    if (!profile) return;
    try {
      await pauseTaskTimer(taskId, profile.id);
      setActiveTimer(null);
      setElapsedTime(0);
      toast({ title: 'Timer Paused' });
      loadMyTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to pause timer', variant: 'destructive' });
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.task_id || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getUserName = (id: string | null) => {
    if (!id) return '-';
    const u = users.find(u => u.id === id || (u as any)._id === id);
    return u?.full_name || u?.username || id;
  };

  const formatTimer = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <HRLayout>
      <div className="space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Task Management</h1>
            <p className="text-muted-foreground mt-1">Manage team tasks and track your own assignments</p>
          </div>
          <Button onClick={handleAdd} className="gap-2 shadow-md">
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="all" className="gap-2"><ListTodo className="h-4 w-4" /> All Tasks</TabsTrigger>
            <TabsTrigger value="my" className="gap-2 font-bold"><CheckSquare className="h-4 w-4" /> My Tasks {myTasks.filter(t => t.status !== 'completed').length > 0 && <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-white">{myTasks.filter(t => t.status !== 'completed').length}</Badge>}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: tasks.length, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
                { label: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
              ].map(stat => (
                <Card key={stat.label} className={cn('border', stat.bg)}>
                  <CardContent className="p-4">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</p>
                    <p className={cn('text-3xl font-black', stat.color)}>{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? <TableRow><TableCell colSpan={6} className="text-center py-10">Loading...</TableCell></TableRow> :
                        filteredTasks.map(task => {
                          const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                          return (
                            <TableRow key={task.id}>
                              <TableCell><span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded">{task.task_id}</span></TableCell>
                              <TableCell className="font-bold">{task.title}</TableCell>
                              <TableCell className="text-sm">{getUserName(task.assigned_to)}</TableCell>
                              <TableCell><Badge className={cn('text-[10px]', sc.color)}>{sc.label}</Badge></TableCell>
                              <TableCell className="text-sm">{task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleView(task)}><Eye className="h-4 w-4 text-primary" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(task)}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my" className="space-y-4">
            {myTasksLoading ? <div className="text-center py-20">Loading...</div> :
              myTasks.length === 0 ? <Card className="py-20 text-center"><p className="text-muted-foreground">No tasks assigned to you</p></Card> :
                myTasks.map(task => (
                  <Card key={task.id} className="overflow-hidden border-l-4 border-primary/20">
                    <CardContent className="p-5 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn("text-[10px] px-1.5", PRIORITY_CONFIG[task.priority]?.color)}>{task.priority}</Badge>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{task.task_id}</span>
                          </div>
                          <h3 className="text-lg font-black">{task.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                          <div className="flex items-center gap-3 text-sm">
                            <Timer className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400">Time Logged</p>
                              <p className="font-bold font-mono">
                                {Math.floor((task.total_time_spent || 0) / 3600)}h {Math.floor(((task.total_time_spent || 0) % 3600) / 60)}m
                                {activeTimer?.task_id === task.id && <span className="text-primary ml-2 animate-pulse">Running: {formatTimer(elapsedTime)}</span>}
                              </p>
                            </div>
                          </div>
                          {activeTimer?.task_id === task.id ? <Button size="sm" variant="outline" onClick={() => handlePauseTask(task.id)}><Pause className="h-4 w-4 mr-2" /> Pause</Button> : <Button size="sm" onClick={() => handlePlayTask(task.id)} disabled={activeTimer !== null || task.status === 'completed'}><Play className="h-4 w-4 mr-2" /> Start</Button>}
                        </div>
                      </div>

                      <div className="md:w-64 space-y-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest">Task Status</Label>
                          <Select value={task.status} onValueChange={v => handleMyTaskStatusChange(task.id, v)}>
                            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl gap-2 font-bold" onClick={() => handleView(task)}><Eye className="h-4 w-4" /> View Details</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            }
          </TabsContent>
        </Tabs>

        {/* --- DIALOGS --- */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[780px] w-[96vw] p-0 rounded-2xl overflow-hidden max-h-[94vh] flex flex-col">
            <DialogHeader className="px-8 py-5 border-b bg-slate-50 shrink-0">
              <DialogTitle className="text-xl font-black">{editTask ? '✏️ Edit Task' : '➕ New Task'}</DialogTitle>
              <DialogDescription>Fill in all details to assign a comprehensive task</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-8">
              <form onSubmit={handleSave} className="space-y-6">
                <Tabs defaultValue="basic">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="basic">📋 Basic</TabsTrigger>
                    <TabsTrigger value="details">📌 Details</TabsTrigger>
                    <TabsTrigger value="attachments">📎 Attachments</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Task Title *</Label>
                      <Input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="rounded-xl h-12" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold">Priority</Label>
                        <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v as any })}>
                          <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Assigned To</Label>
                        <Select value={formData.assigned_to || 'unassigned'} onValueChange={v => setFormData({ ...formData, assigned_to: v === 'unassigned' ? null : v })}>
                          <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Assignee" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Description</Label>
                      <Textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="rounded-xl" />
                    </div>
                  </TabsContent>
                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="font-bold">Deadline</Label><Input type="date" value={formData.deadline || ''} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="rounded-xl h-12" /></div>
                      <div className="space-y-2"><Label className="font-bold">Estimated Time</Label><Input placeholder="e.g. 8h" value={formData.estimated_time || ''} onChange={e => setFormData({ ...formData, estimated_time: e.target.value })} className="rounded-xl h-12" /></div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Requirements (One per line)</Label>
                      <Textarea value={formData.requirements_text || ''} onChange={e => setFormData({ ...formData, requirements_text: e.target.value })} rows={5} className="font-mono text-sm rounded-xl" />
                    </div>
                  </TabsContent>
                  <TabsContent value="attachments" className="space-y-4">
                    <div className="p-5 border rounded-2xl bg-slate-50 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-500">File Display Name</Label>
                        <Input placeholder="Description" value={formData.new_attachment_name || ''} onChange={e => setFormData({ ...formData, new_attachment_name: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="flex gap-3">
                        <Input type="file" onChange={e => setFormData({ ...formData, new_attachment_file: e.target.files?.[0] || null })} className="rounded-xl pt-1.5 bg-white flex-1" />
                        <Button type="button" onClick={handleAddAttachment} disabled={formData.uploading || !formData.new_attachment_file} className="rounded-xl shadow-lg">{formData.uploading ? '...' : 'Upload'}</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(formData.attachments || []).map((att, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 border rounded-xl bg-white">
                          <Paperclip className="h-4 w-4 text-slate-400" />
                          <span className="flex-1 text-sm font-bold truncate">{att.name}</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAttachment(i)}><X className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="flex justify-end gap-3 pt-6 border-t font-black">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button type="submit" className="min-w-[120px] rounded-xl shadow-xl shadow-primary/20">Save Task</Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[820px] w-[96vw] p-0 rounded-2xl overflow-hidden max-h-[94vh] flex flex-col border-none shadow-2xl">
            {viewTask && (
              <>
                <div className="px-8 py-6 border-b bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{viewTask.task_id}</span>
                      <h2 className="text-2xl font-black mt-1 leading-tight">{viewTask.title}</h2>
                    </div>
                    <Badge className={cn("px-4 py-1.5 rounded-full text-[11px] border shadow-sm", PRIORITY_CONFIG[viewTask.priority]?.color)}>{viewTask.priority}</Badge>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Assigned To', value: getUserName(viewTask.assigned_to), icon: User },
                      { label: 'Deadline', value: viewTask.deadline ? new Date(viewTask.deadline).toLocaleDateString() : '-', icon: CalendarDays },
                      { label: 'Estimated', value: viewTask.estimated_time || '-', icon: Clock },
                      { label: 'Spent', value: formatTotalTime(viewTask.total_time_spent || 0), icon: Timer },
                    ].map(item => (
                      <div key={item.label} className="p-4 bg-slate-50 rounded-2xl border flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-primary/50" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">{item.label}</p>
                          <p className="font-bold text-sm tracking-tight">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <section>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">Task Context</h4>
                    <div className="p-5 bg-slate-50 rounded-2xl border text-sm leading-relaxed text-slate-700">{viewTask.description || 'No description provided.'}</div>
                  </section>

                  {viewTask.attachments?.length > 0 && (
                    <section>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">Attachments</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {viewTask.attachments.map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 border rounded-2xl hover:bg-slate-50 transition-colors group">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all"><Paperclip className="h-5 w-5" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black truncate">{att.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 truncate tracking-tight">{att.url.split('/').pop()}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none"><MessageSquarePlus className="h-32 w-32" /></div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" /> Post Update / Comment
                    </h4>
                    <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                      {viewTask.work_updates?.length === 0 ? <p className="text-sm text-slate-500 italic">No communication logs yet.</p> :
                        viewTask.work_updates?.map((wu, i) => (
                          <div key={i} className="space-y-1 bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                            <p className="text-sm leading-relaxed text-slate-200">{wu.text}</p>
                            <div className="flex items-center gap-2 pt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              <span className={cn(wu.updated_by === profile?.id ? "text-blue-400" : "text-amber-400")}>{getUserName(wu.updated_by || null)}</span>
                              <span className="opacity-20">•</span>
                              <span className="font-mono">{new Date(wu.updated_at!).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-8 pt-6 border-t border-white/10">
                      <Textarea placeholder="Share an update or comment..." value={workUpdateText} onChange={e => setWorkUpdateText(e.target.value)} rows={2} className="bg-white/5 border-white/10 rounded-2xl h-14 min-h-[56px] focus:ring-blue-500/50" />
                      <Button onClick={handleAddWorkUpdate} disabled={addingUpdate || !workUpdateText.trim()} className="h-14 w-14 rounded-2xl bg-blue-500 hover:bg-blue-400 shrink-0"><ChevronRight className="h-6 w-6" /></Button>
                    </div>
                  </section>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </HRLayout>
  );
}

function formatTotalTime(s: number) {
  if (!s || s <= 0) return '0s';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
