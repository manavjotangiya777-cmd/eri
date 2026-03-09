import { useEffect, useState } from 'react';
import HRLayout from '@/components/layouts/HRLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getAllAttendance, getAllProfiles, updateAttendance, createAttendance, deleteAttendance, getAbsences, getSystemSettings } from '@/db/api';
import type { Profile, SystemSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

type AttendanceRecord = any;

// Merged row: either an attendance record OR an absence record
type MergedRow =
  | { kind: 'attendance'; record: AttendanceRecord }
  | { kind: 'absent'; userId: string; userName: string; date: string; absenceReason: string };

export default function HRAttendanceManagement() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({ user_id: '', date: '', clock_in: '', clock_out: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [attendanceData, usersData, absenceData, settingsData] = await Promise.all([
        getAllAttendance(500),
        getAllProfiles(),
        getAbsences(),
        getSystemSettings(),
      ]);

      // Include employees, HR users, and BDEs in the attendance view
      const staffUsers = usersData.filter(u => u.role === 'employee' || u.role === 'hr' || u.role === 'bde');
      const staffIds = new Set(staffUsers.map(e => e.id));
      const staffAttendance = (attendanceData as any[]).filter(a => {
        const uid = a.user_id?._id?.toString() || a.user_id?.toString() || a.user_id;
        return staffIds.has(uid);
      });

      setAttendance(staffAttendance);
      setAbsences(absenceData);
      setUsers(staffUsers);
      setSettings(settingsData as any);
    } catch {
      toast({ title: 'Error', description: 'Failed to load attendance data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Attendance key set for quick lookup ──────────────────────────
  const attendanceKeys = new Set(
    attendance.map(a => {
      const uid = a.user_id?._id?.toString() || a.user_id?.toString() || a.user_id;
      return `${uid}_${a.date}`;
    })
  );

  // Build merged rows: attendance rows + absent rows (de-duplicated)
  const IST_TZ = 'Asia/Kolkata';
  const getISTDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ }).format(new Date());
  const getISTTimeInMinutes = () => {
    const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: IST_TZ }).formatToParts(new Date());
    return parseInt(parts.find(p => p.type === 'hour')!.value) * 60 + parseInt(parts.find(p => p.type === 'minute')!.value);
  };

  const todayStr = getISTDate();

  const isShiftEnded = (user: Profile | undefined) => {
    if (!user || !settings) return true;
    const shiftEnd = user.shift_type === 'half_day' ? settings.half_day_end_time : settings.work_end_time;
    if (!shiftEnd) return true;
    const [h, m] = shiftEnd.split(':').map(Number);
    return getISTTimeInMinutes() > (h * 60 + m);
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
    // Dynamic "Not Clocked In Yet" for today
    ...users
      .filter(u => u.role === 'employee' || u.role === 'bde' || u.role === 'hr')
      .filter(u => {
        const uid = u.id || (u as any)._id?.toString();
        return !attendanceKeys.has(`${uid}_${todayStr}`);
      })
      .filter(u => {
        const uid = u.id || (u as any)._id?.toString();
        return !absences.some(ab => ab.date === todayStr && (ab.user_id?._id?.toString() || ab.user_id?.toString?.()) === uid);
      })
      .filter(u => isShiftEnded(u)) // Only show as "Absent" if the shift time has already passed
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
    return db.localeCompare(da); // newest first
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

  // Total break duration: prefer stored totalBreakSeconds, else sum breaks[]
  const formatBreakHours = (r: AttendanceRecord): string => {
    let secs: number = 0;
    if (r.totals?.totalBreakSeconds) {
      secs = r.totals.totalBreakSeconds;
    } else if (r.breaks?.length > 0) {
      // Sum stored durationSeconds
      secs = r.breaks.reduce((acc: number, b: any) => acc + (b.durationSeconds || 0), 0);
      // For open breaks (no durationSeconds yet), calculate from timestamps
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
    // If backend already totals it:
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

  const getUserName = (userId: any): string => {
    const id = userId?._id?.toString() || userId?.toString() || userId;
    const user = users.find(u => u.id === id || (u as any)._id?.toString() === id);
    return user?.full_name || user?.username || 'Unknown';
  };

  const toTimeInput = (iso: string | null): string => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  // ── Status Badge ──────────────────────────────────────────────────
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

  // ── Handlers ─────────────────────────────────────────────────────
  const handleEdit = (record: AttendanceRecord) => {
    setEditRecord(record);
    setFormData({
      user_id: record.user_id?._id?.toString() || record.user_id?.toString() || record.user_id,
      date: record.date,
      clock_in: toTimeInput(getClockIn(record)),
      clock_out: toTimeInput(getClockOut(record)),
    });
    setEditDialogOpen(true);
  };

  const handleAdd = () => {
    setFormData({ user_id: '', date: new Date().toISOString().split('T')[0], clock_in: '', clock_out: '' });
    setAddDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    try {
      const clockInISO = formData.clock_in ? `${formData.date}T${formData.clock_in}:00` : null;
      const clockOutISO = formData.clock_out ? `${formData.date}T${formData.clock_out}:00` : null;
      const existing: any[] = editRecord.sessions || [];
      const updated = existing.length > 0
        ? existing.map((s: any, i: number) => ({
          ...s,
          ...(i === 0 && clockInISO ? { clockInAt: clockInISO } : {}),
          ...(i === existing.length - 1 && clockOutISO ? { clockOutAt: clockOutISO } : {}),
        }))
        : [{ clockInAt: clockInISO, clockOutAt: clockOutISO, durationSeconds: 0 }];
      await updateAttendance(editRecord.id || editRecord._id, { sessions: updated } as any);
      toast({ title: 'Success', description: 'Attendance updated' });
      setEditDialogOpen(false);
      setEditRecord(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update', variant: 'destructive' });
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.date || !formData.clock_in) {
      toast({ title: 'Error', description: 'Fill all required fields', variant: 'destructive' });
      return;
    }
    try {
      const clockInISO = `${formData.date}T${formData.clock_in}:00`;
      const clockOutISO = formData.clock_out ? `${formData.date}T${formData.clock_out}:00` : null;
      await createAttendance({
        user_id: formData.user_id, date: formData.date,
        sessions: [{ clockInAt: clockInISO, clockOutAt: clockOutISO, durationSeconds: 0 }],
        status: clockOutISO ? 'clocked_out' : 'working',
      } as any);
      toast({ title: 'Success', description: 'Attendance record added' });
      setAddDialogOpen(false);
      setFormData({ user_id: '', date: '', clock_in: '', clock_out: '' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to add', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    try {
      await deleteAttendance(id);
      toast({ title: 'Success', description: 'Record deleted' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const absentCount = absences.filter(a => !attendanceKeys.has(`${a.user_id?._id?.toString() || a.user_id?.toString?.() || ''}_${a.date}`)).length;

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <p className="text-muted-foreground">Manage and edit employee attendance records</p>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" />Add Record</Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Records</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{attendance.length}</div></CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">On Time</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{attendance.filter(a => !a.is_late && getClockIn(a)).length}</div></CardContent>
          </Card>
          <Card className="border-yellow-400/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-600">Late</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-yellow-600">{attendance.filter(a => a.is_late).length}</div></CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600">Absent</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{absentCount}</div></CardContent>
          </Card>
          <Card className="border-purple-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-600">Total Overtime</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {Math.floor(attendance.reduce((acc, a) => acc + (a.totals?.overtimeSeconds || 0), 0) / 3600)}h {Math.floor((attendance.reduce((acc, a) => acc + (a.totals?.overtimeSeconds || 0), 0) % 3600) / 60)}m
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader><CardTitle>Attendance Records ({mergedRows.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : mergedRows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Work Hours</TableHead>
                      <TableHead>Break Hours</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergedRows.map((row) => {
                      if (row.kind === 'absent') {
                        return (
                          <TableRow key={`absent_${row.userId}_${row.date}`} className="bg-red-500/5 hover:bg-red-500/10">
                            <TableCell className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                              <UserX className="h-3.5 w-3.5" /> {row.userName}
                            </TableCell>
                            <TableCell>{formatDate(row.date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                {row.userId
                                  ? (users.find(u => (u.id || (u as any)._id?.toString()) === row.userId)?.shift_type === 'half_day' ? 'Half Day' : 'Full Day')
                                  : '-'}
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
                            <TableCell className="text-muted-foreground text-xs">—</TableCell>
                          </TableRow>
                        );
                      }

                      const record = row.record;
                      return (
                        <TableRow key={record.id || record._id} className={cn(
                          record.is_late && 'bg-yellow-400/5 hover:bg-yellow-400/10',
                          !record.is_late && getClockIn(record) && 'hover:bg-green-500/5'
                        )}>
                          <TableCell className="font-semibold">{getUserName(record.user_id)}</TableCell>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] uppercase font-bold',
                                (record.user_id?.shift_type || users.find(u =>
                                  (u.id || (u as any)._id?.toString()) === (record.user_id?._id?.toString() || record.user_id?.toString() || record.user_id)
                                )?.shift_type) === 'half_day' && 'bg-blue-50 text-blue-600 border-blue-100'
                              )}
                            >
                              {(record.user_id?.shift_type || users.find(u =>
                                (u.id || (u as any)._id?.toString()) === (record.user_id?._id?.toString() || record.user_id?.toString() || record.user_id)
                              )?.shift_type) === 'half_day' ? 'Half Day' : 'Full Day'}
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
                              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 font-bold">
                                {formatOvertimeHours(record)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell><StatusBadge record={record} /></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id || record._id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditRecord(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Attendance Record</DialogTitle>
              <DialogDescription>Update clock in/out times</DialogDescription>
            </DialogHeader>
            {editRecord && (
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Input value={getUserName(editRecord.user_id)} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input value={formatDate(formData.date)} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_clock_in">Clock In Time</Label>
                  <Input id="edit_clock_in" type="time" value={formData.clock_in} onChange={e => setFormData({ ...formData, clock_in: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_clock_out">Clock Out Time</Label>
                  <Input id="edit_clock_out" type="time" value={formData.clock_out} onChange={e => setFormData({ ...formData, clock_out: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setFormData({ user_id: '', date: '', clock_in: '', clock_out: '' }); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Attendance Record</DialogTitle>
              <DialogDescription>Create a new attendance record</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select value={formData.user_id} onValueChange={val => setFormData({ ...formData, user_id: val })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.username} — {u.department || 'No dept'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_date">Date *</Label>
                <Input id="add_date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_clock_in">Clock In Time *</Label>
                <Input id="add_clock_in" type="time" value={formData.clock_in} onChange={e => setFormData({ ...formData, clock_in: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_clock_out">Clock Out Time</Label>
                <Input id="add_clock_out" type="time" value={formData.clock_out} onChange={e => setFormData({ ...formData, clock_out: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Add Record</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </HRLayout>
  );
}
