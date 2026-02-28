import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BDELayout from '@/components/layouts/BDELayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getAllProfiles, getDashboardStats, getTodayAttendance, clockIn, clockOut, breakIn, breakOut, getMyAnnouncements } from '@/db/api';
import type { Attendance, Announcement } from '@/types';
import { cn } from '@/lib/utils';
import { CheckSquare, Clock, Users, Play, Pause, Coffee, LogOut, Timer, Bell, Cake, Sparkles, Receipt, Headset } from 'lucide-react';

export default function BDEDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Local timers state
  const [workingSeconds, setWorkingSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const timerRef = useRef<any>(null);

  const loadData = async () => {
    if (!profile?.id || !profile?.role) return;
    try {
      // Use employee-like role for stats to get tasks etc, but also show client/invoice stats if possible
      const [statsData, attendanceData, announcementsData, profilesData] = await Promise.all([
        getDashboardStats(profile.id, profile.role),
        getTodayAttendance(profile.id),
        getMyAnnouncements(profile),
        getAllProfiles()
      ]);
      setStats(statsData);
      setAttendance(attendanceData);
      setAnnouncements(announcementsData);

      // Birthday logic
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentYear = today.getFullYear();

      const birthdays = profilesData
        .filter(p => p.date_of_birth && p.is_active !== false)
        .map(p => {
          const dob = new Date(p.date_of_birth!);
          let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());
          if (nextBirthday < today) nextBirthday.setFullYear(currentYear + 1);
          const diffTime = nextBirthday.getTime() - today.getTime();
          const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));
          return { ...p, daysUntil };
        })
        .filter(p => p.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setUpcomingBirthdays(birthdays);

      if (attendanceData) {
        let clockSeconds = attendanceData.totals?.totalClockSeconds || 0;
        if (attendanceData.status === 'working' && attendanceData.lastClockInAt) {
          const elapsed = Math.floor((Date.now() - new Date(attendanceData.lastClockInAt).getTime()) / 1000);
          clockSeconds += elapsed;
        }
        setWorkingSeconds(clockSeconds);
        setBreakSeconds(attendanceData.totals?.totalBreakSeconds || 0);
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, [profile]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (attendance?.status === 'working') {
      timerRef.current = setInterval(() => setWorkingSeconds(prev => prev + 1), 1000);
    } else if (attendance?.status === 'on_break') {
      timerRef.current = setInterval(() => setBreakSeconds(prev => prev + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [attendance?.status]);

  const handleAction = async (actionFn: (id: string) => Promise<any>, successMsg: string) => {
    if (!profile?.id) return;
    setActionLoading(true);
    try {
      await actionFn(profile.id);
      toast({ title: 'Success', description: successMsg });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Action Failed',
        description: error?.response?.data?.error || error?.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const statCards = [
    { title: 'My Tasks', value: stats?.myTasks || 0, icon: CheckSquare, color: 'text-primary' },
    { title: 'Pending Tasks', value: stats?.pendingTasks || 0, icon: Clock, color: 'text-chart-3' },
    { title: 'Completed Tasks', value: stats?.completedTasks || 0, icon: CheckSquare, color: 'text-chart-2' },
  ];

  const getStatusBadge = () => {
    if (!attendance) return <Badge variant="secondary">CLOCKED OUT</Badge>;
    switch (attendance.status) {
      case 'working': return <Badge className="bg-green-500 hover:bg-green-600">WORKING</Badge>;
      case 'on_break': return <Badge className="bg-yellow-500 hover:bg-yellow-600">ON BREAK</Badge>;
      default: return <Badge variant="secondary">CLOCKED OUT</Badge>;
    }
  };

  const canClockOut = () => {
    if (!attendance || attendance.status === 'on_break' || !attendance.currentSessionOpen) return false;
    if (!attendance.lastClockInAt) return true;
    const diff = (new Date().getTime() - new Date(attendance.lastClockInAt).getTime()) / 1000;
    return diff >= 60;
  };

  const canBreakOut = () => {
    if (!attendance || attendance.status !== 'on_break') return false;
    const lastBreak = attendance.breaks?.[attendance.breaks.length - 1];
    if (!lastBreak?.breakInAt) return true;
    const diff = (new Date().getTime() - new Date(lastBreak.breakInAt).getTime()) / 1000;
    return diff >= 60;
  };

  return (
    <BDELayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">BDE Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.full_name || profile?.username}</p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border text-right">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Time</div>
            <div className="text-xl font-mono font-bold">{currentTime.toLocaleTimeString()}</div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  {loading ? <Skeleton className="h-8 w-16 bg-muted" /> : <div className="text-2xl font-bold">{stat.value}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Attendance Tracker */}
          <Card className="lg:col-span-2 shadow-lg border-primary/20 overflow-hidden">
             <div className="h-1 bg-primary/20 w-full">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: attendance?.status === 'working' ? '100%' : (attendance?.status === 'on_break' ? '50%' : '0%') }}
              />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Attendance Tracker
              </CardTitle>
              {getStatusBadge()}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex flex-col items-center justify-center">
                  <div className="text-xs font-bold text-green-600 uppercase mb-2">Effective Working Time</div>
                  <div className="text-4xl font-mono font-bold text-green-700">
                    {formatDuration(Math.max(0, workingSeconds - breakSeconds))}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex flex-col items-center justify-center">
                  <div className="text-xs font-bold text-yellow-600 uppercase mb-2">Total Break Time</div>
                  <div className="text-4xl font-mono font-bold text-yellow-700">
                    {formatDuration(breakSeconds)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button size="lg" className="w-full flex flex-col font-bold h-16 gap-1" disabled={actionLoading || attendance?.currentSessionOpen} onClick={() => handleAction(clockIn, 'Clocked in successfully')}><Play className="h-4 w-4" /><span>Clock In</span></Button>
                <Button size="lg" variant="outline" className="w-full flex flex-col font-bold h-16 gap-1 border-yellow-500 text-yellow-600" disabled={actionLoading || attendance?.status !== 'working'} onClick={() => handleAction(breakIn, 'Break started')}><Pause className="h-4 w-4" /><span>Break In</span></Button>
                <Button size="lg" variant="outline" className="w-full flex flex-col font-bold h-16 gap-1 border-primary text-primary" disabled={actionLoading || !canBreakOut()} onClick={() => handleAction(breakOut, 'Break ended')}><Coffee className="h-4 w-4" /><span>Break Out</span></Button>
                <Button size="lg" variant="destructive" className="w-full flex flex-col font-bold h-16 gap-1" disabled={actionLoading || !canClockOut()} onClick={() => handleAction(clockOut, 'Clocked out successfully')}><LogOut className="h-4 w-4" /><span>Clock Out</span></Button>
              </div>
            </CardContent>
          </Card>

          {/* Business Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Business Console</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-4 h-12" onClick={() => navigate('/bde/clients')}>
                <Users className="h-5 w-5 text-blue-500" />
                <div className="text-left"><div className="font-semibold text-sm">Client Management</div><div className="text-[10px] text-muted-foreground">View and manage clients</div></div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-4 h-12" onClick={() => navigate('/bde/invoices')}>
                <Receipt className="h-5 w-5 text-green-500" />
                <div className="text-left"><div className="font-semibold text-sm">Invoice Management</div><div className="text-[10px] text-muted-foreground">Track billing & payments</div></div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-4 h-12" onClick={() => navigate('/bde/client-support')}>
                <Headset className="h-5 w-5 text-purple-500" />
                <div className="text-left"><div className="font-semibold text-sm">Client Support</div><div className="text-[10px] text-muted-foreground">Direct client chat</div></div>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
           <Card className="shadow-lg border-muted-foreground/10 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Latest Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {announcements.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm italic border-2 border-dashed rounded-xl">No new announcements today.</div>
              ) : (
                <div className="space-y-4">
                  {announcements.slice(0, 3).map((ann) => (
                    <div key={ann.id} className="p-4 rounded-xl bg-muted/30 border border-muted-foreground/10">
                      <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-sm">{ann.title}</h4><Badge variant="outline" className="text-[9px] uppercase font-black">{ann.priority}</Badge></div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-2xl border-none bg-gradient-to-br from-pink-500/5 to-violet-500/5 overflow-hidden">
            <CardHeader className="bg-white/40 backdrop-blur-md border-b border-pink-500/10 pb-4">
              <CardTitle className="flex items-center justify-between text-xl">
                <div className="flex items-center gap-2 text-pink-600 font-extrabold tracking-tight"><Cake className="h-6 w-6 animate-bounce" />Upcoming Birthdays</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 px-4">
              {upcomingBirthdays.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-white/30 rounded-2xl border border-dashed border-pink-200">
                  <p className="font-medium italic">No birthdays this month.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBirthdays.map((emp) => (
                    <div key={emp.id} className={cn("relative group flex items-center justify-between p-4 rounded-2xl transition-all duration-500", emp.daysUntil === 0 ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg scale-105 z-10" : "bg-white/60 border border-pink-500/5 shadow-sm")}>
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", emp.daysUntil === 0 ? "bg-white/20" : "bg-pink-500/10")}><Cake className={cn("h-5 w-5", emp.daysUntil === 0 ? "text-white" : "text-pink-500")} /></div>
                        <div>
                          <p className={cn("font-black text-sm tracking-tight", emp.daysUntil === 0 ? "text-white" : "text-foreground")}>{emp.full_name || emp.username}</p>
                          <p className={cn("text-[10px] font-bold uppercase tracking-wider", emp.daysUntil === 0 ? "text-pink-100" : "text-muted-foreground")}>{new Date(emp.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <Badge className={cn("text-[10px] font-black px-3 py-0.5 rounded-full border-none", emp.daysUntil === 0 ? "bg-white text-pink-600 shadow-md" : "bg-pink-500/10 text-pink-600")}>{emp.daysUntil === 0 ? "TODAY!" : `${emp.daysUntil} DAYS`}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </BDELayout>
  );
}
