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
  getAllFollowUps,
  getWarnings,
  createWarning,
  deleteWarning,
} from '@/db/api';
import type { Holiday, Announcement, Profile, Client, Document, Notification, FollowUp, Warning } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Calendar, Bell, Cake, FileText, Upload, Phone, MessageCircle, Mail, Video, ChevronRight, AlertTriangle, ShieldAlert } from 'lucide-react';
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
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
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

  const [warningForm, setWarningForm] = useState({
    title: '',
    message: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    target_role: 'all' as 'all' | 'employee' | 'bde' | 'hr' | 'individual',
    user_id: '',
    expires_at: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [holidaysData, announcementsData, employeesData, clientsData, documentsData, notificationsData, allFollowUps, warningsData] = await Promise.all([
        getAllHolidays(),
        getAllAnnouncements(),
        getAllProfiles(),
        getAllClients(),
        getAllDocuments(),
        getAllNotifications(),
        getAllFollowUps(),
        getWarnings(true),
      ]);
      setHolidays(holidaysData);
      setAnnouncements(announcementsData);
      setEmployees(employeesData);
      setClients(clientsData);
      setDocuments(documentsData);
      setNotifications(notificationsData);
      setWarnings(warningsData);
      setFollowUps(allFollowUps.filter(
        (f: FollowUp) => f.assigned_to === profile?.id || (f.assigned_to as any)?._id === profile?.id
      ));
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

  const handleAddWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningForm.title || !warningForm.message) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    try {
      await createWarning({
        title: warningForm.title,
        message: warningForm.message,
        severity: warningForm.severity,
        target_role: warningForm.target_role,
        user_id: warningForm.target_role === 'individual' ? warningForm.user_id : null,
        expires_at: warningForm.expires_at ? new Date(warningForm.expires_at).toISOString() : null,
        created_by: profile?.id || null,
        is_active: true,
      });
      toast({ title: 'Warning Posted', description: 'Warning published successfully' });
      setWarningForm({ title: '', message: '', severity: 'medium', target_role: 'all', user_id: '', expires_at: '' });
      setWarningDialogOpen(false);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to post warning', variant: 'destructive' });
    }
  };

  const handleDeleteWarning = async (id: string) => {
    if (!confirm('Delete this warning?')) return;
    try {
      await deleteWarning(id);
      toast({ title: 'Warning Deleted' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete warning', variant: 'destructive' });
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
          <TabsList className="flex flex-wrap md:grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1.5 bg-muted/30 backdrop-blur-sm rounded-2xl border border-muted-foreground/5 sticky top-0 z-10">
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
            <TabsTrigger value="followups" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all duration-200 relative">
              <Bell className="h-4 w-4 mr-2 text-amber-500" />
              My Follow-Ups
              {followUps.filter(f => f.status !== 'completed').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center">
                  {followUps.filter(f => f.status !== 'completed').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all duration-200">
              <FileText className="h-4 w-4 mr-2 text-primary/70" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all duration-200">
              <Bell className="h-4 w-4 mr-2 text-primary/70" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="warnings" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all duration-200">
              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
              Warnings
              {warnings.filter(w => w.is_active).length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[9px] font-black rounded-full h-4 w-4 inline-flex items-center justify-center">
                  {warnings.filter(w => w.is_active).length}
                </span>
              )}
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

          {/* ── MY FOLLOW-UPS TAB (HR) ── */}
          <TabsContent value="followups" className="space-y-4">
            <div className="grid gap-5">
              {followUps.length === 0 ? (
                <Card className="border-dashed border-amber-200">
                  <CardContent className="text-center py-14 text-muted-foreground flex flex-col items-center gap-3">
                    <Bell className="h-10 w-10 opacity-20 text-amber-500" />
                    <p className="font-semibold">No follow-ups assigned to you</p>
                    <p className="text-sm">Admin will assign follow-ups from the Follow-Up Management panel</p>
                  </CardContent>
                </Card>
              ) : (
                followUps.map((fu) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-100 text-amber-700 border-amber-200',
                    in_followup: 'bg-blue-100 text-blue-700 border-blue-200',
                    waiting_client: 'bg-purple-100 text-purple-700 border-purple-200',
                    completed: 'bg-green-100 text-green-700 border-green-200',
                  };
                  const statusLabels: Record<string, string> = {
                    pending: 'Pending', in_followup: 'In Follow-Up',
                    waiting_client: 'Waiting From Client', completed: 'Completed',
                  };
                  const commIcons: Record<string, React.ReactNode> = {
                    call: <Phone className="h-3.5 w-3.5" />,
                    whatsapp: <MessageCircle className="h-3.5 w-3.5 text-green-500" />,
                    email: <Mail className="h-3.5 w-3.5 text-blue-500" />,
                    meeting: <Video className="h-3.5 w-3.5 text-purple-500" />,
                  };
                  const isOverdue = fu.deadline && fu.status !== 'completed' && new Date(fu.deadline) < new Date();
                  return (
                    <Card key={fu.id} className={`group hover:shadow-xl transition-all duration-300 border-l-4 overflow-hidden ${fu.status === 'completed' ? 'border-l-green-500 opacity-70' :
                      isOverdue ? 'border-l-red-500' : 'border-l-amber-500'
                      }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1">
                            <p className="text-xs font-mono text-muted-foreground">{fu.followup_id || ''}</p>
                            <CardTitle className="text-xl font-black">{fu.title}</CardTitle>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {commIcons[fu.communication_method] || <Bell className="h-3.5 w-3.5" />}
                              <span className="capitalize">{fu.communication_method}</span>
                              {fu.related_name && <><span>•</span><span>{fu.related_name} ({fu.related_type})</span></>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`border text-xs ${statusColors[fu.status] || ''}`}>
                              {statusLabels[fu.status] || fu.status}
                            </Badge>
                            {isOverdue && <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">⚠️ Overdue</Badge>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {fu.description && (
                          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl leading-relaxed">{fu.description}</p>
                        )}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {fu.deadline && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Deadline:</span>
                              <span className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
                                {new Date(fu.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                          {fu.next_action_date && (
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Next Action:</span>
                              <span className="font-semibold">
                                {new Date(fu.next_action_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>
                        {(fu.required_items || []).length > 0 && (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Required Items</p>
                            <ul className="space-y-1">
                              {fu.required_items.map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                  <ChevronRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />{item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(fu.update_notes || []).length > 0 && (
                          <div className="border-t pt-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Latest Update</p>
                            <div className="p-3 bg-amber-50 rounded-xl border-l-4 border-amber-400">
                              <p className="text-sm font-medium">{fu.update_notes[fu.update_notes.length - 1].text}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
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

          {/* ── WARNINGS TAB ── */}
          <TabsContent value="warnings" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setWarningDialogOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20">
                <Plus className="h-4 w-4" />
                Post Warning
              </Button>
            </div>
            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-10"><div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto" /></div>
              ) : warnings.length === 0 ? (
                <Card className="border-dashed border-red-200">
                  <CardContent className="text-center py-14 flex flex-col items-center gap-3">
                    <ShieldAlert className="h-12 w-12 opacity-20 text-red-500" />
                    <p className="font-semibold text-muted-foreground">No warnings posted yet</p>
                    <p className="text-sm text-muted-foreground">Post a warning for employees or BDE</p>
                  </CardContent>
                </Card>
              ) : (
                warnings.map((w) => {
                  const sevConfig: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
                    low: { bg: 'bg-blue-50', border: 'border-l-blue-400', badge: 'bg-blue-100 text-blue-800', icon: 'ℹ️' },
                    medium: { bg: 'bg-amber-50', border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-800', icon: '⚠️' },
                    high: { bg: 'bg-orange-50', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-800', icon: '🔶' },
                    critical: { bg: 'bg-red-50', border: 'border-l-red-600', badge: 'bg-red-100 text-red-800', icon: '🚨' },
                  };
                  const sc = sevConfig[w.severity] || sevConfig.medium;
                  return (
                    <div key={w.id} className={`rounded-2xl border-l-4 p-5 ${sc.bg} ${sc.border} shadow-sm flex items-start justify-between gap-4 group hover:shadow-md transition-all`}>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-lg">{sc.icon}</span>
                          <h3 className="font-black text-lg">{w.title}</h3>
                          <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${sc.badge}`}>
                            {w.severity}
                          </span>
                          <span className="text-[10px] uppercase font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            → {w.target_role === 'all' ? 'Everyone' :
                              w.target_role === 'individual' ? ((w.user_id as any)?.full_name || 'Particular User') :
                                w.target_role}
                          </span>
                          {!w.is_active && <span className="text-[10px] font-bold text-muted-foreground">[Inactive]</span>}
                        </div>
                        <p className="text-sm leading-relaxed text-slate-700">{w.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{new Date(w.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {w.expires_at && <span>Expires: {new Date(w.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600 rounded-full"
                        onClick={() => handleDeleteWarning(w.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
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

        {/* ── WARNING DIALOG ── */}
        <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Post Warning
              </DialogTitle>
              <DialogDescription>Post a warning notice visible to employees and/or BDE members.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddWarning} className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label>Warning Title *</Label>
                <Input
                  placeholder="e.g. Attendance Policy Reminder"
                  value={warningForm.title}
                  onChange={e => setWarningForm({ ...warningForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  placeholder="Describe the warning in detail..."
                  value={warningForm.message}
                  onChange={e => setWarningForm({ ...warningForm, message: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={warningForm.severity} onValueChange={v => setWarningForm({ ...warningForm, severity: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">ℹ️ Low</SelectItem>
                      <SelectItem value="medium">⚠️ Medium</SelectItem>
                      <SelectItem value="high">🔶 High</SelectItem>
                      <SelectItem value="critical">🚨 Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visible To</Label>
                  <Select value={warningForm.target_role} onValueChange={v => setWarningForm({ ...warningForm, target_role: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="individual">Particular User</SelectItem>
                      <SelectItem value="employee">Employees Only</SelectItem>
                      <SelectItem value="bde">BDE Only</SelectItem>
                      <SelectItem value="hr">HR Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {warningForm.target_role === 'individual' && (
                <div className="space-y-2">
                  <Label>Select Employee *</Label>
                  <Select value={warningForm.user_id} onValueChange={v => setWarningForm({ ...warningForm, user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Search member..." /></SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.is_active).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="date"
                  value={warningForm.expires_at}
                  onChange={e => setWarningForm({ ...warningForm, expires_at: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setWarningDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">Post Warning</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </HRLayout>
  );
}
