import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  MessageCircle,
  Calendar,
  Users,
  Search,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface FloatingAIChatbotProps {
  currentPage?: string;
}

export const FloatingAIChatbot: React.FC<FloatingAIChatbotProps> = ({ currentPage = 'dashboard' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: `Hello! I'm your AI assistant for NexEagle easyHMS. I can help you with medical questions, navigate the system, book appointments, and more. How can I assist you today?`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage, currentPage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (userInput: string, page: string): string => {
    const input = userInput.toLowerCase();
    
    // Medical questions
    if (input.includes('dose') || input.includes('dosage') || input.includes('medication')) {
      return `For medication dosages, I recommend consulting the latest medical guidelines. Always verify with current prescribing information. Would you like me to help you find specific drug information or create a prescription?`;
    }
    
    if (input.includes('icd') || input.includes('diagnosis')) {
      return `I can help with ICD-10 code suggestions. For example, if you're looking for hypertension codes, try I10 (Essential hypertension). What specific condition are you diagnosing?`;
    }
    
    if (input.includes('blood pressure') || input.includes('bp')) {
      return `Normal blood pressure is typically <120/80 mmHg. For management guidelines, consider lifestyle modifications first, then medications if needed. Current patient's BP trends can be found in their profile.`;
    }
    
    // Navigation help
    if (input.includes('patient') && (input.includes('find') || input.includes('search'))) {
      return `To find a patient, go to the Patients page and use the search filter. You can search by Patient ID, name, or contact number. Would you like me to guide you there?`;
    }
    
    if (input.includes('appointment') && input.includes('book')) {
      return `To book an appointment: 1) Go to Appointment Scheduler, 2) Select department and doctor, 3) Choose date and time slot, 4) Fill patient details. Need help with any specific step?`;
    }
    
    if (input.includes('prescription') || input.includes('rx')) {
      return `To create a prescription, open a patient profile and go to the E-Prescription tab. You can use templates, add medications with dosages, and customize the format. Want me to show you how?`;
    }
    
    // Page-specific help
    if (page === 'billing' && (input.includes('bill') || input.includes('invoice'))) {
      return `In billing, you can create bills for consultations, lab tests, and medications. Add discounts, select payment methods (UPI, Cash, Card), and generate invoices. Need help with a specific billing task?`;
    }
    
    // General responses
    if (input.includes('hello') || input.includes('hi')) {
      return `Hello! I'm here to help with your healthcare management tasks. You can ask me about medical guidelines, system navigation, patient management, or anything else related to NexEagle easyHMS.`;
    }
    
    return `I understand you're asking about "${userInput}". I can help with medical questions, system navigation, patient management, appointments, billing, and more. Could you be more specific about what you need help with?`;
  };

  const handleVoiceInput = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast({
        title: "Voice Recording Started",
        description: "Speak now... (This is a demo feature)"
      });
      
      // Simulate voice recording
      setTimeout(() => {
        setIsRecording(false);
        setInputMessage("How do I check a patient's lab results?");
        toast({
          title: "Voice Input Received",
          description: "Processing your voice command..."
        });
      }, 3000);
    } else {
      setIsRecording(false);
    }
  };

  const quickActions = [
    { icon: Calendar, label: "Book Appointment", action: "How do I book an appointment?" },
    { icon: Users, label: "Find Patient", action: "How do I search for a patient?" },
    { icon: Search, label: "ICD Codes", action: "Help me find ICD codes" }
  ];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-primary text-white shadow-elegant hover:shadow-hover transition-all duration-300 animate-pulse"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-72 sm:w-80 md:w-96 shadow-elegant transition-all duration-300 ${
        isMinimized ? 'h-16' : 'h-[80vh] sm:h-[500px]'
      }`}>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 bg-gradient-primary">
              <AvatarFallback className="text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm">AI Assistant</CardTitle>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[calc(100%-4rem)]">
            {/* Quick Actions */}
            <div className="p-2 md:p-4 border-b">
              <div className="flex gap-1 md:gap-2 flex-wrap">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-xs h-7 md:h-8 px-2"
                    onClick={() => setInputMessage(action.action)}
                  >
                    <action.icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-2 md:p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.type === 'bot' && (
                      <Avatar className="h-6 w-6 bg-gradient-primary">
                        <AvatarFallback className="text-white">
                          <Bot className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[80%] rounded-lg p-3 text-sm ${
                        message.type === 'user'
                          ? 'bg-gradient-primary text-white'
                          : 'bg-muted'
                      }`}
                    >
                      <p>{message.content}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {message.isVoice && <Mic className="h-3 w-3 opacity-70" />}
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {message.type === 'user' && (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-healthcare-primary text-white text-xs">
                          U
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-3">
                    <Avatar className="h-6 w-6 bg-gradient-primary">
                      <AvatarFallback className="text-white">
                        <Bot className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-2 md:p-4 border-t">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me anything..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="pr-10 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleVoiceInput}
                    className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 ${
                      isRecording ? 'text-red-500' : ''
                    }`}
                  >
                    {isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="bg-gradient-primary text-white h-8 w-8 p-0"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
              
              {isRecording && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Recording... Speak now
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};