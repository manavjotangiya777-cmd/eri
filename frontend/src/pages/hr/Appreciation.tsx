import { useEffect, useState } from 'react';
import HRLayout from '@/components/layouts/HRLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Star, Target, Sparkles, Heart, Search, PlusCircle, Trash2, Award } from 'lucide-react';
import { getAppreciations, createAppreciation, deleteAppreciation, getAllProfiles } from '@/db/api';
import { Badge } from '@/components/ui/badge';

const BADGES = [
    { value: 'Star Performer', label: 'Star Performer', icon: Star, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
    { value: 'Team Player', label: 'Team Player', icon: Heart, color: 'text-red-500 bg-red-50 border-red-200' },
    { value: 'Problem Solver', label: 'Problem Solver', icon: Target, color: 'text-blue-500 bg-blue-50 border-blue-200' },
    { value: 'Innovator', label: 'Innovator', icon: Sparkles, color: 'text-purple-500 bg-purple-50 border-purple-200' },
    { value: 'Customer Champion', label: 'Customer Champion', icon: Award, color: 'text-green-500 bg-green-50 border-green-200' },
    { value: 'Going Extra Mile', label: 'Going Extra Mile', icon: Trophy, color: 'text-orange-500 bg-orange-50 border-orange-200' },
];

export default function AppreciationPage({ Layout = HRLayout }: { Layout?: any }) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [appreciations, setAppreciations] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        employee_id: '',
        title: '',
        message: '',
        badge: 'Star Performer'
    });

    const loadData = async () => {
        try {
            const [appData, empData] = await Promise.all([
                getAppreciations(),
                getAllProfiles()
            ]);
            setAppreciations(appData);
            setEmployees(empData.filter((e: any) => e.role !== 'admin' && e.role !== 'client' && e.is_active));
        } catch (err: any) {
            toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async () => {
        if (!formData.employee_id || !formData.title || !formData.message) {
            toast({ title: 'Validation Error', description: 'Please fill all fields', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            await createAppreciation({
                ...formData,
                given_by: profile?.id || ''
            });
            toast({ title: 'Success', description: 'Appreciation sent successfully!' });
            setIsDialogOpen(false);
            setFormData({ employee_id: '', title: '', message: '', badge: 'Star Performer' });
            loadData();
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.error || 'Failed to submit', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this appreciation?')) return;
        try {
            await deleteAppreciation(id);
            toast({ title: 'Deleted', description: 'Appreciation removed' });
            loadData();
        } catch (err: any) {
            toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
        }
    };

    const filtered = appreciations.filter(a =>
        (a.employee_id?.full_name || a.employee_id?.username || '').toLowerCase().includes(search.toLowerCase()) ||
        a.title.toLowerCase().includes(search.toLowerCase())
    );

    const getBadgeInfo = (badgeName: string) => {
        return BADGES.find(b => b.value === badgeName) || BADGES[0];
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Trophy className="h-8 w-8 text-yellow-500" />
                            Employee Appraisals / Wall of Fame
                        </h1>
                        <p className="text-muted-foreground">Recognize and appreciate exceptional performance.</p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shadow-md">
                        <PlusCircle className="h-4 w-4" /> Appreciate Someone
                    </Button>
                </div>

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search appreciations..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {loading ? (
                    <div className="text-center py-20 text-muted-foreground animate-pulse">Loading appreciations...</div>
                ) : filtered.length === 0 ? (
                    <Card className="border-dashed shadow-none bg-muted/20">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                            <Trophy className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
                            <h3 className="text-xl font-bold mb-2">No Appreciations Yet</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Start recognizing your team members' hard work by giving them an appreciation badge!
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(app => {
                            const badgeInfo = getBadgeInfo(app.badge);
                            const BadgeIcon = badgeInfo.icon;
                            return (
                                <Card key={app._id} className="relative overflow-hidden group shadow-md hover:shadow-xl transition-all duration-300 border-none ring-1 ring-slate-100">
                                    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ` + badgeInfo.color.split(' ')[0]}>
                                        <BadgeIcon className="h-32 w-32 -mt-10 -mr-10 transform rotate-12" />
                                    </div>
                                    <CardHeader className="pb-2 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${badgeInfo.color}`}>
                                                    <BadgeIcon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg leading-tight">{app.employee_id?.full_name || app.employee_id?.username}</CardTitle>
                                                    <CardDescription className="text-xs font-bold uppercase tracking-wider">{app.employee_id?.department || 'Employee'}</CardDescription>
                                                </div>
                                            </div>
                                            {(profile?.role === 'admin' || profile?.id === app.given_by?._id) && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(app._id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10 space-y-3">
                                        <div>
                                            <Badge variant="outline" className={`border-none shadow-sm ${badgeInfo.color}`}>{app.badge}</Badge>
                                        </div>
                                        <h4 className="font-bold text-foreground text-base">{app.title}</h4>
                                        <p className="text-sm text-muted-foreground italic leading-relaxed">"{app.message}"</p>

                                        <div className="pt-4 flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-wider border-t border-dashed">
                                            <span>By: {app.given_by?.full_name || app.given_by?.username}</span>
                                            <span>{new Date(app.created_at).toLocaleDateString('en-GB')}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                <Trophy className="h-6 w-6 text-yellow-500" />
                                Give Appreciation
                            </DialogTitle>
                            <DialogDescription>
                                Praise an employee for their exceptional work or effort.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold">Select Employee</label>
                                <Select value={formData.employee_id} onValueChange={(val) => setFormData({ ...formData, employee_id: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose someone to appreciate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp._id || emp.id} value={emp._id || emp.id}>
                                                {emp.full_name || emp.username} - {emp.department}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold">Select Badge</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {BADGES.map(b => (
                                        <div
                                            key={b.value}
                                            className={`cursor-pointer border rounded-lg p-2 flex items-center gap-2 text-sm transition-all ${formData.badge === b.value ? 'ring-2 ring-primary border-transparent bg-primary/5 font-bold shadow-sm' : 'hover:bg-muted'
                                                }`}
                                            onClick={() => setFormData({ ...formData, badge: b.value })}
                                        >
                                            <b.icon className={`h-4 w-4 ${b.color.split(' ')[0]}`} />
                                            <span className="truncate">{b.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold">Title</label>
                                <Input
                                    placeholder="e.g. Outstanding Project Delivery"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold">Personalized Message</label>
                                <Textarea
                                    placeholder="Write a few words of praise..."
                                    className="resize-none h-24"
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                {submitting ? 'Sending...' : 'Give Appreciation'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
