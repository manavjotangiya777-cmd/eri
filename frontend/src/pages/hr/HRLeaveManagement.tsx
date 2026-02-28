import { useEffect, useState } from 'react';
import HRLayout from '@/components/layouts/HRLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getAllLeaves, updateLeave, getAllProfiles, getEmployeeLeaves, createLeave } from '@/db/api';
import type { Leave, Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Check, X, RefreshCw, Plus, Calendar, ListChecks } from 'lucide-react';

export default function HRLeaveManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();

  // ── All Leaves (manage employees) ──
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // ── My Leave Requests ──
  const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
  const [myLoading, setMyLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'personal',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // ── Load all employee leaves ──
  const loadData = async () => {
    setLoading(true);
    try {
      const [leavesData, usersData] = await Promise.all([getAllLeaves(), getAllProfiles()]);
      // Show only employee leaves here (HR's own leaves go to admin)
      const employeeLeaves = leavesData.filter((l: Leave) => {
        const user = usersData.find((u: Profile) => u.id === (l as any).user_id || u.id === (l as any).user_id?._id);
        return user?.role === 'employee';
      });
      setLeaves(employeeLeaves);
      setUsers(usersData);
    } catch {
      toast({ title: 'Error', description: 'Failed to load leave requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Load HR's own leave requests ──
  const loadMyLeaves = async () => {
    if (!profile?.id) return;
    setMyLoading(true);
    try {
      const data = await getEmployeeLeaves(profile.id);
      setMyLeaves(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load your leave requests', variant: 'destructive' });
    } finally {
      setMyLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadMyLeaves();
  }, [profile]);

  // ── Approve / Reject for employee leaves ──
  const handleApprove = async (leaveId: string) => {
    try {
      await updateLeave(leaveId, { status: 'approved' });
      toast({ title: 'Success', description: 'Leave request approved' });
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to approve leave request', variant: 'destructive' });
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      await updateLeave(leaveId, { status: 'rejected' });
      toast({ title: 'Success', description: 'Leave request rejected' });
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to reject leave request', variant: 'destructive' });
    }
  };

  // ── Submit HR's own leave ──
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.start_date || !formData.end_date || !formData.reason) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast({ title: 'Error', description: 'End date must be after start date', variant: 'destructive' });
      return;
    }

    try {
      await createLeave({
        user_id: profile.id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        status: 'pending',
      });
      toast({ title: 'Success', description: 'Leave request submitted to Admin successfully' });
      setDialogOpen(false);
      setFormData({ leave_type: 'personal', start_date: '', end_date: '', reason: '' });
      loadMyLeaves();
    } catch {
      toast({ title: 'Error', description: 'Failed to submit leave request', variant: 'destructive' });
    }
  };

  // ── Helpers ──
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId || u.id === (userId as any)?._id);
    return user?.username || 'Unknown';
  };

  const getStatusColor = (status: string) => ({
    pending:  'bg-yellow-500/10 text-yellow-600 border-yellow-400/30',
    approved: 'bg-green-500/10 text-green-600 border-green-400/30',
    rejected: 'bg-red-500/10 text-red-600 border-red-400/30',
  }[status] || 'bg-muted text-muted-foreground');

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const calcDays  = (s: string, e: string) => Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;

  const myPendingCount = myLeaves.filter(l => l.status === 'pending').length;

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Leave Management</h1>
            <p className="text-muted-foreground">Manage employee leaves and submit your own leave requests</p>
          </div>
          <FileText className="h-8 w-8 text-primary" />
        </div>

        <Tabs defaultValue="all">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="all">
              <ListChecks className="h-4 w-4 mr-1.5" />
              Employee Leaves
            </TabsTrigger>
            <TabsTrigger value="my" className="relative">
              <Calendar className="h-4 w-4 mr-1.5" />
              My Leave Request
              {myPendingCount > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {myPendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ══ ALL EMPLOYEE LEAVES TAB ══ */}
          <TabsContent value="all" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending Requests</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-yellow-600">{leaves.filter(l => l.status === 'pending').length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Approved</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{leaves.filter(l => l.status === 'approved').length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rejected</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-destructive">{leaves.filter(l => l.status === 'rejected').length}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Leave Requests</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : leaves.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No leave requests found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell className="font-medium">{getUserName(leave.user_id)}</TableCell>
                          <TableCell className="capitalize">{leave.leave_type}</TableCell>
                          <TableCell>{formatDate(leave.start_date)}</TableCell>
                          <TableCell>{formatDate(leave.end_date)}</TableCell>
                          <TableCell>{calcDays(leave.start_date, leave.end_date)}</TableCell>
                          <TableCell className="max-w-xs truncate">{leave.reason || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(leave.status)}>{leave.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5 flex-wrap">
                              {leave.status === 'pending' && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleApprove(leave.id)}
                                    className="text-green-600 hover:bg-green-50" title="Approve">
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleReject(leave.id)}
                                    className="text-destructive hover:bg-destructive/10" title="Reject">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {leave.status === 'approved' && (
                                <Button variant="outline" size="sm" onClick={() => handleReject(leave.id)}
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 text-xs">
                                  <RefreshCw className="h-3 w-3" /> Reject
                                </Button>
                              )}
                              {leave.status === 'rejected' && (
                                <Button variant="outline" size="sm" onClick={() => handleApprove(leave.id)}
                                  className="text-green-600 border-green-500/30 hover:bg-green-50 gap-1 text-xs">
                                  <RefreshCw className="h-3 w-3" /> Approve
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ MY LEAVE REQUEST TAB ══ */}
          <TabsContent value="my" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Your leave requests are sent to the <strong>Admin</strong> for approval</p>
              </div>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Request Leave
              </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-yellow-600">{myLeaves.filter(l => l.status === 'pending').length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Approved</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{myLeaves.filter(l => l.status === 'approved').length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rejected</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-destructive">{myLeaves.filter(l => l.status === 'rejected').length}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  My Leave History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : myLeaves.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No leave requests submitted yet</p>
                    <p className="text-xs mt-1">Click "Request Leave" to submit one to Admin</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myLeaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell className="capitalize">{leave.leave_type}</TableCell>
                          <TableCell>{formatDate(leave.start_date)}</TableCell>
                          <TableCell>{formatDate(leave.end_date)}</TableCell>
                          <TableCell>{calcDays(leave.start_date, leave.end_date)} days</TableCell>
                          <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(leave.status)}>
                              {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(leave.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Submit Leave Dialog ── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
              <DialogDescription>Your request will be sent to Admin for approval</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={formData.leave_type} onValueChange={(v) => setFormData({ ...formData, leave_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="hr_start_date">Start Date *</Label>
                  <Input id="hr_start_date" type="date" value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hr_end_date">End Date *</Label>
                  <Input id="hr_end_date" type="date" value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hr_reason">Reason *</Label>
                <Textarea id="hr_reason" value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Please provide a reason for your leave request" rows={4} required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Submit to Admin</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </HRLayout>
  );
}
