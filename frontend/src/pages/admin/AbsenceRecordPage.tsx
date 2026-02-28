import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { getAbsences, generateAbsences, deleteAbsence } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import { UserX, RefreshCw, Trash2, CalendarOff, FileCheck2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AbsenceRecordPageProps {
  Layout: React.ComponentType<{ children: React.ReactNode }>;
}

type AbsenceRecord = {
  id: string;
  date: string;
  reason: 'no_clockin' | 'approved_leave';
  note?: string;
  user_id: { username: string; full_name?: string; department?: string } | string;
};

export default function AbsenceRecordPage({ Layout }: AbsenceRecordPageProps) {
  const { toast } = useToast();
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Date range filters — default: current month
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(today);

  const loadAbsences = async () => {
    setLoading(true);
    try {
      const data = await getAbsences(from, to);
      setAbsences(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load absence records', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAbsences(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateAbsences(from, to);
      toast({
        title: 'Absences Generated',
        description: `${result.created} new records created, ${result.skipped} already existed.`,
      });
      await loadAbsences();
    } catch {
      toast({ title: 'Error', description: 'Failed to generate absences', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this absence record?')) return;
    try {
      await deleteAbsence(id);
      toast({ title: 'Deleted', description: 'Absence record removed.' });
      setAbsences(prev => prev.filter(a => a.id !== id));
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const getName = (user_id: any): string => {
    if (user_id && typeof user_id === 'object') return user_id.full_name || user_id.username || 'Unknown';
    return 'Unknown';
  };

  const getDept = (user_id: any): string => {
    if (user_id && typeof user_id === 'object') return user_id.department || '-';
    return '-';
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  // Stats
  const noClockinCount = absences.filter(a => a.reason === 'no_clockin').length;
  const leaveCount = absences.filter(a => a.reason === 'approved_leave').length;
  const uniqueEmployees = new Set(absences.map(a => (a.user_id as any)?._id || a.user_id)).size;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-destructive/10 rounded-xl border border-destructive/20">
              <UserX className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Absence Records</h1>
              <p className="text-sm text-muted-foreground">Track missing attendance and approved leave absences</p>
            </div>
          </div>
        </div>

        {/* Filters & Generate */}
        <Card className="border-muted-foreground/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Date Range & Generate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">From</label>
                <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">To</label>
                <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
              </div>
              <Button variant="outline" onClick={loadAbsences} disabled={loading} className="gap-2">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="gap-2 bg-destructive hover:bg-destructive/90"
              >
                <AlertTriangle className={cn('h-4 w-4', generating && 'animate-pulse')} />
                {generating ? 'Generating...' : 'Generate Absences'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              "Generate Absences" will scan all working days (Mon–Fri, excluding holidays) in the selected range and auto-create records for employees who didn't clock in or were on approved leave.
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-destructive/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Absences</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{absences.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{uniqueEmployees} unique employees</p>
            </CardContent>
          </Card>
          <Card className="border-orange-400/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1.5"><CalendarOff className="h-4 w-4 text-orange-500" />No Clock-In</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{noClockinCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Employees who didn't clock in</p>
            </CardContent>
          </Card>
          <Card className="border-blue-400/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1.5"><FileCheck2 className="h-4 w-4 text-blue-500" />Approved Leave</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{leaveCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Days on approved leave</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Absence Records ({absences.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading...</div>
            ) : absences.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserX className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-semibold">No absence records found</p>
                <p className="text-sm mt-1">Click "Generate Absences" to detect missing attendance</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absences.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-semibold">{getName(record.user_id)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{getDept(record.user_id)}</TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{formatDate(record.date)}</span>
                        </TableCell>
                        <TableCell>
                          {record.reason === 'no_clockin' ? (
                            <Badge variant="destructive" className="gap-1">
                              <CalendarOff className="h-3 w-3" /> No Clock-In
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
                              <FileCheck2 className="h-3 w-3" /> Approved Leave
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {record.note || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>
    </Layout>
  );
}
