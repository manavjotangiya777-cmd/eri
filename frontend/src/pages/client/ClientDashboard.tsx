import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientMilestones, getMyDocuments, getClientNotes, getAllProfiles, getClient, getClientTasks } from '@/db/api';
import { Task, Client, PaymentMilestone, Document, ClientNote, Profile } from '@/types';
import { CheckSquare, Clock, AlertCircle, TrendingUp, FileText, ExternalLink, ArrowRight, MessageSquare, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ClientDashboard() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!profile?.client_id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch client info
        const clientData = await getClient(profile.client_id);
        setClientInfo(clientData);

        // Fetch tasks, milestones, documents, and notes
        const [tasksData, milestonesData, documentsData, notesData, profilesData] = await Promise.all([
          getClientTasks(profile.client_id),
          getClientMilestones(profile.client_id),
          getMyDocuments(profile),
          getClientNotes(profile.client_id),
          getAllProfiles()
        ]);

        setTasks(tasksData || []);
        setMilestones(milestonesData || []);
        setDocuments(documentsData);
        setNotes(notesData);
        setProfiles(profilesData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [profile]);

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ClientLayout>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {clientInfo?.company_name || profile?.full_name || profile?.username || 'Client'}</h1>
            <p className="text-muted-foreground mt-2">Here is an overview of your projects and tasks.</p>
          </div>
          {!profile?.client_id && (
            <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
              <strong>Note:</strong> Your profile is not yet linked to a company. Please contact the administrator.
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressTasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overall Project Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedTasks} out of {tasks.length} tasks completed
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Project Updates (Notes) */}
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Project Updates</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notes.slice(0, 5).map((note) => (
                  <div key={note.id} className="p-3 border rounded-md bg-muted/30">
                    <p className="text-sm">{note.note}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {profiles.find(p => p.id === note.created_by)?.username || 'Support Team'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">No recent updates.</p>
                )}
                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                  <Link to="/client/chat">Request more info <ArrowRight className="ml-2 h-3 w-3" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Project Milestones */}
          <Card className="col-span-1 border-none shadow-lg ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Project Milestones
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {milestones.length > 0 ? (
                  milestones.slice(0, 4).sort((a, b) => a.order_index - b.order_index).map((ms) => (
                    <div key={ms.id} className="group relative pl-6 pb-4 last:pb-0">
                      {/* Timeline Line */}
                      <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-slate-100 group-last:bottom-auto group-last:h-2" />
                      {/* Timeline Dot */}
                      <div className={cn(
                        "absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-white ring-2 transition-all",
                        ms.status === 'paid' ? "bg-emerald-500 ring-emerald-100" :
                          ms.status === 'completed' ? "bg-blue-500 ring-blue-100" :
                            "bg-slate-300 ring-slate-100"
                      )} />
                      
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-sm text-slate-900 line-clamp-1">{ms.title}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                            {ms.status} • ₹{ms.amount.toLocaleString()}
                          </p>
                        </div>
                        {ms.status === 'paid' && (
                          <div className="bg-emerald-50 text-emerald-600 p-1 rounded">
                            <AlertCircle className="h-3 w-3 fill-emerald-600 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Target className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                    <p className="text-xs text-muted-foreground">No milestones defined yet.</p>
                  </div>
                )}
                {milestones.length > 4 && (
                    <Button variant="ghost" size="sm" className="w-full text-[10px] h-7 uppercase font-bold tracking-wider" asChild>
                        <Link to="/client/billing">View All Milestones <ArrowRight className="ml-2 h-3 w-3" /></Link>
                    </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recent Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div className="overflow-hidden mr-2">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase shrink-0",
                      task.status === 'completed' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        task.status === 'in_progress' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    )}>
                      {task.status.replace('_', ' ')}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">No tasks found.</p>
                )}
                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                  <Link to="/client/tasks">View all tasks <ArrowRight className="ml-2 h-3 w-3" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Shared Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-primary opacity-70 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{doc.file_type}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">No documents shared.</p>
                )}
                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                  <Link to="/client/documents">View all documents <ArrowRight className="ml-2 h-3 w-3" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
}
