import { useEffect, useState } from 'react';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getEmployeeLeaves, createLeave } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Leave } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus } from 'lucide-react';

export default function EmployeeLeave() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    reason: '',
  });

  const loadLeaves = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const data = await getEmployeeLeaves(profile.id);
      console.log('Loaded employee leaves:', data);
      setLeaves(data);
    } catch (error) {
      console.error('Failed to load leaves:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leave requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.start_date || !formData.end_date || !formData.reason) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createLeave({
        user_id: profile.id,
        leave_type: 'personal',
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        status: 'pending',
      });

      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      });

      setDialogOpen(false);
      setFormData({
        start_date: '',
        end_date: '',
        reason: '',
      });
      loadLeaves();
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit leave request',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leave Requests</h1>
            <p className="text-muted-foreground">Submit and manage your leave requests</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
                <DialogDescription>Fill in the details for your leave request</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Please provide a reason for your leave request"
                    rows={4}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Submit Request</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaves.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No leave requests found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{formatDate(leave.start_date)}</TableCell>
                      <TableCell>{formatDate(leave.end_date)}</TableCell>
                      <TableCell>{calculateDays(leave.start_date, leave.end_date)} days</TableCell>
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
      </div>
    </EmployeeLayout>
  );
}
