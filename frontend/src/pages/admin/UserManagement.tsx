import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
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
import { getAllProfiles, updateProfile, getActiveDepartments, getActiveDesignations, getAllClients, deleteProfile, adminCreateUser, adminChangePassword } from '@/db/api';
import type { Profile, Department, Designation, Client } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Plus, Key, Eye, EyeOff, Filter, Trash2, ShieldCheck, IndianRupee } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import React from 'react';
import { cn } from '@/lib/utils';

export default function UserManagement() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [editUser, setEditUser] = useState<Profile | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const { toast } = useToast();

    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        email: '',
        phone: '',
        full_name: '',
        role: 'employee' as any,
        department: '',
        designation_id: '',
        client_id: '',
        date_of_birth: '',
        skip_ip_restriction: false,
        shift_type: 'full_day' as 'full_day' | 'half_day',
    });

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: '',
    });

    const loadUsers = async () => {
        setLoading(true);
        try {
            const [usersData, deptData, desigData, clientData] = await Promise.all([
                getAllProfiles(),
                getActiveDepartments(),
                getActiveDesignations(),
                getAllClients(),
            ]);
            setUsers(usersData);
            setFilteredUsers(usersData);
            setDepartments(deptData);
            setDesignations(desigData);
            setClients(clientData);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load users',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Filter users by department
    useEffect(() => {
        if (selectedDepartmentFilter === 'all') {
            setFilteredUsers(users);
        } else {
            setFilteredUsers(users.filter((user: Profile) => user.department === selectedDepartmentFilter));
        }
    }, [selectedDepartmentFilter, users]);

    const handleEdit = (user: Profile) => {
        setEditUser(user);
        setEditOpen(true);
    };

    const handleChangePassword = (user: Profile) => {
        setSelectedUser(user);
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setShowNewPassword(false);
        setChangePasswordOpen(true);
    };

    const confirmDelete = (user: Profile) => {
        setUserToDelete(user);
        setDeleteOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            await deleteProfile(userToDelete.id);
            toast({
                title: 'Success',
                description: 'User deleted successfully',
            });
            loadUsers();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete user',
                variant: 'destructive',
            });
        } finally {
            setDeleteOpen(false);
            setUserToDelete(null);
        }
    };

    const handleSubmitPasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUser) return;

        if (!passwordData.newPassword) {
            toast({
                title: 'Error',
                description: 'Password is required',
                variant: 'destructive',
            });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast({
                title: 'Error',
                description: 'Password must be at least 6 characters',
                variant: 'destructive',
            });
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast({
                title: 'Error',
                description: 'Passwords do not match',
                variant: 'destructive',
            });
            return;
        }

        setChangingPassword(true);
        try {
            const data = await adminChangePassword({
                userId: selectedUser.id,
                newPassword: passwordData.newPassword,
            });

            if (!data || !data.success) {
                throw new Error(data?.error || 'Failed to change password');
            }

            toast({
                title: 'Success',
                description: 'Password changed successfully',
            });
            setChangePasswordOpen(false);
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error('Failed to change password:', error);
            toast({
                title: 'Error',
                description: error?.message || 'Failed to change password',
                variant: 'destructive',
            });
        } finally {
            setChangingPassword(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUser?.id) return;

        setSaving(true);
        try {
            await updateProfile(editUser.id, {
                full_name: editUser.full_name,
                email: editUser.email,
                phone: editUser.phone,
                role: editUser.role,
                department: editUser.department,
                designation_id: editUser.designation_id,
                client_id: editUser.client_id,
                is_active: editUser.is_active,
                skip_ip_restriction: editUser.skip_ip_restriction,
                shift_type: editUser.shift_type,
                date_of_birth: editUser.date_of_birth,
            });
            toast({
                title: 'Success',
                description: 'User updated successfully',
            });
            setEditOpen(false);
            loadUsers();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update user',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUser.username || !newUser.password) {
            toast({
                title: 'Error',
                description: 'Username and password are required',
                variant: 'destructive',
            });
            return;
        }

        if (newUser.email && !/^[^@]+@[^@]+\.[^@]+$/.test(newUser.email)) {
            toast({
                title: 'Error',
                description: 'Please enter a valid email address',
                variant: 'destructive',
            });
            return;
        }

        if (newUser.role === 'client' && !newUser.client_id) {
            toast({
                title: 'Error',
                description: 'Please select a company for the client user',
                variant: 'destructive',
            });
            return;
        }

        setCreating(true);
        try {
            const data = await adminCreateUser({
                username: newUser.username,
                password: newUser.password,
                email: newUser.email || null,
                phone: newUser.phone || null,
                full_name: newUser.full_name || null,
                role: newUser.role,
                department: (newUser.role !== 'client' ? newUser.department : null) || null,
                designation_id: (newUser.role !== 'client' ? newUser.designation_id : null) || null,
                client_id: (newUser.role === 'client' ? newUser.client_id : null) || null,
                shift_type: newUser.shift_type,
                date_of_birth: newUser.date_of_birth || null,
            });

            if (!data || !data.success) {
                throw new Error((data as any)?.error || 'Failed to create user');
            }

            toast({
                title: 'Success',
                description: `User created successfully with role: ${newUser.role}`,
            });

            setNewUser({
                username: '',
                password: '',
                email: '',
                phone: '',
                full_name: '',
                role: 'employee',
                department: '',
                designation_id: '',
                client_id: '',
                date_of_birth: '',
                skip_ip_restriction: false,
                shift_type: 'full_day',
            });
            setCreateOpen(false);
            loadUsers();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to create user',
                variant: 'destructive',
            });
        } finally {
            setCreating(false);
        }
    };

    const getRoleBadge = (role: string) => {
        const colors = {
            admin: 'bg-destructive text-destructive-foreground',
            hr: 'bg-primary text-primary-foreground',
            employee: 'bg-secondary text-secondary-foreground',
            client: 'bg-accent text-accent-foreground',
            bde: 'bg-indigo-500 text-white',
        };
        return colors[role as keyof typeof colors] || 'bg-muted';
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
                        <p className="text-muted-foreground text-sm sm:text-base">Manage user accounts and roles</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Create User
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-6 px-6 pt-6">
                        <CardTitle className="text-xl font-bold text-slate-900">All User Directory</CardTitle>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1 sm:mb-0">
                                <Filter className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Filter</span>
                            </div>
                            <Select
                                value={selectedDepartmentFilter}
                                onValueChange={setSelectedDepartmentFilter}
                            >
                                <SelectTrigger className="w-full sm:w-[200px] h-9">
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((dept: Department) => (
                                        <SelectItem key={dept.id} value={dept.name}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="text-center py-8">Loading...</div>
                        ) : (
                            <div className="overflow-x-auto sm:overflow-visible">
                                <Table>
                                    <TableHeader className="bg-slate-50/50 border-b">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="font-bold text-slate-900 py-4">Username</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4">Full Name</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4">Role</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4">Department</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4">Designation</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4">Status</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4">Remote Auth</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4 text-right pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((user: Profile) => (
                                            <TableRow key={user.id} className="group hover:bg-slate-50/50">
                                                <TableCell className="font-semibold text-slate-900">{user.username}</TableCell>
                                                <TableCell className="text-slate-600 line-clamp-1 h-12 flex items-center">{user.full_name || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge className={cn("shadow-none", getRoleBadge(user.role))}>{user.role}</Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-600">{user.department || '-'}</TableCell>
                                                <TableCell className="text-slate-600">{(user as any).designation?.name || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={user.is_active ? 'default' : 'secondary'} className="shadow-none">
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {user.role === 'employee' ? (
                                                        user.skip_ip_restriction ? (
                                                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 flex gap-1 w-fit shadow-none">
                                                                <ShieldCheck className="h-3 w-3" /> Authorized
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="opacity-50 border-slate-200 text-slate-400 font-normal">Standard</Badge>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Exempt</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                                                            title="Edit User"
                                                        >
                                                            <Pencil className="h-4 w-4 text-slate-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm"
                                                            onClick={(e) => { e.stopPropagation(); handleChangePassword(user); }}
                                                            title="Change Password"
                                                        >
                                                            <Key className="h-4 w-4 text-slate-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={(e) => { e.stopPropagation(); confirmDelete(user); }}
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[95vh] sm:max-h-[90vh] p-0 flex flex-col gap-0 rounded-xl overflow-hidden shadow-2xl border-none">
                        <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0 bg-slate-50/50">
                            <DialogTitle className="text-xl font-bold">Create New User</DialogTitle>
                            <DialogDescription>Add a new user account to the system</DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth">
                            <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="new_username" className="text-sm font-semibold">Username *</Label>
                                    <Input
                                        id="new_username"
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        placeholder="e.g. john_doe"
                                        required
                                        className="h-11 shadow-sm"
                                    />
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Letters, numbers, and underscores only</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new_email" className="text-sm font-semibold">Email Address</Label>
                                        <Input
                                            id="new_email"
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            placeholder="email@company.com"
                                            className="h-11 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new_phone" className="text-sm font-semibold">Phone Number</Label>
                                        <Input
                                            id="new_phone"
                                            type="tel"
                                            value={newUser.phone}
                                            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                            className="h-11 shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new_password">Password *</Label>
                                    <div className="relative">
                                        <Input
                                            id="new_password"
                                            type={showPassword ? "text" : "password"}
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            placeholder="Enter password"
                                            required
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 6 characters
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new_full_name" className="text-sm font-semibold">Full Name</Label>
                                        <Input
                                            id="new_full_name"
                                            value={newUser.full_name}
                                            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                            placeholder="Enter full name"
                                            className="h-11 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new_dob" className="text-sm font-semibold">Birth Date</Label>
                                        <Input
                                            id="new_dob"
                                            type="date"
                                            value={newUser.date_of_birth}
                                            onChange={(e) => setNewUser({ ...newUser, date_of_birth: e.target.value })}
                                            className="h-11 shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new_role" className="text-sm font-semibold">Role *</Label>
                                    <Select
                                        value={newUser.role}
                                        onValueChange={(value: any) => setNewUser({ ...newUser, role: value as any })}
                                    >
                                        <SelectTrigger className="h-11 shadow-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin - Full system access</SelectItem>
                                            <SelectItem value="hr">HR - Employee management</SelectItem>
                                            <SelectItem value="employee">Employee - Basic access</SelectItem>
                                            <SelectItem value="client">Client - Project tracking</SelectItem>
                                            <SelectItem value="bde">BDE - Sales & Client Management</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shift_type" className="text-sm font-semibold text-primary">Work Shift Profile</Label>
                                    <Select
                                        value={newUser.shift_type}
                                        onValueChange={(value: any) => setNewUser({ ...newUser, shift_type: value })}
                                    >
                                        <SelectTrigger className="h-11 shadow-sm border-primary/20">
                                            <SelectValue placeholder="Select shift profile" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="full_day">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">Full Day Profile</span>
                                                    <span className="text-[10px] text-muted-foreground">Standard company working hours</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="half_day">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">Half Day Profile</span>
                                                    <span className="text-[10px] text-muted-foreground">Reduced hours / Half day schedule</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {newUser.role === 'client' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="new_client" className="text-sm font-semibold text-blue-600">Associated Client Company *</Label>
                                        <Select
                                            value={newUser.client_id || undefined}
                                            onValueChange={(value: string) => {
                                                console.log('Selected client_id:', value);
                                                setNewUser({ ...newUser, client_id: value });
                                            }}
                                        >
                                            <SelectTrigger id="new_client" className="h-11 shadow-sm border-blue-200 bg-blue-50/30">
                                                <SelectValue placeholder="Select client company" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clients.length === 0 && <div className="p-2 text-xs text-muted-foreground">No clients found</div>}
                                                {clients.map((client: Client) => (
                                                    <SelectItem key={client.id} value={client.id || (client as any)._id}>
                                                        {client.company_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-blue-500 font-medium">This links the user to their specific company portal</p>
                                    </div>
                                )}
                                {newUser.role !== 'client' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="new_department" className="text-sm font-semibold">Department</Label>
                                            <Select
                                                value={newUser.department || 'none'}
                                                onValueChange={(value: string) => {
                                                    setNewUser({ ...newUser, department: value === 'none' ? '' : value, designation_id: '' });
                                                }}
                                            >
                                                <SelectTrigger className="h-11 shadow-sm">
                                                    <SelectValue placeholder="Select dept" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Department</SelectItem>
                                                    {departments.map((dept: Department) => (
                                                        <SelectItem key={dept.id} value={dept.name}>
                                                            {dept.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new_designation" className="text-sm font-semibold">Designation</Label>
                                            <Select
                                                value={newUser.designation_id || 'none'}
                                                onValueChange={(value: string) => setNewUser({ ...newUser, designation_id: value === 'none' ? '' : value })}
                                                disabled={!newUser.department}
                                            >
                                                <SelectTrigger className="h-11 shadow-sm">
                                                    <SelectValue placeholder={newUser.department ? "Select desig" : "Select dept first"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Designation</SelectItem>
                                                    {designations
                                                        .filter((d: Designation) => {
                                                            const dept = departments.find((dep: Department) => dep.name === newUser.department);
                                                            return !d.department_id || d.department_id === dept?.id;
                                                        })
                                                        .map((desig: Designation) => (
                                                            <SelectItem key={desig.id} value={desig.id}>
                                                                {desig.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {(newUser.role === 'employee' || newUser.role === 'bde') && (
                                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="new_skip_ip" className="text-base">Authorize Remote Work</Label>
                                            <p className="text-xs text-muted-foreground">Allow clock-in/out from any network (Skip WiFi check)</p>
                                        </div>
                                        <Switch
                                            id="new_skip_ip"
                                            checked={newUser.skip_ip_restriction}
                                            onCheckedChange={(checked) => setNewUser({ ...newUser, skip_ip_restriction: checked })}
                                        />
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="px-4 sm:px-6 py-4 border-t shrink-0 flex justify-end gap-2 bg-slate-50/50">
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                            <Button type="submit" form="create-user-form" className="px-8 bg-slate-900 font-bold" disabled={creating}>
                                {creating ? 'Creating...' : 'Create User'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[95vh] sm:max-h-[90vh] p-0 flex flex-col gap-0 rounded-xl overflow-hidden shadow-2xl border-none">
                        <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0 bg-slate-50/50">
                            <DialogTitle className="text-xl font-bold">Edit User</DialogTitle>
                            <DialogDescription>Update profile information for {editUser?.username}</DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth">
                            {editUser && (
                                <form id="edit-user-form" onSubmit={handleSave} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_email" className="text-sm font-semibold">Email Address</Label>
                                            <Input
                                                id="edit_email"
                                                type="email"
                                                value={editUser.email || ''}
                                                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                                placeholder="email@company.com"
                                                className="h-11 shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_phone" className="text-sm font-semibold">Phone Number</Label>
                                            <Input
                                                id="edit_phone"
                                                type="tel"
                                                value={editUser.phone || ''}
                                                onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                                                placeholder="+91 98765 43210"
                                                className="h-11 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="full_name" className="text-sm font-semibold">Full Name</Label>
                                            <Input
                                                id="full_name"
                                                value={editUser.full_name || ''}
                                                onChange={(e) =>
                                                    setEditUser({ ...editUser, full_name: e.target.value })
                                                }
                                                className="h-11 shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_dob" className="text-sm font-semibold">Birth Date</Label>
                                            <Input
                                                id="edit_dob"
                                                type="date"
                                                value={editUser.date_of_birth || ''}
                                                onChange={(e) =>
                                                    setEditUser({ ...editUser, date_of_birth: e.target.value })
                                                }
                                                className="h-11 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="text-sm font-semibold">Role</Label>
                                        <Select
                                            value={editUser.role}
                                            onValueChange={(value) =>
                                                setEditUser({ ...editUser, role: value as any })
                                            }
                                        >
                                            <SelectTrigger className="h-11 shadow-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="hr">HR</SelectItem>
                                                <SelectItem value="employee">Employee</SelectItem>
                                                <SelectItem value="bde">BDE</SelectItem>
                                                <SelectItem value="client">Client</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_shift_type" className="text-sm font-semibold text-primary">Work Shift Profile</Label>
                                        <Select
                                            value={editUser.shift_type}
                                            onValueChange={(value: any) => setEditUser({ ...editUser, shift_type: value })}
                                        >
                                            <SelectTrigger className="h-11 shadow-sm border-primary/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="full_day">Full Day Profile</SelectItem>
                                                <SelectItem value="half_day">Half Day Profile</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {editUser.role === 'client' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_client_id" className="text-sm font-semibold">Associated Client Company *</Label>
                                            <Select
                                                value={editUser.client_id || 'none'}
                                                onValueChange={(value) =>
                                                    setEditUser({ ...editUser, client_id: value === 'none' ? null : value })
                                                }
                                            >
                                                <SelectTrigger className="h-11 shadow-sm border-primary/20">
                                                    <SelectValue placeholder="Select associated client" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Client Association</SelectItem>
                                                    {clients.map((client) => (
                                                        <SelectItem key={client.id} value={client.id}>
                                                            {client.company_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {(editUser.role === 'employee' || editUser.role === 'bde') && (
                                        <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50 shadow-sm">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="skip_ip" className="text-sm font-bold block">Authorize Remote Work</Label>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Allow any network</p>
                                            </div>
                                            <Switch
                                                id="skip_ip"
                                                checked={editUser.skip_ip_restriction}
                                                onCheckedChange={(checked) => setEditUser({ ...editUser, skip_ip_restriction: checked })}
                                            />
                                        </div>
                                    )}
                                    {(editUser.role === 'employee' || editUser.role === 'bde' || editUser.role === 'hr') && (
                                        <div className="space-y-2">
                                            <Label htmlFor="salary_per_month" className="text-sm font-semibold">Monthly Salary (₹)</Label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="salary_per_month"
                                                    type="number"
                                                    className="h-11 pl-9 shadow-sm"
                                                    value={editUser.salary_per_month || 0}
                                                    onChange={(e) => setEditUser({ ...editUser, salary_per_month: Number(e.target.value) })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium italic">Standard monthly pay for this user</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="department" className="text-sm font-semibold">Department</Label>
                                            <Select
                                                value={editUser.department || 'none'}
                                                onValueChange={(value) =>
                                                    setEditUser({ ...editUser, department: value === 'none' ? null : value, designation_id: null })
                                                }
                                            >
                                                <SelectTrigger className="h-11 shadow-sm">
                                                    <SelectValue placeholder="Select dept" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Department</SelectItem>
                                                    {departments.map((dept: Department) => (
                                                        <SelectItem key={dept.id} value={dept.name}>
                                                            {dept.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="designation" className="text-sm font-semibold">Designation</Label>
                                            <Select
                                                value={editUser.designation_id || 'none'}
                                                onValueChange={(value) =>
                                                    setEditUser({ ...editUser, designation_id: value === 'none' ? null : value })
                                                }
                                                disabled={!editUser.department}
                                            >
                                                <SelectTrigger className="h-11 shadow-sm">
                                                    <SelectValue placeholder={editUser.department ? "Select desig" : "Select dept first"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Designation</SelectItem>
                                                    {designations
                                                        .filter((d: Designation) => {
                                                            const dept = departments.find((dep: Department) => dep.name === editUser.department);
                                                            return !d.department_id || d.department_id === dept?.id;
                                                        })
                                                        .map((desig: Designation) => (
                                                            <SelectItem key={desig.id} value={desig.id}>
                                                                {desig.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="is_active">Status</Label>
                                        <Select
                                            value={editUser.is_active ? 'active' : 'inactive'}
                                            onValueChange={(value) =>
                                                setEditUser({ ...editUser, is_active: value === 'active' })
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
                                </form>
                            )}
                        </div>
                        <div className="px-4 sm:px-6 py-4 border-t shrink-0 flex justify-end gap-2 bg-slate-50/50">
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
                            <Button type="submit" form="edit-user-form" className="px-8 bg-slate-900 font-bold" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Change Password</DialogTitle>
                            <DialogDescription>
                                Change password for user: {selectedUser?.username}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmitPasswordChange} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new_password_change">New Password *</Label>
                                <div className="relative">
                                    <Input
                                        id="new_password_change"
                                        type={showNewPassword ? "text" : "password"}
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        placeholder="Enter new password"
                                        required
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Minimum 6 characters
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm_password">Confirm Password *</Label>
                                <div className="relative">
                                    <Input
                                        id="confirm_password"
                                        type={showNewPassword ? "text" : "password"}
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        placeholder="Confirm new password"
                                        required
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setChangePasswordOpen(false)}
                                    disabled={changingPassword}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={changingPassword}>
                                    {changingPassword ? 'Changing...' : 'Change Password'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user account
                                for <span className="font-semibold text-foreground">{userToDelete?.full_name || userToDelete?.username}</span> and remove their data from our servers.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteUser}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AdminLayout>
    );
}
