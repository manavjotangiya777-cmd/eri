import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getAllDepartments,
  getAllDesignations,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from '@/db/api';
import type { Department, Designation } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Plus, Trash2, Building2, Briefcase } from 'lucide-react';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<(Designation & { departments: { name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [designationDialogOpen, setDesignationDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingDesignation, setEditingDesignation] = useState<(Designation & { departments: { name: string } | null }) | null>(null);
  const { toast } = useToast();

  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const [designationForm, setDesignationForm] = useState({
    name: '',
    description: '',
    department_id: '',
    is_active: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptData, desigData] = await Promise.all([
        getAllDepartments(),
        getAllDesignations(),
      ]);
      setDepartments(deptData);
      setDesignations(desigData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load departments and designations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Department handlers
  const handleCreateDepartment = () => {
    setEditingDepartment(null);
    setDepartmentForm({ name: '', description: '', is_active: true });
    setDepartmentDialogOpen(true);
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setDepartmentForm({
      name: dept.name,
      description: dept.description || '',
      is_active: dept.is_active,
    });
    setDepartmentDialogOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!departmentForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Department name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, departmentForm);
        toast({
          title: 'Success',
          description: 'Department updated successfully',
        });
      } else {
        await createDepartment(departmentForm);
        toast({
          title: 'Success',
          description: 'Department created successfully',
        });
      }
      setDepartmentDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Failed to save department:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save department',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department? This will also delete all associated designations.')) {
      return;
    }

    try {
      await deleteDepartment(id);
      toast({
        title: 'Success',
        description: 'Department deleted successfully',
      });
      loadData();
    } catch (error: any) {
      console.error('Failed to delete department:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete department',
        variant: 'destructive',
      });
    }
  };

  // Designation handlers
  const handleCreateDesignation = () => {
    setEditingDesignation(null);
    setDesignationForm({ name: '', description: '', department_id: '', is_active: true });
    setDesignationDialogOpen(true);
  };

  const handleEditDesignation = (desig: Designation & { departments: { name: string } | null }) => {
    setEditingDesignation(desig);
    setDesignationForm({
      name: desig.name,
      description: desig.description || '',
      department_id: desig.department_id || '',
      is_active: desig.is_active,
    });
    setDesignationDialogOpen(true);
  };

  const handleSaveDesignation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!designationForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Designation name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        name: designationForm.name,
        description: designationForm.description,
        department_id: designationForm.department_id || null,
        is_active: designationForm.is_active,
      };

      if (editingDesignation) {
        await updateDesignation(editingDesignation.id, payload);
        toast({
          title: 'Success',
          description: 'Designation updated successfully',
        });
      } else {
        await createDesignation(payload);
        toast({
          title: 'Success',
          description: 'Designation created successfully',
        });
      }
      setDesignationDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Failed to save designation:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save designation',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDesignation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this designation?')) {
      return;
    }

    try {
      await deleteDesignation(id);
      toast({
        title: 'Success',
        description: 'Designation deleted successfully',
      });
      loadData();
    } catch (error: any) {
      console.error('Failed to delete designation:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete designation',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Department Management</h1>
          <p className="text-muted-foreground">Manage company departments and designations</p>
        </div>

        <Tabs defaultValue="departments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="departments" className="gap-2">
              <Building2 className="h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="designations" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Designations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Departments</CardTitle>
                <Button onClick={handleCreateDepartment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No departments found</p>
                    <p className="text-sm text-muted-foreground">Create your first department to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell>{dept.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                              {dept.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditDepartment(dept)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDepartment(dept.id)}
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
          </TabsContent>

          <TabsContent value="designations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Designations</CardTitle>
                <Button onClick={handleCreateDesignation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Designation
                </Button>
              </CardHeader>
              <CardContent>
                {designations.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No designations found</p>
                    <p className="text-sm text-muted-foreground">Create your first designation to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {designations.map((desig) => (
                        <TableRow key={desig.id}>
                          <TableCell className="font-medium">{desig.name}</TableCell>
                          <TableCell>{desig.departments?.name || '-'}</TableCell>
                          <TableCell>{desig.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={desig.is_active ? 'default' : 'secondary'}>
                              {desig.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditDesignation(desig)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDesignation(desig.id)}
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
          </TabsContent>
        </Tabs>

        {/* Department Dialog */}
        <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDepartment ? 'Edit Department' : 'Create Department'}</DialogTitle>
              <DialogDescription>
                {editingDepartment ? 'Update department information' : 'Add a new department to your organization'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dept_name">Department Name *</Label>
                <Input
                  id="dept_name"
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                  placeholder="e.g., Engineering, Sales, HR"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept_description">Description</Label>
                <Textarea
                  id="dept_description"
                  value={departmentForm.description}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                  placeholder="Brief description of the department"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept_status">Status</Label>
                <Select
                  value={departmentForm.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) => setDepartmentForm({ ...departmentForm, is_active: value === 'active' })}
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
                <Button type="button" variant="outline" onClick={() => setDepartmentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingDepartment ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Designation Dialog */}
        <Dialog open={designationDialogOpen} onOpenChange={setDesignationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDesignation ? 'Edit Designation' : 'Create Designation'}</DialogTitle>
              <DialogDescription>
                {editingDesignation ? 'Update designation information' : 'Add a new designation/position'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveDesignation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="desig_name">Designation Name *</Label>
                <Input
                  id="desig_name"
                  value={designationForm.name}
                  onChange={(e) => setDesignationForm({ ...designationForm, name: e.target.value })}
                  placeholder="e.g., Software Engineer, Manager"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desig_department">Department</Label>
                <Select
                  value={designationForm.department_id || 'none'}
                  onValueChange={(value) => setDesignationForm({ ...designationForm, department_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.filter(d => d.is_active).map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desig_description">Description</Label>
                <Textarea
                  id="desig_description"
                  value={designationForm.description}
                  onChange={(e) => setDesignationForm({ ...designationForm, description: e.target.value })}
                  placeholder="Brief description of the designation"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desig_status">Status</Label>
                <Select
                  value={designationForm.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) => setDesignationForm({ ...designationForm, is_active: value === 'active' })}
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
                <Button type="button" variant="outline" onClick={() => setDesignationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingDesignation ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
