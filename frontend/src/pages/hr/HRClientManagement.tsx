import { useEffect, useState } from 'react';
import HRLayout from '@/components/layouts/HRLayout';
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
import {
  getAllClients,
  createClient,
  updateClient,
  deleteClient,
  getAllProfiles,
  getAllTasks,
  getClientNotes,
  createClientNote,
  updateProfile,
  adminCreateUser
} from '@/db/api';
import type { Client, Profile, Task, ClientNote } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Users, FileText, CheckSquare, Building2, UserPlus, Filter, Search } from 'lucide-react';
import React from 'react';

export default function ClientManagement() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [clientUsers, setClientUsers] = useState<Profile[]>([]);
  const [clientTasks, setClientTasks] = useState<Task[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();

  // Filtering & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  // New User State
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
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
    sector: 'B2B',
    industry: 'Private',
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
      const [allUsers, allTasks, notes] = await Promise.all([
        getAllProfiles(),
        getAllTasks(),
        getClientNotes(clientId)
      ]);

      setClientUsers(allUsers.filter(u => u.client_id === clientId && u.role === 'client'));
      setClientTasks(allTasks.filter(t => t.client_id === clientId));
      setClientNotes(notes);
    } catch (error) {
      console.error('Error loading client details:', error);
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

    if (!newUser.username || !newUser.password || !newUser.email || !newUser.full_name) {
      toast({
        title: 'Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    setCreatingUser(true);
    try {
      const createResult = await adminCreateUser({
        username: newUser.username,
        password: newUser.password,
        email: newUser.email,
        full_name: newUser.full_name,
        role: 'client',
        client_id: selectedClient.id,
      });

      if (!createResult.success) throw new Error(createResult.error || 'Failed to create user');
      const data = createResult.user;

      if (data?.id) {
        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update the profile with client role and client_id
        await updateProfile(data.id, {
          full_name: newUser.full_name || null,
          email: newUser.email || null,
          role: 'client',
          client_id: selectedClient.id,
        });

        toast({
          title: 'Success',
          description: 'Client user created successfully',
        });

        setNewUser({ username: '', password: '', full_name: '', email: '' });
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
        await createClient({ ...formData, created_by: profile?.id } as Omit<Client, 'id' | 'created_at' | 'updated_at'>);
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

  const filteredClients = (clients || []).filter(client => {
    const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesSector = sectorFilter === 'all' || client.sector === sectorFilter;
    const matchesIndustry = industryFilter === 'all' || client.industry === industryFilter;

    return matchesSearch && matchesStatus && matchesSector && matchesIndustry;
  });

  return (
    <HRLayout>
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

        {/* Filters Section */}
        <Card className="border-primary/10 shadow-sm bg-muted/5">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Search Clients</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Company, name, email..."
                    className="pl-9 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="All Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Sector</Label>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="bg-white">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="All Sectors" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                    <SelectItem value="D2C">D2C</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Industry</Label>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="bg-white">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="All Industries" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Institutional">Institutional</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end pb-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setSectorFilter('all');
                    setIndustryFilter('all');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <TableHead>Sector/Industry</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                        No clients found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <div>{client.company_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{client.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit text-[9px] h-4 uppercase">{client.sector || 'B2B'}</Badge>
                          <Badge variant="outline" className="w-fit text-[9px] h-4 uppercase">{client.industry || 'Private'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs">{client.contact_person}</div>
                        <div className="text-[10px] text-muted-foreground">{client.phone}</div>
                      </TableCell>
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tasks
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
                <Label htmlFor="new_fullname">Client Full Name *</Label>
                <Input
                  id="new_fullname"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
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
                <Label htmlFor="new_email">Email ID *</Label>
                <Input
                  id="new_email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@example.com"
                  required
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
                  <Label htmlFor="sector">Sector</Label>
                  <Select
                    value={formData.sector || 'B2B'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, sector: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B2B">B2B</SelectItem>
                      <SelectItem value="B2C">B2C</SelectItem>
                      <SelectItem value="D2C">D2C</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry || 'Private'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, industry: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="Institutional">Institutional</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as 'active' | 'inactive' })
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
      </div>
    </HRLayout>
  );
}
