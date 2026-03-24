import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  deleteMessage,
} from '@/db/api';
import type { Chat, Message, Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Send, Users, Info, Paperclip, FileText, Download, X, Trash2 } from 'lucide-react';
import { API_URL } from '@/config';

export default function ChatPage() {
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
      const [usersData, common] = await Promise.all([
        getAllProfiles(),
        getCommonChat(profile.id)
      ]);
      setUsers(usersData);
      if (common) {
        const chatId = common.id || (common as any)._id;
        common.id = chatId;
        setSelectedChat(common);
        loadMessages(chatId, true);
        loadGroupMembers(chatId);
      }
    } catch (err: any) {
      console.error('Admin Chat Init Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string | undefined, shouldScroll = false) => {
    if (!chatId) return;
    try {
      const messagesData = await getChatMessages(chatId);
      if (Array.isArray(messagesData)) {
        setMessages(messagesData);
        if (shouldScroll) setTimeout(scrollToBottom, 100);
      }
    } catch (err: any) {
      console.error('Admin Chat load error:', err);
    }
  };

  const loadGroupMembers = async (chatId: string) => {
    try {
      const members = await getChatMembers(chatId);
      setGroupMembers(members);
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadInitialData();
  }, [profile?.id]);

  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(() => {
      loadMessages(selectedChat.id, false);
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedChat?.id]);

  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(() => {
      loadGroupMembers(selectedChat.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedChat?.id]);

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    const chatId = selectedChat?.id || (selectedChat as any)?._id;
    if (!chatId) return;
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
      toast({ title: 'Error', description: 'Message delivery failed' });
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
      }
    } catch (err: any) {
      toast({ title: 'Upload Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getSenderName = (senderId: string | any) => {
    const sId = typeof senderId === 'object' ? senderId.id || senderId._id : senderId;
    const user = users.find(u => u.id === sId || (u as any)._id === sId);
    return user?.full_name || user?.username || 'Team Member';
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteMessage(messageId, profile?.id);
      if (selectedChat) loadMessages(selectedChat.id, false);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' });
    }
  };

  if (loading && !selectedChat) {
    return (
      <AdminLayout fullWidth>
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50">
          <div className="h-16 w-16 border-4 border-primary border-t-transparent animate-spin rounded-full mb-6" />
          <p className="font-black uppercase tracking-[0.2em] text-[10px] text-primary animate-pulse">Syncing Admin Command...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout fullWidth>
      <div className="w-full h-full flex flex-col overflow-hidden bg-white">
        <Card className="flex flex-col flex-1 overflow-hidden border-none shadow-none rounded-none bg-white">
          {selectedChat ? (
            <>
              <CardHeader className="py-5 px-8 border-b border-slate-100 shrink-0 flex flex-row items-center justify-between bg-white/80 backdrop-blur-md z-10 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner rotate-3 transition-transform hover:rotate-0">
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tighter uppercase">{selectedChat.group_name || 'ADMIN WORKSPACE'}</CardTitle>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest leading-none">{groupMembers.length} ACTIVE BITS</p>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <p className="text-[11px] text-primary font-semibold uppercase tracking-widest leading-none">{messages.length} BITS SYNCED</p>
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full h-12 w-12 hover:bg-slate-50 text-slate-400 hover:text-primary border border-slate-100 transition-all" onClick={() => setGroupInfoOpen(true)}>
                  <Info className="h-6 w-6" />
                </Button>
              </CardHeader>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-slate-50/30">
                <div className="flex-1 w-full overflow-y-auto p-6 scroll-smooth">
                  <div className="space-y-6">
                    {messages.map((message: Message, index: number) => {
                      const msgDate = new Date(message.created_at || new Date());
                      const msgDateString = msgDate.toLocaleDateString();
                      const prevMsgDateString = index > 0 ? new Date(messages[index - 1].created_at || new Date()).toLocaleDateString() : null;
                      const showDateHeader = msgDateString !== prevMsgDateString;

                      const isToday = msgDateString === new Date().toLocaleDateString();
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      const isYesterday = msgDateString === yesterday.toLocaleDateString();

                      const displayDate = isToday ? 'Today' : isYesterday ? 'Yesterday' : msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

                      const sId = typeof message.sender_id === 'object' ? (message.sender_id as any).id || (message.sender_id as any)._id : message.sender_id;
                      const isOwn = sId === profile?.id;
                      const isImage = message.file_type?.startsWith('image/');

                      return (
                        <div key={message.id || message._id}>
                          {showDateHeader && (
                            <div className="flex justify-center my-6">
                              <div className="bg-slate-200/50 text-slate-500 text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full border border-slate-200/50 backdrop-blur-sm">
                                {displayDate}
                              </div>
                            </div>
                          )}
                          <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group mt-2`}>
                            <div className={`max-w-[75%] space-y-1`}>
                              {!isOwn && <p className="text-[10px] font-black ml-4 text-primary uppercase tracking-widest mb-1">{getSenderName(message.sender_id)}</p>}
                              <div className={`rounded-[28px] px-6 py-3.5 shadow-sm border ${isOwn ? 'bg-gradient-to-br from-primary to-primary/80 text-white border-primary/20 rounded-br-none shadow-primary/20' : 'bg-white border-slate-200 rounded-bl-none text-slate-800 shadow-slate-100'}`}>
                                {message.content && <p className="text-[15px] leading-relaxed font-medium">{message.content}</p>}
                                {message.file_url && (
                                  <div className="mt-3 overflow-hidden rounded-[24px] ring-1 ring-black/5 shadow-lg">
                                    {isImage ? (
                                      <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer">
                                        <img src={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} alt={message.file_name} className="max-w-full h-auto max-h-[450px] object-cover hover:scale-[1.02] transition-transform cursor-zoom-in" />
                                      </a>
                                    ) : (
                                      <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-[24px] hover:bg-slate-100/50 transition-all group border border-slate-200">
                                        <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-primary shadow-md border border-slate-200 group-hover:rotate-6 transition-transform"><FileText className="h-8 w-8" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-black truncate leading-tight">{message.file_name}</p>
                                          <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mt-1">Shared Material</p>
                                        </div>
                                        <Download className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                      </a>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center justify-between gap-2 mt-2.5">
                                  {isOwn && (
                                    <button
                                      onClick={() => handleDeleteMessage(message.id || message._id as string)}
                                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded-full hover:bg-black/5 text-white"
                                      title="Delete Message"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                  <p className="text-[9px] opacity-60 font-black tracking-widest uppercase ml-auto">
                                    {new Date(message.created_at || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-white/50 backdrop-blur-xl shrink-0 relative">
                  {selectedFile && (
                    <div className="absolute bottom-full left-4 right-4 mb-4 p-4 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-[28px] flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)] z-20">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-primary/5">
                          {selectedFile.type.startsWith('image/') ? (
                            <img src={selectedFile.url.startsWith('http') ? selectedFile.url : `${API_URL.replace('/api', '')}${selectedFile.url}`} className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate leading-tight text-slate-900">{selectedFile.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{selectedFile.type.split('/')[1]}</p>
                          </div>
                        </div>
                      </div>
                      <button type="button" className="h-10 w-10 flex items-center justify-center hover:bg-destructive/10 text-destructive rounded-full transition-all hover:rotate-90 hover:scale-110" onClick={() => setSelectedFile(null)}>
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-3 items-center bg-slate-100/80 p-2 rounded-[32px] ring-1 ring-black/5 focus-within:ring-2 ring-primary/20 transition-all flex-nowrap overflow-hidden shadow-inner">
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button type="button" size="icon" variant="ghost" className="h-12 w-12 shrink-0 rounded-full hover:bg-white transition-all shadow-sm bg-white/50" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}>
                      <Paperclip className={`h-6 w-6 text-slate-500 ${uploading ? 'animate-spin text-primary' : ''}`} />
                    </Button>
                    <textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Broadcast to workspace..."
                      className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-3 text-[15px] font-medium resize-none h-12 max-h-40 scrollbar-hide"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      disabled={sending}
                    />
                    <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-full bg-primary hover:bg-primary shadow-lg shadow-primary/20 text-primary-foreground hover:scale-105 transition-all" disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}>
                      <Send className="h-6 w-6" />
                    </Button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50/30">
              <div className="h-16 w-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="font-black uppercase tracking-[0.2em] text-xs animate-pulse">Initializing Primary Channel...</p>
            </div>
          )}
        </Card>

        {/* Info Dialog */}
        <Dialog open={groupInfoOpen} onOpenChange={setGroupInfoOpen}>
          <DialogContent className="max-w-sm rounded-[32px] p-8 bg-white border-none">
            <DialogHeader>
              <DialogTitle className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-[28px] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Users className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-black">{selectedChat?.group_name || 'WORKSPACE'}</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">{selectedChat?.group_description || 'Global Team Workspace'}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Member Roster ({groupMembers.length})
              </p>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-2">
                  {groupMembers.map((member: any) => (
                    <div key={member.user_id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">{(member.profiles?.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black truncate">{member.profiles?.full_name}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">{member.profiles?.role}</p>
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
    </AdminLayout>
  );
}
