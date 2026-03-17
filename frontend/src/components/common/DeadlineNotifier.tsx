import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDeadlines } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Calendar } from 'lucide-react';

interface DeadlineItem {
    type: string;
    id: string;
    display_id: string;
    title: string;
    deadline: string;
    status: string;
    priority?: string;
}

export const DeadlineNotifier: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [activeDeadlines, setActiveDeadlines] = useState<DeadlineItem[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        if (!user) return;

        const checkDeadlines = async () => {
            try {
                const deadlines: DeadlineItem[] = await getDeadlines(user.id);

                // Find which deadlines are "hitting" now (today or past due)
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                const hitDeadlines = deadlines.filter((d) => {
                    const dDate = new Date(d.deadline);
                    // Only show if it matches today or is past due
                    return dDate <= now || dDate.toDateString() === now.toDateString();
                });

                if (hitDeadlines.length === 0) return;

                // Check against localStorage to only show new notifications
                const seenStorage = localStorage.getItem('seen_deadlines');
                const seenObj = seenStorage ? JSON.parse(seenStorage) : {};

                const newDeadlines: DeadlineItem[] = [];

                hitDeadlines.forEach((item) => {
                    // Check if this specific deadline notification was already acknowledged today
                    // We can key it by item.id + today's date so it reminds once per day if unresolved
                    const dailyKey = `${item.id}_${todayStart.toISOString()}`;
                    if (!seenObj[dailyKey]) {
                        newDeadlines.push(item);
                        seenObj[dailyKey] = true;
                    }
                });

                if (newDeadlines.length > 0) {
                    // Update seen storage
                    localStorage.setItem('seen_deadlines', JSON.stringify(seenObj));

                    // Show toasts for each new one
                    newDeadlines.forEach((d) => {
                        toast({
                            title: `Deadline Alert: ${d.display_id}`,
                            description: d.title,
                            variant: 'destructive',
                        });
                    });

                    // Show popup dialog with all active current hit deadlines
                    setActiveDeadlines((prev) => {
                        // Merge prev + new but unique by id
                        const all = [...prev, ...newDeadlines];
                        const unique = all.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
                        return unique;
                    });
                    setDialogOpen(true);
                }
            } catch (err) {
                console.error('Failed to fetch deadlines', err);
            }
        };

        // Check immediately on mount/login
        checkDeadlines();

        // Check every 10 minutes (600000 ms) automatically
        const intervalId = setInterval(checkDeadlines, 600000);

        return () => clearInterval(intervalId);
    }, [user]);

    const handleAcknowledge = () => {
        setDialogOpen(false);
        setActiveDeadlines([]);
    };

    if (!dialogOpen || activeDeadlines.length === 0) return null;

    return (
        <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) handleAcknowledge();
        }}>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive mb-2">
                        <Bell className="h-6 w-6 animate-bounce" />
                        <DialogTitle className="text-xl">Pending Deadlines Hit!</DialogTitle>
                    </div>
                    <DialogDescription>
                        You have active tasks or reminders that have reached their deadline. Please take action on them.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {activeDeadlines.map(item => (
                        <div key={item.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col gap-1 relative">
                            <div className="flex justify-between items-start gap-4">
                                <span className="font-semibold text-sm line-clamp-2 pr-8">{item.title}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1 font-medium bg-background px-1.5 py-0.5 rounded shadow-sm border">
                                    {item.display_id}
                                </span>
                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(item.deadline).toLocaleDateString()}
                                </span>
                                {item.type === 'task' ? (
                                    <span className="capitalize text-[10px] font-bold border rounded px-1">{item.priority || 'Medium'} Task</span>
                                ) : (
                                    <span className="capitalize text-[10px] font-bold border rounded px-1">Follow-Up Action</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button onClick={handleAcknowledge} variant="destructive" className="w-full font-bold uppercase tracking-wider">
                        I Understand, Dismiss
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
