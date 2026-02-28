import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  getAllProfiles,
  getChatMembers,
  getCommonChat,
  uploadFile,
} from '@/db/api';
import type { Chat, Message, Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Send, Users, Info, Paperclip, FileText, Download, X } from 'lucide-react';
import { API_URL } from '@/config';

interface EmployeeChatProps {
  Layout?: React.ComponentType<{ children: React.ReactNode }>;
}

export default function EmployeeChat({ Layout = EmployeeLayout }: EmployeeChatProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string, name: string, type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInitialData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      // Clear orphaned chat notifications
      await markMessagesAsRead('all', profile.id);
      window.dispatchEvent(new CustomEvent('chat-read'));

      const usersData = await getAllProfiles();
      setUsers(usersData);

      const common = await getCommonChat(profile.id);
      if (common) {
        // ID Fallback
        if (!common.id && (common as any)._id) common.id = (common as any)._id;
        setSelectedChat(common);
      }
    } catch (error: any) {
      console.error('Chat Init Error:', error);
      toast({ title: 'Connection Alert', description: 'Reconnecting to team workspace...', variant: 'destructive' });
      setTimeout(loadInitialData, 3000);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string, shouldScroll = false) => {
    try {
      const messagesData = await getChatMessages(chatId);
      setMessages(messagesData);
      if (profile?.id) {
        await markMessagesAsRead(chatId, profile.id);
        window.dispatchEvent(new CustomEvent('chat-read', { detail: { chatId } }));
      }
      if (shouldScroll) {
        setTimeout(scrollToBottom, 100);
      }
    } catch { /* silent */ }
  };

  useEffect(() => { loadInitialData(); }, [profile]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id, true);
      loadGroupMembers(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat) return;
    const msgInterval = setInterval(() => loadMessages(selectedChat.id, false), 2000);
    const memberInterval = setInterval(() => loadGroupMembers(selectedChat.id), 10000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(memberInterval);
    };
  }, [selectedChat]);

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    const chatId = selectedChat.id || (selectedChat as any)._id;
    if (!chatId) {
      toast({ title: 'Error', description: 'Workspace not connected. Please refresh.' });
      return;
    }
    if ((!newMessage.trim() && !selectedFile) || !profile?.id || sending) return;
    setSending(true);
    try {
      const payload = {
        chat_id: chatId,
        sender_id: profile.id,
        content: newMessage.trim(),
        file_url: selectedFile?.url,
        file_type: selectedFile?.type,
        file_name: selectedFile?.name
      };
      await sendMessage(payload);
      setNewMessage('');
      setSelectedFile(null);
      loadMessages(chatId, true);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Message delivery failed. Checking connection...' });
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFile(file);
      if ('url' in result && result.url) {
        setSelectedFile({
          url: result.url,
          name: (result as any).filename || file.name,
          type: (result as any).mimetype || file.type
        });
      } else {
        throw new Error((result as any).error || 'Upload failed');
      }
    } catch (err: any) {
      toast({ title: 'Upload Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadGroupMembers = async (chatId: string) => {
    try {
      const members = await getChatMembers(chatId);
      setGroupMembers(members);
    } catch { /* silent */ }
  };

  const getSenderName = (senderId: string) => {
    const user = users.find(u => u.id === senderId || (u as any)._id === senderId);
    return user?.full_name || user?.username || 'Unknown';
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Workspace Chat</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Connect with everyone in the company</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 text-xs font-black tracking-widest uppercase">
            Live Feed
          </Badge>
        </div>

        <Card className="flex flex-col overflow-hidden h-[calc(100vh-220px)] border-none shadow-2xl bg-white dark:bg-slate-950/50 backdrop-blur-xl ring-1 ring-slate-100 dark:ring-white/5">
          {selectedChat ? (
            <>
              <CardHeader className="py-4 px-6 border-b border-slate-100 dark:border-white/5 shrink-0 flex flex-row items-center justify-between bg-white/50 dark:bg-transparent">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black">{selectedChat.group_name}</CardTitle>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{groupMembers.length} Employees Connected</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600" onClick={() => setGroupInfoOpen(true)}>
                  <Info className="h-5 w-5" />
                </Button>
              </CardHeader>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-transparent">
                <ScrollArea className="h-full w-full p-6">
                  <div className="space-y-6">
                    {messages.map((message: Message) => {
                      const isOwn = message.sender_id === profile?.id || (message.sender_id as any)?._id === profile?.id;
                      const isImage = message.file_type?.startsWith('image/');
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`max-w-[85%] space-y-1.5`}>
                            {!isOwn && <p className="text-[10px] font-black ml-4 text-slate-400 uppercase tracking-tighter">{getSenderName(message.sender_id)}</p>}
                            <div className={`rounded-2xl px-4 py-2.5 shadow-sm border ${isOwn ? 'bg-emerald-600 text-white border-emerald-500 rounded-br-none' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 rounded-bl-none text-slate-800 dark:text-slate-200'}`}>
                              {message.content && <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>}
                              {message.file_url && (
                                <div className="mt-2 overflow-hidden rounded-xl">
                                  {isImage ? (
                                    <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer">
                                      <img src={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} alt={message.file_name} className="max-w-full h-auto max-h-[350px] object-cover hover:brightness-110 transition-all cursor-zoom-in shadow-lg" />
                                    </a>
                                  ) : (
                                    <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-emerald-50/50 dark:bg-white/5 rounded-xl hover:bg-emerald-100/50 transition-colors group">
                                      <div className="h-10 w-10 bg-white dark:bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100/20"><FileText className="h-6 w-6" /></div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black truncate">{message.file_name}</p>
                                        <p className="text-[9px] text-emerald-600/70 font-black tracking-widest uppercase">Click to view</p>
                                      </div>
                                      <Download className="h-4 w-4 opacity-30 group-hover:opacity-100" />
                                    </a>
                                  )}
                                </div>
                              )}
                              <p className={`text-[9px] mt-2 text-right opacity-50 font-bold`}>
                                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-slate-950/80 backdrop-blur-md shrink-0">
                  {selectedFile && (
                    <div className="mb-3 p-2 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 bg-white dark:bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                          {selectedFile.type.startsWith('image/') ? (
                            <img src={selectedFile.url.startsWith('http') ? selectedFile.url : `${API_URL.replace('/api', '')}${selectedFile.url}`} className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate">{selectedFile.name}</p>
                          <span className="text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-600 font-black uppercase tracking-widest">{selectedFile.type.split('/')[1]}</span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-destructive/10 text-destructive rounded-full" onClick={() => setSelectedFile(null)}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-3 items-end bg-slate-100 dark:bg-white/5 p-2 rounded-[24px] focus-within:ring-2 ring-emerald-500/20 transition-all">
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full hover:bg-white dark:hover:bg-white/10" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}>
                      <Paperclip className={`h-5 w-5 text-slate-500 ${uploading ? 'animate-spin text-emerald-500' : ''}`} />
                    </Button>
                    <Textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 min-h-[40px] max-h-[160px] resize-none border-none bg-transparent focus-visible:ring-0 px-2 py-2 text-sm font-medium"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      disabled={sending}
                    />
                    <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20" disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}>
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <div className="h-12 w-12 border-4 border-emerald-500/30 border-t-emerald-600 animate-spin rounded-full mb-4" />
              <p className="font-black uppercase tracking-widest text-[10px]">Establishing Secure Connection...</p>
            </div>
          )}
        </Card>

        {/* Info Dialog */}
        <Dialog open={groupInfoOpen} onOpenChange={setGroupInfoOpen}>
          <DialogContent className="max-w-sm rounded-[32px] p-8 dark:bg-slate-900 border-none">
            <DialogHeader>
              <DialogTitle className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-[28px] bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner">
                  <Users className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-black">{selectedChat?.group_name}</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">{selectedChat?.group_description}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Member Roster ({groupMembers.length})
              </p>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-2">
                  {groupMembers.map((member: any) => (
                    <div key={member.user_id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-[10px] font-black bg-emerald-500/10 text-emerald-600">{(member.profiles?.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black truncate">{member.profiles?.full_name}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-tighter">{member.profiles?.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-center text-[9px] text-slate-400 font-bold tracking-widest uppercase py-2">Workspace ID: #{selectedChat?.id?.slice(-6)}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
