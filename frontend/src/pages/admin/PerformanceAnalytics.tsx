import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { calculatePerformance, getPerformanceRecords, updatePerformanceRecord } from '@/db/api';
import { TrendingUp, Star, Download, Calculator, BarChart3, Medal, AlertCircle } from 'lucide-react';

export default function PerformanceAnalytics() {
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [records, setRecords] = useState<any[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().substring(0, 7)
    );

    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [editRating, setEditRating] = useState<string>('0');
    const [employeeFilter, setEmployeeFilter] = useState<string>('');

    const { toast } = useToast();

    const loadData = async (month: string) => {
        setLoading(true);
        try {
            const data = await getPerformanceRecords(month);
            setRecords(data.sort((a, b) => b.final_score - a.final_score));
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to fetch performance data', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(selectedMonth);
    }, [selectedMonth]);

    const handleCalculate = async () => {
        setCalculating(true);
        try {
            await calculatePerformance(selectedMonth);
            toast({ title: 'Success', description: `Performance calculated for ${selectedMonth}` });
            await loadData(selectedMonth);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to calculate', variant: 'destructive' });
        } finally {
            setCalculating(false);
        }
    };

    const handleSaveRating = async () => {
        if (!selectedRecord) return;
        try {
            await updatePerformanceRecord(selectedRecord._id, { admin_rating: Number(editRating) });
            toast({ title: 'Success', description: 'Rating updated successfully' });
            setDetailDialogOpen(false);
            loadData(selectedMonth);
        } catch (err: any) {
            toast({ title: 'Error', description: 'Failed to update rating', variant: 'destructive' });
        }
    };

    const handleExportPDF = () => {
        toast({ title: 'Info', description: 'PDF Export relies on browser print. Press Ctrl+P or Cmd+P to print this view.' });
        window.print();
    };

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'Excellent': return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30';
            case 'Good': return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
            case 'Average': return 'bg-yellow-400/15 text-yellow-700 dark:text-yellow-400 border-yellow-400/30';
            default: return 'bg-red-500/15 text-red-600 border-red-500/30';
        }
    };

    const filteredRecords = records.filter(r =>
        (r.employee_id.full_name || r.employee_id.username || '').toLowerCase().includes(employeeFilter.toLowerCase())
    );

    const topPerformers = filteredRecords.filter(r => r.final_score >= 85).slice(0, 3);
    const lowPerformers = filteredRecords.filter(r => r.final_score < 70 && r.final_score > 0);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <BarChart3 className="h-8 w-8 text-primary" />
                            Performance Analytics
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Monthly auto-generated employee scorecards and insights.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex-1 sm:flex-none">
                            <Input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full sm:w-auto font-bold text-primary border-primary/50"
                            />
                        </div>
                        <Button onClick={handleCalculate} disabled={calculating || loading} className="gap-2 shrink-0 shadow-md">
                            <Calculator className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Calculate Now</span>
                        </Button>
                        <Button variant="outline" onClick={handleExportPDF} className="shrink-0">
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Filter by employee name..."
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            className="bg-background shadow-sm"
                        />
                    </div>
                </div>

                {records.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Evaluated Employees</p>
                                        <p className="text-3xl font-bold">{records.length}</p>
                                    </div>
                                    <div className="bg-primary/20 p-3 rounded-xl"><BarChart3 className="h-5 w-5 text-primary" /></div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Avg Company Score</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {Math.round(records.reduce((acc, r) => acc + r.final_score, 0) / records.length)}%
                                        </p>
                                    </div>
                                    <div className="bg-green-500/20 p-3 rounded-xl"><TrendingUp className="h-5 w-5 text-green-600" /></div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-yellow-500/5 to-transparent border-yellow-500/20 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Top Performers</p>
                                        <p className="text-3xl font-bold text-yellow-600">{topPerformers.length}</p>
                                    </div>
                                    <div className="bg-yellow-500/20 p-3 rounded-xl"><Medal className="h-5 w-5 text-yellow-600" /></div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-red-500/5 to-transparent border-red-500/20 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Needs Improvement</p>
                                        <p className="text-3xl font-bold text-red-600">{lowPerformers.length}</p>
                                    </div>
                                    <div className="bg-red-500/20 p-3 rounded-xl"><AlertCircle className="h-5 w-5 text-red-600" /></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Card className="shadow-lg border-primary/10 overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b pb-4 flex flex-row items-center justify-between">
                        <CardTitle>Scoreboard ({selectedMonth})</CardTitle>
                        {employeeFilter && (
                            <Badge variant="secondary" className="font-mono">
                                Filtered: {filteredRecords.length} results
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="text-center py-10">Loading records...</div>
                        ) : records.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed m-4 rounded-xl">
                                <p>No performance data highly calculated for this month yet.</p>
                                <Button onClick={handleCalculate} variant="ghost" className="mt-2" disabled={calculating}>
                                    Calculate Now
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="font-bold text-foreground">Employee</TableHead>
                                            <TableHead>Dept / Role</TableHead>
                                            <TableHead className="text-center">Final Score</TableHead>
                                            <TableHead className="text-center">Grade</TableHead>
                                            <TableHead className="text-center">Att. (20)</TableHead>
                                            <TableHead className="text-center">Task (25)</TableHead>
                                            <TableHead className="text-center">Qual. (15)</TableHead>
                                            <TableHead className="text-center">Act. (10)</TableHead>
                                            <TableHead className="text-center">Leav. (10)</TableHead>
                                            <TableHead className="text-center">Comm. (10)</TableHead>
                                            <TableHead className="text-center">F-Up (10)</TableHead>
                                            <TableHead className="text-center">Warn</TableHead>
                                            <TableHead className="text-center">Appr</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRecords.map((r, i) => (
                                            <TableRow key={r._id} className="hover:bg-muted/50 cursor-default">
                                                <TableCell className="font-semibold flex items-center gap-2">
                                                    <span className="text-muted-foreground text-xs w-4">{i + 1}.</span>
                                                    {r.employee_id.full_name || r.employee_id.username}
                                                </TableCell>
                                                <TableCell className="text-xs uppercase tracking-wider text-muted-foreground">
                                                    {r.employee_id.department || 'N/A'}<br />
                                                    <span className="font-bold text-primary/70">{r.employee_id.role}</span>
                                                </TableCell>
                                                <TableCell className="text-center font-black text-lg">
                                                    {r.final_score}%
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={getGradeColor(r.grade)}>{r.grade}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-sm">{Math.round(r.attendance_score)}</TableCell>
                                                <TableCell className="text-center font-mono text-sm">{Math.round(r.task_completion_score)}</TableCell>
                                                <TableCell className="text-center font-mono text-sm text-primary font-bold bg-primary/5 rounded">
                                                    {Math.round(r.task_quality_score)}
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-sm">{Math.round(r.activity_engagement_score)}</TableCell>
                                                <TableCell className="text-center font-mono text-sm">{Math.round(r.leave_management_score)}</TableCell>
                                                <TableCell className="text-center font-mono text-sm">{Math.round(r.communication_score)}</TableCell>
                                                <TableCell className="text-center font-mono text-sm">{Math.round(r.followup_score || 0)}</TableCell>
                                                <TableCell className="text-center font-mono text-sm text-red-500">-{Math.round(r.warning_penalty || 0)}</TableCell>
                                                <TableCell className="text-center font-mono text-sm text-green-600">+{Math.round(r.appreciation_bonus || 0)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        setSelectedRecord(r);
                                                        setEditRating((r.admin_rating || 0).toString());
                                                        setDetailDialogOpen(true);
                                                    }}>
                                                        Review
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Breakdown Dialog */}
                <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                                <span>{selectedRecord?.employee_id.full_name}</span>
                                <Badge className={`text-lg px-4 ${selectedRecord ? getGradeColor(selectedRecord.grade) : ''}`}>
                                    {selectedRecord?.final_score}% • {selectedRecord?.grade}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription>
                                Detailed performance analytics and employee profile for {selectedMonth}
                            </DialogDescription>
                        </DialogHeader>
                        {selectedRecord && (
                            <div className="grid gap-6 mt-4 max-h-[70vh] overflow-y-auto pr-2">
                                {/* Employee Profile Header */}
                                <div className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl border border-dashed">
                                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold border-2 border-primary/20">
                                        {selectedRecord.employee_id.profile_picture ? (
                                            <img src={selectedRecord.employee_id.profile_picture} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                                        ) : (
                                            selectedRecord.employee_id.full_name?.charAt(0) || selectedRecord.employee_id.username?.charAt(0)
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold">{selectedRecord.employee_id.full_name || selectedRecord.employee_id.username}</h3>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-sm">
                                            <p className="text-muted-foreground"><span className="font-bold text-foreground/70 tracking-tight uppercase text-[10px]">Role:</span> {selectedRecord.employee_id.role}</p>
                                            <p className="text-muted-foreground"><span className="font-bold text-foreground/70 tracking-tight uppercase text-[10px]">Dept:</span> {selectedRecord.employee_id.department || 'N/A'}</p>
                                            <p className="text-muted-foreground truncate"><span className="font-bold text-foreground/70 tracking-tight uppercase text-[10px]">Email:</span> {selectedRecord.employee_id.email}</p>
                                            <p className="text-muted-foreground"><span className="font-bold text-foreground/70 tracking-tight uppercase text-[10px]">Status:</span> <span className="text-green-600 font-bold">{selectedRecord.employee_id.active_status || 'Active'}</span></p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-muted p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70 mb-1">Attendance Info</span>
                                        <span className="text-sm font-semibold">
                                            Present: {selectedRecord.metadata?.presentDays}/{selectedRecord.metadata?.totalWorkingDays}
                                        </span>
                                        <span className="text-xs text-red-500 font-bold">Lates: {selectedRecord.metadata?.lateEntries}</span>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70 mb-1">Task Info</span>
                                        <span className="text-sm font-semibold">
                                            Completed: {selectedRecord.metadata?.completedTasks}/{selectedRecord.metadata?.totalTasks}
                                        </span>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70 mb-1">Leaves Info</span>
                                        <span className="text-sm font-semibold">Total: {selectedRecord.metadata?.totalLeaves}</span>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70 mb-1">Platform Activity</span>
                                        <span className="text-sm font-semibold text-primary">Logins: {selectedRecord.metadata?.totalLogins}</span>
                                        <span className="text-sm font-semibold text-purple-600">AI: {selectedRecord.metadata?.totalAi} reqs</span>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70 mb-1">Comm. Info</span>
                                        <span className="text-sm font-semibold">Messages: {selectedRecord.metadata?.messagesCount}</span>
                                    </div>
                                    <div className="bg-muted/30 p-3 rounded-lg border border-primary/10 flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold text-primary uppercase opacity-70 mb-1">Performance</span>
                                        <span className="text-lg font-black">{selectedRecord.final_score}%</span>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70 mb-1">Follow-ups</span>
                                        <span className="text-sm font-semibold">Done: {selectedRecord.metadata?.completedFollowups}/{selectedRecord.metadata?.totalFollowups}</span>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70 mb-1">Warnings</span>
                                        <span className="text-sm font-bold text-red-600">{selectedRecord.metadata?.warningsCount || 0} Issued</span>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70 mb-1">Appreciations</span>
                                        <span className="text-sm font-bold text-green-600">{selectedRecord.metadata?.appreciationsCount || 0} Received</span>
                                    </div>
                                </div>

                                <div className="mt-4 p-4 border rounded-xl bg-primary/5">
                                    <h4 className="font-bold flex items-center gap-2 mb-4">
                                        <Star className="text-yellow-500 fill-yellow-500 h-5 w-5" />
                                        Admin Feedback & Rating
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Override Task Quality Rating (1 to 5)</Label>
                                            <Select value={editRating} onValueChange={setEditRating}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select rating" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">0 - Not Rated</SelectItem>
                                                    <SelectItem value="1">1 - Poor</SelectItem>
                                                    <SelectItem value="2">2 - Fair</SelectItem>
                                                    <SelectItem value="3">3 - Satisfactory</SelectItem>
                                                    <SelectItem value="4">4 - Very Good</SelectItem>
                                                    <SelectItem value="5">5 - Excellent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">Adjusting this immediately alters the employee's Final Score (+15% weight).</p>
                                        </div>
                                        <Button onClick={handleSaveRating} className="w-full font-bold tracking-wider">
                                            Save Override
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
