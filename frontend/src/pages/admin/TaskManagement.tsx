import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
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
import { Badge } from '@/components/ui/badge';
import { getAllTasks, createTask, updateTask, deleteTask, getAllProfiles, getAllClients } from '@/db/api';
import type { Task, Profile, Client } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function TaskManagement() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const emptyTask: Partial<Task> = {
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    deadline: '',
    assigned_to: null,
  };

  const [formData, setFormData] = useState<Partial<Task>>(emptyTask);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, usersData, clientsData] = await Promise.all([
        getAllTasks(),
        getAllProfiles(),
        getAllClients(),
      ]);
      setTasks(tasksData);
      setUsers(usersData);
      setClients(clientsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = () => {
    setEditTask(null);
    setFormData(emptyTask);
    setDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setFormData({
      ...task,
      deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast({
        title: 'Error',
        description: 'Please enter task title',
        variant: 'destructive',
      });
      return;
    }

    try {
      const taskData = {
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      };

      if (editTask) {
        await updateTask(editTask.id, taskData);
        toast({ title: 'Success', description: 'Task updated successfully' });
      } else {
        await createTask({ ...taskData, created_by: profile?.id } as any);
        toast({ title: 'Success', description: 'Task created successfully' });
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save task',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(id);
      toast({ title: 'Success', description: 'Task deleted successfully' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-muted',
      medium: 'bg-primary',
      high: 'bg-chart-3',
      urgent: 'bg-destructive',
    };
    return colors[priority as keyof typeof colors] || 'bg-muted';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-chart-3',
      in_progress: 'bg-primary',
      completed: 'bg-chart-2',
      cancelled: 'bg-muted',
    };
    return colors[status as keyof typeof colors] || 'bg-muted';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Task Management</h1>
            <p className="text-muted-foreground">Create and assign tasks to employees</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
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
                    const totalHours = Math.floor((task.total_time_spent || 0) / 3600);
                    const totalMinutes = Math.floor(((task.total_time_spent || 0) % 3600) / 60);
                    const totalSeconds = (task.total_time_spent || 0) % 60;

                    let timeDisplay = '-';
                    if (totalHours > 0) {
                      timeDisplay = `${totalHours}h ${totalMinutes}m`;
                    } else if (totalMinutes > 0) {
                      timeDisplay = `${totalMinutes}m ${totalSeconds}s`;
                    } else if (totalSeconds > 0) {
                      timeDisplay = `${totalSeconds}s`;
                    }

                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{clients.find(c => c.id === task.client_id)?.company_name || '-'}</TableCell>
                        <TableCell>{assignedUser?.username || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.deadline
                            ? new Date(task.deadline).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            {timeDisplay}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(task)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
              <DialogDescription>
                {editTask ? 'Update task information' : 'Create a new task'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={formData.deadline || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client / Project</Label>
                  <Select
                    value={formData.client_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, client_id: value === 'none' ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select
                    value={formData.assigned_to || 'unassigned'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, assigned_to: value === 'unassigned' ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editTask ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
