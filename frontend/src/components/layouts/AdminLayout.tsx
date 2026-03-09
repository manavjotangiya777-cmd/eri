import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationCenter from '@/components/common/NotificationCenter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSystemSettings } from '@/db/api';
import { useEffect } from 'react';
import { FILE_BASE } from '@/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  Clock,
  Settings,
  Menu,
  LogOut,
  User,
  MessageSquare,
  Building2,
  Sparkles,
  Receipt,
  Shield,
  UserX,
  Calendar,
  Bell,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useChatUnread } from '@/hooks/use-chat-unread';
import { useFollowUpBadge } from '@/hooks/use-followup-badge';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'User Management', path: '/admin/users' },
  { icon: Building2, label: 'Departments', path: '/admin/departments' },
  { icon: Briefcase, label: 'Clients', path: '/admin/clients' },
  { icon: CheckSquare, label: 'Tasks', path: '/admin/tasks' },
  { icon: Bell, label: 'Follow-Ups', path: '/admin/followups' },
  { icon: Receipt, label: 'Invoices', path: '/admin/invoices' },
  { icon: Clock, label: 'Attendance', path: '/admin/attendance' },
  { icon: Calendar, label: 'HR Leave Requests', path: '/admin/hr-leaves' },
  { icon: Shield, label: 'Network Security', path: '/admin/network-security' },
  { icon: MessageSquare, label: 'Chat', path: '/admin/chat' },
  { icon: Users, label: 'Client Support', path: '/admin/client-support' },
  { icon: UserX, label: 'Absence Records', path: '/admin/absences' },
  { icon: Sparkles, label: 'AI Assistant', path: '/admin/ai-assistant' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export default function AdminLayout({ children, fullWidth = false }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    getSystemSettings().then(setSettings).catch(console.error);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const NavContent = () => {
    const unreadChatCount = useChatUnread();
    const followUpBadge = useFollowUpBadge();

    return (
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            {settings?.company_logo ? (
              <img
                src={settings.company_logo.startsWith('http') ? settings.company_logo : `${FILE_BASE}${settings.company_logo}`}
                alt="Logo"
                className="h-8 w-auto object-contain max-w-[150px] mt-2"
              />
            ) : (
              <>
                <Building2 className="h-6 w-6 text-sidebar-foreground" />
                <span className="font-bold text-lg text-sidebar-foreground">
                  {settings?.company_name || 'error Infotech'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-sidebar-foreground/70 font-bold tracking-widest uppercase">Admin Panel</p>
            <Badge variant="outline" className="border-sidebar-foreground/20 text-sidebar-foreground/50 text-[10px] h-4 font-normal">v1-updated</Badge>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isChat = item.label === 'Chat';
            const isFollowUp = item.label === 'Follow-Ups';

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {isChat && unreadChatCount > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </Badge>
                )}
                {isFollowUp && followUpBadge > 0 && (
                  <Badge className="h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full bg-amber-500 hover:bg-amber-500">
                    {followUpBadge > 9 ? '9+' : followUpBadge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/30">
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 z-20 w-64 bg-sidebar border-r border-sidebar-border overflow-y-auto shadow-xl">
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen relative min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-4 lg:px-8 shadow-sm">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden hover:bg-slate-100 rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-80 p-0 bg-sidebar border-none shadow-2xl">
              <NavContent />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <NotificationCenter />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/ai-assistant')}
            className="text-primary hover:text-primary hover:bg-primary/10"
            title="AI Assistant"
          >
            <Sparkles className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.username} />}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.username?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline">{profile?.username || 'Admin'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className={cn("flex-1 bg-slate-50/10 min-h-0 flex flex-col", fullWidth ? "p-0" : "p-4 md:p-6 lg:p-8 overflow-y-auto")}>
          <div className={cn("w-full flex-1 min-h-0 flex flex-col", !fullWidth && "space-y-6")}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
