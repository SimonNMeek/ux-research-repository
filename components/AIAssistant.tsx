'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    id: number;
    title: string;
    project: string;
  }>;
  timestamp: Date;
}

interface AIAssistantProps {
  workspaceSlug: string;
  workspaceName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AIAssistant({ workspaceSlug, workspaceName, isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [useMcp, setUseMcp] = useState<boolean>(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send conversation history for context
      const endpoint = useMcp ? '/api/agent-mcp' : '/api/mcp-ai';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          workspaceSlug,
          conversationHistory: messages.slice(-10).map(msg => ({ // Last 10 messages for context
            role: msg.role,
            content: msg.content,
            sources: msg.sources
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Server error (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('quota exceeded') || error.message.includes('billing')) {
          errorContent = 'AI service quota exceeded. Please check your OpenAI billing details.';
        } else if (error.message.includes('invalid_api_key')) {
          errorContent = 'AI service configuration error. Please contact support.';
        } else if (error.message.includes('Database connection timeout')) {
          errorContent = 'The database is temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('AI service temporarily unavailable')) {
          errorContent = 'The AI service is temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('Unauthorized')) {
          errorContent = 'Please refresh the page and try again.';
        } else if (error.message.includes('Server error')) {
          errorContent = 'Server error occurred. Please try again.';
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="fixed right-0 top-0 h-full w-96 min-w-96 max-w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col"
        style={{ width: '384px', minWidth: '384px', maxWidth: '384px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Ask about {workspaceName}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-medium mb-2">
                Ask me anything about your research in {workspaceName}
              </p>
              <p className="text-xs mb-4">
                I can help you explore documents, analyze findings, summarize research, and answer questions about your projects.
              </p>
              <div className="text-xs space-y-1">
                <p className="font-medium">Try asking:</p>
                <p>• "What are the main findings in this workspace?"</p>
                <p>• "Summarize the Product Research project"</p>
                <p>• "What documents mention user feedback?"</p>
                <p>• "Help me understand the key themes"</p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              )}
              
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                <Card className={`p-3 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </Card>
                
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sources:</p>
                    {message.sources.map((source) => (
                      <div key={source.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <FileText className="h-3 w-3" />
                        <span>{source.title}</span>
                        <span className="text-gray-400">({source.project})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <Card className="p-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <input type="checkbox" checked={useMcp} onChange={e => setUseMcp(e.target.checked)} />
              Use MCP (server proxy)
            </label>
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your research..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
