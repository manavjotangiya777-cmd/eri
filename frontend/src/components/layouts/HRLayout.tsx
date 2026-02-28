import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationCenter from '@/components/common/NotificationCenter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSystemSettings } from '@/db/api';
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
  FileText,
  Menu,
  LogOut,
  User,
  MessageSquare,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  Headset,
  UserX,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useChatUnread } from '@/hooks/use-chat-unread';
import { cn } from '@/lib/utils';

interface HRLayoutProps {
  children: ReactNode;
}

const hrNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/hr' },
  { icon: Users, label: 'Employees', path: '/hr/employees' },
  { icon: Briefcase, label: 'Clients', path: '/hr/clients' },
  { icon: CheckSquare, label: 'Tasks', path: '/hr/tasks' },
  { icon: Clock, label: 'Attendance', path: '/hr/attendance' },
  { icon: Calendar, label: 'Leave Management', path: '/hr/leaves' },
  { icon: FileText, label: 'Content', path: '/hr/content' },
  { icon: MessageSquare, label: 'Chat', path: '/hr/chat' },
  { icon: UserX, label: 'Absence Records', path: '/hr/absences' },
  { icon: Sparkles, label: 'AI Assistant', path: '/hr/ai-assistant' },
];

export default function HRLayout({ children }: HRLayoutProps) {
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
          <p className="text-xs text-sidebar-foreground/70 mt-2 font-medium tracking-wide uppercase">HR Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {hrNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isChat = item.label === 'Chat';

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
              </Link>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 z-20 w-64 bg-sidebar border-r border-sidebar-border overflow-y-auto">
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar">
              <NavContent />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <NotificationCenter />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/hr/ai-assistant')}
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
                    {profile?.username?.charAt(0).toUpperCase() || 'H'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline">{profile?.username || 'HR'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/hr/profile')}>
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

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
