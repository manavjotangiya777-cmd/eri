import { useState, useEffect, useCallback } from 'react';
import { getChatUnreadCount } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';

export function useChatUnread() {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const count = await getChatUnreadCount(profile.id);
      if (count !== unreadCount) {
        console.log(`[ChatUnread] Updated count for ${profile.username}: ${count}`);
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Failed to load chat unread count:', error);
    }
  }, [profile]);

  useEffect(() => {
    loadUnreadCount();
    
    // Refresh count on custom chat-read event
    const handleRefetch = () => loadUnreadCount();
    window.addEventListener('chat-read', handleRefetch);

    // Poll every 2 seconds to keep it fresh
    const interval = setInterval(loadUnreadCount, 2000);
    
    return () => {
      window.removeEventListener('chat-read', handleRefetch);
      clearInterval(interval);
    };
  }, [loadUnreadCount]);

  return unreadCount;
}
