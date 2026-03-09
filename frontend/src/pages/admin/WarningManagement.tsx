import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { getWarnings, createWarning, deleteWarning, getAllProfiles } from '@/db/api';
import type { Warning, Profile, WarningSeverity } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
    AlertTriangle, Trash2, ShieldAlert, Plus, User,
    Users, Info, Search, Filter, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG: Record<WarningSeverity, { label: string; color: string; icon: any }> = {
    low: { label: 'Low', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Info },
    medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
    high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: ShieldAlert },
    critical: { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200', icon: ShieldAlert },
};

export default function WarningManagement({ Layout = AdminLayout }: { Layout?: any }) {
    const { profile } = useAuth();
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('all');

    const emptyForm = {
        title: '',
        message: '',
        severity: 'medium' as WarningSeverity,
        target_role: 'individual' as any,
        user_id: '',
        expires_at: '',
    };

    const [formData, setFormData] = useState(emptyForm);

    const loadData = async () => {
        setLoading(true);
        try {
            const [warningsData, usersData] = await Promise.all([
                getWarnings(true),
                getAllProfiles(),
            ]);
            setWarnings(warningsData);
            setUsers(usersData.filter(u => u.is_active));
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load warnings', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.message) {
            toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
            return;
        }

        if (formData.target_role === 'individual' && !formData.user_id) {
            toast({ title: 'Error', description: 'Please select a user', variant: 'destructive' });
            return;
        }

        try {
            await createWarning({
                ...formData,
                created_by: profile?.id,
                user_id: formData.target_role === 'individual' ? formData.user_id : null
            });
            toast({ title: 'Success', description: 'Warning issued successfully' });
            setDialogOpen(false);
            setFormData(emptyForm);
            loadData();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to issue warning', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this warning?')) return;
        try {
            await deleteWarning(id);
            toast({ title: 'Success', description: 'Warning deleted' });
            loadData();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete warning', variant: 'destructive' });
        }
    };

    const filteredWarnings = warnings.filter(w => {
        const matchesSearch = w.title.toLowerCase().includes(search.toLowerCase()) ||
            w.message.toLowerCase().includes(search.toLowerCase()) ||
            (w.user_id as any)?.full_name?.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = filterSeverity === 'all' || w.severity === filterSeverity;
        return matchesSearch && matchesSeverity;
    });

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Warning Management</h1>
                        <p className="text-muted-foreground">Issue and manage formal warnings to employees</p>
                    </div>
                    <Button onClick={() => setDialogOpen(true)} className="shadow-lg">
                        <Plus className="h-4 w-4 mr-2" /> Issue Warning
                    </Button>
                </div>

                <div className="flex gap-4 items-center bg-white p-4 rounded-xl border shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search warnings, messages or users..."
                            className="pl-10"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger className="w-[180px]">
                            <span className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                {filterSeverity === 'all' ? 'All Severities' : filterSeverity.toUpperCase()}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Severities</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Target</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Warning Info</TableHead>
                                <TableHead>Issued By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10">Loading warnings...</TableCell></TableRow>
                            ) : filteredWarnings.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No warnings found.</TableCell></TableRow>
                            ) : (
                                filteredWarnings.map((w) => {
                                    const SevIcon = SEVERITY_CONFIG[w.severity].icon;
                                    return (
                                        <TableRow key={w.id}>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {w.target_role === 'individual' ? (
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-3.5 w-3.5 text-primary" />
                                                            <span className="font-semibold">{(w.user_id as any)?.full_name || 'Particular User'}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-3.5 w-3.5 text-slate-500" />
                                                            <Badge variant="secondary" className="capitalize">{w.target_role}</Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("flex w-fit items-center gap-1 px-2 py-0.5", SEVERITY_CONFIG[w.severity].color)}>
                                                    <SevIcon className="h-3 w-3" />
                                                    {SEVERITY_CONFIG[w.severity].label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[300px]">
                                                    <p className="font-bold text-sm truncate">{w.title}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{w.message}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-medium">{(w.created_by as any)?.full_name || 'Admin'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(w.created_at).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Issue Formal Warning</DialogTitle>
                            <DialogDescription>Send a warning to a specific user or group.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Target Type</Label>
                                    <Select
                                        value={formData.target_role}
                                        onValueChange={(val) => setFormData({ ...formData, target_role: val, user_id: '' })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="individual">Particular User</SelectItem>
                                            <SelectItem value="employee">All Employees</SelectItem>
                                            <SelectItem value="hr">All HRs</SelectItem>
                                            <SelectItem value="bde">All BDEs</SelectItem>
                                            <SelectItem value="all">Everyone</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Severity</Label>
                                    <Select value={formData.severity} onValueChange={(val: any) => setFormData({ ...formData, severity: val })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="critical">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {formData.target_role === 'individual' && (
                                <div className="space-y-2">
                                    <Label>Select Employee</Label>
                                    <Select value={formData.user_id} onValueChange={(val) => setFormData({ ...formData, user_id: val })}>
                                        <SelectTrigger><SelectValue placeholder="Search member..." /></SelectTrigger>
                                        <SelectContent>
                                            {users.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Warning Title</Label>
                                <Input
                                    placeholder="e.g. Constant Late Coming"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Message Content</Label>
                                <Textarea
                                    placeholder="Describe the reason for this warning..."
                                    className="min-h-[100px]"
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">Issue Warning</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
