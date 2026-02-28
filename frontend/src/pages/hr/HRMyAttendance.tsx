import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import HRLayout from '@/components/layouts/HRLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { clockIn, clockOut, getTodayAttendance, getMyAttendance, getSystemSettings } from '@/db/api';
import type { Attendance, SystemSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Clock, LogIn, LogOut, AlertCircle, CheckCircle, Coffee } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function HRMyAttendance() {
  const { profile } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!profile?.id) return;
    try {
      const [today, history, systemSettings] = await Promise.all([
        getTodayAttendance(profile.id),
        getMyAttendance(profile.id, 30),
        getSystemSettings(),
      ]);
      setTodayAttendance(today);
      setAttendanceHistory(history);
      setSettings(systemSettings);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const handleClockIn = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      await clockIn(profile.id);
      toast({ title: 'Success', description: 'Clocked in successfully' });
      loadData();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to clock in';
      toast({ title: 'Clock In Failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      await clockOut(profile.id);
      toast({ title: 'Success', description: 'Clocked out successfully' });
      loadData();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to clock out';
      toast({ title: 'Clock Out Failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTimeOnly = (timeString: string | null) => {
    if (typeof timeString !== 'string' || !timeString.includes(':')) return '--:--';
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    const [hours, minutes] = parts;
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCurrentStatus = () => {
    if (!settings) return null;
    const currentTimeStr = currentTime.toTimeString().slice(0, 5);
    if (currentTimeStr < settings.work_start_time) return { type: 'info', message: "Work hasn't started yet", icon: Clock };
    if (currentTimeStr >= settings.lunch_start_time && currentTimeStr < settings.lunch_end_time) return { type: 'lunch', message: 'Lunch Break Time', icon: Coffee };
    if (currentTimeStr > settings.work_end_time) return { type: 'overtime', message: 'Overtime Hours', icon: AlertCircle };
    return { type: 'working', message: 'Work Hours', icon: CheckCircle };
  };

  const status = getCurrentStatus();

  return (
    <HRLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground">Track your daily attendance and work hours</p>
        </div>

        {/* Work Schedule */}
        {settings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Work Schedule
              </CardTitle>
              <CardDescription>Office timings and current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg bg-card">
                  <div className="text-sm text-muted-foreground mb-1">Clock-In Time</div>
                  <div className="text-xl font-bold text-primary">{formatTimeOnly(settings.work_start_time)}</div>
                  <div className="text-xs text-muted-foreground mt-1">On-time arrival</div>
                </div>
                <div className="p-4 border rounded-lg bg-card">
                  <div className="text-sm text-muted-foreground mb-1">Lunch Break</div>
                  <div className="text-xl font-bold">{formatTimeOnly(settings.lunch_start_time)} - {formatTimeOnly(settings.lunch_end_time)}</div>
                  <div className="text-xs text-muted-foreground mt-1">1 hour break</div>
                </div>
                <div className="p-4 border rounded-lg bg-card">
                  <div className="text-sm text-muted-foreground mb-1">Clock-Out Time</div>
                  <div className="text-xl font-bold text-primary">{formatTimeOnly(settings.work_end_time)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Expected departure</div>
                </div>
                <div className="p-4 border rounded-lg bg-card">
                  <div className="text-sm text-muted-foreground mb-1">Work Hours</div>
                  <div className="text-xl font-bold">{settings.work_hours_per_day} hours</div>
                  <div className="text-xs text-muted-foreground mt-1">Excluding lunch</div>
                </div>
              </div>
              {status && (
                <Alert className="mt-4">
                  <status.icon className="h-4 w-4" />
                  <AlertTitle>Current Time: {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</AlertTitle>
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's Attendance + Clock In/Out */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Attendance</CardTitle>
            <CardDescription>
              {todayAttendance ? "Your attendance record for today" : "No attendance record yet — clock in to start"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Clock In</div>
                  <div className="text-2xl font-bold">{formatTime(todayAttendance?.clock_in || null)}</div>
                  {todayAttendance?.is_late && (
                    <Badge variant="destructive" className="mt-2">Late by {todayAttendance.late_minutes} min</Badge>
                  )}
                  {todayAttendance && !todayAttendance.is_late && todayAttendance.clock_in && (
                    <Badge className="mt-2 bg-green-500/10 text-green-500 border-green-500/20">On Time</Badge>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Clock Out</div>
                  <div className="text-2xl font-bold">{formatTime(todayAttendance?.clock_out || null)}</div>
                  {todayAttendance?.is_early_departure && (
                    <Badge variant="destructive" className="mt-2">Early Departure</Badge>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Work Hours</div>
                  <div className="text-2xl font-bold">
                    {todayAttendance?.actual_work_hours ? `${todayAttendance.actual_work_hours.toFixed(2)}h` : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Excluding lunch</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Overtime</div>
                  <div className="text-2xl font-bold">
                    {todayAttendance?.overtime_hours ? `${todayAttendance.overtime_hours.toFixed(2)}h` : '-'}
                  </div>
                  {todayAttendance && todayAttendance.overtime_hours > 0 && (
                    <Badge className="mt-2 bg-blue-500/10 text-blue-500 border-blue-500/20">Extra Hours</Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleClockIn}
                  disabled={loading || !!todayAttendance?.clock_in}
                  className="flex-1"
                  size="lg"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
                <Button
                  onClick={handleClockOut}
                  disabled={loading || !todayAttendance?.clock_in || !!todayAttendance?.clock_out}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Clock Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance History (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No attendance records found</TableCell>
                  </TableRow>
                ) : (
                  attendanceHistory.map((record: Attendance) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>
                        {formatTime(record.clock_in)}
                        {record.is_late && <Badge variant="destructive" className="ml-2 text-xs">+{record.late_minutes}m</Badge>}
                      </TableCell>
                      <TableCell>
                        {formatTime(record.clock_out)}
                        {record.is_early_departure && <Badge variant="destructive" className="ml-2 text-xs">Early</Badge>}
                      </TableCell>
                      <TableCell>{record.actual_work_hours ? `${record.actual_work_hours.toFixed(2)}h` : '-'}</TableCell>
                      <TableCell>
                        {record.overtime_hours > 0 ? (
                          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">+{record.overtime_hours.toFixed(2)}h</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.is_late ? (
                          <Badge variant="destructive">Late</Badge>
                        ) : record.clock_in ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">On Time</Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </HRLayout>
  );
}
