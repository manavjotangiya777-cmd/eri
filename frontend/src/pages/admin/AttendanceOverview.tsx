import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAllAttendance, getAllProfiles, getAbsences, generateAbsences, getSystemSettings } from '@/db/api';
import type { Profile, SystemSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Calendar, UserX, RefreshCcw, Download, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AttendanceRecord = any;

type MergedRow =
  | { kind: 'attendance'; record: AttendanceRecord }
  | { kind: 'absent'; userId: string; userName: string; date: string; absenceReason: string };

export default function AttendanceOverview() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const { toast } = useToast();

  const loadData = async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const [attendanceData, usersData, absenceData, settingsData] = await Promise.all([
        getAllAttendance(500, from || startDate || undefined, to || endDate || undefined),
        getAllProfiles(),
        getAbsences({ from: from || startDate || undefined, to: to || endDate || undefined }),
        getSystemSettings(),
      ]);
      setAttendance(attendanceData as any[]);
      setUsers(usersData);
      setAbsences(absenceData);
      setSettings(settingsData as any);
    } catch {
      toast({ title: 'Error', description: 'Failed to load attendance data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAbsences = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      await generateAbsences(firstDayOfMonth, lastDayOfMonth);
      toast({ title: 'Success', description: 'Absence records synchronized with schedule' });
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Sync failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    loadData();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    loadData('', '');
  };

  const exportToExcel = () => {
    try {
      const headers = ['User', 'Date', 'Shift', 'Clock In', 'Clock Out', 'Work Hours', 'Break Hours', 'Status'];
      const dataRows = mergedRows.map(row => {
        if (row.kind === 'attendance') {
          const r = row.record;
          const user = getUserName(r.user_id);
          const shift = users.find(u => (u.id || (u as any)._id) === (r.user_id?._id || r.user_id))?.shift_type === 'half_day' ? 'Half Day' : 'Full Day';
          return [
            user,
            r.date,
            shift,
            getClockIn(r) ? new Date(getClockIn(r)!).toLocaleTimeString() : '-',
            getClockOut(r) ? new Date(getClockOut(r)!).toLocaleTimeString() : '-',
            formatWorkHours(r),
            formatBreakHours(r),
            r.is_late ? `Late (${r.late_minutes}m)` : 'On Time'
          ];
        } else {
          return [
            row.userName,
            row.date,
            '-',
            '-',
            '-',
            '-',
            '-',
            `Absent: ${row.absenceReason}`
          ];
        }
      });

      const csvContent = [headers, ...dataRows].map(e => e.map(v => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to export data' });
    }
  };

  useEffect(() => { loadData(); }, []);

  // Attendance lookup set
  const attendanceKeys = new Set(
    attendance.map(a => {
      const uid = a.user_id?._id?.toString() || a.user_id?.toString() || a.user_id;
      if (!uid) return '';
      return `${uid}_${a.date}`;
    }).filter(Boolean)
  );

  // ── Helpers ──────────────────────────────────────────────────────
  const getUserName = (userId: any): string => {
    if (userId && typeof userId === 'object' && (userId.full_name || userId.username))
      return userId.full_name || userId.username;
    const id = userId?._id?.toString() || userId?.toString() || userId;
    const user = users.find(u => u.id === id || (u as any)._id?.toString() === id);
    return user?.full_name || user?.username || 'Unknown';
  };

  const getClockIn = (r: AttendanceRecord | null): string | null => {
    if (!r) return null;
    return r.sessions?.length > 0 ? r.sessions[0].clockInAt || null : r.clock_in || null;
  };
  const getClockOut = (r: AttendanceRecord | null): string | null => {
    if (!r) return null;
    if (r.sessions?.length > 0) return r.sessions[r.sessions.length - 1].clockOutAt || null;
    return r.clock_out || null;
  };
  const getBreakIn = (r: AttendanceRecord | null): string | null => {
    if (!r) return null;
    return r.breaks?.length > 0 ? r.breaks[0].breakInAt || null : null;
  };

  const formatWorkHours = (r: AttendanceRecord | null): string => {
    if (!r) return '-';
    const secs = r.totals?.workSeconds || r.totals?.totalClockSeconds || 0;
    if (!secs) return '-';
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  };

  // Total break duration: prefer stored totalBreakSeconds, else calculate from breaks[]
  const formatBreakHours = (r: AttendanceRecord | null): string => {
    if (!r) return '-';
    let secs: number = 0;
    if (r.totals?.totalBreakSeconds) {
      secs = r.totals.totalBreakSeconds;
    } else if (r.breaks?.length > 0) {
      secs = r.breaks.reduce((acc: number, b: any) => acc + (b.durationSeconds || 0), 0);
      if (secs === 0) {
        secs = r.breaks.reduce((acc: number, b: any) => {
          if (b.breakInAt && b.breakOutAt) {
            return acc + Math.floor((new Date(b.breakOutAt).getTime() - new Date(b.breakInAt).getTime()) / 1000);
          }
          return acc;
        }, 0);
      }
    }
    if (!secs) return '-';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatOvertimeHours = (r: AttendanceRecord | null): string => {
    if (!r) return '-';
    const secs = r.totals?.overtimeSeconds || 0;
    if (!secs || secs <= 0) return '-';
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  };

  const formatTime = (val: string | null): string => {
    if (!val) return '-';
    return new Date(val).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (val: string): string =>
    new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Merge attendance + absences + missing current day users
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const isShiftEnded = (user: Profile | undefined) => {
    if (!user || !settings) return true;
    const shiftEnd = user.shift_type === 'half_day' ? settings.half_day_end_time : settings.work_end_time;
    if (!shiftEnd) return true;
    const [h, m] = shiftEnd.split(':').map(Number);
    const endTime = new Date(now);
    endTime.setHours(h, m, 0, 0);
    return now > endTime;
  };

  const mergedRows: MergedRow[] = [
    ...attendance.map(r => ({ kind: 'attendance' as const, record: r })),
    ...absences
      .filter(ab => {
        const uid = ab.user_id?._id?.toString() || ab.user_id?.toString?.() || '';
        const isToday = ab.date === todayStr;
        if (isToday && ab.reason === 'no_clockin') {
          const user = users.find(u => (u.id || (u as any)._id?.toString()) === uid);
          if (!isShiftEnded(user)) return false;
        }
        return !attendanceKeys.has(`${uid}_${ab.date}`);
      })
      .map(ab => ({
        kind: 'absent' as const,
        userId: ab.user_id?._id?.toString() || ab.user_id?.toString?.() || '',
        userName: ab.user_id?.full_name || ab.user_id?.username || 'Unknown',
        date: ab.date,
        absenceReason: ab.reason === 'approved_leave' ? 'Approved Leave' : 'No Clock-In',
      })),
    // Dynamic "Not Clocked In" for today
    ...users
      .filter(u => u.role === 'employee' || u.role === 'bde')
      .filter(u => {
        const uid = u.id || (u as any)._id?.toString();
        return !attendanceKeys.has(`${uid}_${todayStr}`);
      })
      .filter(u => {
        // If there's already an absence record for today (from generator), don't double it
        const uid = u.id || (u as any)._id?.toString();
        return !absences.some(ab => ab.date === todayStr && (ab.user_id?._id?.toString() || ab.user_id?.toString?.()) === uid);
      })
      .filter(u => isShiftEnded(u)) // USER REQUEST: Only show as "Absent" if the shift time has already passed
      .map(u => ({
        kind: 'absent' as const,
        userId: u.id || (u as any)._id?.toString(),
        userName: u.full_name || u.username,
        date: todayStr,
        absenceReason: 'Not Clocked In Yet',
      }))
  ].sort((a, b) => {
    const da = a.kind === 'attendance' ? a.record.date : a.date;
    const db = b.kind === 'attendance' ? b.record.date : b.date;
    return db.localeCompare(da) || (getUserName(a.kind === 'attendance' ? a.record.user_id : (a as any).userId).localeCompare(getUserName(b.kind === 'attendance' ? b.record.user_id : (b as any).userId)));
  });

  // Status badge component
  const StatusBadge = ({ record }: { record: AttendanceRecord | null }) => {
    if (!record || !getClockIn(record)) {
      return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 font-semibold">Absent</Badge>;
    }
    if (record.is_late) {
      return (
        <Badge className="bg-yellow-400/15 text-yellow-700 dark:text-yellow-400 border-yellow-400/30 font-semibold">
          Late +{record.late_minutes}m
        </Badge>
      );
    }
    return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 font-semibold">On Time</Badge>;
  };

  const totalAbsences = mergedRows.filter(r => r.kind === 'absent').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Attendance Overview</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Monitor employee attendance and absences</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAbsences}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
              Sync with Schedule
            </Button>
            <Calendar className="h-8 w-8 text-primary hidden sm:block" />
          </div>
        </div>

        <Card className="border-primary/10">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="grid gap-2 flex-1 w-full">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="grid gap-2 flex-1 w-full">
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="default" onClick={handleDateFilter} disabled={loading} className="gap-2 flex-1 md:flex-none">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
                <Button variant="outline" onClick={handleClearFilter} disabled={loading}>
                  Clear
                </Button>
                <Button variant="secondary" onClick={exportToExcel} disabled={loading} className="gap-2 flex-1 md:flex-none">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Records</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{attendance.length}</div></CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">✅ On Time</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{attendance.filter(a => !a.is_late && getClockIn(a)).length}</div></CardContent>
          </Card>
          <Card className="border-yellow-400/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-600">🕐 Late</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-yellow-600">{attendance.filter(a => a.is_late).length}</div></CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600">❌ Absent</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{totalAbsences}</div></CardContent>
          </Card>
          <Card className="border-purple-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-600">⚡ Total Overtime</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {Math.floor(attendance.reduce((acc, a) => acc + (a.totals?.overtimeSeconds || 0), 0) / 3600)}h {Math.floor((attendance.reduce((acc, a) => acc + (a.totals?.overtimeSeconds || 0), 0) % 3600) / 60)}m
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Attendance Records
              <span className="text-sm font-normal text-muted-foreground">({mergedRows.length} total)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10">Loading...</div>
            ) : mergedRows.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No records found.</div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 pb-2">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="text-nowrap">
                      <TableHead className="font-bold min-w-[150px]">Employee</TableHead>
                      <TableHead className="font-bold min-w-[120px]">Date</TableHead>
                      <TableHead className="font-bold min-w-[100px]">Shift</TableHead>
                      <TableHead className="font-bold min-w-[100px]">Clock In</TableHead>
                      <TableHead className="font-bold min-w-[100px]">Clock Out</TableHead>
                      <TableHead className="font-bold min-w-[120px]">Work Hours</TableHead>
                      <TableHead className="font-bold min-w-[120px]">Break Hours</TableHead>
                      <TableHead className="font-bold min-w-[120px]">Overtime</TableHead>
                      <TableHead className="font-bold min-w-[120px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergedRows.map((row) => {
                      if (row.kind === 'absent') {
                        return (
                          <TableRow
                            key={`absent_${row.userId}_${row.date}`}
                            className="bg-red-500/5 hover:bg-red-500/10"
                          >
                            <TableCell>
                              <div className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400">
                                <UserX className="h-3.5 w-3.5 flex-shrink-0" />
                                {row.userName}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(row.date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                {row.userId ? (users.find(u => (u.id || (u as any)._id?.toString()) === row.userId)?.shift_type === 'half_day' ? 'Half Day' : 'Full Day') : '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell>
                              <Badge className="bg-red-500/15 text-red-600 border-red-500/30 font-semibold">
                                Absent · {row.absenceReason}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                          </TableRow>
                        );
                      }

                      const record = row.record;
                      return (
                        <TableRow
                          key={record.id || record._id}
                          className={cn(
                            record.is_late && 'bg-yellow-400/5 hover:bg-yellow-400/10',
                            !record.is_late && getClockIn(record) && 'hover:bg-green-500/5'
                          )}
                        >
                          <TableCell className="font-semibold">{getUserName(record.user_id)}</TableCell>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase font-bold",
                                (record.user_id?.shift_type || users.find(u => (u.id || (u as any)._id?.toString()) === (record.user_id?._id?.toString() || record.user_id?.toString() || record.user_id))?.shift_type) === 'half_day' && "bg-blue-50 text-blue-600 border-blue-100"
                              )}
                            >
                              {(record.user_id?.shift_type || users.find(u => (u.id || (u as any)._id?.toString()) === (record.user_id?._id?.toString() || record.user_id?.toString() || record.user_id))?.shift_type) === 'half_day' ? 'Half Day' : 'Full Day'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatTime(getClockIn(record))}</TableCell>
                          <TableCell>{formatTime(getClockOut(record))}</TableCell>
                          <TableCell>{formatWorkHours(record)}</TableCell>
                          <TableCell>
                            {getBreakIn(record) || formatBreakHours(record) !== '-' ? (
                              <div className="flex flex-col gap-0.5">
                                {getBreakIn(record) && (
                                  <span className="text-xs text-muted-foreground">
                                    In: {formatTime(getBreakIn(record))}
                                  </span>
                                )}
                                <span className="text-sm font-semibold text-orange-500">
                                  {formatBreakHours(record)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatOvertimeHours(record) !== '-' ? (
                              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 font-bold animate-pulse">
                                {formatOvertimeHours(record)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell><StatusBadge record={record} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
