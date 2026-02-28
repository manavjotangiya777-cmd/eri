import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import HRLayout from '@/components/layouts/HRLayout';
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
import { Send, MessageSquare, Users, Info, Paperclip, FileText, Download, X } from 'lucide-react';
import { API_URL } from '@/config';

export default function HRChatPage() {
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
      // Clear any orphaned chat notifications when landing on chat page
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
      toast({ title: 'Connection Alert', description: 'Re-establishing corporate link...', variant: 'destructive' });
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
        setTimeout(scrollToBottom, 50);
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
    const msgInterval = setInterval(() => loadMessages(selectedChat.id.toString(), false), 2000);
    const memberInterval = setInterval(() => loadGroupMembers(selectedChat.id.toString()), 10000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(memberInterval);
    };
  }, [selectedChat]);

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    const chatId = selectedChat.id || (selectedChat as any)._id;
    if (!chatId) {
      toast({ title: 'System Error', description: 'HR Link unstable. Please refresh.' });
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
      toast({ title: 'Error', description: 'Transmission failed. Checking secure line...' });
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
    <HRLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-indigo-900 dark:text-white">HR Central Chat</h1>
            <p className="text-slate-500 font-medium tracking-tight">Unified communication for all staff and admins</p>
          </div>
          <Badge className="bg-indigo-600/10 text-indigo-700 border-indigo-600/20 px-4 py-1.5 text-[10px] font-black tracking-widest uppercase rounded-full">
            Corporate Feed
          </Badge>
        </div>

        <Card className="flex flex-col overflow-hidden h-[calc(100vh-220px)] border-none shadow-2xl bg-white dark:bg-slate-950/50 backdrop-blur-2xl ring-1 ring-slate-100 dark:ring-white/5">
          {selectedChat ? (
            <>
              <CardHeader className="py-5 px-8 border-b border-indigo-50 dark:border-white/5 shrink-0 flex flex-row items-center justify-between bg-white/40 dark:bg-transparent">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-[20px] bg-indigo-600/10 flex items-center justify-center text-indigo-600 shadow-inner ring-1 ring-indigo-600/5">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tighter uppercase">{selectedChat.group_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                      <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{groupMembers.length} Employees Registered</p>
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full h-11 w-11 hover:bg-indigo-50 text-indigo-300 hover:text-indigo-600 transition-all" onClick={() => setGroupInfoOpen(true)}>
                  <Info className="h-6 w-6" />
                </Button>
              </CardHeader>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-slate-50/30 dark:bg-indigo-950/5">
                <ScrollArea className="h-full w-full px-8 py-6">
                  <div className="space-y-6">
                    {messages.map((message: Message) => {
                      const isOwn = message.sender_id === profile?.id || (message.sender_id as any)?._id === profile?.id;
                      const isImage = message.file_type?.startsWith('image/');
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
                          <div className={`max-w-[80%] space-y-1.5`}>
                            {!isOwn && <p className="text-[10px] font-black ml-4 text-indigo-400 uppercase tracking-widest">{getSenderName(message.sender_id)}</p>}
                            <div className={`rounded-[24px] px-5 py-3 shadow-md border ${isOwn ? 'bg-indigo-600 text-white border-indigo-700 rounded-br-none' : 'bg-white dark:bg-slate-900 border-indigo-50 dark:border-white/5 rounded-bl-none text-slate-800 dark:text-slate-100 shadow-indigo-100/20'}`}>
                              {message.content && <p className="text-sm leading-relaxed whitespace-pre-wrap font-bold">{message.content}</p>}
                              {message.file_url && (
                                <div className="mt-3 overflow-hidden rounded-[20px] shadow-sm ring-1 ring-black/5">
                                  {isImage ? (
                                    <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer">
                                      <img src={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} alt={message.file_name} className="max-w-full h-auto max-h-[400px] object-cover hover:scale-[1.03] transition-transform duration-500 cursor-zoom-in" />
                                    </a>
                                  ) : (
                                    <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-indigo-50/50 dark:bg-white/5 rounded-[20px] hover:bg-indigo-100/50 transition-all group border border-indigo-50/50">
                                      <div className="h-12 w-12 bg-white dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-50"><FileText className="h-7 w-7" /></div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black truncate">{message.file_name}</p>
                                        <p className="text-[9px] text-indigo-600 font-black tracking-widest uppercase">Shared Resource</p>
                                      </div>
                                      <Download className="h-5 w-5 opacity-30 group-hover:opacity-100 hover:text-indigo-600 transition-all" />
                                    </a>
                                  )}
                                </div>
                              )}
                              <p className={`text-[9px] mt-2 text-right opacity-50 font-black tracking-tighter uppercase`}>
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

                <div className="p-6 border-t border-indigo-50 dark:border-white/5 bg-white dark:bg-slate-950/90 backdrop-blur-3xl shrink-0">
                  {selectedFile && (
                    <div className="mb-4 p-3 bg-indigo-50/80 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 bg-white dark:bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-indigo-50">
                          {selectedFile.type.startsWith('image/') ? (
                            <img src={selectedFile.url.startsWith('http') ? selectedFile.url : `${API_URL.replace('/api', '')}${selectedFile.url}`} className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-6 w-6 text-indigo-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate">{selectedFile.name}</p>
                          <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{selectedFile.type.split('/')[1]}</span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-destructive/10 text-destructive rounded-full transition-colors" onClick={() => setSelectedFile(null)}>
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-4 items-end bg-slate-50 dark:bg-white/5 p-2 rounded-[32px] ring-1 ring-indigo-50 dark:ring-white/5 focus-within:ring-2 ring-indigo-500/30 transition-all shadow-inner">
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button type="button" size="icon" variant="ghost" className="h-12 w-12 shrink-0 rounded-full hover:bg-white dark:hover:bg-white/10 shadow-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}>
                      <Paperclip className={`h-6 w-6 text-indigo-400 ${uploading ? 'animate-spin text-indigo-600' : ''}`} />
                    </Button>
                    <Textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Share an update with the team..."
                      className="flex-1 min-h-[48px] max-h-[160px] resize-none border-none bg-transparent focus-visible:ring-0 px-3 py-3 text-sm font-black"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      disabled={sending}
                    />
                    <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-transform active:scale-90" disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}>
                      <Send className="h-6 w-6" />
                    </Button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-16 text-center text-indigo-200">
              <div className="h-14 w-14 border-4 border-indigo-100 border-t-indigo-600 animate-spin rounded-full mb-6" />
              <p className="font-black uppercase tracking-widest text-xs animate-pulse text-indigo-400">Syncing with Central Server...</p>
            </div>
          )}
        </Card>

        {/* Info Dialog */}
        <Dialog open={groupInfoOpen} onOpenChange={setGroupInfoOpen}>
          <DialogContent className="max-w-md rounded-[40px] p-10 dark:bg-slate-900 border-none shadow-3xl">
            <DialogHeader>
              <DialogTitle className="flex flex-col items-center gap-6">
                <div className="h-24 w-24 rounded-[32px] bg-indigo-600/10 flex items-center justify-center text-indigo-600 shadow-inner ring-1 ring-indigo-600/5">
                  <Users className="h-12 w-12" />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-black uppercase tracking-tighter">{selectedChat?.group_name}</h2>
                  <p className="text-sm font-bold text-slate-400 mt-2 px-4 shadow-sm py-1 bg-slate-50 dark:bg-white/5 rounded-full inline-block">{selectedChat?.group_description}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-10">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
                  Active Staff Directory ({groupMembers.length})
                </p>
              </div>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {groupMembers.map((member: any) => (
                    <div key={member.user_id} className="flex items-center gap-4 p-4 rounded-[24px] bg-slate-50/50 dark:bg-white/5 border border-indigo-50/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-lg transition-all duration-300 group">
                      <Avatar className="h-11 w-11 shadow-md">
                        <AvatarFallback className="text-xs font-black bg-indigo-600 text-white leading-none">{(member.profiles?.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">{member.profiles?.full_name}</p>
                        <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-0.5">{member.profiles?.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="bg-indigo-50 dark:bg-white/5 p-4 rounded-[20px] text-center border border-indigo-100/50">
                <p className="text-[10px] text-indigo-400 font-black tracking-[0.3em] uppercase">Enterprise Secure Protocol Enabled</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </HRLayout>
  );
}
