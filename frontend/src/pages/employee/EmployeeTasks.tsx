import { useEffect, useState } from 'react';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEmployeeTasks, startTaskTimer, pauseTaskTimer, getActiveTimer } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, Clock, AlertCircle, Play, Pause, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateTaskStatus } from '@/db/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmployeeTasksProps {
  Layout?: React.ComponentType<{ children: React.ReactNode }>;
}

export default function EmployeeTasks({ Layout = EmployeeLayout }: EmployeeTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<{ task_id: string; start_time: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const loadTasks = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const data = await getEmployeeTasks(profile.id);
      console.log('Loaded employee tasks:', data);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }

    // Check for active timer separately — don't let timer errors affect task display
    try {
      const active = await getActiveTimer(profile.id);
      if (active) {
        setActiveTimer({
          task_id: active.task_id,
          start_time: active.start_time,
        });
        // Calculate elapsed time
        const startTime = new Date(active.start_time).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }
    } catch (timerError) {
      // Silent fail — timer is optional feature, don't disrupt task view
      console.warn('Could not load active timer:', timerError);
    }
  };

  useEffect(() => {
    loadTasks();

    // Cleanup timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [profile]);

  // Update elapsed time every second when timer is active
  useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);

      return () => clearInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      setElapsedTime(0);
    }
  }, [activeTimer]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast({
        title: 'Success',
        description: 'Task status updated successfully',
      });
      loadTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive',
      });
    }
  };

  const handlePlayTask = async (taskId: string) => {
    if (!profile) return;

    try {
      await startTaskTimer(taskId, profile.id);
      setActiveTimer({
        task_id: taskId,
        start_time: new Date().toISOString(),
      });
      setElapsedTime(0);
      toast({
        title: 'Timer Started',
        description: 'Task timer has been started',
      });
    } catch (error: any) {
      console.error('Failed to start timer:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || error?.message || 'Failed to start timer',
        variant: 'destructive',
      });
    }
  };

  const handlePauseTask = async (taskId: string) => {
    if (!profile) return;

    try {
      await pauseTaskTimer(taskId, profile.id);
      setActiveTimer(null);
      setElapsedTime(0);
      toast({
        title: 'Timer Paused',
        description: 'Task timer has been paused',
      });
      loadTasks(); // Reload to update total time
    } catch (error: any) {
      console.error('Failed to pause timer:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || error?.message || 'Failed to pause timer',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTotalTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (deadline: string | null, status: string) => {
    if (!deadline || status === 'completed') return false;
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Tasks</h1>
          <p className="text-muted-foreground">View and manage your assigned tasks</p>
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No tasks assigned</p>
              <p className="text-sm text-muted-foreground">You don't have any tasks at the moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className={isOverdue(task.deadline, task.status) ? 'border-red-500/50' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {task.title}
                        {isOverdue(task.deadline, task.status) && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status === 'in_progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Timer Section */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Timer className="h-5 w-5 text-primary" />
                        <div>
                          <div className="text-sm font-medium">Time Tracking</div>
                          <div className="text-xs text-muted-foreground">
                            Total: {formatTotalTime(task.total_time_spent || 0)}
                            {activeTimer?.task_id === task.id && (
                              <span className="ml-2 text-primary font-medium">
                                • Running: {formatTime(elapsedTime)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeTimer?.task_id === task.id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePauseTask(task.id)}
                            className="gap-2"
                          >
                            <Pause className="h-4 w-4" />
                            Pause
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handlePlayTask(task.id)}
                            disabled={activeTimer !== null && activeTimer.task_id !== task.id}
                            className="gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Start
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Task Details */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {task.deadline && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Due: {formatDate(task.deadline)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Update Status:</span>
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleStatusChange(task.id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
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
      </div>
    </Layout>
  );
}
