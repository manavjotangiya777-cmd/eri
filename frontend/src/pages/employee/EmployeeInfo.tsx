import React, { useEffect, useState } from 'react';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllHolidays, getAllAnnouncements, getMyDocuments, getAllProfiles, getMyNotifications, getMyWarnings } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Holiday, Announcement, Document, Profile, Notification, Warning } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Bell, FileText, Download, Cake, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmployeeInfo({ Layout = EmployeeLayout }: { Layout?: any }) {
  const { profile } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [holidaysData, announcementsData, documentsData, notificationsData, warningsData] = await Promise.all([
        getAllHolidays(),
        getAllAnnouncements(),
        getMyDocuments(profile),
        getMyNotifications(profile.id, profile.role),
        getMyWarnings(profile.id, profile.role),
      ]);

      // Get upcoming birthdays using API
      const allProfiles = await getAllProfiles();
      const birthdaysData = allProfiles
        .filter(p => p.date_of_birth)
        .map(p => ({
          ...p,
          date_of_birth: p.date_of_birth
        }));

      console.log('Loaded employee info:', {
        holidays: holidaysData.length,
        announcements: announcementsData.length,
        documents: documentsData.length,
        birthdays: birthdaysData?.length || 0,
      });

      setHolidays(holidaysData);
      setAnnouncements(announcementsData);
      setDocuments(documentsData);
      setNotifications(notificationsData);
      setBirthdays(birthdaysData || []);
      setWarnings(warningsData);
    } catch (error) {
      console.error('Failed to load information:', error);
      toast({
        title: 'Error',
        description: 'Failed to load information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatBirthday = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  };

  const getUpcomingBirthdays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    return birthdays
      .filter((person: Profile) => person.is_active !== false)
      .map((person) => {
        const dob = new Date(person.date_of_birth);
        // Create this year's birthday
        let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());

        // If birthday already passed this year, look at next year
        if (nextBirthday < today) {
          nextBirthday.setFullYear(currentYear + 1);
        }

        const diffTime = nextBirthday.getTime() - today.getTime();
        const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

        return { ...person, daysUntil, nextBirthday };
      })
      .filter((person) => person.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const handleDownload = async (doc: Document) => {
    try {
      if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      }
    } catch (error) {
      console.error('Failed to download document:', error);
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const upcomingBirthdays = getUpcomingBirthdays();

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Company Info</h1>
            <p className="text-muted-foreground font-medium">Internal resources, events, and celebrations</p>
          </div>
        </div>

        <Tabs defaultValue="announcements" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-auto p-1.5 bg-muted/40 backdrop-blur-sm rounded-2xl border border-muted-foreground/5 overflow-hidden">
            <TabsTrigger value="holidays" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all">
              <Calendar className="h-4 w-4 mr-2" />
              Holidays
            </TabsTrigger>
            <TabsTrigger value="announcements" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all">
              <Bell className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="birthdays" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all">
              <Cake className="h-4 w-4 mr-2" />
              Birthdays
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all">
              <FileText className="h-4 w-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all">
              <Bell className="h-4 w-4 mr-2" />
              Broadcasts
            </TabsTrigger>
            <TabsTrigger value="warnings" className="rounded-xl py-3 data-[state=active]:shadow-md transition-all relative">
              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
              Warnings
              {warnings.filter(w => w.is_active).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center">
                  {warnings.filter(w => w.is_active).length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── WARNINGS VIEW TAB ── */}
          <TabsContent value="warnings">
            <div className="grid gap-4">
              {warnings.length === 0 ? (
                <Card className="border-dashed border-red-100">
                  <CardContent className="text-center py-14 flex flex-col items-center gap-3">
                    <AlertTriangle className="h-10 w-10 opacity-20 text-red-400" />
                    <p className="font-semibold text-muted-foreground">No warnings issued</p>
                    <p className="text-sm text-muted-foreground">You're all clear! No active warnings.</p>
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
                    <div key={w.id} className={`rounded-2xl border-l-4 p-5 ${sc.bg} ${sc.border} shadow-sm space-y-2 hover:shadow-md transition-all`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xl">{sc.icon}</span>
                        <h3 className="font-black text-lg">{w.title}</h3>
                        <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${sc.badge}`}>
                          {w.severity}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700">{w.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span>Posted: {new Date(w.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {w.expires_at && <span>Expires: {new Date(w.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="holidays">
            <Card className="border-muted-foreground/10 shadow-lg overflow-hidden">
              <CardHeader className="bg-primary/5 pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Calendar className="h-6 w-6 text-primary" />
                  Holiday Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {holidays.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No holidays scheduled
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold">Holiday Name</TableHead>
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays.map((holiday) => (
                        <TableRow key={holiday.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-bold text-foreground py-4 text-base">{holiday.name}</TableCell>
                          <TableCell className="font-medium text-muted-foreground">{formatDate(holiday.date)}</TableCell>
                          <TableCell className="text-muted-foreground italic">
                            {holiday.description || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <div className="grid gap-6">
              {announcements.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                    <Bell className="h-10 w-10 opacity-20" />
                    No announcements posted yet
                  </CardContent>
                </Card>
              ) : (
                announcements.map((announcement) => (
                  <Card key={announcement.id} className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                            {announcement.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(announcement.created_at)}
                          </div>
                        </div>
                        <Badge variant={announcement.priority === 'urgent' ? 'destructive' : 'secondary'} className="uppercase tracking-[0.1em] font-black italic">
                          {announcement.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base text-muted-foreground leading-relaxed bg-muted/20 p-4 rounded-xl">
                        {announcement.content}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>


          <TabsContent value="birthdays">
            <Card className="border-muted-foreground/10 shadow-lg overflow-hidden">
              <CardHeader className="bg-pink-500/5 pb-6 border-b border-pink-500/10">
                <CardTitle className="flex items-center gap-3 text-2xl text-pink-600">
                  <Cake className="h-7 w-7" />
                  Upcoming Celebrations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {upcomingBirthdays.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                    <Sparkles className="h-10 w-10 opacity-20" />
                    No upcoming birthdays in the next 30 days
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingBirthdays.map((person) => (
                      <div key={person.id} className="p-5 rounded-2xl border border-pink-500/10 bg-gradient-to-br from-card to-pink-500/5 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-pink-500/10 rounded-2xl group-hover:scale-110 transition-transform shadow-inner shadow-white/10">
                            <Cake className="h-6 w-6 text-pink-500" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-lg text-foreground truncate">{person.full_name || person.username}</h3>
                            <p className="text-sm font-bold text-pink-500/70">{formatBirthday(person.date_of_birth)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-pink-500/5">
                          <Badge className={cn(
                            "rounded-full font-bold px-3 py-1 text-[11px] uppercase tracking-wider",
                            person.daysUntil === 0
                              ? "bg-pink-500 text-white animate-pulse"
                              : "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 shadow-none border-none"
                          )}>
                            {person.daysUntil === 0 ? 'Birthday Today! 🎉' : `In ${person.daysUntil} days`}
                          </Badge>

                          {person.daysUntil === 0 && (
                            <span className="text-[10px] uppercase font-black text-pink-500 tracking-tighter animate-bounce">
                              Celebration Time ✨
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="border-muted-foreground/10 shadow-lg overflow-hidden">
              <CardHeader className="bg-blue-500/5 pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <FileText className="h-6 w-6 text-blue-500" />
                  Shared Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 text-foreground">
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No documents shared with you yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold">Document Name</TableHead>
                        <TableHead className="font-bold">Type</TableHead>
                        <TableHead className="font-bold">Uploaded On</TableHead>
                        <TableHead className="text-right font-bold pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-bold py-4 pl-6">{doc.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-widest">{doc.file_type || 'file'}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium">{formatDate(doc.created_at)}</TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 font-bold hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="h-4 w-4" />
                              Download
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
            <div className="grid gap-4">
              {notifications.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                    <Bell className="h-10 w-10 opacity-20" />
                    No notifications or broadcasts yet
                  </CardContent>
                </Card>
              ) : (
                notifications.map((notif) => (
                  <Card key={notif.id} className="group hover:shadow-md transition-all border-l-4 border-l-blue-500 overflow-hidden bg-gradient-to-r from-blue-500/5 to-transparent">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Bell className="h-4 w-4 text-blue-500" />
                          </div>
                          <h4 className="font-bold text-lg">{notif.title}</h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest">{notif.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground ml-11">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-4 ml-11 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                        <Calendar className="h-3 w-3" />
                        {formatDate(notif.created_at)}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs >
      </div >
    </Layout >
  );
}
