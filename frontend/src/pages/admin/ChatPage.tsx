import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  addChatMember,
  removeChatMember,
  updateGroupChat,
  getCommonChat,
  uploadFile,
  deleteMessage,
} from '@/db/api';
import type { Chat, Message, Profile, ChatMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageSquare, Users, Settings, UserPlus, UserMinus, Paperclip, FileText, Download, X, Trash2 } from 'lucide-react';
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
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<(ChatMember & { profiles: Partial<Profile> })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string, name: string, type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
  });

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
        setSelectedChat(common);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to initialize chat', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string | undefined, shouldScroll = false) => {
    if (!chatId || chatId === 'undefined' || chatId === 'null') {
      console.warn('[AdminChat] Attempted to load messages for invalid chatId:', chatId);
      return;
    }
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
    } catch (error: any) {
      // silent fail on poll
    }
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
    const msgInterval = setInterval(() => {
      if (selectedChat?.id) loadMessages(selectedChat.id.toString(), false);
    }, 2000);
    const memberInterval = setInterval(() => {
      if (selectedChat?.id) loadGroupMembers(selectedChat.id.toString());
    }, 10000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(memberInterval);
    };
  }, [selectedChat]);

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    const chatId = selectedChat?.id || (selectedChat as any)?._id || (selectedChat as any)?.id;
    if (!chatId) {
      toast({ title: 'Error', description: 'Chat context missing. Please refresh.', variant: 'destructive' });
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

      console.log('Sending message:', payload);
      await sendMessage(payload);

      setNewMessage('');
      setSelectedFile(null);
      loadMessages(chatId, true);
    } catch (error: any) {
      console.error('Send Error:', error);
      toast({ title: 'Error', description: 'Failed to send. Server might be down.', variant: 'destructive' });
    } finally {
      setSending(false);
      // Ensure we stay connected to common chat if everything fails
      if (!selectedChat) loadInitialData();
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

  const handleAddMember = async (userId: string) => {
    if (!selectedChat?.id) return;
    try {
      await addChatMember(selectedChat.id, userId);
      loadGroupMembers(selectedChat.id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedChat?.id || !confirm('Remove member?')) return;
    try {
      await removeChatMember(selectedChat.id, userId);
      loadGroupMembers(selectedChat.id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateGroup = async (e: any) => {
    e.preventDefault();
    if (!selectedChat?.id || !groupForm.name.trim()) return;
    try {
      await updateGroupChat(selectedChat.id, { group_name: groupForm.name, group_description: groupForm.description });
      setEditGroupOpen(false);
      setSelectedChat({ ...selectedChat, group_name: groupForm.name, group_description: groupForm.description });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
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
    <AdminLayout fullWidth>
      <div className="w-full h-full flex flex-col overflow-hidden">
        <Card className="flex flex-col flex-1 overflow-hidden border-none shadow-none rounded-none bg-white">
          {selectedChat ? (
            <>
              <CardHeader className="border-b flex flex-row items-center justify-between space-y-0 py-5 px-8 bg-white/80 backdrop-blur-md shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner rotate-3">
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tighter uppercase">{selectedChat.group_name}</CardTitle>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">{groupMembers.length} ACTIVE MEMBERS</p>
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full h-12 w-12 hover:bg-slate-100 transition-all border border-slate-100" onClick={() => setGroupInfoOpen(true)}>
                  <Settings className="h-6 w-6 text-slate-400" />
                </Button>
              </CardHeader>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#F8FAFC]">
                <div className="flex-1 w-full overflow-y-auto p-6 scroll-smooth px-8">
                  <div className="space-y-6">
                    {messages.length === 0 && !loading && (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                        <MessageSquare className="h-16 w-16 mb-4" />
                        <p className="font-bold">No messages yet. Start the conversation!</p>
                      </div>
                    )}
                    {messages.map((message: Message) => {
                      const isOwn = message.sender_id === profile?.id || (message.sender_id as any)?._id === profile?.id;
                      const isImage = message.file_type?.startsWith('image/');
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
                          <div className={`max-w-[75%] space-y-1`}>
                            {!isOwn && <p className="text-[10px] font-black ml-4 text-primary uppercase tracking-widest mb-1">{getSenderName(message.sender_id)}</p>}
                            <div className={`rounded-3xl px-6 py-3.5 shadow-sm border ${isOwn ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary rounded-br-none shadow-primary/20' : 'bg-white border-slate-200 rounded-bl-none shadow-slate-100'}`}>
                              {message.content && <p className="text-[15px] leading-relaxed font-medium">{message.content}</p>}
                              {message.file_url && (
                                <div className="mt-3 overflow-hidden rounded-[24px] ring-1 ring-black/5 shadow-lg">
                                  {isImage ? (
                                    <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer">
                                      <img src={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} alt={message.file_name} className="max-w-full h-auto max-h-[450px] object-cover hover:scale-[1.02] transition-transform cursor-zoom-in" />
                                    </a>
                                  ) : (
                                    <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-slate-100 transition-all group">
                                      <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-md text-primary group-hover:scale-110 transition-transform">
                                        <FileText className="h-8 w-8" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black truncate text-slate-900 leading-tight">{message.file_name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Shared Document</p>
                                      </div>
                                      <Download className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" />
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
                                <p className="text-[9px] opacity-60 font-black tracking-widest uppercase">
                                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="p-4 border-t bg-white/50 backdrop-blur-xl shrink-0 relative">
                  {selectedFile && (
                    <div className="absolute bottom-full left-4 right-4 mb-4 p-4 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-[28px] flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)] z-20">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-primary/5 overflow-hidden">
                          {selectedFile.type.startsWith('image/') ? (
                            <img src={selectedFile.url.startsWith('http') ? selectedFile.url : `${API_URL.replace('/api', '')}${selectedFile.url}`} className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate text-slate-900">{selectedFile.name}</p>
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
                  <form onSubmit={handleSendMessage} className="flex gap-3 items-center bg-slate-100/80 p-2 rounded-[32px] ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-primary/20 transition-all flex-nowrap overflow-hidden shadow-inner">
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button type="button" size="icon" variant="ghost" className="h-12 w-12 shrink-0 rounded-full hover:bg-white transition-all shadow-sm bg-white/50" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}>
                      <Paperclip className={`h-6 w-6 text-slate-500 ${uploading ? 'animate-spin' : ''}`} />
                    </Button>
                    <textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-3 text-[15px] font-medium resize-none h-12 max-h-40 scrollbar-hide"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      disabled={sending}
                    />
                    <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-full shadow-lg bg-primary text-white hover:bg-primary/90 hover:scale-105 transition-all" disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}>
                      <Send className="h-6 w-6" />
                    </Button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-center p-12">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4" />
              <p className="font-bold text-slate-400">Loading Universal Chat...</p>
            </div>
          )}
        </Card>

        {/* Dialogs */}
        <Dialog open={groupInfoOpen} onOpenChange={setGroupInfoOpen}>
          <DialogContent className="max-w-md rounded-[32px] p-8">
            <DialogHeader>
              <DialogTitle className="flex justify-center flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-[28px] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Users className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-black tracking-tight">{selectedChat?.group_name}</span>
                  <span className="block text-sm font-medium text-muted-foreground mt-2 px-6">{selectedChat?.group_description}</span>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-6">
              <div className="flex items-center justify-between px-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Team Members ({groupMembers.length})</p>
                <Button size="sm" variant="outline" className="rounded-xl border-dashed" onClick={() => setAddMemberOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Invite</Button>
              </div>
              <ScrollArea className="h-[240px] rounded-3xl border border-slate-100 bg-slate-50/50 p-2 shadow-inner">
                <div className="space-y-2">
                  {groupMembers.map((member: any) => (
                    <div key={member.user_id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-100 group">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-xs font-black bg-primary/10 text-primary">{(member.profiles?.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate">{member.profiles?.full_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{member.profiles?.role}</p>
                      </div>
                      {member.user_id !== profile?.id && (
                        <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 text-destructive rounded-full transition-all" onClick={() => handleRemoveMember(member.user_id)}>
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button variant="outline" className="w-full rounded-2xl h-12 font-bold" onClick={() => { if (selectedChat) { setGroupForm({ name: selectedChat.group_name || '', description: selectedChat.group_description || '' }); setEditGroupOpen(true); } }}>Edit Workspace Details</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
          <DialogContent className="rounded-[32px]">
            <DialogHeader><DialogTitle className="text-center font-black">Invite New Members</DialogTitle></DialogHeader>
            <ScrollArea className="h-[350px] mt-4">
              <div className="space-y-2 pr-4">
                {users.filter(u => !groupMembers.some(m => m.user_id === u.id)).map(user => (
                  <Button key={user.id} variant="ghost" className="w-full justify-start gap-4 h-16 rounded-2xl hover:bg-primary/5 group" onClick={() => { handleAddMember(user.id); setAddMemberOpen(false); }}>
                    <Avatar className="h-10 w-10 shadow-sm border border-slate-100 group-hover:border-primary/20">
                      <AvatarFallback className="bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary">{user.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-black truncate">{user.full_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{user.role}</p>
                    </div>
                    <UserPlus className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
          <DialogContent className="rounded-[32px]">
            <DialogHeader><DialogTitle className="text-center font-black text-2xl">Modify Group</DialogTitle></DialogHeader>
            <form onSubmit={handleUpdateGroup} className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-500 uppercase tracking-widest text-[10px] ml-2">Workspace Name</Label>
                <Input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="h-12 rounded-2xl font-bold px-4" required />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-500 uppercase tracking-widest text-[10px] ml-2">Description</Label>
                <Textarea value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} className="rounded-2xl min-h-[100px] font-medium p-4" />
              </div>
              <Button type="submit" className="w-full h-12 rounded-2xl font-black text-lg">Save Changes</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
