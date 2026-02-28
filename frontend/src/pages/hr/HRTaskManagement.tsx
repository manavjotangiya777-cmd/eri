import { useEffect, useState } from 'react';
import HRLayout from '@/components/layouts/HRLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  getAllProfiles,
  getEmployeeTasks,
  updateTaskStatus,
  startTaskTimer,
  pauseTaskTimer,
  getActiveTimer,
} from '@/db/api';
import type { Task, Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, CheckSquare, Clock, AlertCircle, Play, Pause, Timer, ListTodo } from 'lucide-react';

export default function HRTaskManagement() {
  const { profile } = useAuth();

  // ── All Tasks state ──
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const { toast } = useToast();

  // ── My Tasks state ──
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myTasksLoading, setMyTasksLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<{ task_id: string; start_time: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);

  const emptyTask: Partial<Task> = {
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    deadline: '',
    assigned_to: null,
  };

  const [formData, setFormData] = useState<Partial<Task>>(emptyTask);

  // ══════════ ALL TASKS ══════════
  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, usersData] = await Promise.all([getAllTasks(), getAllProfiles()]);
      setTasks(tasksData);
      // HR can assign to employees AND other HRs (self)
      setUsers(usersData.filter(u => u.role === 'employee' || u.role === 'hr'));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ══════════ MY TASKS ══════════
  const loadMyTasks = async () => {
    if (!profile) return;
    setMyTasksLoading(true);
    try {
      const data = await getEmployeeTasks(profile.id);
      setMyTasks(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load your tasks', variant: 'destructive' });
    } finally {
      setMyTasksLoading(false);
    }

    try {
      const active = await getActiveTimer(profile.id);
      if (active) {
        setActiveTimer({ task_id: active.task_id, start_time: active.start_time });
        setElapsedTime(Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000));
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadData();
    loadMyTasks();
    return () => { if (timerInterval) clearInterval(timerInterval); };
  }, [profile]);

  // Timer ticker
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

  // ══════════ ALL TASKS HANDLERS ══════════
  const handleAdd = () => {
    setEditTask(null);
    setFormData(emptyTask);
    setDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setFormData({ ...task, deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '' });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast({ title: 'Error', description: 'Please enter task title', variant: 'destructive' });
      return;
    }
    try {
      const taskData = { ...formData, deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null };
      if (editTask) {
        await updateTask(editTask.id, taskData);
        toast({ title: 'Success', description: 'Task updated successfully' });
      } else {
        await createTask({ ...taskData, created_by: profile?.id } as any);
        toast({ title: 'Success', description: 'Task created successfully' });
      }
      setDialogOpen(false);
      loadData();
      loadMyTasks();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save task', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(id);
      toast({ title: 'Success', description: 'Task deleted successfully' });
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete task', variant: 'destructive' });
    }
  };

  // ══════════ MY TASKS HANDLERS ══════════
  const handleMyTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast({ title: 'Success', description: 'Task status updated' });
      loadMyTasks();
    } catch {
      toast({ title: 'Error', description: 'Failed to update task status', variant: 'destructive' });
    }
  };

  const handlePlayTask = async (taskId: string) => {
    if (!profile) return;
    try {
      await startTaskTimer(taskId, profile.id);
      setActiveTimer({ task_id: taskId, start_time: new Date().toISOString() });
      setElapsedTime(0);
      toast({ title: 'Timer Started', description: 'Task timer has been started' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error?.message || 'Failed to start timer', variant: 'destructive' });
    }
  };

  const handlePauseTask = async (taskId: string) => {
    if (!profile) return;
    try {
      await pauseTaskTimer(taskId, profile.id);
      setActiveTimer(null);
      setElapsedTime(0);
      toast({ title: 'Timer Paused', description: 'Task timer has been paused' });
      loadMyTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error?.message || 'Failed to pause timer', variant: 'destructive' });
    }
  };

  // ══════════ HELPERS ══════════
  const getPriorityColor = (priority: string) => ({ low: 'bg-muted', medium: 'bg-primary', high: 'bg-chart-3', urgent: 'bg-destructive' }[priority] || 'bg-muted');
  const getStatusColor  = (status: string)   => ({ pending: 'bg-chart-3', in_progress: 'bg-primary', completed: 'bg-chart-2', cancelled: 'bg-muted' }[status] || 'bg-muted');

  const getPriorityBadge = (priority: string) => ({
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
  }[priority] || 'bg-muted text-muted-foreground');

  const getStatusBadge = (status: string) => ({
    completed: 'bg-green-500/10 text-green-500 border-green-500/20',
    in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  }[status] || 'bg-muted text-muted-foreground');

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatTotalTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const isOverdue = (deadline: string | null, status: string) => deadline && status !== 'completed' && new Date(deadline) < new Date();

  const myTasksCount = myTasks.filter(t => t.status !== 'completed').length;

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Task Management</h1>
            <p className="text-muted-foreground">Create tasks for employees and view your own assigned tasks</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="all">
              <ListTodo className="h-4 w-4 mr-1.5" />
              All Tasks
            </TabsTrigger>
            <TabsTrigger value="my" className="relative">
              <CheckSquare className="h-4 w-4 mr-1.5" />
              My Tasks
              {myTasksCount > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {myTasksCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ══ ALL TASKS TAB ══ */}
          <TabsContent value="all" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Tasks</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{tasks.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-chart-3">{tasks.filter(t => t.status === 'pending').length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">In Progress</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-primary">{tasks.filter(t => t.status === 'in_progress').length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-chart-2">{tasks.filter(t => t.status === 'completed').length}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>All Tasks</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Time Spent</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => {
                        const assignedUser = users.find(u => u.id === task.assigned_to);
                        const ts = task.total_time_spent || 0;
                        const th = Math.floor(ts / 3600), tm = Math.floor((ts % 3600) / 60), tsec = ts % 60;
                        const timeDisplay = th > 0 ? `${th}h ${tm}m` : tm > 0 ? `${tm}m ${tsec}s` : ts > 0 ? `${tsec}s` : '-';
                        return (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>{assignedUser?.username || 'Unassigned'}</TableCell>
                            <TableCell><Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge></TableCell>
                            <TableCell><Badge className={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge></TableCell>
                            <TableCell>{task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>{timeDisplay}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ MY TASKS TAB ══ */}
          <TabsContent value="my" className="mt-4">
            {myTasksLoading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : myTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckSquare className="h-14 w-14 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold">No tasks assigned to you</p>
                  <p className="text-sm text-muted-foreground">Admin or HR can assign tasks to you from the All Tasks tab</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myTasks.map((task) => (
                  <Card key={task.id} className={isOverdue(task.deadline, task.status) ? 'border-red-500/50' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-base">
                            {task.title}
                            {isOverdue(task.deadline, task.status) && (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <AlertCircle className="h-3 w-3" /> Overdue
                              </Badge>
                            )}
                          </CardTitle>
                          {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5 items-end shrink-0">
                          <Badge className={getPriorityBadge(task.priority)}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                          </Badge>
                          <Badge className={getStatusBadge(task.status)}>
                            {task.status === 'in_progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Timer */}
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Timer className="h-5 w-5 text-primary" />
                            <div>
                              <div className="text-sm font-medium">Time Tracking</div>
                              <div className="text-xs text-muted-foreground">
                                Total: {formatTotalTime(task.total_time_spent || 0)}
                                {activeTimer?.task_id === task.id && (
                                  <span className="ml-2 text-primary font-medium">• Running: {formatTimer(elapsedTime)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeTimer?.task_id === task.id ? (
                              <Button size="sm" variant="outline" onClick={() => handlePauseTask(task.id)} className="gap-2">
                                <Pause className="h-4 w-4" /> Pause
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => handlePlayTask(task.id)} disabled={activeTimer !== null && activeTimer.task_id !== task.id} className="gap-2">
                                <Play className="h-4 w-4" /> Start
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Details + Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {task.deadline && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Due: {new Date(task.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <Select value={task.status} onValueChange={(v) => handleMyTaskStatusChange(task.id, v)}>
                              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
              <DialogDescription>{editTask ? 'Update task information' : 'Create a new task and optionally assign it'}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input type="datetime-local" value={formData.deadline || ''} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={formData.assigned_to || 'unassigned'}
                    onValueChange={(v) => setFormData({ ...formData, assigned_to: v === 'unassigned' ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username} — {user.role === 'hr' ? '🔑 HR' : user.department || 'No dept'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editTask ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </HRLayout>
  );
}
