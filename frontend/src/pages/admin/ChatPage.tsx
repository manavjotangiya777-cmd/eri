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
  addChatMember,
  removeChatMember,
  updateGroupChat,
  getCommonChat,
  uploadFile,
} from '@/db/api';
import type { Chat, Message, Profile, ChatMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageSquare, Users, Settings, UserPlus, UserMinus, Shield, Paperclip, FileText, Download, X } from 'lucide-react';
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
    const msgInterval = setInterval(() => loadMessages(selectedChat.id.toString(), false), 2000);
    const memberInterval = setInterval(() => loadGroupMembers(selectedChat.id.toString()), 10000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(memberInterval);
    };
  }, [selectedChat]);

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    const chatId = selectedChat?.id || (selectedChat as any)?._id;
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

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Common Chatbox</h1>
            <p className="text-muted-foreground">Universal workspace for the entire team</p>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
            <Shield className="h-3.5 w-3.5" /> SYSTEM ADMIN
          </Badge>
        </div>

        <Card className="flex flex-col overflow-hidden h-[calc(100vh-220px)] min-h-[550px] shadow-2xl border-none ring-1 ring-slate-200">
          {selectedChat ? (
            <>
              <CardHeader className="border-b flex flex-row items-center justify-between space-y-0 py-4 px-6 bg-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">{selectedChat.group_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{groupMembers.length} active team members</p>
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full hover:bg-slate-100" onClick={() => setGroupInfoOpen(true)}>
                  <Settings className="h-5 w-5 text-slate-400" />
                </Button>
              </CardHeader>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#F8FAFC]">
                <ScrollArea className="h-full w-full p-6">
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
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] space-y-1.5`}>
                            {!isOwn && <p className="text-[10px] font-black ml-3 text-primary uppercase tracking-tighter">{getSenderName(message.sender_id)}</p>}
                            <div className={`rounded-3xl px-5 py-3 shadow-sm border ${isOwn ? 'bg-primary text-primary-foreground border-primary rounded-br-none' : 'bg-white border-slate-100 rounded-bl-none'}`}>
                              {message.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>}
                              {message.file_url && (
                                <div className="mt-3 overflow-hidden rounded-2xl">
                                  {isImage ? (
                                    <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer">
                                      <img src={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} alt={message.file_name} className="max-w-full h-auto max-h-96 object-cover hover:brightness-110 transition-all cursor-zoom-in" />
                                    </a>
                                  ) : (
                                    <a href={message.file_url.startsWith('http') ? message.file_url : `${API_URL.replace('/api', '')}${message.file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
                                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary">
                                        <FileText className="h-7 w-7" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black truncate text-slate-900">{message.file_name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Document File</p>
                                      </div>
                                      <Download className="h-5 w-5 opacity-40" />
                                    </a>
                                  )}
                                </div>
                              )}
                              <p className={`text-[9px] mt-2 text-right opacity-40 font-bold`}>
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

                <div className="p-6 border-t bg-white">
                  {selectedFile && (
                    <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-primary/10 overflow-hidden">
                          {selectedFile.type.startsWith('image/') ? (
                            <img src={selectedFile.url.startsWith('http') ? selectedFile.url : `${API_URL.replace('/api', '')}${selectedFile.url}`} className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate">{selectedFile.name}</p>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{selectedFile.type.split('/')[1]}</span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-destructive/10 text-destructive rounded-full transition-colors" onClick={() => setSelectedFile(null)}>
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-4 items-end bg-[#F1F5F9] p-2 rounded-[28px]">
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button type="button" size="icon" variant="ghost" className="h-12 w-12 shrink-0 rounded-full hover:bg-white transition-all shadow-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}>
                      <Paperclip className={`h-6 w-6 text-slate-500 ${uploading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Write a message to the team..."
                      className="flex-1 min-h-[48px] max-h-[160px] resize-none border-none bg-transparent focus-visible:ring-0 px-4 py-3 text-sm font-medium"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      disabled={sending}
                    />
                    <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-full shadow-lg shadow-primary/20" disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}>
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
