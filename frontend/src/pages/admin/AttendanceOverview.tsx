import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAllAttendance, getAllProfiles, getAbsences } from '@/db/api';
import type { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Calendar, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

type AttendanceRecord = any;

type MergedRow =
  | { kind: 'attendance'; record: AttendanceRecord }
  | { kind: 'absent'; userId: string; userName: string; date: string; absenceReason: string };

export default function AttendanceOverview() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [attendanceData, usersData, absenceData] = await Promise.all([
        getAllAttendance(500),
        getAllProfiles(),
        getAbsences(),
      ]);
      setAttendance(attendanceData as any[]);
      setUsers(usersData);
      setAbsences(absenceData);
    } catch {
      toast({ title: 'Error', description: 'Failed to load attendance data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Attendance lookup set
  const attendanceKeys = new Set(
    attendance.map(a => {
      const uid = a.user_id?._id?.toString() || a.user_id?.toString() || a.user_id;
      return `${uid}_${a.date}`;
    })
  );

  // Merge attendance + absences
  const mergedRows: MergedRow[] = [
    ...attendance.map(r => ({ kind: 'attendance' as const, record: r })),
    ...absences
      .filter(ab => {
        const uid = ab.user_id?._id?.toString() || ab.user_id?.toString?.() || '';
        return !attendanceKeys.has(`${uid}_${ab.date}`);
      })
      .map(ab => ({
        kind: 'absent' as const,
        userId: ab.user_id?._id?.toString() || ab.user_id?.toString?.() || '',
        userName: ab.user_id?.full_name || ab.user_id?.username || 'Unknown',
        date: ab.date,
        absenceReason: ab.reason === 'approved_leave' ? 'Approved Leave' : 'No Clock-In',
      })),
  ].sort((a, b) => {
    const da = a.kind === 'attendance' ? a.record.date : a.date;
    const db = b.kind === 'attendance' ? b.record.date : b.date;
    return db.localeCompare(da);
  });

  // ── Helpers ──────────────────────────────────────────────────────
  const getClockIn = (r: AttendanceRecord): string | null =>
    r.sessions?.length > 0 ? r.sessions[0].clockInAt || null : r.clock_in || null;

  const getClockOut = (r: AttendanceRecord): string | null => {
    if (r.sessions?.length > 0) return r.sessions[r.sessions.length - 1].clockOutAt || null;
    return r.clock_out || null;
  };

  const getBreakIn = (r: AttendanceRecord): string | null =>
    r.breaks?.length > 0 ? r.breaks[0].breakInAt || null : null;

  const formatWorkHours = (r: AttendanceRecord): string => {
    const secs = r.totals?.workSeconds || r.totals?.totalClockSeconds || 0;
    if (!secs) return '-';
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  };

  // Total break duration: prefer stored totalBreakSeconds, else calculate from breaks[]
  const formatBreakHours = (r: AttendanceRecord): string => {
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

  const formatTime = (val: string | null): string => {
    if (!val) return '-';
    return new Date(val).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (val: string): string =>
    new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const getUserName = (userId: any): string => {
    if (userId && typeof userId === 'object' && (userId.full_name || userId.username))
      return userId.full_name || userId.username;
    const id = userId?._id?.toString() || userId?.toString() || userId;
    const user = users.find(u => u.id === id || (u as any)._id?.toString() === id);
    return user?.full_name || user?.username || 'Unknown';
  };

  // Status badge component
  const StatusBadge = ({ record }: { record: AttendanceRecord }) => {
    if (!getClockIn(record)) {
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

  const today = new Date().toISOString().split('T')[0];
  const absentCount = absences.filter(ab => {
    const uid = ab.user_id?._id?.toString() || ab.user_id?.toString?.() || '';
    return !attendanceKeys.has(`${uid}_${ab.date}`);
  }).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Attendance Overview</h1>
            <p className="text-muted-foreground">Monitor employee attendance and absences</p>
          </div>
          <Calendar className="h-8 w-8 text-primary" />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
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
            <CardContent><div className="text-2xl font-bold text-red-600">{absentCount}</div></CardContent>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Work Hours</TableHead>
                      <TableHead>Break Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergedRows.map((row, idx) => {
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
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell>
                              <Badge className="bg-red-500/15 text-red-600 border-red-500/30 font-semibold">
                                Absent · {row.absenceReason}
                              </Badge>
                            </TableCell>
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
