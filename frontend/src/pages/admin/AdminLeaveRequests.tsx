import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAllLeaves, updateLeave, getAllProfiles } from '@/db/api';
import type { Leave, Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Calendar, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function AdminLeaveRequests() {
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [adminComment, setAdminComment] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [leavesData, usersData] = await Promise.all([getAllLeaves(), getAllProfiles()]);

      // Show only HR users' leave requests
      const hrUsers = new Set(usersData.filter((u: Profile) => u.role === 'hr').map((u: Profile) => u.id));
      const hrLeaves = (leavesData as Leave[]).filter((l: Leave) => {
        const uid = (l as any).user_id?._id?.toString() || (l as any).user_id?.toString() || l.user_id;
        return hrUsers.has(uid);
      });

      setLeaves(hrLeaves);
      setUsers(usersData);
    } catch {
      toast({ title: 'Error', description: 'Failed to load HR leave requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleApprove = async (leaveId: string, comment?: string) => {
    try {
      await updateLeave(leaveId, { status: 'approved', hr_comment: comment || adminComment });
      toast({ title: 'Approved ✅', description: 'HR leave request approved' });
      setViewDialogOpen(false);
      setAdminComment('');
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleReject = async (leaveId: string, comment?: string) => {
    try {
      await updateLeave(leaveId, { status: 'rejected', hr_comment: comment || adminComment });
      toast({ title: 'Rejected', description: 'HR leave request rejected' });
      setViewDialogOpen(false);
      setAdminComment('');
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' });
    }
  };

  const getUserName = (userId: string) => {
    const uid = (userId as any)?._id?.toString() || userId?.toString();
    const user = users.find(u => u.id === uid || u.id === userId);
    return user ? `${user.full_name || user.username} (HR)` : 'Unknown HR';
  };

  const getStatusColor = (status: string) => ({
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-400/30',
    approved: 'bg-green-500/10 text-green-600 border-green-400/30',
    rejected: 'bg-red-500/10 text-red-600 border-red-400/30',
  }[status] || 'bg-muted text-muted-foreground');

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const calcDays = (s: string, e: string) => Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">HR Leave Requests</h1>
            <p className="text-muted-foreground">Review and manage leave requests submitted by HR personnel</p>
          </div>
          <Calendar className="h-8 w-8 text-primary" />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending Requests</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              {pendingCount > 0 && <p className="text-xs text-muted-foreground mt-1">Awaiting your action</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Approved</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{approvedCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rejected</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{rejectedCount}</div></CardContent>
          </Card>
        </div>

        {/* Leave Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>HR Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : leaves.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <Calendar className="h-14 w-14 mb-4 opacity-20" />
                <p className="font-medium">No HR leave requests found</p>
                <p className="text-xs mt-1">HR users can submit leave requests from their panel</p>
              </div>
            ) : (
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HR Member</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted On</TableHead>
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
                        <TableCell>{calcDays(leave.start_date, leave.end_date)} days</TableCell>
                        <TableCell className="max-w-[150px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate cursor-help">{leave.reason || '-'}</div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px] whitespace-normal">
                              {leave.reason || 'No reason provided'}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(leave.status)}>
                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(leave.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1.5 flex-wrap">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedLeave(leave);
                              setAdminComment(leave.hr_comment || '');
                              setViewDialogOpen(true);
                            }}
                              className="text-primary hover:bg-primary/10" title="View Details">
                              <FileText className="h-4 w-4" />
                            </Button>
                            {leave.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleApprove(leave.id)}
                                  className="text-green-600 hover:bg-green-50" title="Quick Approve">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleReject(leave.id)}
                                  className="text-destructive hover:bg-destructive/10" title="Quick Reject">
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* ── View Detail Dialog ── */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>HR Leave Request Details</DialogTitle>
              <DialogDescription>Full details of the leave request from {selectedLeave && getUserName(selectedLeave.user_id)}</DialogDescription>
            </DialogHeader>
            {selectedLeave && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">HR Member</p>
                    <p className="font-semibold">{getUserName(selectedLeave.user_id)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Leave Type</p>
                    <Badge className="capitalize">{selectedLeave.leave_type}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-semibold">{formatDate(selectedLeave.start_date)} - {formatDate(selectedLeave.end_date)}</p>
                    <p className="text-xs text-muted-foreground">{calcDays(selectedLeave.start_date, selectedLeave.end_date)} days</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedLeave.status)}>{selectedLeave.status}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">Reason / Description</p>
                  <div className="p-4 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {selectedLeave.reason || 'No reason provided'}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label htmlFor="admin_comment_box" className="font-bold">Admin Comments / Feedback</Label>
                  <p className="text-xs text-muted-foreground mb-1">Explain the reason for approval or rejection.</p>
                  <Textarea
                    id="admin_comment_box"
                    placeholder="Type your feedback here..."
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    rows={3}
                  />
                  <p className="text-[10px] text-muted-foreground italic">HR will see this comment in their Leave panel.</p>
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
                  {selectedLeave.status !== 'rejected' && (
                    <Button variant="destructive" onClick={() => handleReject(selectedLeave.id)} className="gap-2">
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  )}
                  {selectedLeave.status !== 'approved' && (
                    <Button onClick={() => handleApprove(selectedLeave.id)} className="bg-green-600 hover:bg-green-700 gap-2">
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
