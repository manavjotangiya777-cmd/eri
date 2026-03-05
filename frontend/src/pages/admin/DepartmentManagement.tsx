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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Department Management</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage company departments and designations</p>
          </div>
        </div>

        <Tabs defaultValue="departments" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="departments" className="gap-2 flex-1 sm:flex-none py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Building2 className="h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="designations" className="gap-2 flex-1 sm:flex-none py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Briefcase className="h-4 w-4" />
              Designations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departments">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6">
                <CardTitle className="text-lg font-bold">Departments</CardTitle>
                <Button onClick={handleCreateDepartment} className="w-full sm:w-auto shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6 px-6 pb-2">
                  {departments.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium">No departments found</p>
                      <p className="text-sm text-muted-foreground">Create your first department to get started</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="text-nowrap">
                          <TableHead className="min-w-[150px]">Name</TableHead>
                          <TableHead className="min-w-[200px]">Description</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>
                          <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {departments.map((dept) => (
                          <TableRow key={dept.id} className="group hover:bg-slate-50/50">
                            <TableCell className="font-semibold text-slate-900">{dept.name}</TableCell>
                            <TableCell className="text-slate-600 truncate max-w-[200px]">{dept.description || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={dept.is_active ? 'default' : 'secondary'} className="shadow-none">
                                {dept.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"
                                  onClick={() => handleEditDepartment(dept)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="designations">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6">
                <CardTitle className="text-lg font-bold">Designations</CardTitle>
                <Button onClick={handleCreateDesignation} className="w-full sm:w-auto shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Designation
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6 px-6 pb-2">
                  {designations.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium">No designations found</p>
                      <p className="text-sm text-muted-foreground">Create your first designation to get started</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="text-nowrap">
                          <TableHead className="min-w-[150px]">Name</TableHead>
                          <TableHead className="min-w-[150px]">Department</TableHead>
                          <TableHead className="min-w-[200px]">Description</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>
                          <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {designations.map((desig) => (
                          <TableRow key={desig.id} className="group hover:bg-slate-50/50">
                            <TableCell className="font-semibold text-slate-900">{desig.name}</TableCell>
                            <TableCell className="text-slate-600">{desig.departments?.name || '-'}</TableCell>
                            <TableCell className="text-slate-600 truncate max-w-[200px]">{desig.description || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={desig.is_active ? 'default' : 'secondary'} className="shadow-none">
                                {desig.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"
                                  onClick={() => handleEditDesignation(desig)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Department Dialog */}
        <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
          <DialogContent className="sm:max-w-[600px] w-[95vw] p-0 flex flex-col gap-0 rounded-xl overflow-hidden shadow-2xl border-none max-h-[95vh] sm:max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50/80 shrink-0">
              <DialogTitle className="text-xl font-bold">{editingDepartment ? 'Edit Department' : 'Create Department'}</DialogTitle>
              <DialogDescription>
                {editingDepartment ? 'Update department information' : 'Add a new department to your organization'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <form id="dept-form" onSubmit={handleSaveDepartment} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="dept_name" className="text-sm font-semibold">Department Name *</Label>
                  <Input
                    id="dept_name"
                    value={departmentForm.name}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                    placeholder="e.g., Engineering, Sales, HR"
                    required
                    className="h-11 shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept_description" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="dept_description"
                    value={departmentForm.description}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                    placeholder="Brief description of the department"
                    rows={3}
                    className="shadow-sm resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept_status" className="text-sm font-semibold">Status</Label>
                  <Select
                    value={departmentForm.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) => setDepartmentForm({ ...departmentForm, is_active: value === 'active' })}
                  >
                    <SelectTrigger className="h-11 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </div>
            <div className="p-4 border-t bg-slate-50/80 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDepartmentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="dept-form" className="px-8 bg-slate-900 font-bold">
                {editingDepartment ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={designationDialogOpen} onOpenChange={setDesignationDialogOpen}>
          <DialogContent className="sm:max-w-[600px] w-[95vw] p-0 flex flex-col gap-0 rounded-xl overflow-hidden shadow-2xl border-none max-h-[95vh] sm:max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50/80 shrink-0">
              <DialogTitle className="text-xl font-bold">{editingDesignation ? 'Edit Designation' : 'Create Designation'}</DialogTitle>
              <DialogDescription>
                {editingDesignation ? 'Update designation information' : 'Add a new designation/position'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <form id="desig-form" onSubmit={handleSaveDesignation} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="desig_name" className="text-sm font-semibold">Designation Name *</Label>
                  <Input
                    id="desig_name"
                    value={designationForm.name}
                    onChange={(e) => setDesignationForm({ ...designationForm, name: e.target.value })}
                    placeholder="e.g., Software Engineer, Manager"
                    required
                    className="h-11 shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desig_department" className="text-sm font-semibold">Department</Label>
                  <Select
                    value={designationForm.department_id || 'none'}
                    onValueChange={(value) => setDesignationForm({ ...designationForm, department_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger className="h-11 shadow-sm">
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
                  <Label htmlFor="desig_description" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="desig_description"
                    value={designationForm.description}
                    onChange={(e) => setDesignationForm({ ...designationForm, description: e.target.value })}
                    placeholder="Brief description of the designation"
                    rows={3}
                    className="shadow-sm resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desig_status" className="text-sm font-semibold">Status</Label>
                  <Select
                    value={designationForm.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) => setDesignationForm({ ...designationForm, is_active: value === 'active' })}
                  >
                    <SelectTrigger className="h-11 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </div>
            <div className="p-4 border-t bg-slate-50/80 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDesignationDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="desig-form" className="px-8 bg-slate-900 font-bold">
                {editingDesignation ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
