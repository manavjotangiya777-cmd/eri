import { useEffect, useState } from 'react';
import { API_URL } from '@/config';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getClientMilestones, getClientInvoices } from '@/db/api';
import { PaymentMilestone, Invoice } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  IndianRupee, 
  Receipt, 
  CreditCard, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClientBillingPage() {
  const { profile } = useAuth();
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.client_id) return;
      try {
        const [mdata, idata] = await Promise.all([
          getClientMilestones(profile.client_id),
          getClientInvoices(profile.client_id)
        ]);
        setMilestones(mdata);
        setInvoices(idata);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load billing data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const paidAmount = milestones.filter(m => m.status === 'paid').reduce((sum, m) => sum + Number(m.amount), 0);
  const totalAmount = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
  const billingProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'completed': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing & Payments</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Manage your project milestones, achievements, and invoices
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="hidden @md:flex">
              <Download className="mr-2 h-4 w-4" />
              Export History
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              Payment Portal
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-primary/10 to-transparent">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <IndianRupee className="h-12 w-12 text-primary" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider">Total Contract</CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight">₹{totalAmount.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>Standard project value</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white dark:bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider">Amount Paid</CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight text-green-600">₹{paidAmount.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={billingProgress} className="h-1.5 bg-muted" />
              <div className="text-xs text-muted-foreground">
                {Math.round(billingProgress)}% of total value cleared
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white dark:bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider">Remaining Balance</CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight text-orange-600">₹{(totalAmount - paidAmount).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Based on {milestones.filter(m => m.status !== 'paid').length} pending milestones
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white dark:bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider">Next Payment Due</CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {invoices.find(inv => inv.status !== 'paid')?.due_date || 'N/A'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {invoices.filter(inv => inv.status !== 'paid').length} active invoices
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Achievement Milestones Timeline */}
          <Card className="lg:col-span-2 border-none shadow-lg">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Milestones</CardTitle>
                  <CardDescription>Payment schedule based on project achievements</CardDescription>
                </div>
                <Badge variant="outline" className="bg-background">
                  {milestones.length} Steps
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6">
                <div className="space-y-8">
                  {milestones.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground italic">
                      No project milestones have been defined yet.
                    </div>
                  ) : (
                    milestones.map((m, index) => (
                      <div key={m.id} className="relative pl-10">
                        {/* Timeline Connector */}
                        {index !== milestones.length - 1 && (
                          <div className="absolute left-[19px] top-8 bottom-[-32px] w-0.5 bg-muted" />
                        )}
                        
                        {/* Timeline Point */}
                        <div className={cn(
                          "absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-background shadow-sm flex items-center justify-center z-10",
                          m.status === 'paid' ? "bg-green-100 text-green-600" : 
                          m.status === 'completed' ? "bg-blue-100 text-blue-600" : 
                          "bg-muted text-muted-foreground"
                        )}>
                          {m.status === 'paid' ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-lg">{m.title}</h4>
                              <Badge variant={m.status === 'paid' ? 'default' : m.status === 'completed' ? 'secondary' : 'outline'} className="capitalize text-[10px] h-5">
                                {m.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground max-w-md">{m.description || 'Achievement based payment milestone.'}</p>
                          </div>
                          <div className="flex items-center gap-4 md:text-right">
                            <div className="space-y-0.5">
                              <div className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Amount</div>
                              <div className="text-xl font-black">₹{m.amount.toLocaleString()}</div>
                            </div>
                            {m.status === 'completed' && (
                              <Button size="sm" className="ml-2 h-8">
                                Settle Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card className="border-none shadow-lg h-fit">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Recent billing history</CardDescription>
                </div>
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {invoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground italic">
                    No invoices found.
                  </div>
                ) : (
                  invoices.map((inv) => (
                    <div key={inv.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          inv.status === 'paid' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                        )}>
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-sm group-hover:text-primary transition-colors">{inv.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">Due: {inv.due_date || 'Immediate'}</div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-bold text-sm">₹{inv.amount.toLocaleString()}</div>
                        <div className="flex items-center justify-end gap-2">
                          {inv.status !== 'paid' ? (
                            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 font-bold uppercase border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => {
                              toast({ title: 'Payment', description: 'Redirecting to payment portal...' });
                            }}>
                              Pay Now
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-5 border-green-200 text-green-600 bg-green-50">PAID</Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => window.open(`${API_URL}/invoices/${inv.id}/download`, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            {invoices.length > 0 && (
              <div className="p-4 border-t bg-muted/10">
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary">
                  View Full Transaction History
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
}
