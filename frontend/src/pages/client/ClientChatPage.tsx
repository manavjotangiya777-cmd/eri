import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile, Chat, Message } from '@/types';
import { getOrCreateChat, getChatMessages, sendMessage, markMessagesAsRead, getAllProfiles, deleteMessage } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, MessageSquare, Trash2 } from 'lucide-react';
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
        await markMessagesAsRead('all', profile.id);
        window.dispatchEvent(new CustomEvent('chat-read'));

        const users = await getAllProfiles();
        const filteredAdmins = users.filter(u => ['admin', 'bde'].includes(u.role) && u.is_active);
        setAdmins(filteredAdmins);
      } catch (error) {
        console.error('Error fetching admins:', error);
      }
    }
    fetchAdmins();
  }, [profile?.id]);

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

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteMessage(messageId, profile?.id);
      if (currentChat) loadMessages(currentChat.id);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' });
    }
  };

  const startChat = async (admin: Profile) => {
    if (!profile?.id) return;
    setSelectedAdmin(admin);
    try {
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
                <div className="flex-1 overflow-y-auto pr-4 scroll-smooth">
                  <div className="space-y-4">
                    {messages.map((msg, index) => {
                      const msgDate = new Date(msg.created_at || new Date());
                      const msgDateString = msgDate.toLocaleDateString();
                      const prevMsgDateString = index > 0 ? new Date(messages[index - 1].created_at || new Date()).toLocaleDateString() : null;
                      const showDateHeader = msgDateString !== prevMsgDateString;

                      const isToday = msgDateString === new Date().toLocaleDateString();
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      const isYesterday = msgDateString === yesterday.toLocaleDateString();

                      const displayDate = isToday ? 'Today' : isYesterday ? 'Yesterday' : msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

                      return (
                        <div key={msg.id}>
                          {showDateHeader && (
                            <div className="flex justify-center my-6">
                              <div className="bg-slate-200/50 text-slate-500 text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full border border-slate-200/50 backdrop-blur-sm">
                                {displayDate}
                              </div>
                            </div>
                          )}
                          <div
                            className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'} group mt-2`}
                          >
                            <div
                              className={`max-w-[80%] px-4 py-2 rounded-lg relative ${msg.sender_id === profile?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                                }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <div className="flex items-center justify-between gap-2 mt-1">
                                {msg.sender_id === profile?.id && (
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded-full hover:bg-black/5 text-white"
                                    title="Delete Message"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                                <p className="text-[10px] opacity-70 ml-auto">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-10">
                        No messages yet. Send a message to start the conversation.
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 shrink-0">
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
