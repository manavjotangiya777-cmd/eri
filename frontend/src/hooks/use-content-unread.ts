import { useState, useEffect, useCallback } from 'react';
import {
    getAllHolidays,
    getAllAnnouncements,
    getAllDocuments,
    getAllNotifications,
    getWarnings,
    getAllFollowUps,
    getAllProfiles
} from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = (userId: string) => `hr_content_seen_${userId}`;

/**
 * Returns the total unread count for all tabs in Content Management.
 * Listens for 'content-seen' event to refresh.
 */
export function useContentUnread() {
    const { profile } = useAuth();
    const [total, setTotal] = useState(0);

    const compute = useCallback(async () => {
        if (!profile?.id || (profile.role !== 'hr' && profile.role !== 'admin')) return;

        try {
            const saved = localStorage.getItem(STORAGE_KEY(profile.id));
            const lastSeen = saved ? JSON.parse(saved) : {};

            const [holidays, announcements, documents, notifications, warnings, followUps, employees] = await Promise.all([
                getAllHolidays().catch(() => []),
                getAllAnnouncements().catch(() => []),
                getAllDocuments().catch(() => []),
                getAllNotifications().catch(() => []),
                getWarnings(true).catch(() => []),
                getAllFollowUps().catch(() => []),
                getAllProfiles().catch(() => [])
            ]);

            const getCount = (items: any[], key: string) => {
                const seenAt = lastSeen[key];
                if (!seenAt) return items.length;
                const seenDate = new Date(seenAt);
                return items.filter(item => {
                    const date = item.updated_at ? new Date(item.updated_at) : new Date(item.created_at);
                    return date > seenDate;
                }).length;
            };

            // Birthdays logic: show count if not seen today
            const getBirthdayCount = () => {
                const seenAt = lastSeen['birthdays'];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (seenAt && new Date(seenAt) >= today) return 0;

                const currentYear = today.getFullYear();
                const upcoming = employees
                    .filter((emp: any) => emp.date_of_birth && emp.is_active !== false)
                    .filter((emp: any) => {
                        const dob = new Date(emp.date_of_birth);
                        let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());
                        if (nextBirthday < today) nextBirthday.setFullYear(currentYear + 1);
                        const diffDays = Math.round((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays >= 0 && diffDays <= 30;
                    });
                return upcoming.length;
            };

            const h = getCount(holidays, 'holidays');
            const a = getCount(announcements, 'announcements');
            const d = getCount(documents, 'documents');
            const n = getCount(notifications, 'notifications');
            const w = getCount(warnings.filter((w: any) => w.is_active), 'warnings');

            // For followups, only count those assigned to me and pending
            const myFollowUps = followUps.filter((f: any) =>
                (f.assigned_to === profile.id || (f.assigned_to && (f.assigned_to as any)._id === profile.id)) &&
                f.status !== 'completed'
            );
            const f = getCount(myFollowUps, 'followups');
            const b = getBirthdayCount();

            setTotal(h + a + d + n + w + f + b);
        } catch {
            // silent
        }
    }, [profile]);

    useEffect(() => {
        compute();
        const interval = setInterval(compute, 30000); // 30s
        window.addEventListener('content-seen', compute);
        return () => {
            clearInterval(interval);
            window.removeEventListener('content-seen', compute);
        };
    }, [compute]);

    return total;
}
