import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Bell,
    Check,
    Info,
    AlertCircle,
    Cake,
    Calendar,
    ClipboardList,
    Clock,
    MessageSquare,
    X,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getMyNotifications, markNotificationRead, triggerBirthdayNotifications } from '@/db/api';
import type { Notification } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ── Route resolver by role + notification type ─────────────────────
function resolveNotificationRoute(notif: Notification, role: string): string | null {
    const type = notif.type;
    const base = `/${role}`;

    switch (type) {
        case 'chat':
            // chat notifications → chat page with chatId
            const chatId = notif.meta?.chat_id;
            const chatParam = chatId ? `?chatId=${chatId}` : '';
            return `${base}/chat${chatParam}`;
        case 'task':
            return role === 'admin' ? '/admin/tasks' : `${base}/tasks`;
        case 'announcement':
            // Employee/HR/BDE → info page; Admin → content
            if (role === 'employee') return '/employee/info';
            if (role === 'hr') return '/hr/content';
            if (role === 'bde') return '/bde/followups'; // closest
            return '/admin/settings';
        case 'leave':
            if (role === 'admin') return '/admin/hr-leaves';
            if (role === 'hr') return '/hr/leaves';
            return `${base}/leave`;
        case 'attendance':
            if (role === 'admin') return '/admin/attendance';
            if (role === 'hr') return '/hr/attendance';
            return `${base}/attendance-report`;
        case 'birthday':
            if (role === 'hr') return '/hr/content';
            if (role === 'employee') return '/employee/info';
            return null;
        default:
            return null;
    }
}

// ── Toast popup ───────────────────────────────────────────────────
type ToastItem = {
    id: string;
    title: string;
    message: string;
    type: string;
    route: string | null;
};

function NotificationToast({ item, onDismiss, onNavigate }: {
    item: ToastItem;
    onDismiss: () => void;
    onNavigate: (route: string) => void;
}) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 5000);
        return () => clearTimeout(t);
    }, [onDismiss]);

    const iconMap: Record<string, React.ReactNode> = {
        chat: <MessageSquare className="h-4 w-4 text-primary" />,
        task: <ClipboardList className="h-4 w-4 text-green-500" />,
        leave: <Calendar className="h-4 w-4 text-orange-500" />,
        announcement: <AlertCircle className="h-4 w-4 text-blue-500" />,
        birthday: <Cake className="h-4 w-4 text-pink-500" />,
        attendance: <Clock className="h-4 w-4 text-purple-500" />,
    };

    return (
        <div
            className={cn(
                'flex items-start gap-3 p-4 bg-card border border-border rounded-xl shadow-2xl',
                'w-80 animate-in slide-in-from-right-8 fade-in-0 duration-300',
                item.route ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''
            )}
            onClick={() => {
                if (item.route) { onNavigate(item.route); onDismiss(); }
            }}
        >
            <div className="mt-0.5 p-2 bg-muted rounded-lg shrink-0">
                {iconMap[item.type] || <Info className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
                {item.route && (
                    <p className="text-[10px] text-primary font-semibold mt-1">Click to view →</p>
                )}
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

// ── Toast container ───────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss, onNavigate }: {
    toasts: ToastItem[];
    onDismiss: (id: string) => void;
    onNavigate: (route: string) => void;
}) {
    if (toasts.length === 0) return null;
    return (
        <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto">
                    <NotificationToast item={t} onDismiss={() => onDismiss(t.id)} onNavigate={onNavigate} />
                </div>
            ))}
        </div>
    );
}

// ── Main NotificationCenter ───────────────────────────────────────
export default function NotificationCenter() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [open, setOpen] = useState(false);
    const prevNotifIdsRef = useRef<Set<string>>(new Set());
    const isFirstLoadRef = useRef(true);

    const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const handleNavigate = (route: string) => {
        setOpen(false);
        navigate(route);
    };

    const loadNotifications = useCallback(async () => {
        if (!profile?.id || !profile?.role) return;
        try {
            const data = await getMyNotifications(profile.id, profile.role);
            setNotifications(data);

            const unread = data.filter(n => !n.is_read_by.includes(profile.id)).length;
            setUnreadCount(unread);

            // Detect NEW notifications since last poll and show toasts
            if (!isFirstLoadRef.current) {
                const newItems = data.filter(n => !prevNotifIdsRef.current.has(n.id));
                if (newItems.length > 0) {
                    const toastItems: ToastItem[] = newItems.slice(0, 3).map(n => ({
                        id: `toast_${n.id}_${Date.now()}`,
                        title: n.title,
                        message: n.message,
                        type: n.type,
                        route: resolveNotificationRoute(n, profile.role),
                    }));
                    setToasts(prev => [...toastItems, ...prev].slice(0, 5));
                }
            } else {
                isFirstLoadRef.current = false;
            }

            prevNotifIdsRef.current = new Set(data.map(n => n.id));
        } catch (error) {
            console.error('Failed to load notifications', error);
        }
    }, [profile]);

    useEffect(() => {
        loadNotifications();
        triggerBirthdayNotifications().catch((err: any) => console.error('Birthday trigger failed:', err));

        const handleChatRead = () => loadNotifications();
        window.addEventListener('chat-read', handleChatRead);

        const interval = setInterval(loadNotifications, 7000);

        return () => {
            window.removeEventListener('chat-read', handleChatRead);
            clearInterval(interval);
        };
    }, [loadNotifications]);

    const handleMarkAsRead = async (id: string) => {
        if (!profile?.id) return;
        try {
            await markNotificationRead(profile.id, id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read_by: [...n.is_read_by, profile.id] } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const handleNotifClick = async (n: Notification) => {
        // Mark as read
        if (!n.is_read_by.includes(profile?.id || '')) {
            handleMarkAsRead(n.id);
        }
        // Navigate
        const route = resolveNotificationRoute(n, profile?.role || '');
        if (route) {
            setOpen(false);
            navigate(route);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'chat': return <MessageSquare className="h-4 w-4 text-primary" />;
            case 'birthday': return <Cake className="h-4 w-4 text-pink-500" />;
            case 'announcement': return <AlertCircle className="h-4 w-4 text-blue-500" />;
            case 'task': return <ClipboardList className="h-4 w-4 text-green-500" />;
            case 'leave': return <Calendar className="h-4 w-4 text-orange-500" />;
            case 'attendance': return <Clock className="h-4 w-4 text-purple-500" />;
            default: return <Info className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <>
            {/* ── Toast Popups ────────── */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} onNavigate={handleNavigate} />

            {/* ── Bell Dropdown ─────────────────────────────── */}
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <Badge
                                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground border-2 border-background"
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[360px] p-0 shadow-xl overflow-hidden rounded-xl border-primary/10">
                    <DropdownMenuLabel className="p-4 flex items-center justify-between bg-muted/30">
                        <span className="font-bold text-base">Notifications</span>
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                {unreadCount} New
                            </Badge>
                        )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="m-0" />
                    <ScrollArea className="h-[420px]">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <Bell className="h-8 w-8 opacity-20" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((n) => {
                                    const isRead = n.is_read_by.includes(profile?.id || '');
                                    const route = resolveNotificationRoute(n, profile?.role || '');
                                    return (
                                        <div
                                            key={n.id}
                                            onClick={() => handleNotifClick(n)}
                                            className={cn(
                                                'p-4 border-b last:border-0 transition-colors group relative',
                                                route ? 'cursor-pointer' : 'cursor-default',
                                                !isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
                                            )}
                                        >
                                            <div className="flex gap-3">
                                                <div className={cn(
                                                    'mt-1 p-2 rounded-lg shrink-0',
                                                    !isRead ? 'bg-background shadow-sm' : 'bg-muted/50'
                                                )}>
                                                    {getIcon(n.type)}
                                                </div>
                                                <div className="space-y-1 pr-6 text-left flex-1">
                                                    <p className={cn(
                                                        'text-sm font-semibold leading-none',
                                                        !isRead ? 'text-foreground' : 'text-muted-foreground'
                                                    )}>
                                                        {n.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                        {n.message}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] text-muted-foreground/70 font-medium">
                                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                                        </p>
                                                        {route && (
                                                            <span className="text-[10px] text-primary font-bold">
                                                                Click to view →
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {!isRead && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkAsRead(n.id);
                                                    }}
                                                    title="Mark as read"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                    <DropdownMenuSeparator className="m-0" />
                    <div className="p-2 bg-muted/10">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground hover:text-primary"
                            onClick={() => {
                                setOpen(false);
                                // Navigate to role-specific info page
                                const role = profile?.role || '';
                                if (role === 'employee') navigate('/employee/info');
                                else if (role === 'hr') navigate('/hr/content');
                                else if (role === 'admin') navigate('/admin');
                            }}
                        >
                            View All Notifications
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
