import { useEffect, useState } from 'react';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  getEmployeeTasks, startTaskTimer, pauseTaskTimer,
  getActiveTimer, updateTaskStatus, updateTask as apiUpdateTask,
  getAllProfiles
} from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, TaskWorkUpdate, Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  CheckSquare, Clock, AlertCircle, Play, Pause, Timer,
  Eye, MessageSquarePlus, ChevronRight, Paperclip, Hash, User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeeTasksProps {
  Layout?: React.ComponentType<{ children: React.ReactNode }>;
}

export default function EmployeeTasks({ Layout = EmployeeLayout }: EmployeeTasksProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<{ task_id: string; start_time: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [workUpdateText, setWorkUpdateText] = useState('');
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [editingEstTime, setEditingEstTime] = useState<string | null>(null);
  const [newEstTime, setNewEstTime] = useState('');

  const loadTasks = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [data, profileData] = await Promise.all([getEmployeeTasks(profile.id), getAllProfiles()]);
      setTasks(data);
      setProfiles(profileData);
      const active = await getActiveTimer(profile.id);
      if (active) {
        setActiveTimer({ task_id: active.task_id, start_time: active.start_time });
        setElapsedTime(Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000));
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
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

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (newStatus === 'completed') {
      toast({ title: 'Restricted', description: 'Only HR can mark tasks as completed', variant: 'destructive' });
      return;
    }
    try {
      await updateTaskStatus(taskId, newStatus);
      toast({ title: 'Success', description: 'Status updated' });
      loadTasks();
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
      loadTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to pause timer', variant: 'destructive' });
    }
  };

  const handleView = (task: Task) => {
    setViewTask(task);
    setViewDialogOpen(true);
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
      loadTasks();
    } catch {
      toast({ title: 'Error', description: 'Failed to add update', variant: 'destructive' });
    } finally {
      setAddingUpdate(false);
    }
  };

  const handleUpdateEstimatedTime = async (taskId: string) => {
    if (!newEstTime.trim()) return;
    try {
      await apiUpdateTask(taskId, { estimated_time: newEstTime.trim() });
      toast({ title: 'Success', description: 'Estimated time updated' });
      setEditingEstTime(null);
      loadTasks();
    } catch {
      toast({ title: 'Error', description: 'Failed to update estimated time', variant: 'destructive' });
    }
  };

  const getPriorityColor = (p: string) => ({ high: 'text-red-500 bg-red-50', medium: 'text-amber-500 bg-amber-50', low: 'text-green-500 bg-green-50' }[p] || 'bg-muted');
  const getUserName = (id: string | null) => profiles.find(p => p.id === id || (p as any)._id === id)?.full_name || id || '-';

  if (loading) return <Layout><div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black">My Work Station</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track your progress and communicate with managers</p>
        </div>

        <div className="grid gap-4">
          {tasks.length === 0 ? (
            <Card className="py-20 text-center"><p className="text-muted-foreground">No tasks assigned to you right now</p></Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className={cn("overflow-hidden border-l-4 transition-all hover:shadow-lg", isOverdue(task.deadline, task.status) ? 'border-red-500' : 'border-primary/20')}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", getPriorityColor(task.priority))}>{task.priority}</Badge>
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tighter">{task.task_id}</span>
                        {isOverdue(task.deadline, task.status) && <Badge variant="destructive" className="text-[9px] gap-1 font-black uppercase"><AlertCircle className="h-2 w-2" /> Overdue</Badge>}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 leading-tight">{task.title}</h2>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">{task.description}</p>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border shadow-inner">
                        <div className="flex items-center gap-4">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", activeTimer?.task_id === task.id ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-white text-slate-400 border")}>
                            <Timer className={cn("h-5 w-5", activeTimer?.task_id === task.id && "animate-pulse")} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Execution Log</p>
                            <p className="font-black font-mono text-sm">
                              {formatTotalTime(task.total_time_spent || 0)}
                              {activeTimer?.task_id === task.id && <span className="text-primary ml-2 animate-pulse">• Running: {formatTime(elapsedTime)}</span>}
                            </p>
                          </div>
                        </div>
                        {activeTimer?.task_id === task.id ?
                          <Button size="sm" variant="outline" onClick={() => handlePauseTask(task.id)} className="rounded-xl border-dashed hover:bg-slate-100 transition-all font-bold gap-2"><Pause className="h-4 w-4" /> Pause Session</Button> :
                          <Button size="sm" onClick={() => handlePlayTask(task.id)} disabled={activeTimer !== null} className="rounded-xl shadow-lg shadow-primary/20 font-bold gap-2"><Play className="h-4 w-4" /> Start Session</Button>}
                      </div>
                    </div>

                    <div className="lg:w-72 space-y-5 lg:border-l lg:pl-8 flex flex-col justify-center">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 flex items-center gap-1"><Hash className="h-3 w-3" /> Execution Status</Label>
                        <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)} disabled={task.status === 'completed'}>
                          <SelectTrigger className="h-11 rounded-xl bg-white focus:ring-primary/20 transition-all font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['pending', 'in_progress', 'review', 'completed', 'on_hold'].map(s => (
                              (s === 'completed' && task.status !== 'completed') ? null : (
                                <SelectItem key={s} value={s} className="font-bold">{s.replace('_', ' ').toUpperCase()}</SelectItem>
                              )
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Estimated Time</Label>
                        {editingEstTime === task.id ? (
                          <div className="flex gap-1.5">
                            <Input value={newEstTime} onChange={e => setNewEstTime(e.target.value)} size={5} className="h-10 rounded-xl bg-white" placeholder="8h" />
                            <Button size="sm" onClick={() => handleUpdateEstimatedTime(task.id)} className="h-10 rounded-xl px-4 font-black">SAVE</Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-primary/40 transition-all group/est cursor-pointer" onClick={() => { setEditingEstTime(task.id); setNewEstTime(task.estimated_time || ''); }}>
                            <span className="text-sm font-bold text-slate-700">{task.estimated_time || '8h'}</span>
                            <Pencil className="h-3.5 w-3.5 text-slate-300 group-hover/est:text-primary transition-colors" />
                          </div>
                        )}
                      </div>

                      <Button onClick={() => handleView(task)} variant="ghost" className="w-full h-11 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest text-primary hover:bg-primary/5 hover:text-primary transition-all">
                        <Eye className="h-4 w-4" /> Project details & Feed
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[820px] w-[96vw] p-0 rounded-3xl overflow-hidden border-none shadow-2xl bg-white max-h-[94vh] flex flex-col">
            {viewTask && (
              <>
                <div className="px-10 py-8 bg-slate-900 text-white relative flex justify-between items-start shrink-0 overflow-hidden">
                  <div className="absolute -bottom-10 -left-10 h-64 w-64 bg-primary/20 blur-[100px] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={cn("text-[9px] p-0 px-2 h-5 flex items-center font-black uppercase tracking-widest shadow-xl", getPriorityColor(viewTask.priority))}>{viewTask.priority}</Badge>
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">{viewTask.task_id}</span>
                    </div>
                    <h2 className="text-2xl font-black leading-tight max-w-[500px]">{viewTask.title}</h2>
                  </div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Assigned By</p>
                      <p className="text-sm font-black">{getUserName(viewTask.assigned_by)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                      <User className="h-5 w-5 text-slate-300" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Start Date', value: viewTask.start_date ? formatDate(viewTask.start_date) : '-', icon: Clock },
                      { label: 'Deadline', value: viewTask.deadline ? formatDate(viewTask.deadline) : '-', icon: AlertCircle },
                      { label: 'Time Spent', value: formatTotalTime(viewTask.total_time_spent || 0), icon: Timer },
                      { label: 'Estimated', value: viewTask.estimated_time || '-', icon: CheckSquare },
                    ].map(i => (
                      <div key={i.label} className="p-4 bg-slate-50 rounded-2xl border flex items-center gap-3">
                        <i.icon className="h-5 w-5 text-primary/40" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 font-mono mb-0.5">{i.label}</p>
                          <p className="text-sm font-black text-slate-800">{i.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {viewTask.description && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Project Brief</h4>
                      <div className="p-6 bg-slate-50 rounded-2xl border text-sm leading-relaxed text-slate-700 font-medium">{viewTask.description}</div>
                    </div>
                  )}

                  {viewTask.requirements?.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Requirements Checklist</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {viewTask.requirements.map((r, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-primary/20 transition-all font-bold text-sm">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewTask.attachments?.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Assets & Links</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {viewTask.attachments.map((a, idx) => (
                          <a key={idx} href={a.url} target="_blank" rel="noreferrer" className="group flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl hover:bg-slate-900 transition-all duration-300">
                            <div className="h-10 w-10 min-w-[40px] rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all"><Paperclip className="h-5 w-5" /></div>
                            <div className="min-w-0">
                              <p className="font-black text-sm truncate text-slate-900 group-hover:text-white transition-colors">{a.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono truncate tracking-tight">{a.url.split('/').pop()}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-10 border-t">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><MessageSquarePlus className="h-48 w-48 text-white" /></div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-8 flex items-center gap-4">
                        <span className="h-2 w-2 rounded-full bg-primary animate-ping" /> Project Feed & Comms
                      </h4>
                      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                        {viewTask.work_updates?.length === 0 ? <p className="italic text-slate-500 text-sm">Start a conversation with your manager here...</p> :
                          viewTask.work_updates?.map((u, idx) => (
                            <div key={idx} className={cn("group p-5 rounded-2xl transition-all border", u.updated_by === profile?.id ? "bg-white/5 border-white/5" : "bg-primary/5 border-primary/10")}>
                              <p className="text-sm leading-relaxed text-slate-200 group-hover:text-white transition-colors">{u.text}</p>
                              <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-4 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
                                <span className={cn(u.updated_by === profile?.id ? "text-primary" : "text-amber-500")}>{getUserName(u.updated_by || null)}</span>
                                <span className="opacity-10">•</span>
                                <span className="font-mono">{new Date(u.updated_at!).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                      <div className="mt-10 flex gap-4 pt-8 border-t border-white/10 items-end">
                        <Textarea placeholder="Share progress or ask a question..." value={workUpdateText} onChange={e => setWorkUpdateText(e.target.value)} rows={2} className="flex-1 bg-white/5 border-white/10 text-white rounded-2xl h-16 min-h-[64px] focus:ring-primary/40 focus:bg-white/10 transition-all placeholder:text-slate-600" />
                        <Button onClick={handleAddWorkUpdate} disabled={addingUpdate || !workUpdateText.trim()} className="h-16 w-16 min-w-[64px] rounded-2xl bg-primary hover:bg-primary/80 text-white shadow-lg shadow-primary/20"><ChevronRight className="h-7 w-7" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

const formatTotalTime = (s: number) => {
  if (!s || s <= 0) return '0s';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatDate = (ds: string) => new Date(ds).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const isOverdue = (d: string | null, s: string) => d && s !== 'completed' && new Date(d) < new Date();

function Pencil(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
  );
}
