import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationCenter from '@/components/common/NotificationCenter';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  UserX,
  Bell,
  AlertTriangle,
  IndianRupee,
  HardDrive,
  Trophy,
  Layout,
  Award,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useChatUnread } from '@/hooks/use-chat-unread';
import { useFollowUpBadge } from '@/hooks/use-followup-badge';
import { useContentUnread } from '@/hooks/use-content-unread';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface HRLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

const hrNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/hr' },
  { icon: Users, label: 'Employees', path: '/hr/employees' },
  { icon: Briefcase, label: 'Clients', path: '/hr/clients' },
  { icon: CheckSquare, label: 'Tasks', path: '/hr/tasks' },
  { icon: Layout, label: 'Weekly Plan', path: '/hr/weekly-plan' },
  { icon: Bell, label: 'Follow-Ups', path: '/hr/followups' },
  { icon: Clock, label: 'Attendance', path: '/hr/attendance' },
  { icon: Calendar, label: 'Leave Management', path: '/hr/leaves' },
  { icon: FileText, label: 'Content', path: '/hr/content' },
  { icon: MessageSquare, label: 'Chat', path: '/hr/chat' },
  { icon: UserX, label: 'Absence Records', path: '/hr/absences' },
  { icon: AlertTriangle, label: 'Warnings', path: '/hr/warnings' },
  { icon: IndianRupee, label: 'Payroll', path: '/hr/salaries' },
  { icon: Trophy, label: 'Appreciations', path: '/hr/appreciations' },
  { icon: Award, label: 'My Performance', path: '/hr/performance' },
  { icon: Sparkles, label: 'AI Assistant', path: '/hr/ai-assistant' },
];

const NavContent = ({
  isCollapsed,
  settings,
  location,
  setMobileOpen,
  setIsPinned,
  isPinned
}: any) => {
  const unreadChatCount = useChatUnread();
  const followUpBadge = useFollowUpBadge();
  const contentBadge = useContentUnread();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border shadow-2xl overflow-hidden">
      <div className="p-4 border-b border-sidebar-border h-24 flex items-center justify-center overflow-hidden shrink-0">
        <motion.div
          animate={{
            width: isCollapsed ? 40 : 180,
            scale: isCollapsed ? 0.8 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex items-center justify-center"
        >
          {settings?.company_logo ? (
            <img
              src={settings.company_logo.startsWith('http') ? settings.company_logo : `${FILE_BASE}${settings.company_logo}`}
              alt="Logo"
              className="w-full h-auto object-contain max-h-16"
            />
          ) : (
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-sidebar-foreground shrink-0" />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-bold text-lg text-sidebar-foreground truncate"
                >
                  {settings?.company_name || 'error Infotech'}
                </motion.span>
              )}
            </div>
          )}
        </motion.div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar scroll-smooth">
        <TooltipProvider delayDuration={0}>
          {hrNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isChat = item.label === 'Chat';
            const isFollowUp = item.label === 'Follow-Ups';
            const isContent = item.label === 'Content';

            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    onClick={() => {
                      if (setMobileOpen) setMobileOpen(false);
                      if (isCollapsed && setIsPinned) setIsPinned(true);
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group h-12',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1 font-bold tracking-tight truncate text-sm"
                      >
                        {item.label}
                      </motion.span>
                    )}

                    {isChat && unreadChatCount > 0 && (
                      <Badge variant="destructive" className={cn("h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px] rounded-full", isCollapsed ? "absolute top-1 right-1" : "")}>
                        {unreadChatCount > 9 ? '9+' : unreadChatCount}
                      </Badge>
                    )}
                    {isFollowUp && followUpBadge > 0 && (
                      <Badge className={cn("h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px] rounded-full bg-amber-500 hover:bg-amber-500", isCollapsed ? "absolute top-1 right-1" : "")}>
                        {followUpBadge > 9 ? '9+' : followUpBadge}
                      </Badge>
                    )}
                    {isContent && contentBadge > 0 && (
                      <Badge variant="destructive" className={cn("h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px] rounded-full", isCollapsed ? "absolute top-1 right-1" : "")}>
                        {contentBadge > 9 ? '9+' : contentBadge}
                      </Badge>
                    )}
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" sideOffset={10} className="font-bold bg-slate-900 border-none text-white z-[100]">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      <div className="p-4 border-t border-sidebar-border shrink-0">
        <Button
          variant="ghost"
          onClick={() => setIsPinned(!isPinned)}
          className="w-full h-10 rounded-xl justify-center lg:justify-start gap-3 hover:bg-sidebar-accent/50"
        >
          <Menu className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className="font-bold text-sm">Expand Sidebar</span>}
        </Button>
      </div>
    </div>
  );
};

export default function HRLayout({ children, fullWidth = false }: HRLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const isCollapsed = !isPinned && !isHovered;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/30">
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "hidden lg:flex lg:flex-col fixed inset-y-0 left-0 z-20 transition-all duration-500 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <NavContent
          isCollapsed={isCollapsed}
          settings={settings}
          location={location}
          setIsPinned={setIsPinned}
          isPinned={isPinned}
        />
      </aside>

      <div className={cn(
        "flex-1 flex flex-col h-screen relative min-w-0 transition-all duration-500 ease-in-out",
        isCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-4 lg:px-8 shadow-sm shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden hover:bg-slate-100 rounded-full">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-80 p-0 bg-sidebar border-none shadow-2xl">
              <NavContent
                isCollapsed={false}
                settings={settings}
                location={location}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
              />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open('https://drive.google.com', '_blank')}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            title="Google Drive"
          >
            <HardDrive className="h-5 w-5" />
          </Button>

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

        <main className={cn(
          "flex-1 bg-slate-50/10 min-h-0 overflow-y-auto no-scrollbar scroll-smooth",
          !fullWidth && "p-4 lg:p-6"
        )}>
          <div className={cn("w-full transition-all duration-300", fullWidth ? "h-full" : "max-w-[1600px] mx-auto space-y-6 pb-12")}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
