import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  getAllClients,
  createClient,
  updateClient,
  deleteClient,
  getAllProfiles,
  getProfilesByRole,
  getAllTasks,
  getClientNotes,
  createClientNote,
  updateProfile,
  getClientMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getClientInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  adminCreateUser
} from '@/db/api';
import type { Client, Profile, Task, ClientNote, PaymentMilestone, Invoice } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Users, FileText, CheckSquare, Building2, UserPlus, CreditCard, IndianRupee, Receipt } from 'lucide-react';
import React from 'react';
interface ClientManagementProps {
  Layout?: React.ComponentType<{ children: React.ReactNode }>;
}

export default function ClientManagement({ Layout = AdminLayout }: ClientManagementProps) {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [clientUsers, setClientUsers] = useState<Profile[]>([]);
  const [clientTasks, setClientTasks] = useState<Task[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [clientMilestones, setClientMilestones] = useState<PaymentMilestone[]>([]);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [milestoneFormData, setMilestoneFormData] = useState<Partial<PaymentMilestone>>({
    title: '',
    description: '',
    amount: 0,
    status: 'pending'
  });
  const [invoiceFormData, setInvoiceFormData] = useState<Partial<Invoice>>({
    invoice_number: '',
    amount: 0,
    status: 'draft',
    due_date: new Date().toISOString().split('T')[0]
  });
  const [editingMilestone, setEditingMilestone] = useState<PaymentMilestone | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();

  // New User State
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Note State
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const emptyClient: Partial<Client> = {
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    assigned_to: null,
  };

  const [formData, setFormData] = useState<Partial<Client>>(emptyClient);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, usersData] = await Promise.all([
        getAllClients(),
        getAllProfiles(),
      ]);
      setClients(clientsData);
      setUsers(usersData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClientDetails = async (clientId: string) => {
    try {
      const [allUsers, allTasks, notes, milestones, invoices] = await Promise.all([
        getAllProfiles(),
        getAllTasks(),
        getClientNotes(clientId),
        getClientMilestones(clientId),
        getClientInvoices(clientId)
      ]);

      setClientUsers(allUsers.filter(u => u.client_id === clientId && u.role === 'client'));
      setClientTasks(allTasks.filter(t => t.client_id === clientId));
      setClientNotes(notes);
      setClientMilestones(milestones);
      setClientInvoices(invoices);
    } catch (error) {
      console.error('Error loading client details:', error);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      if (editingMilestone) {
        await updateMilestone(editingMilestone.id, milestoneFormData);
        toast({ title: 'Success', description: 'Milestone updated' });
      } else {
        await createMilestone({
          ...milestoneFormData,
          client_id: selectedClient.id,
          order_index: clientMilestones.length
        } as any);
        toast({ title: 'Success', description: 'Milestone created' });
      }
      setShowMilestoneDialog(false);
      setEditingMilestone(null);
      setMilestoneFormData({ title: '', description: '', amount: 0, status: 'pending' });
      await loadClientDetails(selectedClient.id);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save milestone', variant: 'destructive' });
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      await createInvoice({
        ...invoiceFormData,
        client_id: selectedClient.id,
      } as any);
      toast({ title: 'Success', description: 'Invoice generated' });
      setShowInvoiceDialog(false);
      setInvoiceFormData({ invoice_number: '', amount: 0, status: 'draft', due_date: new Date().toISOString().split('T')[0] });
      await loadClientDetails(selectedClient.id);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create invoice', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManage = async (client: Client) => {
    setSelectedClient(client);
    setManageDialogOpen(true);
    await loadClientDetails(client.id);
  };

  const handleAdd = () => {
    setEditClient(null);
    setFormData(emptyClient);
    setDialogOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditClient(client);
    setFormData(client);
    setDialogOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    if (!newUser.username || !newUser.password) {
      toast({
        title: 'Error',
        description: 'Username and password are required',
        variant: 'destructive',
      });
      return;
    }

    setCreatingUser(true);
    try {
      const { data, error } = await adminCreateUser({
        username: newUser.username,
        password: newUser.password,
        role: 'client',
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.user?.id) {
        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update the profile with client role and client_id
        await updateProfile(data.user.id, {
          full_name: newUser.full_name || null,
          role: 'client',
          client_id: selectedClient.id,
        });

        toast({
          title: 'Success',
          description: 'Client user created successfully',
        });

        setNewUser({ username: '', password: '', full_name: '' });
        setCreateUserDialogOpen(false);
        await loadClientDetails(selectedClient.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newNote.trim()) return;

    setSubmittingNote(true);
    try {
      await createClientNote({
        client_id: selectedClient.id,
        note: newNote.trim(),
        created_by: profile?.id || null,
      });

      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
      setNewNote('');
      await loadClientDetails(selectedClient.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name || !formData.contact_person) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editClient) {
        await updateClient(editClient.id, formData);
        toast({ title: 'Success', description: 'Client updated successfully' });
      } else {
        await createClient({ ...formData, created_by: profile?.id } as any);
        toast({ title: 'Success', description: 'Client created successfully' });
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save client',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      await deleteClient(id);
      toast({ title: 'Success', description: 'Client deleted successfully' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Client Management</h1>
            <p className="text-muted-foreground">Manage your client relationships</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.company_name}</TableCell>
                      <TableCell>{client.contact_person}</TableCell>
                      <TableCell>{client.email || '-'}</TableCell>
                      <TableCell>{client.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManage(client)}
                          >
                            <Building2 className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(client.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Manage Client Dialog */}
        <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Client: {selectedClient?.company_name}</DialogTitle>
              <DialogDescription>
                Project updates, users, and notes for this client
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="users">
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="billing">
                  <IndianRupee className="h-4 w-4 mr-2" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="notes">
                  <FileText className="h-4 w-4 mr-2" />
                  Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Client Accounts</h3>
                  <Button size="sm" onClick={() => setCreateUserDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Client User
                  </Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No users found for this client
                          </TableCell>
                        </TableRow>
                      ) : (
                        clientUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.full_name || '-'}</TableCell>
                            <TableCell>{user.email || '-'}</TableCell>
                            <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Project Tasks</h3>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Title</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientTasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No tasks found for this client
                          </TableCell>
                        </TableRow>
                      ) : (
                        clientTasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{task.priority}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="capitalize">{task.status.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell>{task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  * Assign tasks to this client in the Task Management module to show them here.
                </p>
              </TabsContent>

              <TabsContent value="billing" className="space-y-6 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Payment Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Paid: ₹{clientMilestones.filter(m => m.status === 'paid').reduce((sum, m) => sum + Number(m.amount), 0)}</span>
                        <span>Total: ₹{clientMilestones.reduce((sum, m) => sum + Number(m.amount), 0)}</span>
                      </div>
                      <Progress value={
                        clientMilestones.reduce((sum, m) => sum + Number(m.amount), 0) > 0
                          ? (clientMilestones.filter(m => m.status === 'paid').reduce((sum, m) => sum + Number(m.amount), 0) / clientMilestones.reduce((sum, m) => sum + Number(m.amount), 0)) * 100
                          : 0
                      } className="h-1.5" />
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Billing Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center h-10">
                      <div className="text-xs">
                        <span className="font-bold text-orange-600">{clientMilestones.filter(m => m.status !== 'paid').length}</span> Pending Milestones
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-primary">{clientInvoices.length}</span> Total Invoices
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Achievement Milestones
                    </h3>
                    <Button size="sm" onClick={() => {
                      setEditingMilestone(null);
                      setMilestoneFormData({ title: '', description: '', amount: 0, status: 'pending' });
                      setShowMilestoneDialog(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  </div>
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Achievement Title</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientMilestones.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                              No project milestones defined yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          clientMilestones.map((m) => (
                            <TableRow key={m.id} className="hover:bg-muted/10 transition-colors">
                              <TableCell>
                                <div className="font-bold">{m.title}</div>
                                <div className="text-[10px] text-muted-foreground line-clamp-1">{m.description}</div>
                              </TableCell>
                              <TableCell className="font-mono font-bold">₹{m.amount.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={m.status === 'paid' ? 'default' : m.status === 'completed' ? 'secondary' : 'outline'} className="text-[10px] h-5 uppercase tracking-tighter">
                                  {m.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                    setEditingMilestone(m);
                                    setMilestoneFormData(m);
                                    setShowMilestoneDialog(true);
                                  }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => {
                                    if (confirm('Are you sure you want to delete this milestone?')) {
                                      await deleteMilestone(m.id);
                                      await loadClientDetails(selectedClient!.id);
                                    }
                                  }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Invoice History
                    </h3>
                    <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={() => {
                      setInvoiceFormData({
                        invoice_number: `INV-${Date.now()}`,
                        amount: 0,
                        status: 'draft',
                        due_date: new Date().toISOString().split('T')[0]
                      });
                      setShowInvoiceDialog(true);
                    }}>
                      <Receipt className="h-4 w-4 mr-2" />
                      Generate Invoice
                    </Button>
                  </div>
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientInvoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                              No invoices have been generated for this client.
                            </TableCell>
                          </TableRow>
                        ) : (
                          clientInvoices.map((inv) => (
                            <TableRow key={inv.id} className="hover:bg-muted/10 transition-colors">
                              <TableCell className="font-mono font-bold">{inv.invoice_number}</TableCell>
                              <TableCell className="font-mono">₹{inv.amount.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className="text-[10px] h-5 uppercase tracking-tighter">
                                  {inv.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">{inv.due_date || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Project Updates & Notes</h3>
                </div>
                <form onSubmit={handleAddNote} className="space-y-2">
                  <Textarea
                    placeholder="Add a project update or private note for this client..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={submittingNote}>
                      {submittingNote ? 'Saving...' : 'Add Note'}
                    </Button>
                  </div>
                </form>
                <div className="space-y-3">
                  {clientNotes.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No notes yet</div>
                  ) : (
                    clientNotes.map((note) => (
                      <div key={note.id} className="p-3 border rounded-md bg-muted/30">
                        <p className="text-sm">{note.note}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] text-muted-foreground uppercase">
                            By {users.find(u => u.id === note.created_by)?.username || 'System'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Create Client User Dialog */}
        <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Client User Account</DialogTitle>
              <DialogDescription>
                Create a login account for {selectedClient?.company_name}.
                The user will be automatically linked to this client and have the 'Client' role.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_username">Username *</Label>
                <Input
                  id="new_username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="jdoe_client"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_fullname">Full Name</Label>
                <Input
                  id="new_fullname"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">Password *</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingUser}>
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Client Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              <DialogDescription>
                {editClient ? 'Update client information' : 'Create a new client record'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person *</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_person: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select
                    value={formData.assigned_to || 'unassigned'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, assigned_to: value === 'unassigned' ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editClient ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Milestone Dialog */}
        <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={milestoneFormData.title} onChange={e => setMilestoneFormData({ ...milestoneFormData, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={milestoneFormData.description || ''} onChange={e => setMilestoneFormData({ ...milestoneFormData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" value={milestoneFormData.amount} onChange={e => setMilestoneFormData({ ...milestoneFormData, amount: parseFloat(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={milestoneFormData.status} onValueChange={v => setMilestoneFormData({ ...milestoneFormData, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowMilestoneDialog(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog */}
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input value={invoiceFormData.invoice_number} onChange={e => setInvoiceFormData({ ...invoiceFormData, invoice_number: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" value={invoiceFormData.amount} onChange={e => setInvoiceFormData({ ...invoiceFormData, amount: parseFloat(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={invoiceFormData.due_date || ''} onChange={e => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={invoiceFormData.notes || ''} onChange={e => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowInvoiceDialog(false)}>Cancel</Button>
                <Button type="submit">Generate</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
