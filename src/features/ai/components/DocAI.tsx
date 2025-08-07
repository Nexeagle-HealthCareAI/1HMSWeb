import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  Download, 
  FileText, 
  MessageSquare, 
  Lightbulb,
  Sparkles,
  Brain,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

const predefinedQuestions = [
  "What are the symptoms of hypertension?",
  "ICD-10 code for diabetes",
  "Treatment guidelines for pneumonia",
  "Drug interactions with warfarin",
  "Emergency protocols for cardiac arrest"
];

export const DocAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm DocAI, your medical assistant. I can help you with medical questions, ICD-10 codes, treatment guidelines, and more. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(input),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('hypertension') || lowerQuestion.includes('blood pressure')) {
      return "Hypertension symptoms include:\n• Headaches\n• Shortness of breath\n• Nosebleeds\n• Flushing\n• Dizziness\n• Chest pain\n\nICD-10 Code: I10 (Essential hypertension)\n\nTreatment typically involves lifestyle modifications and antihypertensive medications like ACE inhibitors or diuretics.";
    }
    
    if (lowerQuestion.includes('diabetes') || lowerQuestion.includes('icd')) {
      return "ICD-10 Codes for Diabetes:\n• E11 - Type 2 diabetes mellitus\n• E10 - Type 1 diabetes mellitus\n• E13 - Other specified diabetes mellitus\n• E14 - Unspecified diabetes mellitus\n\nWould you like specific subcategory codes or treatment guidelines?";
    }
    
    if (lowerQuestion.includes('pneumonia')) {
      return "Pneumonia Treatment Guidelines:\n\n**Community-Acquired Pneumonia:**\n• First-line: Amoxicillin or Macrolides\n• Severe cases: Beta-lactam + Macrolide\n\n**Hospital-Acquired:**\n• Broad-spectrum antibiotics\n• Consider MRSA coverage if risk factors present\n\nDuration: 5-7 days for most cases\nICD-10: J18.9 (Pneumonia, unspecified organism)";
    }
    
    return "I understand your question about " + question + ". Based on current medical guidelines, I recommend consulting the latest clinical protocols. Would you like me to help you find specific ICD-10 codes or treatment guidelines for this condition?";
  };

  const handlePredefinedQuestion = (question: string) => {
    setInput(question);
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input would be implemented here
  };

  const handleFileUpload = () => {
    // File upload logic would be implemented here
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-subtle p-2 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Bot className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">DocAI Assistant</h1>
              <p className="text-sm md:text-base text-muted-foreground">Your intelligent medical companion</p>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="mb-3 md:mb-4 flex-shrink-0">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Quick Questions:</h3>
        <div className="flex flex-wrap gap-1 md:gap-2">
          {predefinedQuestions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handlePredefinedQuestion(question)}
              className="text-xs h-7 md:h-8 px-2 md:px-3"
            >
              <span className="truncate">{question}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {message.type === 'ai' ? (
                    <div className="w-full h-full bg-gradient-primary rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <>
                      <AvatarImage src="/api/placeholder/32/32" />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                
                <div
                  className={`p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-healthcare-primary text-white'
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  <div className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <div className="w-full h-full bg-gradient-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                </Avatar>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t p-2 md:p-4 flex-shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about medical conditions, ICD codes, treatments..."
                className="resize-none pr-16 md:pr-20 text-sm"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="absolute right-2 bottom-2 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleFileUpload}
                  className="h-5 w-5 md:h-6 md:w-6 p-0"
                >
                  <FileText className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleVoiceInput}
                  className={`h-5 w-5 md:h-6 md:w-6 p-0 ${isListening ? 'text-healthcare-primary' : ''}`}
                >
                  <Brain className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="self-end h-8 w-8 md:h-10 md:w-10 p-0"
            >
              <Send className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
          
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
            <span className="sm:hidden">Enter to send</span>
            <span>{input.length}/1000</span>
          </div>
        </div>
      </Card>
    </div>
  );
};