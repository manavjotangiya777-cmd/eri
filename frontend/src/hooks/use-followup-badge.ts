import { useState, useEffect, useCallback } from 'react';
import { getAllFollowUps } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { FollowUp } from '@/types';

const STORAGE_KEY = (userId: string) => `followup_seen_at_${userId}`;

/** Returns count of pending follow-ups assigned to the current user that
 *  were created/updated AFTER the last time user visited the follow-ups page.
 *  Calling `markSeen()` clears the badge immediately. */
export function useFollowUpBadge() {
    const { profile } = useAuth();
    const [count, setCount] = useState(0);

    const compute = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const all: FollowUp[] = await getAllFollowUps();

            // Filter to only this user's non-completed follow-ups
            const mine = all.filter(
                (f) =>
                    (f.assigned_to === profile.id || (f.assigned_to as any)?._id === profile.id) &&
                    f.status !== 'completed'
            );

            // Compare against last seen timestamp
            const seenAt = localStorage.getItem(STORAGE_KEY(profile.id));
            if (!seenAt) {
                setCount(mine.length);
                return;
            }

            const seenDate = new Date(seenAt);
            // Count follow-ups that are newer than the last "seen" timestamp
            const newOnes = mine.filter((f) => {
                const updatedAt = f.updated_at ? new Date(f.updated_at) : new Date(f.created_at);
                return updatedAt > seenDate;
            });

            setCount(newOnes.length);
        } catch {
            // silently fail
        }
    }, [profile]);

    useEffect(() => {
        compute();
        const interval = setInterval(compute, 15000); // poll every 15s
        const handleSeen = () => compute();
        window.addEventListener('followup-seen', handleSeen);
        return () => {
            clearInterval(interval);
            window.removeEventListener('followup-seen', handleSeen);
        };
    }, [compute]);

    return count;
}

/** Call this when user visits the follow-ups page/tab to clear the badge */
export function markFollowUpsSeen(userId: string) {
    if (!userId) return;
    localStorage.setItem(STORAGE_KEY(userId), new Date().toISOString());
    window.dispatchEvent(new Event('followup-seen'));
}
