import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAllInvoices, getAllClients, updateInvoice } from '@/db/api';
import { Invoice, Client } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Receipt, CheckCircle, Clock, IndianRupee, AlertCircle, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { API_URL } from '@/config';

interface InvoiceManagementProps {
  Layout?: React.ComponentType<{ children: React.ReactNode }>;
}

export default function InvoiceManagement({ Layout = AdminLayout }: InvoiceManagementProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [invData, clientData] = await Promise.all([
        getAllInvoices(),
        getAllClients()
      ]);
      setInvoices(invData);
      setClients(clientData);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load invoices', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, status: Invoice['status']) => {
    try {
      await updateInvoice(id, { status });
      toast({ title: 'Success', description: `Invoice marked as ${status}` });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const client = clients.find(c => c.id === inv.client_id);
    return inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      client?.company_name.toLowerCase().includes(search.toLowerCase());
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0);
  const pendingInvoices = invoices.filter(inv => inv.status !== 'paid').length;

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoice Management</h1>
            <p className="text-muted-foreground">Monitor and manage all client financial transactions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Receipt className="mr-2 h-4 w-4" />
              Billing Report
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-md bg-white dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
              <IndianRupee className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalBilled.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Across {invoices.length} invoices</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-white dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collections (Paid)</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{Math.round((totalPaid / totalBilled) * 100 || 0)}% recovery rate</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-white dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₹{(totalBilled - totalPaid).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{pendingInvoices} invoices pending</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Filter and manage client billing records</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices or clients..."
                  className="pl-9 bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading invoice data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 pb-2">
                <Table>
                  <TableHeader className="bg-muted/30 text-nowrap">
                    <TableRow>
                      <TableHead className="font-bold min-w-[120px]">Invoice #</TableHead>
                      <TableHead className="font-bold min-w-[200px]">Client</TableHead>
                      <TableHead className="font-bold min-w-[120px]">Amount</TableHead>
                      <TableHead className="font-bold min-w-[120px]">Due Date</TableHead>
                      <TableHead className="font-bold min-w-[100px]">Status</TableHead>
                      <TableHead className="text-right font-bold min-w-[160px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                          No invoices found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const client = clients.find(c => c.id === inv.client_id);
                        return (
                          <TableRow key={inv.id} className="hover:bg-muted/10 transition-colors">
                            <TableCell className="font-mono font-bold text-primary">{inv.invoice_number}</TableCell>
                            <TableCell>
                              <div className="font-bold">{client?.company_name || 'Unknown Client'}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{client?.contact_person}</div>
                            </TableCell>
                            <TableCell className="font-mono font-black">₹{inv.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {inv.due_date || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                inv.status === 'paid' ? 'default' :
                                  inv.status === 'sent' ? 'secondary' :
                                    inv.status === 'cancelled' ? 'destructive' : 'outline'
                              } className="uppercase text-[10px] font-bold tracking-tighter h-5">
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {inv.status !== 'paid' && (
                                  <Button size="sm" variant="outline" className="h-8 border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(inv.id, 'paid')}>
                                    <CheckCircle className="h-4 w-4 mr-1.5" />
                                    Paid
                                  </Button>
                                )}
                                {inv.status === 'draft' && (
                                  <Button size="sm" variant="outline" className="h-8" onClick={() => handleStatusChange(inv.id, 'sent')}>
                                    <Clock className="h-4 w-4 mr-1.5" />
                                    Send
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary"
                                  onClick={() => window.open(`${API_URL}/invoices/${inv.id}/download`, '_blank')}
                                  title="Download Invoice"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {!loading && filteredInvoices.length > 0 && (
            <div className="p-4 border-t bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
              <div>Showing {filteredInvoices.length} invoices</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled className="h-7">Previous</Button>
                <Button variant="outline" size="sm" disabled className="h-7">Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
