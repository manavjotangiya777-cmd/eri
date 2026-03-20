import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
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

interface EmployeeChatProps {
  Layout?: React.ComponentType<{ children: React.ReactNode; fullWidth?: boolean }>;
}

export default function EmployeeChat({ Layout = EmployeeLayout }: EmployeeChatProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
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
      // setLoading(false);
    }
  };

  const loadMessages = async (chatId: string | undefined, shouldScroll = false) => {
    if (!chatId || chatId === 'undefined' || chatId === 'null') return;
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
    const chatId = selectedChat?.id || (selectedChat as any)?._id;
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

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteMessage(messageId, profile?.id);
      if (selectedChat) loadMessages(selectedChat.id.toString(), false);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' });
    }
  };

  return (
    <Layout fullWidth>
      <div className="w-full h-full flex flex-col overflow-hidden">
        <Card className="flex flex-col flex-1 overflow-hidden border-none shadow-none rounded-none bg-white">
          {selectedChat ? (
            <>
              <CardHeader className="py-5 px-8 border-b border-slate-100 dark:border-white/5 shrink-0 flex flex-row items-center justify-between bg-white/80 backdrop-blur-md z-10 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner rotate-3 transition-transform hover:rotate-0">
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tighter uppercase">{selectedChat.group_name}</CardTitle>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[11px] text-emerald-600 font-black uppercase tracking-widest leading-none">{groupMembers.length} EMPLOYEES ONLINE</p>
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full h-12 w-12 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-100 transition-all" onClick={() => setGroupInfoOpen(true)}>
                  <Info className="h-6 w-6" />
                </Button>
              </CardHeader>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-transparent">
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

                      const isOwn = message.sender_id === profile?.id || (message.sender_id as any)?._id === profile?.id;
                      const isImage = message.file_type?.startsWith('image/');
                      return (
                        <div key={message.id}>
                          {showDateHeader && (
                            <div className="flex justify-center my-6">
                              <div className="bg-slate-200/50 text-slate-500 text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full border border-slate-200/50 backdrop-blur-sm">
                                {displayDate}
                              </div>
                            </div>
                          )}
                          <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group mt-2`}>
                            <div className={`max-w-[75%] space-y-1`}>
                              {!isOwn && <p className="text-[10px] font-black ml-4 text-emerald-600 uppercase tracking-widest mb-1">{getSenderName(message.sender_id)}</p>}
                              <div className={`rounded-[28px] px-6 py-3.5 shadow-sm border ${isOwn ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white border-emerald-500 rounded-br-none shadow-emerald-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 rounded-bl-none text-slate-800 dark:text-slate-200 shadow-slate-100'}`}>
                                {message.content && <p className="text-[15px] leading-relaxed font-medium">{message.content}</p>}
                                {message.file_url && (
                                  <div className="mt-3 overflow-hidden rounded-[24px] ring-1 ring-black/5 shadow-lg">
                                    {isImage ? (
                                      <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer">
                                        <img src={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} alt={message.file_name} className="max-w-full h-auto max-h-[450px] object-cover hover:scale-[1.02] transition-transform cursor-zoom-in" />
                                      </a>
                                    ) : (
                                      <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-emerald-50/50 dark:bg-white/5 rounded-[24px] hover:bg-emerald-100/50 transition-all group border border-emerald-100/20">
                                        <div className="h-14 w-14 bg-white dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 shadow-md border border-emerald-200 group-hover:rotate-6 transition-transform"><FileText className="h-8 w-8" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-black truncate leading-tight">{message.file_name}</p>
                                          <p className="text-[10px] text-emerald-600/70 font-black tracking-widest uppercase mt-1">Shared Material</p>
                                        </div>
                                        <Download className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:text-emerald-600 transition-all" />
                                      </a>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center justify-between gap-2 mt-2.5">
                                  {isOwn && (
                                    <button
                                      onClick={() => handleDeleteMessage(message.id)}
                                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded-full hover:bg-black/5 text-white"
                                      title="Delete Message"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                  <p className="text-[9px] opacity-60 font-black tracking-widest uppercase ml-auto">
                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-white/50 backdrop-blur-xl shrink-0 relative">
                  {selectedFile && (
                    <div className="absolute bottom-full left-4 right-4 mb-4 p-4 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-emerald-200/30 dark:border-white/10 rounded-[28px] flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)] z-20">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-emerald-500/5">
                          {selectedFile.type.startsWith('image/') ? (
                            <img src={selectedFile.url.startsWith('http') ? selectedFile.url : `${API_URL.replace('/api', '')}${selectedFile.url}`} className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-8 w-8 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate leading-tight text-slate-900 dark:text-emerald-50">{selectedFile.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{selectedFile.type.split('/')[1]}</p>
                          </div>
                        </div>
                      </div>
                      <button type="button" className="h-10 w-10 flex items-center justify-center hover:bg-destructive/10 text-destructive rounded-full transition-all hover:rotate-90 hover:scale-110" onClick={() => setSelectedFile(null)}>
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-3 items-center bg-slate-100/80 dark:bg-white/5 p-2 rounded-[32px] ring-1 ring-black/5 focus-within:ring-2 ring-emerald-500/20 transition-all flex-nowrap overflow-hidden shadow-inner">
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button type="button" size="icon" variant="ghost" className="h-12 w-12 shrink-0 rounded-full hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm bg-white/50 dark:bg-transparent" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}>
                      <Paperclip className={`h-6 w-6 text-slate-500 ${uploading ? 'animate-spin text-emerald-500' : ''}`} />
                    </Button>
                    <textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-3 text-[15px] font-medium resize-none h-12 max-h-40 dark:text-white scrollbar-hide"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      disabled={sending}
                    />
                    <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 text-white hover:scale-105 transition-all" disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}>
                      <Send className="h-6 w-6" />
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
