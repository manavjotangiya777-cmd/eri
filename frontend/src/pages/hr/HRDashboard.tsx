import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import HRLayout from '@/components/layouts/HRLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Briefcase,
  CheckSquare,
  Calendar,
  Users,
  ChevronRight,
  LayoutList,
  Play,
  Pause,
  Coffee,
  LogOut,
  Timer,
} from 'lucide-react';
import {
  getDashboardStats,
  getTodayAttendance,
  clockIn,
  clockOut,
  breakIn,
  breakOut,
} from '@/db/api';
import type { Attendance } from '@/types';

export default function HRDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live timers
  const [workingSeconds, setWorkingSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  const loadData = async () => {
    if (!profile?.id || !profile?.role) return;
    try {
      const [statsData, attendanceData] = await Promise.all([
        getDashboardStats(profile.id, profile.role),
        getTodayAttendance(profile.id),
      ]);
      setStats(statsData);
      setAttendance(attendanceData);

      if (attendanceData) {
        let clockSeconds = attendanceData.totals?.totalClockSeconds || 0;

        if (attendanceData.status === 'working' && attendanceData.lastClockInAt) {
          const elapsed = Math.floor(
            (Date.now() - new Date(attendanceData.lastClockInAt).getTime()) / 1000
          );
          clockSeconds += elapsed;
        }

        setWorkingSeconds(clockSeconds);
        setBreakSeconds(attendanceData.totals?.totalBreakSeconds || 0);
      }
    } catch (error) {
      console.error('Failed to load HR dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, [profile]);

  // Live timer increment
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (attendance?.status === 'working') {
      timerRef.current = setInterval(() => {
        setWorkingSeconds(prev => prev + 1);
      }, 1000);
    } else if (attendance?.status === 'on_break') {
      timerRef.current = setInterval(() => {
        setBreakSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

  const getStatusBadge = () => {
    if (!attendance) return <Badge variant="secondary">CLOCKED OUT</Badge>;
    switch (attendance.status) {
      case 'working':   return <Badge className="bg-green-500 hover:bg-green-600">WORKING</Badge>;
      case 'on_break':  return <Badge className="bg-yellow-500 hover:bg-yellow-600">ON BREAK</Badge>;
      default:          return <Badge variant="secondary">CLOCKED OUT</Badge>;
    }
  };

  const statCards = [
    { title: 'Total Clients',   value: stats?.totalClients  || 0, icon: Briefcase,   color: 'text-primary' },
    { title: 'Total Tasks',     value: stats?.totalTasks    || 0, icon: CheckSquare,  color: 'text-chart-2' },
    { title: 'Pending Leaves',  value: stats?.pendingLeaves || 0, icon: Calendar,     color: 'text-chart-3' },
  ];

  return (
    <HRLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">HR Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.full_name || profile?.username}</p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border text-right">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Time</div>
            <div className="text-xl font-mono font-bold">{currentTime.toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-3">
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

        {/* ─── Attendance Tracker ─── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-lg border-primary/20 overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-primary/20 w-full">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{
                  width: attendance?.status === 'working' ? '100%'
                    : attendance?.status === 'on_break' ? '50%'
                    : '0%'
                }}
              />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  Attendance Tracker
                </CardTitle>
                <CardDescription>Manage your daily work sessions and breaks</CardDescription>
              </div>
              {getStatusBadge()}
            </CardHeader>
            <CardContent className="pt-4">
              {/* Timers */}
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

              {/* Action Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  size="lg"
                  className="w-full flex flex-col font-bold h-16 gap-1"
                  disabled={actionLoading || !!attendance?.currentSessionOpen}
                  onClick={() => handleAction(clockIn, 'Clocked in successfully')}
                >
                  <Play className="h-4 w-4" />
                  <span>Clock In</span>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full flex flex-col font-bold h-16 gap-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  disabled={actionLoading || attendance?.status !== 'working'}
                  onClick={() => handleAction(breakIn, 'Break started')}
                >
                  <Pause className="h-4 w-4" />
                  <span>Break In</span>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full flex flex-col font-bold h-16 gap-1 border-primary text-primary hover:bg-primary/5"
                  disabled={actionLoading || !canBreakOut()}
                  onClick={() => handleAction(breakOut, 'Break ended')}
                >
                  <Coffee className="h-4 w-4" />
                  <span>Break Out</span>
                </Button>

                <Button
                  size="lg"
                  variant="destructive"
                  className="w-full flex flex-col font-bold h-16 gap-1"
                  disabled={actionLoading || !canClockOut()}
                  onClick={() => handleAction(clockOut, 'Clocked out successfully')}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Clock Out</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Today Summary */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Today Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-dashed">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Total Clock Time
                </div>
                <div className="font-mono font-bold">{formatDuration(workingSeconds)}</div>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-dashed">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  Total Break Time
                </div>
                <div className="font-mono font-bold text-yellow-600">{formatDuration(breakSeconds)}</div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="text-base font-bold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Net Working Hours
                </div>
                <div className="text-xl font-mono font-black text-green-600">
                  {formatDuration(Math.max(0, workingSeconds - breakSeconds))}
                </div>
              </div>

              <div className="mt-6 p-3 bg-muted/40 rounded-lg">
                <p className="text-[10px] text-muted-foreground italic leading-tight">
                  Note: Multiple sessions are combined. Net hours excludes breaks.
                  Min. 1 minute session required for clock out.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Department Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-lg border-none ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <LayoutList className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Link
                to="/hr/employees"
                className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-primary/5 hover:border-primary/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Manage Employees</div>
                    <div className="text-sm text-muted-foreground">View and manage staff records</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/hr/leaves"
                className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-primary/5 hover:border-primary/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Review Leaves</div>
                    <div className="text-sm text-muted-foreground">Approve or reject pending leaves</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/hr/content"
                className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-primary/5 hover:border-primary/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Manage Content</div>
                    <div className="text-sm text-muted-foreground">Update holidays & announcements</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Active Clients</div>
                <div className="text-lg font-medium">{stats.totalClients || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Tasks</div>
                <div className="text-lg font-medium">{stats.totalTasks || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pending Approvals</div>
                <div className="text-lg font-medium">{stats.pendingLeaves || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </HRLayout>
  );
}
