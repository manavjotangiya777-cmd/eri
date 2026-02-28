import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/db/api';
import { API_URL } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, User, Mail, Phone, Shield, Calendar, Building2, Save, Loader2, Pencil } from 'lucide-react';

// Lazy layout import based on role
import AdminLayout from '@/components/layouts/AdminLayout';
import HRLayout from '@/components/layouts/HRLayout';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import ClientLayout from '@/components/layouts/ClientLayout';
import BDELayout from '@/components/layouts/BDELayout';

function LayoutWrapper({ role, children }: { role: string; children: React.ReactNode }) {
  if (role === 'hr') return <HRLayout>{children}</HRLayout>;
  if (role === 'employee') return <EmployeeLayout>{children}</EmployeeLayout>;
  if (role === 'client') return <ClientLayout>{children}</ClientLayout>;
  if (role === 'bde') return <BDELayout>{children}</BDELayout>;
  return <AdminLayout>{children}</AdminLayout>;
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.url) throw new Error('Upload failed');
      const fullUrl = data.url.startsWith('http') ? data.url : `${API_URL.replace('/api', '')}${data.url}`;
      await updateProfile(profile.id, { avatar_url: fullUrl } as any);
      setAvatarUrl(fullUrl);
      await refreshProfile();
      toast({ title: 'Photo Updated', description: 'Your profile photo has been changed.' });
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (form.email && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await updateProfile(profile.id, {
        full_name: form.full_name || null,
        username: form.username || profile.username,
        email: form.email ? form.email.toLowerCase().trim() : null,
        phone: form.phone || null,
      } as any);
      await refreshProfile();
      toast({ title: 'Profile Saved! ✅', description: 'Your profile has been updated successfully.' });
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/15 text-destructive border-destructive/30',
    hr: 'bg-primary/15 text-primary border-primary/30',
    employee: 'bg-secondary/60 text-secondary-foreground border-secondary',
    client: 'bg-blue-500/15 text-blue-600 border-blue-300',
    bde: 'bg-purple-500/15 text-purple-600 border-purple-300',
  };

  const initials = (form.full_name || form.username || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (!profile) return null;

  return (
    <LayoutWrapper role={profile.role}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your personal information and account settings</p>
          </div>
        </div>

        {/* Avatar Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <Avatar className="h-28 w-28 border-4 border-primary/20 shadow-lg">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={form.full_name || form.username} />}
                  <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  {uploading
                    ? <Loader2 className="h-7 w-7 text-white animate-spin" />
                    : <Camera className="h-7 w-7 text-white" />
                  }
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
              <div className="flex-1 text-center sm:text-left space-y-2">
                <h2 className="text-2xl font-bold">{form.full_name || form.username}</h2>
                <p className="text-muted-foreground text-sm">@{profile.username}</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Badge className={`capitalize border ${roleColors[profile.role] || ''}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {profile.role}
                  </Badge>
                  {(profile as any).department && (
                    <Badge variant="outline">
                      <Building2 className="h-3 w-3 mr-1" />
                      {(profile as any).department}
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <Pencil className="h-3 w-3" />
                  {uploading ? 'Uploading...' : 'Change Profile Photo'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your profile details. Email can be used to log in.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    <User className="h-3.5 w-3.5 inline mr-1.5 opacity-60" />
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">
                    <User className="h-3.5 w-3.5 inline mr-1.5 opacity-60" />
                    Username <span className="text-xs text-muted-foreground ml-1">(display name)</span>
                  </Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="your_username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-3.5 w-3.5 inline mr-1.5 opacity-60" />
                    Email Address <span className="text-xs text-primary ml-1 font-semibold">(for login)</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                  />
                  <p className="text-xs text-muted-foreground">Set an email to log in without your username</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-3.5 w-3.5 inline mr-1.5 opacity-60" />
                    Mobile Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <Separator />

              {/* Read-only info */}
              <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-xl p-4">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Role</p>
                  <p className="text-sm font-semibold capitalize">{profile.role}</p>
                </div>
                {(profile as any).department && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Department</p>
                    <p className="text-sm font-semibold">{(profile as any).department}</p>
                  </div>
                )}
                {profile.hire_date && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">
                      <Calendar className="h-3 w-3 inline mr-1" />Joined
                    </p>
                    <p className="text-sm font-semibold">{new Date(profile.hire_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} size="lg" className="px-8 shadow-lg shadow-primary/20">
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Save Changes</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  );
}
