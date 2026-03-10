import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IndianRupee, Download, TrendingUp, History } from 'lucide-react';
import { getAllSalaries } from '@/db/api';
import type { Salary } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import { API_URL } from '@/config';

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function MySalary() {
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useAuth();
    const { toast } = useToast();

    const loadData = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const data = await getAllSalaries({ user_id: profile.id, role: 'employee' });
            setSalaries(data);
        } catch {
            toast({ title: 'Error', description: 'Failed to load your salary history', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.id]);

    const handleDownload = (id: string) => {
        window.open(`${API_URL}/salaries/download/${id}`, '_blank');
    };

    const totalEarnings = salaries.reduce((sum, s) => sum + (s.net_salary || 0), 0);

    return (
        <EmployeeLayout>
            <div className="space-y-6 pb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <IndianRupee className="h-8 w-8 text-primary" />
                        My Salary & Payslips
                    </h1>
                    <p className="text-muted-foreground">View and download your monthly salary slips</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-emerald-100 p-2 rounded-lg"><TrendingUp className="h-6 w-6 text-emerald-600" /></div>
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Earnings</p>
                                <p className="text-2xl font-black text-emerald-800">₹ {totalEarnings.toLocaleString('en-IN')}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-slate-100 p-2 rounded-lg"><History className="h-6 w-6 text-slate-600" /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Payslips</p>
                                <p className="text-2xl font-black text-slate-800">{salaries.length}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-blue-100 p-2 rounded-lg"><Download className="h-6 w-6 text-blue-600" /></div>
                            <div>
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Last Payout</p>
                                <p className="text-2xl font-black text-blue-800">
                                    {salaries[0] ? `₹ ${salaries[0].net_salary.toLocaleString('en-IN')}` : 'No records'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Payslip History</CardTitle>
                        <CardDescription>Your monthly salary details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-10 italic">Loading your history...</div>
                        ) : salaries.length === 0 ? (
                            <div className="text-center py-10 italic text-muted-foreground border-2 border-dashed rounded-lg">No salary records found yet. Contact HR if this is an error.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-900 hover:bg-slate-900">
                                        <TableHead className="text-white font-bold">Month & Year</TableHead>
                                        <TableHead className="text-white font-bold">Basic + HRA</TableHead>
                                        <TableHead className="text-white font-bold">Extra Earnings</TableHead>
                                        <TableHead className="text-white font-bold">Total Ded.</TableHead>
                                        <TableHead className="text-white font-bold">Net Payable</TableHead>
                                        <TableHead className="text-white font-bold">Status</TableHead>
                                        <TableHead className="text-right text-white font-bold">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {salaries.map(sal => {
                                        const extraEarnings = (sal.allowances || 0) + (sal.bonus || 0) + (sal.incentives || 0);
                                        return (
                                            <TableRow key={sal.id} className="hover:bg-slate-50 transition-colors">
                                                <TableCell className="font-bold">
                                                    {MONTHS[sal.month]} {sal.year}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">₹{(sal.basic_salary + (sal.hra || 0)).toLocaleString('en-IN')}</div>
                                                    <div className="text-[10px] text-muted-foreground italic">(Basic: ₹{sal.basic_salary.toLocaleString('en-IN')})</div>
                                                </TableCell>
                                                <TableCell className="text-emerald-600 font-medium">+₹{extraEarnings.toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-rose-600 font-medium">-₹{(sal.total_deductions || 0).toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="font-black text-slate-900 text-lg">₹{(sal.net_salary || 0).toLocaleString('en-IN')}</TableCell>
                                                <TableCell>
                                                    <Badge variant={sal.status === 'paid' ? 'default' : sal.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize px-3 py-1">
                                                        {sal.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2 font-bold border-slate-300 hover:bg-slate-900 hover:text-white transition-all"
                                                        onClick={() => handleDownload(sal.id)}
                                                    >
                                                        <Download className="h-4 w-4" /> Download PDF
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </EmployeeLayout>
    );
}
