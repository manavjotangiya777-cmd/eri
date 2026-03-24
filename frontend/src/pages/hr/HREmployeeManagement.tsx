import { useEffect, useState } from 'react';
import HRLayout from '@/components/layouts/HRLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { getAllProfiles, updateProfile, deleteProfile } from '@/db/api';
import type { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import FollowUpCreateDialog from '@/components/common/FollowUpCreateDialog';
import { Pencil, Users, Trash2, ShieldCheck, Bell } from 'lucide-react';

export default function HREmployeeManagement() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEmployee, setEditEmployee] = useState<Profile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Profile | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<Profile | null>(null);
  const { toast } = useToast();

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await getAllProfiles();
      // HR can manage employees and other HR users, but not admins
      const filteredData = data.filter(u => u.role !== 'admin');
      setEmployees(filteredData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleEdit = (employee: Profile) => {
    setEditEmployee(employee);
    setEditOpen(true);
  };

  const confirmDelete = (employee: Profile) => {
    setEmployeeToDelete(employee);
    setDeleteOpen(true);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      await deleteProfile(employeeToDelete.id);
      toast({
        title: 'Success',
        description: 'Employee deleted successfully',
      });
      loadEmployees();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete employee',
        variant: 'destructive',
      });
    } finally {
      setDeleteOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployee?.id) return;

    try {
      await updateProfile(editEmployee.id, {
        full_name: editEmployee.full_name,
        department: editEmployee.department,
        is_active: editEmployee.is_active,
        skip_ip_restriction: editEmployee.skip_ip_restriction,
        date_of_birth: editEmployee.date_of_birth,
      });
      toast({
        title: 'Success',
        description: 'Employee updated successfully',
      });
      setEditOpen(false);
      loadEmployees();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update employee',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      hr: 'bg-primary text-primary-foreground',
      employee: 'bg-secondary text-secondary-foreground',
    };
    return colors[role as keyof typeof colors] || 'bg-muted';
  };

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Employee Management</h1>
            <p className="text-muted-foreground">Manage employee records and information</p>
          </div>
          <Users className="h-8 w-8 text-primary" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.filter(e => e.role === 'employee').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">HR Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.filter(e => e.role === 'hr').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-2">
                {employees.filter(e => e.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Employees</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remote Auth</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.username}</TableCell>
                      <TableCell>{employee.full_name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadge(employee.role)}>{employee.role}</Badge>
                      </TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(employee.role === 'employee' || employee.role === 'bde') ? (
                          employee.skip_ip_restriction ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 flex gap-1 w-fit">
                              <ShieldCheck className="h-3 w-3" /> Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="opacity-50">Standard</Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Exempt</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            title="Edit Employee"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTargetEmployee(employee);
                              setFollowUpOpen(true);
                            }}
                            title="Add Follow-Up"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(employee)}
                            title="Delete Employee"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>Update employee information</DialogDescription>
            </DialogHeader>
            {editEmployee && (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={editEmployee.username} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={editEmployee.role} disabled />
                  <p className="text-xs text-muted-foreground">
                    Contact admin to change user roles
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={editEmployee.full_name || ''}
                    onChange={(e) =>
                      setEditEmployee({ ...editEmployee, full_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Birth Date</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={editEmployee.date_of_birth || ''}
                    onChange={(e) =>
                      setEditEmployee({ ...editEmployee, date_of_birth: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={editEmployee.department || ''}
                    onChange={(e) =>
                      setEditEmployee({ ...editEmployee, department: e.target.value })
                    }
                  />
                </div>
                {(editEmployee.role === 'employee' || editEmployee.role === 'bde') && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div className="space-y-0.5">
                      <Label htmlFor="hr_skip_ip" className="text-base font-semibold">Authorize Remote Work</Label>
                      <p className="text-xs text-muted-foreground italic">Allow clock-in/out from any network (Skip WiFi check)</p>
                    </div>
                    <Switch
                      id="hr_skip_ip"
                      checked={editEmployee.skip_ip_restriction}
                      onCheckedChange={(checked) => setEditEmployee({ ...editEmployee, skip_ip_restriction: checked })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={editEmployee.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) =>
                      setEditEmployee({ ...editEmployee, is_active: value === 'active' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the employee account
                for <span className="font-semibold text-foreground">{employeeToDelete?.full_name || employeeToDelete?.username}</span> and remove their data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteEmployee}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <FollowUpCreateDialog
          open={followUpOpen}
          onOpenChange={setFollowUpOpen}
          targetUser={targetEmployee}
        />
      </div >
    </HRLayout >
  );
}
