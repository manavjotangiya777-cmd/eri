import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getAllTasks, createTask, updateTask, deleteTask, getAllProfiles, getAllClients, updateTask as apiUpdateTask } from '@/db/api';
import type { Task, Profile, Client, TaskWorkUpdate, TaskAttachment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Pencil, Trash2, Eye, X, Link2, Paperclip,
  CalendarDays, Clock, User, Building2, CheckCircle2,
  ChevronRight, MessageSquarePlus, Star, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEPARTMENTS = ['Development', 'Digital Marketing', 'BDE', 'Design', 'Support', 'HR', 'Other'];

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

export default function TaskManagement() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [workUpdateText, setWorkUpdateText] = useState('');
  const [addingUpdate, setAddingUpdate] = useState(false);
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [search, setSearch] = useState('');

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

  useEffect(() => { loadData(); }, []);

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
      delete (taskData as any).new_attachment_url;
      delete (taskData as any).new_attachment_type;

      if (editTask) {
        await updateTask(editTask.id, taskData);
        toast({ title: 'Success', description: 'Task updated' });
      } else {
        await createTask(taskData as any);
        toast({ title: 'Success', description: 'Task created' });
      }
      setDialogOpen(false);
      loadData();
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
    } catch {
      toast({ title: 'Error', description: 'Failed to delete task', variant: 'destructive' });
    }
  };

  const handleAddAttachment = async () => {
    if (formData.new_attachment_type === 'file') {
      if (!formData.new_attachment_file) return;
      setFormData(prev => ({ ...prev, uploading: true }));
      try {
        const fileData = new FormData();
        fileData.append('file', formData.new_attachment_file);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
          method: 'POST',
          body: fileData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
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
    } else {
      // Logic for links could go here if needed, but the user asked for file upload specifically
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
      setViewTask(prev => prev ? { ...prev, work_updates: [...(prev.work_updates || []), newUpdate] } : prev);
      setWorkUpdateText('');
      toast({ title: 'Update Added' });
    } catch {
      toast({ title: 'Error', description: 'Failed to add update', variant: 'destructive' });
    } finally {
      setAddingUpdate(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.task_id || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const getUserName = (id: string | null) => {
    if (!id) return '-';
    const u = users.find(u => u.id === id || (u as any)._id === id);
    return u?.full_name || u?.username || id;
  };

  const getClientName = (id: string | null) => {
    if (!id) return '-';
    return clients.find(c => c.id === id)?.company_name || id;
  };

  const statsTotal = tasks.length;
  const statsPending = tasks.filter(t => t.status === 'pending').length;
  const statsInProgress = tasks.filter(t => t.status === 'in_progress').length;
  const statsCompleted = tasks.filter(t => t.status === 'completed').length;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Task Management</h1>
            <p className="text-muted-foreground mt-1">Create, assign and track all tasks across departments</p>
          </div>
          <Button onClick={handleAdd} className="gap-2 shadow-md">
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Tasks', value: statsTotal, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
            { label: 'Pending', value: statsPending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'In Progress', value: statsInProgress, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
            { label: 'Completed', value: statsCompleted, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          ].map(stat => (
            <Card key={stat.label} className={cn('border', stat.bg)}>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className={cn('text-3xl font-black', stat.color)}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Search by title or task ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Tasks ({filteredTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No tasks found</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow className="text-nowrap hover:bg-transparent">
                        <TableHead className="min-w-[100px]">Task ID</TableHead>
                        <TableHead className="min-w-[220px]">Title</TableHead>
                        <TableHead className="min-w-[120px]">Department</TableHead>
                        <TableHead className="min-w-[140px]">Assigned To</TableHead>
                        <TableHead className="min-w-[100px]">Priority</TableHead>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                        <TableHead className="min-w-[130px]">Deadline</TableHead>
                        <TableHead className="min-w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map(task => {
                        const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                        const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                        const isOverdue = task.deadline && task.status !== 'completed' && new Date(task.deadline) < new Date();
                        return (
                          <TableRow key={task.id} className="group hover:bg-slate-50/60">
                            <TableCell>
                              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {task.task_id || '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="font-semibold text-slate-900 truncate cursor-help">{task.title}</p>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[300px] whitespace-normal">
                                    {task.title}
                                  </TooltipContent>
                                </Tooltip>
                                {task.client_id && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-xs text-muted-foreground truncate cursor-help">{getClientName(task.client_id)}</p>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px] whitespace-normal">
                                      Project: {getClientName(task.client_id)}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {task.department ? (
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">{task.department}</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-sm">{getUserName(task.assigned_to)}</TableCell>
                            <TableCell>
                              <Badge className={cn('border text-xs', pc.color)}>
                                <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', pc.dot)} />
                                {pc.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('border text-xs', sc.color)}>{sc.label}</Badge>
                            </TableCell>
                            <TableCell className={cn('text-sm', isOverdue ? 'text-red-500 font-semibold' : 'text-slate-600')}>
                              {task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                              {isOverdue && <span className="ml-1 text-xs">⚠️</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleView(task)}>
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(task)}>
                                  <Pencil className="h-4 w-4 text-slate-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-50" onClick={() => handleDelete(task.id)}>
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── ADD / EDIT DIALOG ── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[780px] w-[96vw] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden shadow-2xl border-none max-h-[94vh]">
            <DialogHeader className="px-8 py-5 border-b bg-gradient-to-r from-slate-50 to-white shrink-0">
              <DialogTitle className="text-xl font-black">{editTask ? '✏️ Edit Task' : '➕ New Task'}</DialogTitle>
              <DialogDescription>{editTask ? 'Update the task details below' : 'Fill in all details to create a comprehensive task'}</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-8">
              <form id="task-form" onSubmit={handleSave}>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="basic">📋 Basic Info</TabsTrigger>
                    <TabsTrigger value="details">📌 Details</TabsTrigger>
                    <TabsTrigger value="attachments">📎 Attachments</TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Basic */}
                  <TabsContent value="basic" className="space-y-5 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="title" className="font-semibold">Task Title *</Label>
                        <Input id="title" placeholder="e.g. Landing Page UI Development" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Department</Label>
                        <Select value={formData.department || ''} onValueChange={v => setFormData({ ...formData, department: v || null })}>
                          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Client / Project</Label>
                        <Select value={formData.client_id || 'none'} onValueChange={v => setFormData({ ...formData, client_id: v === 'none' ? null : v })}>
                          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Assigned To</Label>
                        <Select value={formData.assigned_to || 'unassigned'} onValueChange={v => setFormData({ ...formData, assigned_to: v === 'unassigned' ? null : v })}>
                          <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.full_name || u.username} ({u.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Assigned By</Label>
                        <Select value={formData.assigned_by || 'unassigned'} onValueChange={v => setFormData({ ...formData, assigned_by: v === 'unassigned' ? null : v })}>
                          <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">None</SelectItem>
                            {users.filter(u => u.role === 'admin' || u.role === 'hr').map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.full_name || u.username} ({u.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Priority</Label>
                        <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                <span className="flex items-center gap-2">
                                  <span className={cn('h-2 w-2 rounded-full', v.dot)} />
                                  {v.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Status</Label>
                        <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label className="font-semibold">Task Description</Label>
                        <Textarea placeholder="Complete explanation of the task..." value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Details */}
                  <TabsContent value="details" className="space-y-5 mt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Start Date</Label>
                        <Input type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Deadline</Label>
                        <Input type="date" value={formData.deadline || ''} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Estimated Time</Label>
                        <Input placeholder="e.g. 6 Hours / 2 Days" value={formData.estimated_time || ''} onChange={e => setFormData({ ...formData, estimated_time: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Completion Date</Label>
                        <Input type="date" value={formData.completion_date || ''} onChange={e => setFormData({ ...formData, completion_date: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold">Task Requirements</Label>
                      <p className="text-xs text-muted-foreground">Write each requirement on a new line</p>
                      <Textarea
                        placeholder={"Responsive design\nFast loading\nCross-browser support\nClean code structure"}
                        value={formData.requirements_text || ''}
                        onChange={e => setFormData({ ...formData, requirements_text: e.target.value })}
                        rows={5}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold">Review Notes</Label>
                      <Textarea placeholder="Manager / Admin feedback..." value={formData.review_notes || ''} onChange={e => setFormData({ ...formData, review_notes: e.target.value })} rows={3} />
                    </div>
                  </TabsContent>

                  {/* TAB 3: Attachments */}
                  <TabsContent value="attachments" className="space-y-5 mt-0">
                    <div className="space-y-3">
                      <Label className="font-semibold">Attachments / Assets</Label>
                      <div className="grid grid-cols-1 gap-4 p-5 border rounded-2xl bg-slate-50 shadow-inner">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">File Display Name</Label>
                            <Input placeholder="e.g. Project Assets" value={formData.new_attachment_name || ''} onChange={e => setFormData({ ...formData, new_attachment_name: e.target.value })} className="h-10 rounded-xl" />
                          </div>
                        </div>
                        <div className="flex gap-3 items-end">
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Choose File</Label>
                            <Input
                              type="file"
                              onChange={e => setFormData({ ...formData, new_attachment_file: e.target.files?.[0] || null })}
                              className="h-10 bg-white rounded-xl border-dashed border-2 cursor-pointer pt-1.5 px-3"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleAddAttachment}
                            disabled={formData.uploading || !formData.new_attachment_file}
                            className={cn("h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg", formData.uploading ? "bg-slate-400" : "bg-primary shadow-primary/20")}
                          >
                            {formData.uploading ? '...' : 'Upload'}
                          </Button>
                        </div>
                      </div>

                      {(formData.attachments || []).length > 0 && (
                        <div className="space-y-2">
                          {(formData.attachments || []).map((att, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                              {att.type === 'link' ? <Link2 className="h-4 w-4 text-blue-500 shrink-0" /> : <Paperclip className="h-4 w-4 text-slate-500 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{att.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{att.url}</p>
                              </div>
                              <button type="button" onClick={() => handleRemoveAttachment(idx)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="min-w-[120px]">
                    {editTask ? 'Update Task' : 'Create Task'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── VIEW DIALOG ── */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[820px] w-[96vw] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden shadow-2xl border-none max-h-[94vh]">
            {viewTask && (() => {
              const sc = STATUS_CONFIG[viewTask.status] || STATUS_CONFIG.pending;
              const pc = PRIORITY_CONFIG[viewTask.priority] || PRIORITY_CONFIG.medium;
              return (
                <>
                  <div className="px-8 py-5 border-b bg-gradient-to-r from-slate-50 to-white shrink-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">{viewTask.task_id || 'No ID'}</p>
                        <h2 className="text-xl font-black">{viewTask.title}</h2>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Badge className={cn('border', pc.color)}><span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', pc.dot)} />{pc.label}</Badge>
                        <Badge className={cn('border', sc.color)}>{sc.label}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { icon: Building2, label: 'Department', value: viewTask.department || '-' },
                        { icon: User, label: 'Assigned To', value: getUserName(viewTask.assigned_to) },
                        { icon: User, label: 'Assigned By', value: getUserName(viewTask.assigned_by) },
                        { icon: CalendarDays, label: 'Start Date', value: viewTask.start_date ? new Date(viewTask.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
                        { icon: Clock, label: 'Deadline', value: viewTask.deadline ? new Date(viewTask.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
                        { icon: Clock, label: 'Estimated Time', value: viewTask.estimated_time || '-' },
                        { icon: CheckCircle2, label: 'Completion Date', value: viewTask.completion_date ? new Date(viewTask.completion_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
                      ].map(item => (
                        <div key={item.label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border">
                          <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                            <p className="text-sm font-semibold mt-0.5">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    {viewTask.description && (
                      <div>
                        <h3 className="font-bold text-sm mb-2 uppercase tracking-wider text-muted-foreground">Description</h3>
                        <p className="text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border">{viewTask.description}</p>
                      </div>
                    )}

                    {/* Requirements */}
                    {(viewTask.requirements || []).length > 0 && (
                      <div>
                        <h3 className="font-bold text-sm mb-3 uppercase tracking-wider text-muted-foreground">Requirements</h3>
                        <ul className="space-y-2">
                          {viewTask.requirements.map((req, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Attachments */}
                    {(viewTask.attachments || []).length > 0 && (
                      <div>
                        <h3 className="font-bold text-sm mb-3 uppercase tracking-wider text-muted-foreground">Attachments</h3>
                        <div className="space-y-2">
                          {viewTask.attachments.map((att, i) => (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 border rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group">
                              {att.type === 'link' ? <Link2 className="h-4 w-4 text-blue-500" /> : <Paperclip className="h-4 w-4 text-slate-500" />}
                              <span className="flex-1 text-sm font-medium group-hover:text-blue-600">{att.name}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{att.url}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review Notes */}
                    {viewTask.review_notes && (
                      <div>
                        <h3 className="font-bold text-sm mb-2 uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 text-amber-500" /> Review Notes
                        </h3>
                        <p className="text-sm bg-amber-50 border border-amber-200 p-4 rounded-xl leading-relaxed">{viewTask.review_notes}</p>
                      </div>
                    )}

                    {/* Work Updates Section (Dark Theme) */}
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden relative group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none">
                        <MessageSquarePlus className="h-32 w-32" />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" /> Team Feed & Communications
                      </h4>
                      <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                        {(viewTask.work_updates || []).length === 0 ? (
                          <p className="text-sm text-slate-500 italic">No communication logs yet.</p>
                        ) : (
                          (viewTask.work_updates || []).map((wu, i) => (
                            <div key={i} className="space-y-1 bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                              <p className="text-sm leading-relaxed text-slate-200">{wu.text}</p>
                              <div className="flex items-center gap-2 pt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span className={cn(wu.updated_by === profile?.id ? "text-blue-400" : "text-amber-400")}>
                                  {getUserName(wu.updated_by || null)}
                                </span>
                                <span className="opacity-20">•</span>
                                <span className="font-mono">{wu.updated_at ? new Date(wu.updated_at).toLocaleString() : ''}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-3 mt-8 pt-6 border-t border-white/10">
                        <Textarea
                          placeholder="Type an update or comment..."
                          value={workUpdateText}
                          onChange={e => setWorkUpdateText(e.target.value)}
                          rows={2}
                          className="bg-white/5 border-white/10 text-white rounded-2xl h-14 min-h-[56px] focus:ring-blue-500/50"
                        />
                        <Button
                          onClick={handleAddWorkUpdate}
                          disabled={addingUpdate || !workUpdateText.trim()}
                          className="h-14 w-14 rounded-2xl bg-blue-500 hover:bg-blue-400 shrink-0 shadow-lg shadow-blue-500/20"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
