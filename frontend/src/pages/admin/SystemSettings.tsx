import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getSystemSettings, updateSystemSettings } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import { Settings, CalendarDays, Info, FileText, Code, Upload, Trash2, ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FILE_BASE } from '@/config';

type SaturdayRule = 'all_off' | 'all_on' | '2nd_4th_off' | '1st_3rd_off' | 'custom';

const SATURDAY_RULES: { value: SaturdayRule; label: string; description: string }[] = [
  { value: 'all_off', label: 'All Saturdays Off', description: 'Every Saturday is a holiday (Sun + all Sat off)' },
  { value: 'all_on', label: 'All Saturdays Working', description: 'Every Saturday is a working day' },
  { value: '2nd_4th_off', label: '2nd & 4th Saturday Off', description: '1st, 3rd (& 5th) Saturdays are working' },
  { value: '1st_3rd_off', label: '1st & 3rd Saturday Off', description: '2nd, 4th (& 5th) Saturdays are working' },
  { value: 'custom', label: 'Custom', description: 'Manually choose which week Saturdays are off' },
];

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSystemSettings();
      setSettings({
        ...data,
        saturday_rule: (data as any).saturday_rule || 'all_off',
        saturday_off_weeks: (data as any).saturday_off_weeks || [],
        invoice_template: (data as any).invoice_template || '',
        company_logo: (data as any).company_logo || null
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await updateSystemSettings({
        company_name: settings.company_name,
        company_email: settings.company_email,
        company_phone: settings.company_phone,
        company_address: settings.company_address,
        work_start_time: settings.work_start_time,
        work_end_time: settings.work_end_time,
        lunch_start_time: settings.lunch_start_time,
        lunch_end_time: settings.lunch_end_time,
        work_hours_per_day: settings.work_hours_per_day,
        late_threshold_minutes: settings.late_threshold_minutes,
        half_day_start_time: settings.half_day_start_time,
        half_day_end_time: settings.half_day_end_time,
        half_day_late_threshold: settings.half_day_late_threshold,
        half_day_work_hours: settings.half_day_work_hours,
        overtime_enabled: settings.overtime_enabled,
        overtime_threshold_hours: settings.overtime_threshold_hours,
        half_day_overtime_threshold_hours: settings.half_day_overtime_threshold_hours,
        saturday_rule: settings.saturday_rule,
        saturday_off_weeks: settings.saturday_off_weeks,
        invoice_template: settings.invoice_template,
        company_logo: settings.company_logo,
      } as any);
      toast({ title: 'Success', description: 'Settings updated successfully' });
      loadSettings();
    } catch {
      toast({ title: 'Error', description: 'Failed to update settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        setSettings({ ...settings, company_logo: data.url });
        toast({ title: 'Success', description: 'Logo uploaded. Click Save to apply.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to upload logo', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-muted-foreground">Configure system-wide settings</p>
          </div>
          <Settings className="h-8 w-8 text-primary" />
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="attendance">Attendance & Rules</TabsTrigger>
            <TabsTrigger value="billing">Bill Format</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSave} className="space-y-6">
            <TabsContent value="general" className="space-y-6">
              {/* Company Info */}
              <Card>
                <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input id="company_name" value={settings?.company_name || ''} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_email">Company Email</Label>
                      <Input id="company_email" type="email" value={settings?.company_email || ''} onChange={(e) => setSettings({ ...settings, company_email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_phone">Company Phone</Label>
                      <Input id="company_phone" value={settings?.company_phone || ''} onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_address">Company Address</Label>
                    <Input id="company_address" value={settings?.company_address || ''} onChange={(e) => setSettings({ ...settings, company_address: e.target.value })} />
                  </div>

                  <div className="space-y-4 pt-2">
                    <Label>Company Logo</Label>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6 border-2 border-dashed rounded-2xl bg-muted/30">
                      <div className="relative group">
                        <div className="h-24 w-44 rounded-xl border bg-white flex items-center justify-center overflow-hidden shadow-sm transition-transform group-hover:scale-[1.02]">
                          {settings?.company_logo ? (
                            <img
                              src={settings.company_logo.startsWith('http') ? settings.company_logo : `${FILE_BASE}${settings.company_logo}`}
                              alt="Logo Preview"
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                              <ImageIcon className="h-8 w-8" />
                              <span className="text-[10px] font-medium uppercase tracking-wider">No Logo</span>
                            </div>
                          )}
                        </div>
                        {settings?.company_logo && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setSettings({ ...settings, company_logo: null })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">Brand Identity</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Upload your company logo to display on reports, invoices, and the dashboard sidebar.
                            Recommended: PNG or SVG with transparent background.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="relative overflow-hidden group/btn px-4 bg-white"
                          >
                            <Upload className="h-3.5 w-3.5 mr-2 group-hover/btn:scale-110 transition-transform" />
                            Upload New Logo
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={handleLogoUpload}
                            />
                          </Button>
                          {settings?.company_logo && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-1">
                              Logo Connected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-6">
              {/* Work Hours */}
              <Card>
                <CardHeader><CardTitle>Work Hours Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="work_start_time">Clock-In Time (On Time)</Label>
                      <Input id="work_start_time" type="time" value={settings?.work_start_time || ''} onChange={(e) => setSettings({ ...settings, work_start_time: e.target.value })} />
                      <p className="text-xs text-muted-foreground">Expected arrival time (e.g., 10:00 AM)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="work_end_time">Clock-Out Time</Label>
                      <Input id="work_end_time" type="time" value={settings?.work_end_time || ''} onChange={(e) => setSettings({ ...settings, work_end_time: e.target.value })} />
                      <p className="text-xs text-muted-foreground">Expected departure time (e.g., 7:00 PM)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lunch_start_time">Lunch Break Start</Label>
                      <Input id="lunch_start_time" type="time" value={settings?.lunch_start_time || ''} onChange={(e) => setSettings({ ...settings, lunch_start_time: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lunch_end_time">Lunch Break End</Label>
                      <Input id="lunch_end_time" type="time" value={settings?.lunch_end_time || ''} onChange={(e) => setSettings({ ...settings, lunch_end_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-4 text-primary">Half Day Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="half_day_start_time">Half Day Clock-In (Start)</Label>
                        <Input id="half_day_start_time" type="time" value={settings?.half_day_start_time || '09:00'} onChange={(e) => setSettings({ ...settings, half_day_start_time: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="half_day_end_time">Half Day Clock-Out (End)</Label>
                        <Input id="half_day_end_time" type="time" value={settings?.half_day_end_time || '14:00'} onChange={(e) => setSettings({ ...settings, half_day_end_time: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="half_day_late_threshold">Half Day Late Threshold (minutes)</Label>
                        <Input id="half_day_late_threshold" type="number" value={settings?.half_day_late_threshold || 15} onChange={(e) => setSettings({ ...settings, half_day_late_threshold: parseInt(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="half_day_work_hours">Half Day Expected Work Hours</Label>
                        <Input id="half_day_work_hours" type="number" step="0.1" value={settings?.half_day_work_hours || 4} onChange={(e) => setSettings({ ...settings, half_day_work_hours: parseFloat(e.target.value) })} />
                      </div>
                    </div>
                  </div>

                  {/* Overtime Configuration */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-primary">Overtime Configuration</h4>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="overtime_enabled" className="text-xs uppercase font-bold text-muted-foreground mr-2">Enable Overtime</Label>
                        <Select
                          value={settings?.overtime_enabled ? "true" : "false"}
                          onValueChange={(val) => setSettings({ ...settings, overtime_enabled: val === "true" })}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Enabled</SelectItem>
                            <SelectItem value="false">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="overtime_threshold_hours">Full Day Overtime Threshold (Hours)</Label>
                        <Input
                          id="overtime_threshold_hours"
                          type="number"
                          step="0.1"
                          disabled={!settings?.overtime_enabled}
                          value={settings?.overtime_threshold_hours || 8}
                          onChange={(e) => setSettings({ ...settings, overtime_threshold_hours: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">Work after these hours will count as overtime.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="half_day_overtime_threshold_hours">Half Day Overtime Threshold (Hours)</Label>
                        <Input
                          id="half_day_overtime_threshold_hours"
                          type="number"
                          step="0.1"
                          disabled={!settings?.overtime_enabled}
                          value={settings?.half_day_overtime_threshold_hours || 4}
                          onChange={(e) => setSettings({ ...settings, half_day_overtime_threshold_hours: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">Work after these hours on a half-day will count as overtime.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="work_hours_per_day">Expected Work Hours Per Day</Label>
                      <Input id="work_hours_per_day" type="number" step="0.5" min="1" max="24" value={settings?.work_hours_per_day || 8} onChange={(e) => setSettings({ ...settings, work_hours_per_day: parseFloat(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="late_threshold_minutes">Late Threshold (minutes)</Label>
                      <Input id="late_threshold_minutes" type="number" value={settings?.late_threshold_minutes || 0} onChange={(e) => setSettings({ ...settings, late_threshold_minutes: parseInt(e.target.value) })} />
                      <p className="text-xs text-muted-foreground">Grace period before marking as late</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Working Days / Saturday Rule ─────────────────────────── */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Working Days Configuration</CardTitle>
                      <CardDescription className="mt-1">
                        Set which Saturdays are working days. Sunday is always off.
                        This affects absence auto-generation.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Rule Selector */}
                  <div className="space-y-2">
                    <Label>Saturday Working Rule</Label>
                    <Select
                      value={settings?.saturday_rule || 'all_off'}
                      onValueChange={(val) => setSettings({ ...settings, saturday_rule: val, saturday_off_weeks: [] })}
                    >
                      <SelectTrigger className="w-full md:w-80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SATURDAY_RULES.map(r => (
                          <SelectItem key={r.value} value={r.value}>
                            <div>
                              <span className="font-medium">{r.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">— {r.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Invoice Template (HTML Format)</CardTitle>
                      <CardDescription>Customize how your client invoices look when downloaded.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="invoice_template" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        HTML Structure
                      </Label>
                      <Badge variant="outline" className="text-[10px] uppercase">Customizable</Badge>
                    </div>
                    <Textarea
                      id="invoice_template"
                      className="min-h-[400px] font-mono text-xs p-4 bg-slate-950 text-emerald-400 border-none rounded-lg"
                      placeholder="Enter your HTML template here..."
                      value={settings?.invoice_template || ''}
                      onChange={(e) => setSettings({ ...settings, invoice_template: e.target.value })}
                    />
                  </div>

                  <div className="bg-muted/50 p-4 rounded-xl border">
                    <h4 className="font-bold text-xs mb-2 flex items-center gap-2">
                      <Info className="h-3 w-3" />
                      Available Placeholders
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        'company_name', 'company_address', 'company_email', 'company_phone',
                        'invoice_number', 'invoice_date', 'due_date', 'amount',
                        'client_company', 'client_contact', 'client_email', 'client_address',
                        'status', 'status_color'
                      ].map(p => (
                        <code key={p} className="text-[10px] px-2 py-1 bg-white border rounded">{'{{'}{p}{'}}'}</code>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={saving} size="lg" className="px-8 shadow-lg shadow-primary/20">
                {saving ? 'Saving...' : 'Save All Settings'}
              </Button>
            </div>
          </form>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

