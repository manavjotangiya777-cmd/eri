import { useEffect, useState } from 'react';
import HRLayout from '@/components/layouts/HRLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAllHolidays,
  createHoliday,
  deleteHoliday,
  getAllAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getAllProfiles,
  getAllClients,
  getAllDocuments,
  createDocument,
  deleteDocument,
  uploadFile,
  sendNotification,
  getAllNotifications,
  deleteNotification,
} from '@/db/api';
import type { Holiday, Announcement, Profile, Client, Document, Notification } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Calendar, Bell, Cake, FileText, Upload } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';

export default function HRContentManagement() {
  const { profile } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const { toast } = useToast();

  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    description: '',
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
  });

  const [documentForm, setDocumentForm] = useState<{
    title: string;
    visibility: 'employees' | 'clients' | 'public';
    client_id: string | null;
    file: File | null;
  }>({
    title: '',
    visibility: 'employees',
    client_id: null,
    file: null,
  });

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    target_role: 'all' as 'all' | 'admin' | 'hr' | 'employee' | 'client',
    type: 'system' as 'system' | 'announcement' | 'birthday' | 'task' | 'attendance' | 'leave',
  });

  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [holidaysData, announcementsData, employeesData, clientsData, documentsData, notificationsData] = await Promise.all([
        getAllHolidays(),
        getAllAnnouncements(),
        getAllProfiles(), // This will now call the locally defined getAllProfiles
        getAllClients(),
        getAllDocuments(),
        getAllNotifications(),
      ]);
      setHolidays(holidaysData);
      setAnnouncements(announcementsData);
      setEmployees(employeesData);
      setClients(clientsData);
      setDocuments(documentsData);
      setNotifications(notificationsData);
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

  useEffect(() => {
    loadData();
  }, []);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name || !holidayForm.date) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createHoliday({
        name: holidayForm.name,
        date: holidayForm.date,
        description: holidayForm.description || null,
        created_by: profile?.id || '',
      });
      toast({ title: 'Success', description: 'Holiday added successfully' });
      setHolidayForm({ name: '', date: '', description: '' });
      setHolidayDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add holiday',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await deleteHoliday(id);
      toast({ title: 'Success', description: 'Holiday deleted successfully' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete holiday',
        variant: 'destructive',
      });
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.content) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createAnnouncement({
        title: announcementForm.title,
        content: announcementForm.content,
        priority: 'normal',
        created_by: profile?.id || '',
      });
      toast({ title: 'Success', description: 'Announcement created successfully' });
      setAnnouncementForm({ title: '', content: '' });
      setAnnouncementDialogOpen(false);
      // Small delay ensures backend has stored the auto-notification before we refetch
      setTimeout(() => loadData(), 500);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await deleteAnnouncement(id);
      toast({ title: 'Success', description: 'Announcement deleted successfully' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
    }
  };

  const getUpcomingBirthdays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    return employees
      .filter((emp: Profile) => emp.date_of_birth && emp.is_active !== false)
      .map((emp: Profile) => {
        const dob = new Date(emp.date_of_birth!);
        // Create this year's birthday at midnight local
        let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());

        // If birthday already passed this year, look at next year
        if (nextBirthday < today) {
          nextBirthday.setFullYear(currentYear + 1);
        }

        const diffTime = nextBirthday.getTime() - today.getTime();
        const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...emp,
          daysUntil,
          birthDate: nextBirthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        };
      })
      .filter((emp) => emp.daysUntil >= 0 && emp.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const upcomingBirthdays = getUpcomingBirthdays();

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentForm.title || !documentForm.file) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields and select a file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const file = documentForm.file;
      const fileExt = file.name.split('.').pop();

      const uploadResult = await uploadFile(file);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }
      const publicUrl = uploadResult.url;

      await createDocument({
        title: documentForm.title,
        file_url: publicUrl,
        file_type: fileExt || null,
        file_size: file.size,
        uploaded_by: profile?.id || '',
        visibility: documentForm.visibility,
        client_id: documentForm.visibility === 'clients' ? documentForm.client_id : null,
      } as any);

      toast({ title: 'Success', description: 'Document uploaded successfully' });
      setDocumentForm({ title: '', visibility: 'employees', client_id: null, file: null });
      setDocumentDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title || !notificationForm.message) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendNotification({
        ...notificationForm,
        created_by: profile?.id,
      });
      toast({
        title: 'Success',
        description: 'Notification sent successfully',
      });
      setNotificationForm({
        title: '',
        message: '',
        target_role: 'all',
        type: 'system',
      });
      setNotificationDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDocument(id);
      toast({ title: 'Success', description: 'Document deleted successfully' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification history?')) return;
    try {
      await deleteNotification(id);
      toast({ title: 'Success', description: 'Notification removed' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove notification', variant: 'destructive' });
    }
  };

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-primary/10 rounded-2xl shadow-sm border border-primary/20">
              <FileText className="h-9 w-9 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Content Management</h1>
              <p className="text-muted-foreground font-medium">Control company-wide broadcasts, events, and resources</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="holidays" className="w-full space-y-6">
          <TabsList className="flex flex-wrap md:grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1.5 bg-muted/30 backdrop-blur-sm rounded-2xl border border-muted-foreground/5 sticky top-0 z-10">
            <TabsTrigger value="holidays" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all duration-200">
              <Calendar className="h-4 w-4 mr-2 text-primary/70" />
              Holidays
            </TabsTrigger>
            <TabsTrigger value="birthdays" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all duration-200">
              <Cake className="h-4 w-4 mr-2 text-primary/70" />
              Birthdays
            </TabsTrigger>
            <TabsTrigger value="announcements" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all duration-200">
              <Bell className="h-4 w-4 mr-2 text-primary/70" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all duration-200">
              <FileText className="h-4 w-4 mr-2 text-primary/70" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all duration-200">
              <Bell className="h-4 w-4 mr-2 text-primary/70" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holidays" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setHolidayDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Company Holidays</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : holidays.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No holidays added yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Holiday Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays.map((holiday: Holiday) => (
                        <TableRow key={holiday.id}>
                          <TableCell className="font-medium">{holiday.name}</TableCell>
                          <TableCell>
                            {new Date(holiday.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>{holiday.description || '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteHoliday(holiday.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="birthdays" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Birthdays (Next 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBirthdays.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming birthdays in the next 30 days
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                    {upcomingBirthdays.map((emp) => (
                      <div
                        key={emp.id}
                        className="p-5 rounded-2xl border border-muted-foreground/10 bg-gradient-to-br from-card to-secondary/5 flex flex-col gap-4 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-pink-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <Cake className="h-6 w-6 text-pink-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground text-lg leading-tight truncate">{emp.full_name || emp.username}</p>
                            <p className="text-sm text-muted-foreground font-medium">{emp.birthDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-muted-foreground/5">
                          <Badge variant="outline" className={cn(
                            "font-bold px-3 py-1 rounded-full",
                            emp.daysUntil === 0
                              ? "bg-pink-500 text-white border-none animate-pulse shadow-lg shadow-pink-500/20"
                              : "bg-primary/5 text-primary border-primary/20"
                          )}>
                            {emp.daysUntil === 0 ? 'Today! 🎂' : `In ${emp.daysUntil} days`}
                          </Badge>
                          {emp.daysUntil <= 7 && emp.daysUntil > 0 && (
                            <span className="text-[10px] uppercase font-black text-orange-500 tracking-tighter animate-bounce flex items-center gap-1">
                              Coming Soon ⚡
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Employee Birthdays</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Birth Date</TableHead>
                      <TableHead>Month</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees
                      .filter(emp => emp.date_of_birth)
                      .sort((a, b) => {
                        const dateA = new Date(a.date_of_birth!);
                        const dateB = new Date(b.date_of_birth!);
                        if (dateA.getMonth() !== dateB.getMonth()) {
                          return dateA.getMonth() - dateB.getMonth();
                        }
                        return dateA.getDate() - dateB.getDate();
                      })
                      .map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.full_name || emp.username}</TableCell>
                          <TableCell>
                            {new Date(emp.date_of_birth!).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {new Date(emp.date_of_birth!).toLocaleDateString('en-US', { month: 'long' })}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    }
                    {employees.filter(emp => emp.date_of_birth).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          No birth dates registered yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setAnnouncementDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Announcement
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Company Announcements</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No announcements yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement: Announcement) => (
                      <div
                        key={announcement.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{announcement.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {announcement.content}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(announcement.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setDocumentDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents uploaded yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc: Document) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {doc.title}
                            </a>
                          </TableCell>
                          <TableCell className="uppercase">{doc.file_type || '-'}</TableCell>
                          <TableCell className="capitalize">{doc.visibility}</TableCell>
                          <TableCell>
                            {doc.visibility === 'clients'
                              ? clients.find((c: Client) => c.id === doc.client_id)?.company_name || 'All Clients'
                              : doc.visibility === 'employees' ? 'All Employees' : 'Everyone'
                            }
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Broadcast Center</CardTitle>
                  <CardDescription>Targeted notifications to specific roles and groups</CardDescription>
                </div>
                <Button onClick={() => setNotificationDialogOpen(true)} className="flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                  <Plus className="h-4 w-4" />
                  Broadcast New
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                    <Bell className="h-10 w-10 mx-auto mb-4 opacity-20" />
                    <p>No notifications history found.</p>
                    <p className="text-sm">Broadcasting a new notification will start the history log.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-5 rounded-2xl border border-muted-foreground/10 bg-gradient-to-br from-card to-muted/20 flex items-start justify-between group shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex gap-5">
                          <div className="p-3 bg-primary/10 rounded-xl shrink-0 h-fit border border-primary/20">
                            <Bell className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-lg text-foreground tracking-tight">{n.title}</h3>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-primary/5 text-primary border-primary/20">{n.type}</Badge>
                              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest bg-muted/50">Recipient: {n.target_role}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{n.message}</p>
                            <div className="flex items-center gap-4 text-[11px] text-muted-foreground/60 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                {new Date(n.created_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8 p-0"
                          onClick={() => handleDeleteNotification(n.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
              <DialogDescription>
                Create a new notification for users based on their role.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendNotification} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="notif_title">Title</Label>
                <Input
                  id="notif_title"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  placeholder="Notification Title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notif_type">Type</Label>
                <Select
                  value={notificationForm.type}
                  onValueChange={(value: any) => setNotificationForm({ ...notificationForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notif_role">Target Role</Label>
                <Select
                  value={notificationForm.target_role}
                  onValueChange={(value: any) => setNotificationForm({ ...notificationForm, target_role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="employee">Employees</SelectItem>
                    <SelectItem value="client">Clients</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notif_message">Message</Label>
                <Textarea
                  id="notif_message"
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  placeholder="Enter your message here..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setNotificationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Send Notification</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Holiday</DialogTitle>
              <DialogDescription>Add a new company holiday</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="holiday_name">Holiday Name *</Label>
                <Input
                  id="holiday_name"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday_date">Date *</Label>
                <Input
                  id="holiday_date"
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday_description">Description</Label>
                <Textarea
                  id="holiday_description"
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setHolidayDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Holiday</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>Create a new company announcement</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="announcement_title">Title *</Label>
                <Input
                  id="announcement_title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement_content">Content *</Label>
                <Textarea
                  id="announcement_content"
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  rows={5}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Announcement</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Share a document with employees or clients</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDocument} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc_title">Document Title *</Label>
                <Input
                  id="doc_title"
                  value={documentForm.title}
                  onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc_file">File *</Label>
                <Input
                  id="doc_file"
                  type="file"
                  onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc_visibility">Visibility</Label>
                <Select
                  value={documentForm.visibility}
                  onValueChange={(value: any) => setDocumentForm({ ...documentForm, visibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employees">Employees Only</SelectItem>
                    <SelectItem value="clients">Specific Client</SelectItem>
                    <SelectItem value="public">Public (Everyone)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {documentForm.visibility === 'clients' && (
                <div className="space-y-2">
                  <Label htmlFor="doc_client">Target Client</Label>
                  <Select
                    value={documentForm.client_id || 'all'}
                    onValueChange={(value) => setDocumentForm({ ...documentForm, client_id: value === 'all' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client: Client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDocumentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </HRLayout>
  );
}
