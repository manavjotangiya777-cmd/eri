import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getAllProfiles,
    getTasks,
    updateTask,
    createTask,
    getTodayAttendance,
    startTaskTimer,
    pauseTaskTimer,
    getActiveTimer,
    updateTaskStatus,
    deleteTask
} from '@/db/api';
import { Task, Profile, Attendance } from '@/types';
import {
    Plus,
    Clock,
    Layout as LayoutIcon,
    Briefcase,
    Play,
    Pause,
    CheckCircle2,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Trash2,
    Edit
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
    format,
    startOfWeek,
    addDays,
    isSameDay,
    parseISO,
    subWeeks,
    addWeeks
} from 'date-fns';
import AdminLayout from '@/components/layouts/AdminLayout';
import HRLayout from '@/components/layouts/HRLayout';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import BDELayout from '@/components/layouts/BDELayout';

const WeeklyPlan = ({ Layout }: { Layout?: any }) => {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showBacklogs, setShowBacklogs] = useState(true);
    const [showWeekends, setShowWeekends] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
    const [addTaskDialog, setAddTaskDialog] = useState(false);
    const [addTaskDate, setAddTaskDate] = useState<Date | null>(null);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', estimated_time: '2h' });
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [saving, setSaving] = useState(false);

    // Timer state
    const [activeTimer, setActiveTimer] = useState<{ task_id: string; start_time: string } | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number>(0);

    const isAdminOrHr = useMemo(() => {
        return profile?.role === 'admin' || profile?.role === 'hr';
    }, [profile]);

    // Layout helper
    const LayoutComponent = Layout || (profile?.role === 'admin' ? AdminLayout : (profile?.role === 'hr' ? HRLayout : (profile?.role === 'bde' ? BDELayout : EmployeeLayout)));

    // Get days of the week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = useMemo(() => {
        const days = [];
        const count = showWeekends ? 7 : 5;
        for (let i = 0; i < count; i++) {
            days.push(addDays(weekStart, i));
        }
        return days;
    }, [weekStart, showWeekends]);

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());

    // Timer Effect
    useEffect(() => {
        let interval: any;
        if (activeTimer) {
            const startTime = new Date(activeTimer.start_time).getTime();
            interval = setInterval(() => {
                const now = Date.now();
                setElapsedTime(Math.floor((now - startTime) / 1000));
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [activeTimer]);
    // Initial setup of selectedUserId
    useEffect(() => {
        if (profile?.id && !selectedUserId) {
            setSelectedUserId(profile.id);
        }
    }, [profile]);

    useEffect(() => {
        loadData();
    }, [profile, currentDate, selectedUserId, isAdminOrHr]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Fetch all profiles if admin/hr
            if (isAdminOrHr) {
                const pList = await getAllProfiles();
                // Filter out clients and ensure active users
                const filtered = pList.filter(p => {
                    const r = (p.role || '').toLowerCase();
                    return r !== 'client';
                }).sort((a, b) => (a.full_name || a.username || '').localeCompare(b.full_name || b.username || ''));

                setProfiles(filtered);

                // If no user is selected yet, or selected user is not in the list (except if it's the current admin)
                if (!selectedUserId && filtered.length > 0) {
                    const currentInList = filtered.find(p => p.id === profile?.id);
                    setSelectedUserId(currentInList ? currentInList.id : filtered[0].id);
                }
            } else if (profile?.id) {
                setSelectedUserId(profile.id);
            }

            const targetUserId = isAdminOrHr ? selectedUserId : profile?.id;

            if (targetUserId) {
                // Fetch tasks for the selected user
                const allTasks = await getTasks({ assigned_to: targetUserId, task_type: 'weekly_plan' });
                setTasks(allTasks);

                // Sync active timer for target user
                const active = await getActiveTimer(targetUserId);
                if (active) {
                    setActiveTimer({
                        task_id: active.task_id as any,
                        start_time: (active as any).start_time,
                    });
                } else {
                    setActiveTimer(null);
                }
            } else {
                setTasks([]);
            }

            // Fetch today's attendance for the logged-in user
            if (profile?.id) {
                const att = await getTodayAttendance(profile.id);
                setTodayAttendance(att);
            }

        } catch (err: any) {
            console.error('WeeklyPlan loadData error:', err);
            toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const getTasksForDay = (day: Date) => {
        return tasks.filter(t => t.planned_date && isSameDay(parseISO(t.planned_date), day));
    };

    const backlogTasks = useMemo(() => {
        return tasks.filter(t => !t.planned_date && t.status !== 'completed');
    }, [tasks]);

    const formatTime = (seconds: number) => {
        if (!seconds || seconds < 0) return '0h 0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };



    const handleMoveToDay = async (taskId: string, date: Date | null) => {
        try {
            const dateStr = date ? date.toISOString() : null;
            await updateTask(taskId, { planned_date: dateStr });
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, planned_date: dateStr } : t));
            toast({ title: 'Success', description: date ? 'Task scheduled' : 'Task moved to backlog' });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
        }
    };

    const openAddTask = (day: Date) => {
        setAddTaskDate(day);
        setNewTask({ title: '', description: '', priority: 'medium', estimated_time: '2h' });
        setAddTaskDialog(true);
    };

    const handleSaveTask = async () => {
        if (!newTask.title.trim()) {
            toast({ title: 'Error', description: 'Task title is required', variant: 'destructive' });
            return;
        }
        setSaving(true);
        const targetUserId = isAdminOrHr ? selectedUserId : profile?.id;
        try {
            await createTask({
                title: newTask.title,
                description: newTask.description || null,
                priority: newTask.priority as any,
                estimated_time: newTask.estimated_time || null,
                task_type: 'weekly_plan',
                planned_date: addTaskDate ? addTaskDate.toISOString() : null,
                assigned_to: targetUserId || null,
                assigned_by: profile?.id || null,
                created_by: profile?.id || null,
                status: 'pending',
                department: null,
                start_date: null,
                deadline: null,
                completion_date: null,
                client_id: null,
                requirements: [],
                attachments: [],
                work_updates: [],
                review_notes: null,
                total_time_spent: 0,
                task_id: null,
            });
            toast({ title: 'Success', description: 'Task created and scheduled!' });
            setAddTaskDialog(false);
            await loadData();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to create task', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handlePlayTask = async (taskId: string) => {
        const targetUserId = isAdminOrHr ? selectedUserId : profile?.id;
        if (!targetUserId || targetUserId !== profile?.id) {
            toast({ title: 'Restricted', description: 'You can only start timers for your own tasks', variant: 'destructive' });
            return;
        }

        try {
            await startTaskTimer(taskId, targetUserId);
            setActiveTimer({
                task_id: taskId,
                start_time: new Date().toISOString(),
            });
            toast({ title: 'Timer Started', description: 'Task timer is running' });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to start timer', variant: 'destructive' });
        }
    };

    const handlePauseTask = async (taskId: string) => {
        const targetUserId = isAdminOrHr ? selectedUserId : profile?.id;
        if (!targetUserId) return;

        try {
            await pauseTaskTimer(taskId, targetUserId);
            setActiveTimer(null);
            toast({ title: 'Timer Paused', description: 'Task timer stopped' });
            loadData(); // Reload to update total time
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to pause timer', variant: 'destructive' });
        }
    };

    const handleStatusUpdate = async (taskId: string, status: string) => {
        if (status === 'completed' && !isAdminOrHr) {
            toast({ title: 'Restricted', description: 'Only HR can mark tasks as completed', variant: 'destructive' });
            return;
        }
        try {
            await updateTaskStatus(taskId, status);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as any } : t));
            toast({ title: 'Status Updated', description: `Task is now ${status.replace('_', ' ')}` });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await deleteTask(taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            toast({ title: 'Task Deleted', description: 'Task removed successfully' });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete task', variant: 'destructive' });
        }
    };

    const handleSaveEditTask = async () => {
        if (!editTask) return;
        setSaving(true);
        try {
            const res = await updateTask(editTask.id, {
                title: editTask.title,
                description: editTask.description,
                priority: editTask.priority,
                estimated_time: editTask.estimated_time || '2h'
            });
            if (res) {
                setTasks(prev => prev.map(t => t.id === res.id ? res : t));
                setEditTask(null);
                toast({ title: 'Task Updated', description: 'Changes saved successfully' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <LayoutComponent>
            <div className="space-y-4 max-w-[1600px] mx-auto">
                {/* Slim Premium Header */}
                <div className="bg-white border rounded-2xl p-4 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                            <LayoutIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase truncate">Weekly Plan</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{format(currentDate, 'MMMM yyyy')}</span>
                                {isLoading && <div className="h-3 w-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        {isAdminOrHr && (
                            <div className="w-full sm:w-auto shrink-0">
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger className="w-full sm:w-[220px] h-9 bg-slate-50 border-none rounded-lg text-xs font-bold uppercase tracking-wide px-3">
                                        <div className="flex items-center gap-2 overflow-hidden truncate">
                                            <Briefcase className="h-3 w-3 text-primary shrink-0" />
                                            <SelectValue placeholder="SELECT EMPLOYEE" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200">
                                        <div className="px-3 py-2 text-[9px] font-black text-muted-foreground uppercase opacity-50">Team Directory ({profiles.length})</div>
                                        {profiles.length > 0 ? (
                                            profiles.map(p => (
                                                <SelectItem key={p.id} value={p.id} className="text-xs font-bold py-2">
                                                    {p.full_name || p.username}
                                                    <span className="ml-2 opacity-40 text-[9px]">({p.role})</span>
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-[10px] font-bold text-muted-foreground">No employees found</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-7 w-7"><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="ghost" onClick={handleToday} className="h-7 px-2 text-[9px] font-bold">TODAY</Button>
                            <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-7 w-7"><ChevronRight className="h-4 w-4" /></Button>
                        </div>

                        <div className="h-9 px-3 bg-slate-900 text-white flex items-center gap-2 rounded-lg text-[10px] font-bold tracking-wider">
                            {format(weekStart, 'dd/MM')} - {format(addDays(weekStart, showWeekends ? 6 : 4), 'dd/MM')}
                        </div>
                    </div>
                </div>

                {/* Today Status Strip - Slimmer */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-5 bg-white border border-primary/10 rounded-2xl shadow-sm transition-all hover:shadow-md group/strip">
                    <div className="flex items-center gap-4">
                        <div className="space-y-0.5">
                            <h2 className="text-lg font-black text-foreground tracking-tight group-hover/strip:text-primary transition-colors">
                                Today - <span className="opacity-60">{format(new Date(), 'dd/MM/yy')}</span>
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="h-7 px-3 flex items-center gap-2 bg-slate-100/80 rounded-full border text-[10px] font-black text-slate-600">
                                <Clock className="h-3 w-3" />
                                {formatTime(todayAttendance?.totals?.workSeconds || 0)}
                            </div>

                            {activeTimer && (
                                <div className="animate-in fade-in slide-in-from-left-2 flex items-center gap-2">
                                    <Badge className="h-7 px-3 rounded-full bg-emerald-500 text-white border-none text-[9px] font-black tracking-widest gap-2 shadow-lg shadow-emerald-500/10">
                                        <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                        TIMER RUNNING
                                    </Badge>
                                    <div className="h-7 px-3 flex items-center gap-2 bg-blue-500 text-white rounded-full text-[10px] font-mono font-bold shadow-lg shadow-blue-500/10">
                                        {formatTime(activeTimer ? (tasks.find(t => t.id === activeTimer.task_id)?.total_time_spent || 0) + elapsedTime : 0)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 py-1.5 px-4 bg-muted/40 rounded-full border border-muted-foreground/10 hover:border-primary/30 transition-all">
                            <input
                                type="checkbox"
                                id="enable-weekends"
                                checked={showWeekends}
                                onChange={e => setShowWeekends(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-all cursor-pointer"
                            />
                            <Label htmlFor="enable-weekends" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none">Enable Weekends</Label>
                        </div>

                        <Button
                            variant={showBacklogs ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowBacklogs(!showBacklogs)}
                            className={`h-9 px-6 rounded-full text-xs font-black tracking-widest transition-all ${showBacklogs ? 'shadow-lg shadow-primary/25 translate-y-[-1px]' : ''}`}
                        >
                            {showBacklogs ? 'HIDE BACKLOGS' : 'SHOW BACKLOGS'}
                        </Button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="flex-1 min-w-0">
                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-[500px] bg-slate-50 border border-dashed rounded-2xl animate-pulse flex items-center justify-center">
                                        <Clock className="h-6 w-6 text-slate-200" />
                                    </div>
                                ))}
                            </div>
                        ) : isAdminOrHr && !selectedUserId ? (
                            <div className="flex flex-col items-center justify-center py-40 bg-slate-50 border border-dashed rounded-[2rem] space-y-4 shadow-inner">
                                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-bounce">
                                    <Briefcase className="h-8 w-8" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Select Employee</h3>
                                    <p className="text-xs text-muted-foreground font-medium max-w-xs mx-auto">Choose a team member from the directory to manage their weekly execution plan.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {weekDays.map((day, idx) => {
                                    const dayTasks = getTasksForDay(day);
                                    const isDayToday = isSameDay(day, new Date());
                                    const totalSec = dayTasks.reduce((acc, t) => acc + (t.total_time_spent || 0), 0);

                                    return (
                                        <div key={idx} className="flex flex-col gap-2 min-w-0">
                                            <div className={`p-3 rounded-2xl border transition-all ${isDayToday ? 'bg-primary shadow-lg shadow-primary/20 border-primary text-white' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase tracking-wider ${isDayToday ? 'text-white' : 'text-slate-900'}`}>{format(day, 'EEEE')}</p>
                                                        <p className={`text-[9px] font-bold ${isDayToday ? 'text-white/80' : 'text-muted-foreground'}`}>{format(day, 'dd MMM')}</p>
                                                    </div>
                                                    <Badge variant="outline" className={`text-[8px] h-4 px-1.5 font-bold ${isDayToday ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200'}`}>{formatTime(totalSec)}</Badge>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    className={`w-full mt-3 h-10 rounded-xl border border-dashed ${isDayToday ? 'bg-white/10 border-white/30 text-white hover:bg-white/20' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-primary/30 text-muted-foreground hover:text-primary'} text-[11px] font-black uppercase tracking-widest transition-all`}
                                                    onClick={() => openAddTask(day)}
                                                >
                                                    <Plus className="h-4 w-4 mr-1.5" /> Add Task
                                                </Button>
                                            </div>

                                            <div className="space-y-2 min-h-[400px]">
                                                {dayTasks.length > 0 ? (
                                                    dayTasks.map(task => (
                                                        <TaskCard
                                                            key={task.id}
                                                            task={task}
                                                            activeTimer={activeTimer}
                                                            elapsedTime={elapsedTime}
                                                            onPlay={handlePlayTask}
                                                            onPause={handlePauseTask}
                                                            onStatusUpdate={handleStatusUpdate}
                                                            onMoveToDate={handleMoveToDay}
                                                            onEdit={setEditTask}
                                                            onDelete={handleDeleteTask}
                                                            isAdminOrHr={isAdminOrHr}
                                                            weekDays={weekDays}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="h-32 flex items-center justify-center border-2 border-dashed rounded-2xl opacity-10 group">
                                                        <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {showBacklogs && (
                        <div className="w-full xl:w-80 shrink-0">
                            <div className="bg-white border rounded-2xl p-4 shadow-xl shadow-slate-200/50 flex flex-col h-full mb-4 md:mb-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                            <Briefcase className="h-4 w-4" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Backlog</h3>
                                    </div>
                                    <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] font-bold px-2">{backlogTasks.length}</Badge>
                                </div>

                                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                                    {backlogTasks.length > 0 ? (
                                        backlogTasks.map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                activeTimer={activeTimer}
                                                elapsedTime={elapsedTime}
                                                onPlay={handlePlayTask}
                                                onPause={handlePauseTask}
                                                onStatusUpdate={handleStatusUpdate}
                                                onMoveToDate={handleMoveToDay}
                                                onEdit={setEditTask}
                                                onDelete={handleDeleteTask}
                                                isAdminOrHr={isAdminOrHr}
                                                weekDays={weekDays}
                                            />
                                        ))
                                    ) : (
                                        <div className="py-20 text-center border-2 border-dashed rounded-2xl opacity-20">
                                            <p className="text-[10px] font-bold uppercase tracking-widest">Clear Backlog</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Task Dialog */}
            <Dialog open={addTaskDialog} onOpenChange={setAddTaskDialog}>
                <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tight">
                            <Plus className="h-6 w-6 text-primary" />
                            New Weekly Task
                        </DialogTitle>
                        <p className="text-xs font-bold text-muted-foreground uppercase opacity-50">{addTaskDate ? format(addTaskDate, 'EEEE, dd MMMM yyyy') : 'No date'}</p>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Task Title *</Label>
                            <Input
                                placeholder="What needs to be done?"
                                value={newTask.title}
                                className="h-11 rounded-xl border-slate-200 font-bold focus:ring-primary/20"
                                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</Label>
                            <Textarea
                                placeholder="Additional details..."
                                value={newTask.description}
                                rows={3}
                                className="rounded-xl border-slate-200 font-medium text-xs focus:ring-primary/20"
                                onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority</Label>
                                <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="low" className="text-xs font-bold">Low</SelectItem>
                                        <SelectItem value="medium" className="text-xs font-bold">Medium</SelectItem>
                                        <SelectItem value="high" className="text-xs font-bold">High</SelectItem>
                                        <SelectItem value="urgent" className="text-xs font-bold">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estimate</Label>
                                <Input
                                    placeholder="e.g. 2h, 30m"
                                    value={newTask.estimated_time}
                                    className="h-10 rounded-xl"
                                    onChange={e => setNewTask(p => ({ ...p, estimated_time: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setAddTaskDialog(false)} className="rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</Button>
                        <Button
                            onClick={handleSaveTask}
                            disabled={saving}
                            className="rounded-xl px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                            {saving ? 'Creating...' : 'Launch Task'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={!!editTask} onOpenChange={() => setEditTask(null)}>
                <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tight">
                            <Edit className="h-6 w-6 text-primary" />
                            Edit Task Execution
                        </DialogTitle>
                    </DialogHeader>
                    {editTask && (
                        <div className="space-y-5 py-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Title</Label>
                                <Input
                                    value={editTask.title}
                                    className="h-11 rounded-xl border-slate-200 font-bold"
                                    onChange={e => setEditTask({ ...editTask, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</Label>
                                <Textarea
                                    value={editTask.description || ''}
                                    rows={3}
                                    className="rounded-xl border-slate-200 font-medium text-xs"
                                    onChange={e => setEditTask({ ...editTask, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority</Label>
                                    <Select value={editTask.priority} onValueChange={v => setEditTask({ ...editTask, priority: v as any })}>
                                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="low" className="text-xs font-bold">Low</SelectItem>
                                            <SelectItem value="medium" className="text-xs font-bold">Medium</SelectItem>
                                            <SelectItem value="high" className="text-xs font-bold">High</SelectItem>
                                            <SelectItem value="urgent" className="text-xs font-bold">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estimate</Label>
                                    <Input
                                        value={editTask.estimated_time || ''}
                                        className="h-10 rounded-xl"
                                        onChange={e => setEditTask({ ...editTask, estimated_time: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setEditTask(null)} className="rounded-xl text-[10px] font-black uppercase tracking-widest">Dismiss</Button>
                        <Button
                            onClick={handleSaveEditTask}
                            disabled={saving}
                            className="rounded-xl px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                            {saving ? 'Syncing...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </LayoutComponent>
    );
};

interface TaskCardProps {
    task: Task;
    activeTimer: { task_id: string; start_time: string } | null;
    elapsedTime: number;
    onPlay: (id: string) => void;
    onPause: (id: string) => void;
    onStatusUpdate: (id: string, status: string) => void;
    onMoveToDate: (id: string, date: Date | null) => void;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
    isAdminOrHr: boolean;
    weekDays: Date[];
}

const TaskCard = ({
    task,
    activeTimer,
    elapsedTime,
    onPlay,
    onPause,
    onStatusUpdate,
    onMoveToDate,
    onEdit,
    onDelete,
    isAdminOrHr,
    weekDays
}: TaskCardProps) => {
    const isRunning = activeTimer?.task_id === task.id;

    const formattedTime = (sec: number) => {
        const total = isRunning ? sec + elapsedTime : sec;
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
    };

    const getPriorityColor = (p: string) => {
        switch (p?.toLowerCase()) {
            case 'urgent': return 'bg-red-500 text-white border-none';
            case 'high': return 'bg-orange-500 text-white border-none';
            case 'medium': return 'bg-blue-500 text-white border-none';
            case 'low': return 'bg-emerald-500 text-white border-none';
            default: return 'bg-slate-500 text-white border-none';
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'review': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'on_hold': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <Card className={`group relative hover:shadow-xl transition-all duration-300 border-l-[4px] shadow-sm overflow-hidden ${isRunning ? 'border-primary ring-2 ring-primary/20 scale-[1.01] z-10' : 'border-primary/20'}`}>
            {isRunning && (
                <div className="absolute top-0 left-0 h-full w-0.5 bg-primary animate-pulse" />
            )}

            <CardContent className="p-3.5 space-y-2.5">
                <div className="flex justify-between items-start gap-1">
                    <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Badge className={`text-[9px] h-4 leading-none font-black px-1.5 rounded-sm uppercase ${getPriorityColor(task.priority)}`}>
                                {task.priority || 'Med'}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground/40 tracking-tighter uppercase truncate">
                                {task.task_id || 'TASK'}
                            </span>
                        </div>
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h5 className="text-[13px] font-black leading-snug line-clamp-3 text-slate-800 group-hover:text-primary transition-colors cursor-help">
                                        {task.title}
                                    </h5>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start" className="max-w-[280px] p-3 rounded-xl bg-slate-900 border-none shadow-2xl">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-tight text-white border-b border-white/10 pb-1">{task.title}</p>
                                        <p className="text-[9px] font-medium leading-relaxed text-slate-300">
                                            {task.description || 'No additional description provided for this task.'}
                                        </p>
                                        <div className="flex items-center gap-2 pt-1">
                                            <Badge className="text-[7px] font-black h-3.5 bg-white/10 text-white border-none uppercase">ID: {task.task_id || 'N/A'}</Badge>
                                            <Badge className="text-[7px] font-black h-3.5 bg-white/10 text-white border-none uppercase">Est: {task.estimated_time || '2h'}</Badge>
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-2xl border-primary/5">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Execution Date</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onMoveToDate(task.id, null)} className="text-[10px] font-bold gap-2 py-2">
                                <Briefcase className="h-3 w-3" /> Move to Backlog
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {weekDays.map((date, i) => (
                                <DropdownMenuItem key={i} onClick={() => onMoveToDate(task.id, date)} className="text-[10px] font-bold gap-2 py-2">
                                    <CalendarDays className="h-3 w-3 text-primary/50" /> {format(date, 'EEEE')}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Workflow Status</DropdownMenuLabel>
                            <div className="grid grid-cols-1 gap-0.5 p-1">
                                {['pending', 'in_progress', 'review', 'completed', 'on_hold'].map((s) => (
                                    (!isAdminOrHr && s === 'completed') ? null : (
                                        <DropdownMenuItem key={s} onClick={() => onStatusUpdate(task.id, s)} className="text-[10px] capitalize font-bold h-8">
                                            {s.replace('_', ' ')}
                                        </DropdownMenuItem>
                                    )
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {isAdminOrHr && (
                    <div className="flex gap-0.5 absolute top-1.5 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={() => onEdit(task)}>
                            <Edit className="h-2.5 w-2.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(task.id)}>
                            <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                    </div>
                )}

                <div className="flex flex-col gap-2 pt-1 border-t border-slate-50 mt-1">
                    <div className="flex items-center justify-between text-[10px]">
                        <div className={`flex items-center gap-1.5 font-bold transition-all px-2 py-0.5 rounded-md border ${isRunning ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                            <Clock className={`h-3 w-3 ${isRunning ? 'animate-spin' : ''}`} />
                            <span className="font-mono">{formattedTime(task.total_time_spent || 0)}</span>
                            <span className="opacity-40">/ {task.estimated_time || '2h'}</span>
                        </div>

                        <Badge variant="outline" className={`text-[9px] font-black h-5 px-2 capitalize whitespace-nowrap ${getStatusColor(task.status)} shadow-sm`}>
                            {task.status?.replace('_', ' ') || 'Pending'}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary border border-primary/20 shrink-0">
                                {task.assigned_to_name?.charAt(0) || 'U'}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 truncate opacity-80 uppercase tracking-tight">{task.assigned_to_name?.split(' ')[0]}</span>
                        </div>

                        <div className="flex gap-1.5">
                            {isRunning ? (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 px-2.5 text-[10px] font-black rounded-lg gap-1.5 shadow-md shadow-destructive/20 active:scale-95 transition-all"
                                    onClick={() => onPause(task.id)}
                                >
                                    <Pause className="h-3 w-3 fill-current" /> STOP
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 text-[10px] font-black text-primary border-primary/30 hover:bg-primary hover:text-white transition-all rounded-lg gap-1.5 shadow-sm active:scale-95"
                                    onClick={() => onPlay(task.id)}
                                    disabled={activeTimer !== null}
                                >
                                    <Play className="h-3 w-3 fill-current" /> START
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {task.status === 'completed' && (
                    <div className="absolute bottom-0 right-0 opacity-5 pointer-events-none">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default WeeklyPlan;
