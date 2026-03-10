import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
    IndianRupee,
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    Plus,
    Search,
    Trash2,
    FileText,
    User,
    Building2,
} from 'lucide-react';
import {
    getAllCashFlow,
    getCashFlowDashboard,
    createCashFlow,
    deleteCashFlow,
    getAllClients,
    getAllInvoices,
    getAllProfiles,
} from '@/db/api';
import type { CashFlow, CashFlowDashboardStats, Client, Invoice, Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';

export default function CashFlowPage() {
    const [transactions, setTransactions] = useState<CashFlow[]>([]);
    const [stats, setStats] = useState<CashFlowDashboardStats>({ total_inflow: 0, total_outflow: 0, net_cash: 0 });
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'inflow' | 'outflow'>('all');

    // Filters
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { profile } = useAuth();
    const { toast } = useToast();

    const [formData, setFormData] = useState<Partial<CashFlow>>({
        type: 'inflow',
        category: '',
        amount: 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_mode: 'UPI',
        client_id: '',
        invoice_id: '',
        salary_id: '',
        paid_to: '',
        received_by: '',
        approved_by: '',
        notes: ''
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [data, dashboardStats, allClients, allInvoices, allProfiles] = await Promise.all([
                getAllCashFlow({
                    type: activeTab === 'all' ? undefined : activeTab,
                    startDate,
                    endDate
                }),
                getCashFlowDashboard(),
                getAllClients(),
                getAllInvoices(),
                getAllProfiles()
            ]);
            setTransactions(data);
            setStats(dashboardStats);
            setClients(allClients);
            setInvoices(allInvoices);
            setEmployees(allProfiles.filter((p: Profile) => ['admin', 'hr', 'employee', 'bde'].includes(p.role)));
        } catch {
            toast({ title: 'Error', description: 'Failed to load transaction data', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab, startDate, endDate]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createCashFlow({
                ...formData,
                created_by: profile?.id
            });
            toast({ title: 'Success', description: 'Transaction recorded successfully' });
            setDialogOpen(false);
            loadData();
        } catch {
            toast({ title: 'Error', description: 'Failed to save transaction', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await deleteCashFlow(id);
            toast({ title: 'Deleted', description: 'Record removed' });
            loadData();
        } catch {
            toast({ title: 'Error', description: 'Failed to delete' });
        }
    };

    const filteredTransactions = transactions.filter(t => {
        const clientName = (typeof t.client_id === 'object' ? t.client_id?.company_name : '')?.toLowerCase() || '';
        const category = t.category.toLowerCase();
        const paidTo = (t.paid_to || '').toLowerCase();
        const searchLower = search.toLowerCase();
        return clientName.includes(searchLower) || category.includes(searchLower) || paidTo.includes(searchLower);
    });

    return (
        <AdminLayout>
            <div className="space-y-6 pb-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <Wallet className="h-8 w-8 text-primary" />
                            Cash Flow Ledger
                        </h1>
                        <p className="text-muted-foreground">Monitor company inflows and outflows</p>
                    </div>
                    <Button onClick={() => setDialogOpen(true)} className="gap-2 shadow-lg h-11 px-6 bg-primary hover:bg-primary/90">
                        <Plus className="h-5 w-5" /> Add Transaction
                    </Button>
                </div>

                {/* Dashboard Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <ArrowUpCircle className="h-12 w-12 text-emerald-600" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Inflow</p>
                            <h3 className="text-3xl font-black text-emerald-900">₹ {stats.total_inflow.toLocaleString('en-IN')}</h3>
                            <div className="mt-2 flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                <span>Money Received</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <ArrowDownCircle className="h-12 w-12 text-rose-600" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-bold text-rose-600 uppercase tracking-widest mb-1">Total Outflow</p>
                            <h3 className="text-3xl font-black text-rose-900">₹ {stats.total_outflow.toLocaleString('en-IN')}</h3>
                            <div className="mt-2 flex items-center gap-1 text-rose-600 text-xs font-bold">
                                <span>Money Paid Out</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl overflow-hidden relative group text-white">
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
                            <Wallet className="h-12 w-12 text-white" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-sm font-bold text-white/60 uppercase tracking-widest mb-1">Net Cash Balance</p>
                            <h3 className="text-3xl font-black">₹ {stats.net_cash.toLocaleString('en-IN')}</h3>
                            <div className="mt-2 flex items-center gap-1 text-white/40 text-xs font-bold uppercase">
                                <span>Company Liquidity</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-none shadow-xl bg-white overflow-hidden">
                    <Tabs defaultValue="all" className="w-full" onValueChange={(v: any) => setActiveTab(v)}>
                        <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b">
                            <TabsList className="bg-slate-100 p-1">
                                <TabsTrigger value="all" className="font-bold px-4">All History</TabsTrigger>
                                <TabsTrigger value="inflow" className="font-bold px-4 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Cash Inflow</TabsTrigger>
                                <TabsTrigger value="outflow" className="font-bold px-4 data-[state=active]:bg-rose-500 data-[state=active]:text-white">Cash Outflow</TabsTrigger>
                            </TabsList>

                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:flex-none">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search records..."
                                        className="pl-9 w-full md:w-64 h-10"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        className="h-10 text-xs"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                    <span className="text-muted-foreground">to</span>
                                    <Input
                                        type="date"
                                        className="h-10 text-xs"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <TabsContent value="all" className="m-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-bold">Transaction Date</TableHead>
                                            <TableHead className="font-bold">Details</TableHead>
                                            <TableHead className="font-bold">Category</TableHead>
                                            <TableHead className="font-bold">Payment Mode</TableHead>
                                            <TableHead className="font-bold text-right">Amount</TableHead>
                                            <TableHead className="font-bold text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-20 italic">Loading ledger...</TableCell></TableRow>
                                        ) : filteredTransactions.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-20 italic text-muted-foreground">No transactions found for the selected filters.</TableCell></TableRow>
                                        ) : filteredTransactions.map((t) => (
                                            <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${t.type === 'inflow' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                            {t.type === 'inflow' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                                                        </div>
                                                        <span className="font-bold">{format(new Date(t.date), 'dd MMM yyyy')}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {t.type === 'inflow' ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                                                <span className="font-bold text-slate-800">{typeof t.client_id === 'object' ? t.client_id?.company_name : 'Direct Client'}</span>
                                                            </div>
                                                            {t.invoice_id && (
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="h-3 w-3 text-primary/60" />
                                                                    <span className="text-[10px] uppercase font-black text-primary/60 tracking-wider">INV: {typeof t.invoice_id === 'object' ? t.invoice_id?.invoice_number : '-'}</span>
                                                                </div>
                                                            )}
                                                            {t.received_by && (
                                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold italic">
                                                                    <span>Recv by: {typeof t.received_by === 'object' ? t.received_by.full_name : '-'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <User className="h-3 w-3 text-muted-foreground" />
                                                                <span className="font-bold text-slate-800">{t.paid_to || 'Company Expense'}</span>
                                                            </div>
                                                            {t.approved_by && (
                                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold italic">
                                                                    <span>Auth by: {typeof t.approved_by === 'object' ? t.approved_by.full_name : '-'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-slate-50 font-bold uppercase tracking-tighter text-[10px]">
                                                        {t.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{t.payment_mode}</span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`text-lg font-black ${t.type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {t.type === 'inflow' ? '+' : '-'} ₹{t.amount.toLocaleString('en-IN')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="hover:text-rose-600" onClick={() => handleDelete(t.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                        {/* More Contents for Specific tabs would follow if needed, but handled by list filtering above */}
                    </Tabs>
                </Card>

                {/* Create Transaction Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className={`p-6 ${formData.type === 'inflow' ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                            <DialogTitle className="text-2xl font-black">Record New Transaction</DialogTitle>
                            <DialogDescription className="text-white/80 font-medium">
                                Fill in the details to update the company ledger.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                                <Button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'inflow' })}
                                    className={`flex-1 font-bold h-10 ${formData.type === 'inflow' ? 'bg-emerald-600 text-white shadow-md' : 'bg-transparent text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Money Coming In
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'outflow' })}
                                    className={`flex-1 font-bold h-10 ${formData.type === 'outflow' ? 'bg-rose-600 text-white shadow-md' : 'bg-transparent text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Money Going Out
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Transaction Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="h-11 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount (₹)</Label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="h-11 pl-9 border-slate-200 font-bold"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={v => setFormData({ ...formData, category: v })}
                                    >
                                        <SelectTrigger className="h-11 border-slate-200">
                                            <SelectValue placeholder="Select purpose" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {formData.type === 'inflow' ? (
                                                <>
                                                    <SelectItem value="Project Payment">Project Payment</SelectItem>
                                                    <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                                                    <SelectItem value="Other Income">Other Income</SelectItem>
                                                </>
                                            ) : (
                                                <>
                                                    <SelectItem value="Salary">Salary Payout</SelectItem>
                                                    <SelectItem value="Office Rent">Office Rent</SelectItem>
                                                    <SelectItem value="Marketing">Marketing Expense</SelectItem>
                                                    <SelectItem value="Utility Bill">Utility Bill (Internet/Elec)</SelectItem>
                                                    <SelectItem value="Hardware/Software">Hardware/Software</SelectItem>
                                                    <SelectItem value="Misc">Misc Expense</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Mode</Label>
                                    <Select
                                        value={formData.payment_mode}
                                        onValueChange={(v: any) => setFormData({ ...formData, payment_mode: v })}
                                    >
                                        <SelectTrigger className="h-11 border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="UPI">UPI / PhonePe / GPay</SelectItem>
                                            <SelectItem value="Bank">Bank Transfer (NEFT/RTGS)</SelectItem>
                                            <SelectItem value="Cash">Physical Cash</SelectItem>
                                            <SelectItem value="Other">Other Mode</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {formData.type === 'inflow' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">From Client</Label>
                                        <Select
                                            value={formData.client_id as string}
                                            onValueChange={v => setFormData({ ...formData, client_id: v })}
                                        >
                                            <SelectTrigger className="h-11 border-slate-200">
                                                <SelectValue placeholder="Internal / Direct" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Specific Client</SelectItem>
                                                {clients.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Linked Invoice</Label>
                                        <Select
                                            value={formData.invoice_id as string}
                                            onValueChange={v => setFormData({ ...formData, invoice_id: v })}
                                        >
                                            <SelectTrigger className="h-11 border-slate-200">
                                                <SelectValue placeholder="Optional" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Linked Invoice</SelectItem>
                                                {invoices.filter(inv => !formData.client_id || (typeof inv.client_id === 'object' ? (inv.client_id as any)._id : inv.client_id) === formData.client_id).map(i => (
                                                    <SelectItem key={i.id} value={i.id}>#{i.invoice_number} (₹{i.amount})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Received By (Employee)</Label>
                                        <Select
                                            value={formData.received_by as string}
                                            onValueChange={v => setFormData({ ...formData, received_by: v })}
                                        >
                                            <SelectTrigger className="h-11 border-slate-200">
                                                <SelectValue placeholder="Select staff..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map(e => (
                                                    <SelectItem key={e.id} value={e.id}>{e.full_name || e.username}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Paid To</Label>
                                        <Input
                                            placeholder="Name / Vendor"
                                            className="h-11 border-slate-200"
                                            value={formData.paid_to}
                                            onChange={e => setFormData({ ...formData, paid_to: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved By</Label>
                                        <Select
                                            value={formData.approved_by as string}
                                            onValueChange={v => setFormData({ ...formData, approved_by: v })}
                                        >
                                            <SelectTrigger className="h-11 border-slate-200">
                                                <SelectValue placeholder="Authorized Staff" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.filter(e => e.role === 'admin' || e.role === 'hr').map(e => (
                                                    <SelectItem key={e.id} value={e.id}>{e.full_name || e.username}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Remarks / Notes</Label>
                                <Input
                                    placeholder="Add any additional details here..."
                                    className="h-11 border-slate-200"
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="font-bold">Cancel</Button>
                                <Button type="submit" className={`h-11 px-8 font-black ${formData.type === 'inflow' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} text-white`}>
                                    Confirm & Save Record
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
