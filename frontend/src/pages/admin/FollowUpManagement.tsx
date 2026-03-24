import React, { useEffect, useState } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table, TableBody, TableCell, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
    getAllFollowUps, createFollowUp, updateFollowUp, deleteFollowUp, getAllProfiles,
} from '@/db/api';
import type { FollowUp, FollowUpTaskType, FollowUpStatus, Profile, FollowUpUpdateNote } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { markFollowUpsSeen } from '@/hooks/use-followup-badge';
import {
    Plus, Pencil, Trash2, Phone, Mail, MessageCircle, Video,
    ChevronRight, Hash, Bell, ChevronDown,
    MessageSquarePlus, RefreshCw,
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
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<FollowUp | null>(null);
    const [updateNoteText, setUpdateNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const { toast } = useToast();
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState((profile?.role === 'admin' || profile?.role === 'hr') ? 'all' : 'received');
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
        setExpandedId(expandedId === item.id ? null : item.id);
        setUpdateNoteText('');
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

    const handleAddNoteInline = async (fu: FollowUp) => {
        if (!updateNoteText.trim()) return;
        setAddingNote(true);
        try {
            const newNote: FollowUpUpdateNote = {
                text: updateNoteText.trim(),
                noted_by: profile?.id,
                noted_at: new Date().toISOString(),
            };
            const updatedNotes = [...(fu.update_notes || []), newNote];
            await updateFollowUp(fu.id, { update_notes: updatedNotes });
            
            // Local update
            setFollowUps(prev => prev.map(f => f.id === fu.id ? { ...f, update_notes: updatedNotes } : f));
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

    const visibleFollowUps = (profile?.role === 'admin' || profile?.role === 'hr')
        ? followUps
        : followUps.filter(f =>
            f.assigned_to === profile?.id ||
            (f.assigned_to as any)?._id === profile?.id ||
            f.assigned_by === profile?.id ||
            (f.assigned_by as any)?._id === profile?.id
        );

    const filtered = visibleFollowUps.filter(f => {
        const isReceived = f.assigned_to === profile?.id || (f.assigned_to as any)?._id === profile?.id;
        const isSent = f.assigned_by === profile?.id || (f.assigned_by as any)?._id === profile?.id;

        const matchTab = activeTab === 'all' 
            || (activeTab === 'received' && isReceived)
            || (activeTab === 'sent' && isSent);

        const matchStatus = filterStatus === 'all' || f.status === filterStatus;
        const matchSearch = !search ||
            f.title.toLowerCase().includes(search.toLowerCase()) ||
            (f.followup_id || '').toLowerCase().includes(search.toLowerCase()) ||
            (f.related_name || '').toLowerCase().includes(search.toLowerCase());
        return matchTab && matchStatus && matchSearch;
    });

    const stats = {
        total: visibleFollowUps.length,
        pending: visibleFollowUps.filter(f => f.status === 'pending').length,
        inFollowup: visibleFollowUps.filter(f => f.status === 'in_followup').length,
        completed: visibleFollowUps.filter(f => f.status === 'completed').length,
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
                
                {/* ── Tabs ── */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-slate-100 p-1 rounded-xl h-auto border">
                        {(profile?.role === 'admin' || profile?.role === 'hr') && (
                            <TabsTrigger value="all" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                All Follow-Ups
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="received" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm relative">
                            My Received
                            {visibleFollowUps.filter(f => (f.assigned_to === profile?.id || (f.assigned_to as any)?._id === profile?.id) && f.status !== 'completed').length > 0 && (
                                <span className="ml-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {visibleFollowUps.filter(f => (f.assigned_to === profile?.id || (f.assigned_to as any)?._id === profile?.id) && f.status !== 'completed').length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="sent" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Sent by Me
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

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
                                    <Table>
                                        <TableBody>
                                            {filtered.map(fu => {
                                                const sc = STATUS_CONFIG[fu.status];
                                                const tt = TASK_TYPES[fu.task_type];
                                                const isOverdue = fu.deadline && fu.status !== 'completed' && new Date(fu.deadline) < new Date();
                                                const isExpanded = expandedId === fu.id;
                                                const isReceived = fu.assigned_to === profile?.id || (fu.assigned_to as any)?._id === profile?.id;

                                                return (
                                                    <React.Fragment key={fu.id}>
                                                        <TableRow className={cn(
                                                            "group transition-colors", 
                                                            isExpanded ? "bg-slate-50/80" : "hover:bg-slate-50/60",
                                                            isReceived && fu.status !== 'completed' && "border-l-4 border-l-amber-400"
                                                        )}>
                                                            <TableCell>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-6 w-6 rounded-md hover:bg-slate-200"
                                                                    onClick={() => handleView(fu)}
                                                                >
                                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                                </Button>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                                    {fu.followup_id || '-'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="max-w-[200px]">
                                                                    <p className="font-semibold text-slate-900 truncate">{fu.title}</p>
                                                                    <p className="text-xs text-muted-foreground">{tt?.emoji} {tt?.label}</p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="max-w-[150px]">
                                                                    <p className="text-sm font-medium truncate">{fu.related_name || '-'}</p>
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
                                                            <TableCell className={cn('text-sm text-nowrap', isOverdue ? 'text-red-500 font-semibold' : 'text-slate-600')}>
                                                                {fu.deadline ? new Date(fu.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                                                {isOverdue && ' ⚠️'}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-slate-600">
                                                                {fu.next_action_date ? new Date(fu.next_action_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-1">
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(fu)}>
                                                                        <Pencil className="h-4 w-4 text-slate-500" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-50" onClick={() => handleDelete(fu.id)}>
                                                                        <Trash2 className="h-4 w-4 text-red-400" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* ── EXPANDED ROW (DROPDOWN DETAILS) ── */}
                                                        {isExpanded && (
                                                            <TableRow className="bg-slate-50 border-t-0 hover:bg-slate-50">
                                                                <TableCell colSpan={10} className="p-0">
                                                                    <div className="p-6 border-x mx-4 bg-white rounded-b-2xl shadow-inner animate-in slide-in-from-top-2 duration-300">
                                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                                            {/* Left Side: Meta & Description */}
                                                                            <div className="md:col-span-4 space-y-4">
                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                    {[
                                                                                        { label: 'Assigned By', value: getUserName(fu.assigned_by) },
                                                                                        { label: 'Related', value: `${fu.related_name || '-'} (${fu.related_type})` },
                                                                                    ].map(item => (
                                                                                        <div key={item.label} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                                                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                                                                                            <p className="text-xs font-semibold mt-0.5 truncate">{item.value}</p>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>

                                                                                {fu.description && (
                                                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                                                                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                                                                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{fu.description}</p>
                                                                                    </div>
                                                                                )}

                                                                                {(fu.required_items || []).length > 0 && (
                                                                                    <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100/60">
                                                                                        <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">Required Items</h4>
                                                                                        <ul className="space-y-1.5">
                                                                                            {fu.required_items.map((item, i) => (
                                                                                                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                                                                                    <ChevronRight className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                                                                                                    {item}
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Middle: Status & Update Controls */}
                                                                            <div className="md:col-span-4 space-y-4">
                                                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                                                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Update Progress</h4>
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                                                            <Button
                                                                                                key={k}
                                                                                                variant={fu.status === k ? 'default' : 'outline'}
                                                                                                size="sm"
                                                                                                className={cn(
                                                                                                    "h-8 text-xs font-medium",
                                                                                                    fu.status === k && "shadow-md scale-[1.02]"
                                                                                                )}
                                                                                                onClick={async () => {
                                                                                                    await updateFollowUp(fu.id, { status: k as FollowUpStatus });
                                                                                                    setFollowUps(prev => prev.map(f => f.id === fu.id ? { ...f, status: k as FollowUpStatus } : f));
                                                                                                    toast({ title: `Status marked as ${v.label}` });
                                                                                                }}
                                                                                            >
                                                                                                {v.label}
                                                                                            </Button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="p-4 bg-white rounded-xl border border-slate-200/60 shadow-sm">
                                                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Internal Note</h4>
                                                                                    <Textarea
                                                                                        placeholder="Add update note..."
                                                                                        value={updateNoteText}
                                                                                        onChange={e => setUpdateNoteText(e.target.value)}
                                                                                        rows={2}
                                                                                        className="text-xs mb-2 resize-none focus-visible:ring-amber-500"
                                                                                    />
                                                                                    <Button 
                                                                                        size="sm" 
                                                                                        className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600"
                                                                                        disabled={addingNote || !updateNoteText.trim()}
                                                                                        onClick={async () => {
                                                                                            // Temporarily set the item for the handler
                                                                                            // setViewItem(fu); // Not needed if we use local fu
                                                                                            handleAddNoteInline(fu);
                                                                                        }}
                                                                                    >
                                                                                        {addingNote ? 'Saving...' : 'Post Note'}
                                                                                    </Button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Right: History Timeline */}
                                                                            <div className="md:col-span-4">
                                                                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                                                    <MessageSquarePlus className="h-3 w-3" />
                                                                                    History ({(fu.update_notes || []).length})
                                                                                </h4>
                                                                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                                                    {(fu.update_notes || []).length === 0 && (
                                                                                        <p className="text-xs text-muted-foreground italic text-center py-8">No updates recorded yet.</p>
                                                                                    )}
                                                                                    {[...(fu.update_notes || [])].reverse().map((note, i) => (
                                                                                        <div key={i} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/40 relative overflow-hidden">
                                                                                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                                                                                            <p className="text-xs font-medium text-slate-800 line-clamp-3 hover:line-clamp-none transition-all">{note.text}</p>
                                                                                            <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                                                                                                <span className="font-semibold text-slate-500">{getUserName(note.noted_by || null)}</span>
                                                                                                <span>{note.noted_at ? new Date(note.noted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
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

            </div>
        </Layout>
    );
}
