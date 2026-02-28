import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/layouts/AdminLayout';
import HRLayout from '@/components/layouts/HRLayout';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';
import ClientLayout from '@/components/layouts/ClientLayout';
import BDELayout from '@/components/layouts/BDELayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, Send, Bot, User } from 'lucide-react';
import { createParser } from 'eventsource-parser';
import { Streamdown } from 'streamdown';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function AiAssistantPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: input.trim() }],
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ contents: newMessages }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`AI Assistant Error: ${errorData.details || errorData.error || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages((prev) => [
        ...prev,
        { role: 'model', parts: [{ text: '' }] },
      ]);

      const onParse = (event: any) => {
        if (event.type === 'event') {
          try {
            const data = JSON.parse(event.data);
            const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            assistantText += chunk;
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage.role === 'model') {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMessage, parts: [{ text: assistantText }] },
                ];
              }
              return prev;
            });
          } catch (e) {
            console.error('Error parsing SSE data', e);
          }
        }
      };

      const parser = createParser({ onEvent: onParse });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        parser.feed(chunk);
      }
    } catch (error) {
      console.error('AI Assistant Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'model', parts: [{ text: 'Sorry, I encountered an error. Please try again later.' }] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLayout = (content: React.ReactNode) => {
    if (profile?.role === 'admin') return <AdminLayout>{content}</AdminLayout>;
    if (profile?.role === 'hr') return <HRLayout>{content}</HRLayout>;
    if (profile?.role === 'client') return <ClientLayout>{content}</ClientLayout>;
    if (profile?.role === 'bde') return <BDELayout>{content}</BDELayout>;
    return <EmployeeLayout>{content}</EmployeeLayout>;
  };

  return renderLayout(
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b flex flex-row items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle>AI Assistant</CardTitle>
            <p className="text-sm text-muted-foreground">Ask me anything about your business, clients, or tasks.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMessages([])}>
            Clear Chat
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                  <div className="bg-primary/10 p-4 rounded-full">
                    <Bot className="h-12 w-12 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Welcome to IT Company AI</h3>
                    <p className="text-muted-foreground max-w-sm">
                      I'm your intelligent assistant. I can help you manage your workflow and answer questions.
                    </p>
                  </div>
                </div>
              )}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3 max-w-[80%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"}>
                      {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {msg.role === 'model' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {msg.parts[0].text ? (
                          <Streamdown>{msg.parts[0].text}</Streamdown>
                        ) : (
                          <span className="animate-pulse">...</span>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
