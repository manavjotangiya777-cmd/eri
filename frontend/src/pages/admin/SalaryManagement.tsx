import { useEffect, useState } from 'react';
import Layout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { IndianRupee, Download, Pencil, Trash2, Plus, Search, History, CheckCircle2 } from 'lucide-react';
import { getAllProfiles, getAllSalaries, createSalary, updateSalary, deleteSalary } from '@/db/api';
import type { Profile, Salary } from '@/types/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { API_URL } from '@/config';

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function SalaryManagement({ Layout: UserLayout = Layout }: { Layout?: any }) {
    const Layout = UserLayout;
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
    const [formData, setFormData] = useState({
        user_id: '',
        basic_salary: 0,
        hra: 0,
        allowances: 0,
        bonus: 0,
        incentives: 0,
        total_working_days: 26,
        leave_days: 0,
        late_entries: 0,
        pf: 0,
        other_deductions: 0,
        status: 'pending' as 'pending' | 'paid' | 'cancelled',
        payment_method: 'bank_transfer' as any,
        notes: ''
    });

    const { toast } = useToast();

    const loadData = async () => {
        setLoading(true);
        try {
            const [profiles, salData] = await Promise.all([
                getAllProfiles(),
                getAllSalaries({ month: selectedMonth, year: selectedYear })
            ]);
            setEmployees(profiles.filter(p => ['employee', 'bde', 'hr'].includes(p.role)));
            setSalaries(salData);
        } catch {
            toast({ title: 'Error', description: 'Failed to load salary data', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedMonth, selectedYear]);

    const handleCreateNew = () => {
        setEditingSalary(null);
        setFormData({
            user_id: '',
            basic_salary: 0,
            hra: 0,
            allowances: 0,
            bonus: 0,
            incentives: 0,
            total_working_days: 26,
            leave_days: 0,
            late_entries: 0,
            pf: 0,
            other_deductions: 0,
            status: 'pending',
            payment_method: 'bank_transfer',
            notes: ''
        });
        setDialogOpen(true);
    };

    const handleEdit = (salary: any) => {
        setEditingSalary(salary);
        setFormData({
            user_id: salary.user_id,
            basic_salary: salary.basic_salary,
            hra: salary.hra || 0,
            allowances: salary.allowances || 0,
            bonus: salary.bonus || 0,
            incentives: salary.incentives || 0,
            total_working_days: salary.total_working_days || 26,
            leave_days: salary.leave_days || 0,
            late_entries: salary.late_entries || 0,
            pf: salary.pf || 0,
            other_deductions: salary.other_deductions || 0,
            status: salary.status,
            payment_method: salary.payment_method,
            notes: salary.notes || ''
        });
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.user_id) return;

        try {
            const payload = {
                ...formData,
                month: selectedMonth,
                year: selectedYear,
                payment_date: formData.status === 'paid' ? new Date().toISOString() : null
            };

            if (editingSalary) {
                await updateSalary(editingSalary.id, payload);
                toast({ title: 'Success', description: 'Salary recalculated and updated' });
            } else {
                await createSalary(payload);
                toast({ title: 'Success', description: 'Salary generated successfully' });
            }
            setDialogOpen(false);
            loadData();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.message || 'Failed to generate salary. Check for duplicates.',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await deleteSalary(id);
            loadData();
        } catch {
            toast({ title: 'Error', description: 'Failed to delete' });
        }
    };

    const handleDownload = (id: string) => {
        window.open(`${API_URL} /salaries/download / ${id} `, '_blank');
    };

    const filteredSalaries = salaries.filter(s => {
        const emp = s.user || employees.find(e => e.id === (typeof s.user_id === 'object' ? (s.user_id as any)._id : s.user_id));
        const name = emp?.full_name?.toLowerCase() || emp?.username?.toLowerCase() || '';
        return name.includes(search.toLowerCase());
    });

    const calculateNetPreview = () => {
        const perDay = formData.basic_salary / (formData.total_working_days || 26);
        const leaveDed = formData.leave_days * perDay;
        const latePenalty = Math.floor(formData.late_entries / 3) * 0.5 * perDay;

        const gross = formData.basic_salary + formData.hra + formData.allowances + formData.bonus + formData.incentives;
        const ded = leaveDed + latePenalty + formData.pf + formData.other_deductions;
        return Math.round(gross - ded);
    };

    return (
        <Layout>
            <div className="space-y-6 pb-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <IndianRupee className="h-8 w-8 text-primary" />
                            Payroll & Salary Masters
                        </h1>
                        <p className="text-muted-foreground">Automated salary calculation & payslip engine</p>
                    </div>
                    <Button onClick={handleCreateNew} className="gap-2 shadow-lg bg-primary hover:bg-primary/90">
                        <Plus className="h-4 w-4" /> Generate Salary
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="p-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Month</p>
                            <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
                                <SelectTrigger className="mt-1 border-none bg-transparent h-auto p-0 text-xl font-black text-slate-800 shadow-none ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((m, i) => (
                                        <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="p-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Year</p>
                            <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
                                <SelectTrigger className="mt-1 border-none bg-transparent h-auto p-0 text-xl font-black text-slate-800 shadow-none ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {YEARS.map(y => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-50 border-emerald-200 col-span-1 md:col-span-2 shadow-sm">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Monthly Disbursement ({MONTHS[selectedMonth - 1]})</p>
                                <p className="text-2xl font-black text-emerald-800">
                                    ₹ {salaries.reduce((sum, s) => sum + s.net_salary, 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div className="bg-emerald-100 p-3 rounded-full"><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-lg border-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                        <div>
                            <CardTitle className="font-black">Salary Ledger</CardTitle>
                            <CardDescription>Processed records for {MONTHS[selectedMonth - 1]} {selectedYear}</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-bold">Employee</TableHead>
                                    <TableHead className="font-bold text-right">Gross</TableHead>
                                    <TableHead className="font-bold text-right">Deductions</TableHead>
                                    <TableHead className="font-bold text-right">Net Payable</TableHead>
                                    <TableHead className="text-center font-bold">Status</TableHead>
                                    <TableHead className="text-right font-bold pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-20 italic">Processing ledger...</TableCell></TableRow>
                                ) : filteredSalaries.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-20 italic text-muted-foreground">No records found. Click 'Generate Salary' to start.</TableCell></TableRow>
                                ) : filteredSalaries.map(sal => {
                                    const emp = sal.user || employees.find(e => e.id === (typeof sal.user_id === 'object' ? (sal.user_id as any)._id : sal.user_id));
                                    return (
                                        <TableRow key={sal.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-semibold py-4">
                                                <div className="text-slate-900">{emp?.full_name || emp?.username || 'Unknown'}</div>
                                                <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-tighter">
                                                    {emp?.role} {emp?.department ? `• ${emp.department} ` : ''}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">₹{sal.gross_salary?.toLocaleString('en-IN') || 0}</TableCell>
                                            <TableCell className="text-right text-rose-600 font-medium">- ₹{sal.total_deductions?.toLocaleString('en-IN') || 0}</TableCell>
                                            <TableCell className="text-right">
                                                <span className="bg-slate-900 text-white px-3 py-1 rounded-md text-xs font-black">
                                                    ₹{sal.net_salary?.toLocaleString('en-IN') || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={sal.status === 'paid' ? 'default' : sal.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize px-3">
                                                    {sal.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDownload(sal.id)} title="Download Payslip">
                                                        <Download className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(sal)} title="Edit Record">
                                                        <Pencil className="h-4 w-4 text-slate-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sal.id)} title="Remove">
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Automation Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className="p-6 bg-slate-900 text-white">
                            <DialogTitle className="text-2xl font-black">{editingSalary ? 'Recalculate Salary' : 'Generate Monthly Salary'}</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Enter parameters for **{MONTHS[selectedMonth - 1]} {selectedYear}**. All logic is automated.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="flex flex-col max-h-[90vh]">
                            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Select Employee</Label>
                                        <Select
                                            value={formData.user_id}
                                            onValueChange={v => {
                                                const emp = employees.find(e => e.id === v);
                                                setFormData({ ...formData, user_id: v, basic_salary: emp?.salary_per_month || 0 });
                                            }}
                                            disabled={!!editingSalary}
                                        >
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Identify employee" /></SelectTrigger>
                                            <SelectContent>
                                                {employees.map(e => (
                                                    <SelectItem key={e.id} value={e.id}>{e.full_name || e.username} ({e.role})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Basic Monthly Salary (₹)</Label>
                                        <Input
                                            type="number"
                                            className="h-11 font-bold"
                                            value={formData.basic_salary}
                                            onChange={e => setFormData({ ...formData, basic_salary: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                        <History className="h-3.5 w-3.5" /> 1. Attendance & Rule Logic
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase">Working Days</Label>
                                            <Input type="number" value={formData.total_working_days} onChange={e => setFormData({ ...formData, total_working_days: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase">Leave Days</Label>
                                            <Input type="number" value={formData.leave_days} onChange={e => setFormData({ ...formData, leave_days: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase">Late Entries</Label>
                                            <Input type="number" value={formData.late_entries} onChange={e => setFormData({ ...formData, late_entries: Number(e.target.value) })} />
                                            <p className="text-[9px] text-muted-foreground italic">3 lates = 0.5 day ded.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600">2. Extra Earnings</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-medium">HRA</Label>
                                                <Input type="number" value={formData.hra} onChange={e => setFormData({ ...formData, hra: Number(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-medium">Allowances</Label>
                                                <Input type="number" value={formData.allowances} onChange={e => setFormData({ ...formData, allowances: Number(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-medium">Bonus</Label>
                                                <Input type="number" value={formData.bonus} onChange={e => setFormData({ ...formData, bonus: Number(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-medium">Incentives</Label>
                                                <Input type="number" value={formData.incentives} onChange={e => setFormData({ ...formData, incentives: Number(e.target.value) })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-rose-600">3. Fixed Deductions</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-medium">PF</Label>
                                                <Input type="number" value={formData.pf} onChange={e => setFormData({ ...formData, pf: Number(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-medium">Other Ded.</Label>
                                                <Input type="number" value={formData.other_deductions} onChange={e => setFormData({ ...formData, other_deductions: Number(e.target.value) })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Payment Method</Label>
                                        <Select value={formData.payment_method} onValueChange={v => setFormData({ ...formData, payment_method: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="cheque">Cheque</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Status</Label>
                                        <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="paid">Paid</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t flex justify-between items-center bg-slate-900 text-white">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Estimated Net Payable</p>
                                    <div className="text-3xl font-black text-white italic">
                                        ₹{calculateNetPreview().toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setDialogOpen(false)}
                                        className="font-bold text-slate-400 hover:text-white hover:bg-slate-800"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="px-8 font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all"
                                    >
                                        {editingSalary ? 'Update Salary' : 'Generate Slip'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
