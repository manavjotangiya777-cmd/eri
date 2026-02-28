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
import { Check, X, RefreshCw, Calendar } from 'lucide-react';

export default function AdminLeaveRequests() {
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleApprove = async (leaveId: string) => {
    try {
      await updateLeave(leaveId, { status: 'approved' });
      toast({ title: 'Approved ✅', description: 'HR leave request approved' });
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      await updateLeave(leaveId, { status: 'rejected' });
      toast({ title: 'Rejected', description: 'HR leave request rejected' });
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
    pending:  'bg-yellow-500/10 text-yellow-600 border-yellow-400/30',
    approved: 'bg-green-500/10 text-green-600 border-green-400/30',
    rejected: 'bg-red-500/10 text-red-600 border-red-400/30',
  }[status] || 'bg-muted text-muted-foreground');

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const calcDays  = (s: string, e: string) => Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;

  const pendingCount   = leaves.filter(l => l.status === 'pending').length;
  const approvedCount  = leaves.filter(l => l.status === 'approved').length;
  const rejectedCount  = leaves.filter(l => l.status === 'rejected').length;

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
                      <TableCell className="max-w-xs truncate">{leave.reason || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(leave.status)}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(leave.created_at)}</TableCell>
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
      </div>
    </AdminLayout>
  );
}
