import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile, Chat, Message } from '@/types';
import { getOrCreateChat, getChatMessages, sendMessage, markMessagesAsRead, getAllProfiles } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ClientChatPage() {
  const { profile } = useAuth();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    async function fetchAdmins() {
      if (!profile?.id) return;
      try {
        // Clear all chat notifications when client lands here
        await markMessagesAsRead('all', profile.id);
        window.dispatchEvent(new CustomEvent('chat-read'));

        const users = await getAllProfiles();
        // Fetch Admin and BDE users that the client can chat with
        const filteredAdmins = users.filter(u => ['admin', 'bde'].includes(u.role) && u.is_active);
        setAdmins(filteredAdmins);
      } catch (error) {
        console.error('Error fetching admins:', error);
      }
    }

    fetchAdmins();
  }, []);

  const loadMessages = async (chatId: string) => {
    if (!profile?.id) return;
    try {
      const msgs = await getChatMessages(chatId);
      setMessages(msgs);
      await markMessagesAsRead(chatId, profile.id);
      window.dispatchEvent(new CustomEvent('chat-read', { detail: { chatId } }));
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const startChat = async (admin: Profile) => {
    if (!profile?.id) return;
    setSelectedAdmin(admin);

    try {
      // getOrCreateChat(targetUserId, currentUserId)
      const chat = await getOrCreateChat(admin.id, profile.id);
      setCurrentChat(chat);
      if (chat) {
        await loadMessages(chat.id);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!currentChat) return;

    const interval = setInterval(() => {
      loadMessages(currentChat.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentChat]);

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentChat || !profile?.id) return;

    try {
      await sendMessage({
        chat_id: currentChat.id,
        sender_id: profile.id,
        content: newMessage.trim()
      });
      setNewMessage('');
      if (currentChat) await loadMessages(currentChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  return (
    <ClientLayout>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Support Contacts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {admins.map((admin) => (
                <button
                  key={admin.id}
                  onClick={() => startChat(admin)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors text-left border-b last:border-0 ${selectedAdmin?.id === admin.id ? 'bg-muted' : ''}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{admin.role === 'admin' ? 'O' : 'B'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {admin.role === 'admin' ? 'Owner' : 'BDE'}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-tight font-black">{admin.role}</p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 flex flex-col overflow-hidden">
          {selectedAdmin ? (
            <>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Chatting with {selectedAdmin.role === 'admin' ? 'Owner' : 'BDE'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-2 rounded-lg ${msg.sender_id === profile?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                            }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-[10px] opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-10">
                        No messages yet. Send a message to start the conversation.
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10">
              <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
              <p>Select a contact to start a support conversation</p>
            </div>
          )}
        </Card>
      </div>
    </ClientLayout>
  );
}

