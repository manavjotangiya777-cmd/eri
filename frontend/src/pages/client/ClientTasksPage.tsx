import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientTasks } from '@/db/api';
import { Task } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ClientTasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchTasks() {
      if (!profile?.client_id) return;

      try {
        const data = await getClientTasks(profile.client_id);
        setTasks(data || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [profile?.client_id]);

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="animate-pulse">Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-orange-400 text-white hover:bg-orange-500">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Tasks</h1>
            <p className="text-muted-foreground mt-2">Track the progress of all tasks associated with your projects.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Task List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredTasks.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p>{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>
                          {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(task.updated_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No tasks found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
