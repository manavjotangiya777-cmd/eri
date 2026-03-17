import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getPerformanceRecords } from '@/db/api';
import { Award, BarChart3, TrendingUp, Briefcase, CalendarClock, MessageSquare, Zap, Target, AlertCircle } from 'lucide-react';

export default function MyPerformance() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [record, setRecord] = useState<any | null>(null);

    // Create last 6 months options
    const [monthOptions, setMonthOptions] = useState<{ label: string, value: string }[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const { toast } = useToast();

    useEffect(() => {
        const opts = [];
        const date = new Date();
        for (let i = 0; i < 6; i++) {
            const value = date.toISOString().substring(0, 7);
            const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            opts.push({ label, value });
            date.setMonth(date.getMonth() - 1);
        }
        setMonthOptions(opts);
        setSelectedMonth(opts[0].value);
    }, []);

    const loadData = async (month: string) => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const data = await getPerformanceRecords(month, profile.id);
            setRecord(data[0] || null);
        } catch (err: any) {
            toast({ title: 'Error', description: 'Failed to fetch performance data', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedMonth) loadData(selectedMonth);
    }, [selectedMonth, profile?.id]);

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'Excellent': return 'bg-green-500 text-white';
            case 'Good': return 'bg-blue-500 text-white';
            case 'Average': return 'bg-yellow-500 text-white';
            default: return 'bg-red-500 text-white';
        }
    };

    return (
        <EmployeeLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Award className="h-8 w-8 text-primary" />
                            My Performance
                        </h1>
                        <p className="text-muted-foreground">View your auto-generated monthly scorecards.</p>
                    </div>
                    <div className="w-full sm:w-64">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="font-bold border-primary">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-muted-foreground animate-pulse">Loading scorecard...</div>
                ) : !record ? (
                    <Card className="border-dashed shadow-none bg-muted/20">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-xl font-bold mb-2">No Evaluation Yet</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Your performance report for {monthOptions.find(o => o.value === selectedMonth)?.label} has not been compiled or calculated by admins yet.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-primary/10 to-transparent">
                            <CardContent className="p-8">
                                <div className="grid md:grid-cols-2 gap-8 items-center">
                                    <div>
                                        <Badge variant="outline" className="mb-4 bg-background uppercase font-bold tracking-widest text-[10px]">
                                            {monthOptions.find(o => o.value === selectedMonth)?.label} Report
                                        </Badge>
                                        <h2 className="text-5xl font-black mb-2 flex items-baseline gap-2 text-foreground">
                                            {record.final_score}%
                                            <span className="text-xl font-medium text-muted-foreground">/ 100%</span>
                                        </h2>
                                        <Badge className={getGradeColor(record.grade) + " px-4 py-1 text-sm font-bold shadow-md rounded-full mt-2"}>
                                            {record.grade}
                                        </Badge>
                                    </div>
                                    <div className="space-y-4 max-w-sm ml-auto w-full">
                                        <div>
                                            <div className="flex justify-between text-sm font-bold mb-1">
                                                <span>Overall Progress</span>
                                                <span>{record.final_score}%</span>
                                            </div>
                                            <Progress value={record.final_score} className="h-4" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Category Breakdown */}
                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <CalendarClock className="h-5 w-5 text-primary" />
                                        Attendance (20%)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-black mb-1">{Math.round(record.attendance_score)}<span className="text-sm text-muted-foreground">/20</span></p>
                                    <p className="text-xs text-muted-foreground font-medium">Present: {record.metadata?.presentDays}/{record.metadata?.totalWorkingDays} days</p>
                                    {record.metadata?.lateEntries > 0 && (
                                        <p className="text-[10px] text-red-500 font-bold uppercase mt-1">{record.metadata?.lateEntries} Late Entries Found</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Briefcase className="h-5 w-5 text-blue-500" />
                                        Task Volume (25%)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-black mb-1 text-blue-600">{Math.round(record.task_completion_score)}<span className="text-sm text-muted-foreground font-medium">/25</span></p>
                                    <p className="text-xs text-muted-foreground font-medium">Completed: {record.metadata?.completedTasks}/{record.metadata?.totalTasks} assigned tasks</p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Target className="h-5 w-5 text-yellow-500" />
                                        Task Quality (15%)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-black mb-1 text-yellow-600">{Math.round(record.task_quality_score)}<span className="text-sm text-muted-foreground font-medium">/15</span></p>
                                    <p className="text-xs text-muted-foreground font-medium">Admin Rating: {record.admin_rating || 'Not evaluated yet'}/5</p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Zap className="h-5 w-5 text-purple-500" />
                                        Engagement (10%)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-black mb-1 text-purple-600">{Math.round(record.activity_engagement_score)}<span className="text-sm text-muted-foreground font-medium">/10</span></p>
                                    <p className="text-xs text-muted-foreground font-medium">Logins: {record.metadata?.totalLogins} | AI Uses: {record.metadata?.totalAi}</p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                        Leaves Tracking (10%)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-black mb-1 text-green-600">{Math.round(record.leave_management_score)}<span className="text-sm text-muted-foreground font-medium">/10</span></p>
                                    <p className="text-xs text-muted-foreground font-medium">Unplanned impacts negatively.</p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <MessageSquare className="h-5 w-5 text-indigo-500" />
                                        Communication (10%)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-black mb-1 text-indigo-600">{Math.round(record.communication_score)}<span className="text-sm text-muted-foreground font-medium">/10</span></p>
                                    <p className="text-xs text-muted-foreground font-medium">{record.metadata?.messagesCount} internal messages logged.</p>
                                </CardContent>
                            </Card>
                            <Card className="shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <TrendingUp className="h-5 w-5 text-orange-500" />
                                        Follow-ups (10%)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-black mb-1 text-orange-600">{Math.round(record.followup_score || 0)}<span className="text-sm text-muted-foreground font-medium">/10</span></p>
                                    <p className="text-xs text-muted-foreground font-medium">Done: {record.metadata?.completedFollowups || 0}/{record.metadata?.totalFollowups || 0}</p>
                                </CardContent>
                            </Card>

                            {(record.warning_penalty > 0 || record.appreciation_bonus > 0) && (
                                <Card className="shadow-md border-primary/20 bg-primary/5 md:col-span-2 lg:col-span-3">
                                    <CardContent className="py-4">
                                        <div className="flex flex-wrap gap-8 justify-around items-center">
                                            {record.warning_penalty > 0 && (
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-red-100 p-2 rounded-full"><AlertCircle className="h-6 w-6 text-red-600" /></div>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase text-red-600">Warnings Penalty</p>
                                                        <p className="text-xl font-black text-red-700">-{record.warning_penalty} Points</p>
                                                        <p className="text-[10px] text-muted-foreground">Based on {record.metadata?.warningsCount} warnings issued</p>
                                                    </div>
                                                </div>
                                            )}
                                            {record.appreciation_bonus > 0 && (
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-green-100 p-2 rounded-full"><Award className="h-6 w-6 text-green-600" /></div>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase text-green-600">Appreciation Bonus</p>
                                                        <p className="text-xl font-black text-green-700">+{record.appreciation_bonus} Points</p>
                                                        <p className="text-[10px] text-muted-foreground">Based on {record.metadata?.appreciationsCount} badges received</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <p className="text-center text-xs text-muted-foreground italic opacity-70 mt-8">
                            Metrics are auto-calculated at month end via Cron. Please consult Admin for score disputes.
                        </p>
                    </div>
                )}
            </div>
        </EmployeeLayout>
    );
}
