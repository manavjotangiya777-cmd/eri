import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getOrCreateChat, getChatMessages, sendMessage, markMessagesAsRead, getAllProfiles } from '@/db/api';
import type { Profile, Chat, Message } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageSquare, User, Users, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientSupportChatPageProps {
    Layout: React.ComponentType<{ children: React.ReactNode }>;
}

export default function ClientSupportChatPage({ Layout }: ClientSupportChatPageProps) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [clients, setClients] = useState<Profile[]>([]);
    const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
    const [currentChat, setCurrentChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<any>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const all = await getAllProfiles();
                const clientProfiles = all.filter(u => u.role === 'client' && u.is_active !== false);
                setClients(clientProfiles);
            } catch (e) {
                console.error('Failed to fetch client profiles:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, []);

    const loadMessages = async (chatId: string) => {
        try {
            const msgs = await getChatMessages(chatId);
            setMessages(msgs);
            if (profile?.id) {
                await markMessagesAsRead(chatId, profile.id);
                window.dispatchEvent(new CustomEvent('chat-read', { detail: { chatId } }));
            }
            setTimeout(scrollToBottom, 80);
        } catch (e) { console.error(e); }
    };

    const selectClient = async (client: Profile) => {
        if (!profile?.id) return;
        setSelectedClient(client);
        setMessages([]);
        if (pollRef.current) clearInterval(pollRef.current);

        try {
            // Admin/HR (current user) opens chat with the client (target)
            const chat = await getOrCreateChat(client.id, profile.id);
            setCurrentChat(chat);
            if (chat) {
                await loadMessages(chat.id);
                // Poll every 5 seconds for new messages
                pollRef.current = setInterval(() => loadMessages(chat.id), 5000);
            }
        } catch (e: any) {
            toast({ title: 'Error', description: 'Failed to open chat', variant: 'destructive' });
        }
    };

    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentChat || !profile?.id || sending) return;
        setSending(true);
        try {
            await sendMessage({ chat_id: currentChat.id, sender_id: profile.id, content: newMessage.trim() });
            setNewMessage('');
            await loadMessages(currentChat.id);
        } catch {
            toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col space-y-4 h-full">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Client Support Chat</h1>
                        <p className="text-sm text-muted-foreground">Chat directly with your clients in real-time</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
                    {/* Client List */}
                    <Card className="md:col-span-1 shadow-lg border-muted-foreground/10 flex flex-col overflow-hidden">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                Clients ({clients.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            {loading ? (
                                <div className="p-4 text-sm text-muted-foreground text-center">Loading clients...</div>
                            ) : clients.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground">
                                    <User className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No client accounts found</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-full">
                                    {clients.map((client) => (
                                        <button
                                            key={client.id}
                                            onClick={() => selectClient(client)}
                                            className={cn(
                                                'w-full flex items-center gap-3 p-4 hover:bg-primary/5 transition-all text-left border-b last:border-0 group',
                                                selectedClient?.id === client.id && 'bg-primary/10 border-l-2 border-l-primary'
                                            )}
                                        >
                                            <Avatar className="h-9 w-9 shrink-0">
                                                <AvatarFallback className={cn(
                                                    'text-sm font-bold transition-colors',
                                                    selectedClient?.id === client.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                                )}>
                                                    {(client.full_name || client.username).charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold truncate">{client.full_name || client.username}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{client.username}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] uppercase font-bold border-primary/20 text-primary hidden group-hover:block shrink-0">
                                                Chat
                                            </Badge>
                                        </button>
                                    ))}
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>

                    {/* Chat Window */}
                    <Card className="md:col-span-3 shadow-lg border-muted-foreground/10 flex flex-col overflow-hidden">
                        {selectedClient && currentChat ? (
                            <>
                                {/* Chat Header */}
                                <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent py-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                                {(selectedClient.full_name || selectedClient.username).charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-base font-bold">{selectedClient.full_name || selectedClient.username}</CardTitle>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Client • Support Conversation</p>
                                        </div>
                                    </div>
                                </CardHeader>

                                {/* Messages */}
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    <ScrollArea className="flex-1 p-4">
                                        <div className="space-y-3">
                                            {messages.length === 0 ? (
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm font-medium">No messages yet</p>
                                                    <p className="text-xs">Start the conversation with this client</p>
                                                </div>
                                            ) : (
                                                messages.map((msg) => {
                                                    const isMe = msg.sender_id === profile?.id;
                                                    return (
                                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={cn(
                                                                'max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm',
                                                                isMe
                                                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                                    : 'bg-muted text-foreground rounded-bl-sm'
                                                            )}>
                                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                                <p className={cn('text-[10px] mt-1 opacity-70', isMe ? 'text-right' : 'text-left')}>
                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    </ScrollArea>

                                    {/* Message Input */}
                                    <div className="border-t p-3 bg-background shrink-0">
                                        <form onSubmit={handleSend} className="flex gap-2">
                                            <Input
                                                placeholder={`Message ${selectedClient.full_name || selectedClient.username}...`}
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                className="flex-1 rounded-xl border-muted-foreground/20"
                                                autoFocus
                                            />
                                            <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="rounded-xl shrink-0">
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10 gap-4">
                                <div className="p-6 bg-muted/30 rounded-full">
                                    <MessageSquare className="h-14 w-14 opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-lg">Select a Client</p>
                                    <p className="text-sm mt-1">Choose a client from the left panel to start a support conversation</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
