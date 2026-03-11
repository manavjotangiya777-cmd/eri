import { useEffect, useState } from 'react';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getMyAttendance, getAbsences, getSystemSettings } from '@/db/api';
import type { Attendance, SystemSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, TrendingUp, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeeAttendanceReportProps {
  Layout?: React.ComponentType<{ children: React.ReactNode }>;
}

export default function EmployeeAttendanceReport({ Layout = EmployeeLayout }: EmployeeAttendanceReportProps) {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [attendanceData, absenceData, settingsData] = await Promise.all([
        getMyAttendance(profile.id, 90),
        getAbsences({ user_id: profile.id }),
        getSystemSettings()
      ]);
      setAttendance(attendanceData);
      setAbsences(absenceData);
      setSettings(settingsData as any);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load attendance report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString.includes('T')) {
      // It's a YYYY-MM-DD string
      const [y, m, d] = dateString.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const getClockIn = (r: Attendance): string | null =>
    r.sessions && r.sessions.length > 0 ? r.sessions[0].clockInAt : (r as any).clock_in || null;

  const getClockOut = (r: Attendance): string | null => {
    if (r.sessions && r.sessions.length > 0) return r.sessions[r.sessions.length - 1].clockOutAt || null;
    return (r as any).clock_out || null;
  };

  const calculateHours = (r: Attendance): number => {
    if (r.totals?.workSeconds) return r.totals.workSeconds / 3600;
    if (r.totals?.totalClockSeconds) return r.totals.totalClockSeconds / 3600;
    return (r as any).actual_work_hours || 0;
  };

  const formatWorkHours = (r: Attendance): string => {
    const secs = r.totals?.workSeconds || r.totals?.totalClockSeconds || 0;
    if (secs) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
    const decimalHours = (r as any).actual_work_hours || 0;
    if (decimalHours > 0) return `${Math.floor(decimalHours)}h ${Math.round((decimalHours % 1) * 60)}m`;
    return '-';
  };

  const formatBreakHours = (r: Attendance): string => {
    let secs = r.totals?.totalBreakSeconds || 0;
    if (!secs && r.breaks?.length > 0) {
      secs = r.breaks.reduce((acc: number, b: any) => acc + (b.durationSeconds || 0), 0);
    }
    if (!secs) return '-';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const calculateOvertime = (r: Attendance): number => {
    return (r as any).overtime_hours || 0;
  };

  const IST_TZ = 'Asia/Kolkata';
  const getISTDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ }).format(new Date());
  const getISTTimeInMinutes = () => {
    const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: IST_TZ }).formatToParts(new Date());
    return parseInt(parts.find(p => p.type === 'hour')!.value) * 60 + parseInt(parts.find(p => p.type === 'minute')!.value);
  };

  const todayStr = getISTDate();

  const isShiftEnded = () => {
    if (!profile || !settings) return true;
    const shiftEnd = profile.shift_type === 'half_day' ? settings.half_day_end_time : settings.work_end_time;
    if (!shiftEnd) return true;
    const [h, m] = shiftEnd.split(':').map(Number);
    return getISTTimeInMinutes() > (h * 60 + m);
  };

  const StatusBadge = ({ record }: { record: Attendance }) => {
    if (!record || !getClockIn(record)) {
      return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
    }

    const labels = [];
    if (record.is_late) {
      labels.push(`Late +${record.late_minutes}m`);
    }

    const isToday = record.date === todayStr;
    if ((record as any).is_early_leave && record.status === 'clocked_out' && (!isToday || isShiftEnded())) {
      labels.push(`Early Leave -${(record as any).early_leave_minutes}m`);
    }

    if (labels.length > 0) {
      return (
        <div className="flex flex-col gap-1">
          {labels.map((label, idx) => (
            <Badge key={idx} className={cn(
              "font-semibold w-fit",
              label.includes('Late')
                ? "bg-yellow-400/15 text-yellow-700 dark:text-yellow-400 border-yellow-400/30"
                : "bg-orange-500/15 text-orange-600 border-orange-500/30"
            )}>
              {label}
            </Badge>
          ))}
        </div>
      );
    }

    return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 font-semibold">On Time</Badge>;
  };

  const attendanceKeys = new Set(attendance.map(a => a.date));
  const mergedRows = [
    ...attendance.map(r => ({ kind: 'attendance' as const, record: r })),
    ...absences
      .filter(ab => !attendanceKeys.has(ab.date))
      .map(ab => ({
        kind: 'absent' as const,
        date: ab.date,
        reason: ab.reason === 'approved_leave' ? 'Approved Leave' : 'No Clock-In',
      })),
  ].sort((a, b) => {
    const da = a.kind === 'attendance' ? a.record.date : a.date!;
    const db = b.kind === 'attendance' ? b.record.date : b.date!;
    return db.localeCompare(da);
  });

  const totalDays = attendance.length;
  const lateDays = attendance.filter(a => a.is_late).length;
  const onTimeDays = attendance.filter(a => !a.is_late && getClockIn(a)).length;
  const earlyDepartures = attendance.filter(a => (a as any).is_early_leave).length;
  const totalWorkHours = attendance.reduce((sum, a) => sum + calculateHours(a), 0);
  const totalOvertimeHours = attendance.reduce((sum, a) => sum + calculateOvertime(a), 0);
  const avgWorkHours = totalDays > 0 ? (totalWorkHours / totalDays).toFixed(1) : '0';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Attendance Report</h1>
            <p className="text-muted-foreground">View your attendance history and statistics</p>
          </div>
          <Calendar className="h-8 w-8 text-primary" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Total Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDays}</div>
              <p className="text-xs text-muted-foreground">Last 90 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                On Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{onTimeDays}</div>
              <p className="text-xs text-muted-foreground">
                {totalDays > 0 ? `${((onTimeDays / totalDays) * 100).toFixed(0)}%` : '0%'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Late Arrivals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lateDays}</div>
              <p className="text-xs text-muted-foreground">
                {totalDays > 0 ? `${((lateDays / totalDays) * 100).toFixed(0)}%` : '0%'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg Work Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{avgWorkHours}h</div>
              <p className="text-xs text-muted-foreground">Per day</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Overtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{totalOvertimeHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Extra hours</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Break Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedRows.map((row) => {
                    if (row.kind === 'absent') {
                      return (
                        <TableRow key={`absent_${row.date}`} className="bg-red-500/5 hover:bg-red-500/10">
                          <TableCell className="font-medium">
                            {formatDate(row.date!)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell>
                            <Badge className="bg-red-500/15 text-red-600 border-red-500/30 font-semibold">
                              Absent · {row.reason}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const record = row.record;
                    return (
                      <TableRow key={record.id} className={cn(
                        record.is_late && 'bg-yellow-400/5 hover:bg-yellow-400/10',
                        !record.is_late && getClockIn(record) && 'hover:bg-green-500/5'
                      )}>
                        <TableCell className="font-medium">
                          {formatDate(record.date)}
                        </TableCell>
                        <TableCell>
                          {formatTime(getClockIn(record))}
                          {record.is_late && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              +{record.late_minutes}m
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatTime(getClockOut(record))}
                          {(record as any).is_early_leave && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Early
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatWorkHours(record)}
                        </TableCell>
                        <TableCell>
                          {formatBreakHours(record)}
                        </TableCell>
                        <TableCell>
                          {calculateOvertime(record) > 0 ? (
                            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                              +{calculateOvertime(record).toFixed(2)}h
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge record={record} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <span className="text-sm font-medium">Total Working Days</span>
                <span className="text-lg font-bold">{totalDays}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <span className="text-sm font-medium">Total Work Hours</span>
                <span className="text-lg font-bold">{totalWorkHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <span className="text-sm font-medium">Punctuality Rate</span>
                <span className="text-lg font-bold text-chart-2">
                  {totalDays > 0 ? `${((onTimeDays / totalDays) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <span className="text-sm font-medium">Late Arrival Rate</span>
                <span className="text-lg font-bold text-destructive">
                  {totalDays > 0 ? `${((lateDays / totalDays) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
