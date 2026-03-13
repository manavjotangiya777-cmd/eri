import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    getAllFollowUps, createFollowUp, updateFollowUp, deleteFollowUp, getAllProfiles,
} from '@/db/api';
import type { FollowUp, FollowUpTaskType, FollowUpStatus, Profile, FollowUpUpdateNote } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { markFollowUpsSeen } from '@/hooks/use-followup-badge';
import {
    Plus, Pencil, Trash2, Eye, Phone, Mail, MessageCircle, Video,
    User, ChevronRight, Hash, Bell, CalendarDays, Clock,
    CheckCircle2, MessageSquarePlus, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Config Maps ───────────────────────────────────────────────
const TASK_TYPES: Record<FollowUpTaskType, { label: string; emoji: string }> = {
    update_levanu: { label: 'Update Levanu', emoji: '📋' },
    work_karavanu: { label: 'Work Karavanu', emoji: '🔨' },
    document_collect: { label: 'Document Collect Karavanu', emoji: '📄' },
    client_followup: { label: 'Client Follow-Up', emoji: '🤝' },
    payment_followup: { label: 'Payment Follow-Up', emoji: '💰' },
    internal_coordination: { label: 'Internal Coordination', emoji: '🔗' },
};

const STATUS_CONFIG: Record<FollowUpStatus, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    in_followup: { label: 'In Follow-Up', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    waiting_client: { label: 'Waiting From Client', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
};

const COMM_ICONS = {
    call: <Phone className="h-3.5 w-3.5" />,
    whatsapp: <MessageCircle className="h-3.5 w-3.5 text-green-500" />,
    email: <Mail className="h-3.5 w-3.5 text-blue-500" />,
    meeting: <Video className="h-3.5 w-3.5 text-purple-500" />,
    other: <Bell className="h-3.5 w-3.5" />,
};

const RELATED_TYPES = ['client', 'employee', 'vendor', 'department', 'other'];
const COMM_METHODS = ['call', 'whatsapp', 'email', 'meeting', 'other'];

// ─── Component ──────────────────────────────────────────────────
interface FollowUpManagementProps {
    Layout?: React.ComponentType<{ children: React.ReactNode }>;
}

export default function FollowUpManagement({ Layout = AdminLayout }: FollowUpManagementProps) {
    const { profile } = useAuth();
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [editItem, setEditItem] = useState<FollowUp | null>(null);
    const [viewItem, setViewItem] = useState<FollowUp | null>(null);
    const [updateNoteText, setUpdateNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const { toast } = useToast();
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');

    const emptyForm: Partial<FollowUp> & { required_items_text?: string } = {
        title: '',
        task_type: 'client_followup',
        related_name: '',
        related_type: 'client',
        assigned_to: null,
        assigned_by: profile?.id || null,
        description: '',
        required_items: [],
        required_items_text: '',
        communication_method: 'call',
        deadline: '',
        next_action_date: '',
        status: 'pending',
    };

    const [formData, setFormData] = useState<typeof emptyForm>(emptyForm);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fups, usrs] = await Promise.all([getAllFollowUps(), getAllProfiles()]);
            setFollowUps(fups);
            setUsers(usrs);
        } catch {
            toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
        } finally { setLoading(false); }
    };

    useEffect(() => {
        loadData();
        // Mark follow-ups as seen when page is opened → clears sidebar badge
        if (profile?.id) markFollowUpsSeen(profile.id);
    }, []);

    const handleAdd = () => {
        setEditItem(null);
        setFormData({ ...emptyForm, assigned_by: profile?.id || null });
        setDialogOpen(true);
    };

    const handleEdit = (item: FollowUp) => {
        setEditItem(item);
        setFormData({
            ...item,
            deadline: item.deadline ? new Date(item.deadline).toISOString().slice(0, 10) : '',
            next_action_date: item.next_action_date ? new Date(item.next_action_date).toISOString().slice(0, 10) : '',
            required_items_text: (item.required_items || []).join('\n'),
        });
        setDialogOpen(true);
    };

    const handleView = (item: FollowUp) => {
        setViewItem(item);
        setUpdateNoteText('');
        setViewOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title?.trim()) {
            toast({ title: 'Error', description: 'Title is required', variant: 'destructive' }); return;
        }
        try {
            const required_items = (formData.required_items_text || '')
                .split('\n').map(s => s.trim()).filter(Boolean);

            const payload: Partial<FollowUp> = {
                ...formData,
                required_items,
                deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
                next_action_date: formData.next_action_date ? new Date(formData.next_action_date).toISOString() : null,
                assigned_by: formData.assigned_by || profile?.id || null,
            };
            delete (payload as any).required_items_text;

            if (editItem) {
                await updateFollowUp(editItem.id, payload);
                toast({ title: 'Updated', description: 'Follow-up updated' });
            } else {
                await createFollowUp(payload);
                toast({ title: 'Created', description: 'Follow-up created' });
            }
            setDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast({ title: 'Error', description: err?.message || 'Save failed', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this follow-up?')) return;
        try {
            await deleteFollowUp(id);
            toast({ title: 'Deleted' });
            loadData();
        } catch {
            toast({ title: 'Error', description: 'Could not delete', variant: 'destructive' });
        }
    };

    const handleAddNote = async () => {
        if (!updateNoteText.trim() || !viewItem) return;
        setAddingNote(true);
        try {
            const newNote: FollowUpUpdateNote = {
                text: updateNoteText.trim(),
                noted_by: profile?.id,
                noted_at: new Date().toISOString(),
            };
            await updateFollowUp(viewItem.id, {
                update_notes: [...(viewItem.update_notes || []), newNote],
            });
            setViewItem(prev => prev ? { ...prev, update_notes: [...(prev.update_notes || []), newNote] } : prev);
            setUpdateNoteText('');
            toast({ title: 'Note Added' });
        } catch {
            toast({ title: 'Error', description: 'Failed to add note', variant: 'destructive' });
        } finally { setAddingNote(false); }
    };

    const getUserName = (id: string | null | undefined) => {
        if (!id) return '-';
        const u = users.find(u => u.id === id || (u as any)._id === id);
        return u?.full_name || u?.username || id;
    };

    const filtered = followUps.filter(f => {
        const matchStatus = filterStatus === 'all' || f.status === filterStatus;
        const matchSearch = !search ||
            f.title.toLowerCase().includes(search.toLowerCase()) ||
            (f.followup_id || '').toLowerCase().includes(search.toLowerCase()) ||
            (f.related_name || '').toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const stats = {
        total: followUps.length,
        pending: followUps.filter(f => f.status === 'pending').length,
        inFollowup: followUps.filter(f => f.status === 'in_followup').length,
        completed: followUps.filter(f => f.status === 'completed').length,
    };

    return (
        <Layout>
            <div className="space-y-6 pb-8">
                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <Bell className="h-8 w-8 text-primary" />
                            Follow-Up Management
                        </h1>
                        <p className="text-muted-foreground mt-1">Send reminders and track follow-ups for clients, employees and tasks</p>
                    </div>
                    <Button onClick={handleAdd} className="gap-2 shadow-md">
                        <Plus className="h-4 w-4" /> New Follow-Up
                    </Button>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
                        { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                        { label: 'In Follow-Up', value: stats.inFollowup, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                        { label: 'Completed', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                    ].map(s => (
                        <Card key={s.label} className={cn('border', s.bg)}>
                            <CardContent className="p-4">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                                <p className={cn('text-3xl font-black', s.color)}>{s.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ── Filters ── */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                placeholder="Search by title, ID, or related name..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1"
                            />
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={loadData} title="Refresh">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Table ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Hash className="h-5 w-5 text-primary" />
                            Follow-Ups ({filtered.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No follow-ups found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-6 px-6">
                                <TooltipProvider>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent text-nowrap">
                                                <TableHead className="min-w-[100px]">ID</TableHead>
                                                <TableHead className="min-w-[220px]">Title / Type</TableHead>
                                                <TableHead className="min-w-[150px]">Related</TableHead>
                                                <TableHead className="min-w-[140px]">Assigned To</TableHead>
                                                <TableHead className="min-w-[80px]">Via</TableHead>
                                                <TableHead className="min-w-[120px]">Status</TableHead>
                                                <TableHead className="min-w-[120px]">Deadline</TableHead>
                                                <TableHead className="min-w-[130px]">Next Action</TableHead>
                                                <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filtered.map(fu => {
                                                const sc = STATUS_CONFIG[fu.status];
                                                const tt = TASK_TYPES[fu.task_type];
                                                const isOverdue = fu.deadline && fu.status !== 'completed' && new Date(fu.deadline) < new Date();
                                                return (
                                                    <TableRow key={fu.id} className="group hover:bg-slate-50/60">
                                                        <TableCell>
                                                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                                {fu.followup_id || '-'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-[200px]">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <p className="font-semibold text-slate-900 truncate cursor-help">{fu.title}</p>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="max-w-[300px] whitespace-normal">
                                                                        {fu.title}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                                <p className="text-xs text-muted-foreground">{tt?.emoji} {tt?.label}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-[150px]">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <p className="text-sm font-medium truncate cursor-help">{fu.related_name || '-'}</p>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="max-w-[300px] whitespace-normal">
                                                                        Related: {fu.related_name || '-'}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                                <p className="text-xs text-muted-foreground capitalize">{fu.related_type}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{getUserName(fu.assigned_to)}</TableCell>
                                                        <TableCell>
                                                            <span className="flex items-center gap-1.5 text-xs capitalize">
                                                                {COMM_ICONS[fu.communication_method as keyof typeof COMM_ICONS] || COMM_ICONS.other}
                                                                {fu.communication_method}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={cn('border text-xs', sc.color)}>{sc.label}</Badge>
                                                        </TableCell>
                                                        <TableCell className={cn('text-sm', isOverdue ? 'text-red-500 font-semibold' : 'text-slate-600')}>
                                                            {fu.deadline ? new Date(fu.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                                            {isOverdue && ' ⚠️'}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-600">
                                                            {fu.next_action_date ? new Date(fu.next_action_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleView(fu)}>
                                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(fu)}>
                                                                    <Pencil className="h-4 w-4 text-slate-500" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-50" onClick={() => handleDelete(fu.id)}>
                                                                    <Trash2 className="h-4 w-4 text-red-400" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TooltipProvider>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── ADD/EDIT DIALOG ── */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-[740px] w-[96vw] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden shadow-2xl border-none max-h-[94vh]">
                        <DialogHeader className="px-8 py-5 border-b bg-gradient-to-r from-amber-50 to-white shrink-0">
                            <DialogTitle className="text-xl font-black flex items-center gap-2">
                                <Bell className="h-5 w-5 text-amber-500" />
                                {editItem ? 'Edit Follow-Up' : 'New Follow-Up'}
                            </DialogTitle>
                            <DialogDescription>Fill details for the follow-up reminder</DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-8">
                            <form onSubmit={handleSave} className="space-y-5">
                                {/* Row 1 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="font-semibold">Follow-Up Title *</Label>
                                        <Input placeholder="e.g. Client Document Collection" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold">Task Type</Label>
                                        <Select value={formData.task_type} onValueChange={v => setFormData({ ...formData, task_type: v as FollowUpTaskType })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(TASK_TYPES).map(([k, v]) => (
                                                    <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold">Communication Method</Label>
                                        <Select value={formData.communication_method} onValueChange={v => setFormData({ ...formData, communication_method: v as any })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {COMM_METHODS.map(m => (
                                                    <SelectItem key={m} value={m} className="capitalize">
                                                        <span className="flex items-center gap-2">{COMM_ICONS[m as keyof typeof COMM_ICONS]} {m.charAt(0).toUpperCase() + m.slice(1)}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold">Related Person / Source</Label>
                                        <Input placeholder="Client name / Employee / Vendor" value={formData.related_name || ''} onChange={e => setFormData({ ...formData, related_name: e.target.value })} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold">Related Type</Label>
                                        <Select value={formData.related_type} onValueChange={v => setFormData({ ...formData, related_type: v as any })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {RELATED_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold">Assigned To</Label>
                                        <Select value={formData.assigned_to || 'unassigned'} onValueChange={v => setFormData({ ...formData, assigned_to: v === 'unassigned' ? null : v })}>
                                            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {users.map(u => (
                                                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold">Status</Label>
                                        <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as FollowUpStatus })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold">Deadline</Label>
                                        <Input type="date" value={formData.deadline || ''} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-semibold">Next Action Date</Label>
                                        <Input type="date" value={formData.next_action_date || ''} onChange={e => setFormData({ ...formData, next_action_date: e.target.value })} />
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="font-semibold">Description</Label>
                                        <Textarea placeholder="Exactly su karvanu che..." value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="font-semibold">Required Items / Output</Label>
                                        <p className="text-xs text-muted-foreground">Each item on a new line</p>
                                        <Textarea
                                            className="font-mono text-sm"
                                            placeholder={"Logo file\nWebsite content\nBrand colors\nContact details"}
                                            value={formData.required_items_text || ''}
                                            onChange={e => setFormData({ ...formData, required_items_text: e.target.value })}
                                            rows={4}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" className="min-w-[130px]">
                                        {editItem ? 'Update Follow-Up' : 'Create Follow-Up'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ── VIEW DIALOG ── */}
                <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                    <DialogContent className="sm:max-w-[780px] w-[96vw] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden shadow-2xl border-none max-h-[94vh]">
                        {viewItem && (() => {
                            const sc = STATUS_CONFIG[viewItem.status];
                            const tt = TASK_TYPES[viewItem.task_type];
                            return (
                                <>
                                    <div className="px-8 py-5 border-b bg-gradient-to-r from-amber-50 to-white shrink-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-mono text-muted-foreground mb-1">{viewItem.followup_id || 'No ID'}</p>
                                                <h2 className="text-xl font-black">{viewItem.title}</h2>
                                                <p className="text-sm text-muted-foreground mt-0.5">{tt?.emoji} {tt?.label}</p>
                                            </div>
                                            <Badge className={cn('border shrink-0', sc.color)}>{sc.label}</Badge>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                        {/* Meta grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {[
                                                { icon: User, label: 'Assigned To', value: getUserName(viewItem.assigned_to) },
                                                { icon: User, label: 'Assigned By', value: getUserName(viewItem.assigned_by) },
                                                { icon: Bell, label: 'Contact Via', value: viewItem.communication_method.charAt(0).toUpperCase() + viewItem.communication_method.slice(1) },
                                                { icon: User, label: 'Related', value: `${viewItem.related_name || '-'} (${viewItem.related_type})` },
                                                { icon: CalendarDays, label: 'Deadline', value: viewItem.deadline ? new Date(viewItem.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
                                                { icon: Clock, label: 'Next Action', value: viewItem.next_action_date ? new Date(viewItem.next_action_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
                                            ].map(item => (
                                                <div key={item.label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border">
                                                    <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                                                        <p className="text-sm font-semibold mt-0.5">{item.value}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Description */}
                                        {viewItem.description && (
                                            <div>
                                                <h3 className="font-bold text-sm mb-2 uppercase tracking-wider text-muted-foreground">Description</h3>
                                                <p className="text-sm bg-slate-50 border p-4 rounded-xl leading-relaxed">{viewItem.description}</p>
                                            </div>
                                        )}

                                        {/* Required Items */}
                                        {(viewItem.required_items || []).length > 0 && (
                                            <div>
                                                <h3 className="font-bold text-sm mb-3 uppercase tracking-wider text-muted-foreground">Required Items / Output</h3>
                                                <ul className="space-y-2">
                                                    {viewItem.required_items.map((item, i) => (
                                                        <li key={i} className="flex items-center gap-2 text-sm">
                                                            <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Update Notes */}
                                        <div>
                                            <h3 className="font-bold text-sm mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <MessageSquarePlus className="h-3.5 w-3.5" />
                                                Update Notes ({(viewItem.update_notes || []).length})
                                            </h3>
                                            <div className="space-y-3 mb-4">
                                                {(viewItem.update_notes || []).length === 0 && (
                                                    <p className="text-sm text-muted-foreground italic py-2">No updates yet.</p>
                                                )}
                                                {(viewItem.update_notes || []).map((note, i) => (
                                                    <div key={i} className="p-3 bg-amber-50 rounded-xl border-l-4 border-amber-400">
                                                        <p className="text-sm font-medium">{note.text}</p>
                                                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                                            <span>{getUserName(note.noted_by || null)}</span>
                                                            <span>•</span>
                                                            <span>{note.noted_at ? new Date(note.noted_at).toLocaleString() : ''}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Textarea
                                                    placeholder="Add an update note... (e.g. Client sathe call thayu, content 2 divas ma mokalse)"
                                                    value={updateNoteText}
                                                    onChange={e => setUpdateNoteText(e.target.value)}
                                                    rows={2}
                                                    className="flex-1"
                                                />
                                                <Button onClick={handleAddNote} disabled={addingNote || !updateNoteText.trim()} className="self-end">
                                                    {addingNote ? '...' : 'Post'}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Status change quick action */}
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border">
                                            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm font-medium">Update Status:</span>
                                            <Select
                                                value={viewItem.status}
                                                onValueChange={async v => {
                                                    await updateFollowUp(viewItem.id, { status: v as FollowUpStatus });
                                                    setViewItem(prev => prev ? { ...prev, status: v as FollowUpStatus } : prev);
                                                    toast({ title: 'Status Updated' });
                                                }}
                                            >
                                                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
