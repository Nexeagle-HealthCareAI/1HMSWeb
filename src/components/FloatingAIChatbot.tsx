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
  Maximize2,
  BookOpen,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  FileText,
  UserPlus,
  Stethoscope,
  Calculator,
  Settings,
  Activity,
  Lightbulb
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { toast } from '@/hooks/use-toast';
import { USER_GUIDE, searchGuide, getGuideById, type GuideSection } from './UserGuide';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'guide';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  guideSection?: GuideSection;
}

interface FloatingAIChatbotProps {
  currentPage?: string;
}

export const FloatingAIChatbot: React.FC<FloatingAIChatbotProps> = ({ currentPage = 'dashboard' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'guide'>('chat');
  const [selectedGuideSection, setSelectedGuideSection] = useState<GuideSection | null>(null);
  const [guideSearchTerm, setGuideSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: `Hello! I'm your AI assistant for NexEagle easyHMS. I can help you with:

🔍 **Medical questions** - Drug interactions, ICD codes, treatment guidelines
📋 **System navigation** - Find features, book appointments, manage patients  
📚 **User guides** - Step-by-step instructions for all features
🚀 **Quick actions** - Fast access to common tasks

How can I assist you today?`,
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

    // Check if it's a guide request
    const guideResults = searchGuide(inputMessage);
    if (guideResults.length > 0) {
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'guide',
          content: `I found ${guideResults.length} guide section(s) related to "${inputMessage}". Click on any section below to view detailed instructions:`,
          timestamp: new Date(),
          guideSection: guideResults[0]
        };
        
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1000);
    } else {
      // Regular AI response
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
    }
  };

  const generateBotResponse = (userInput: string, page: string): string => {
    const input = userInput.toLowerCase();
    
    // Medical questions
    if (input.includes('dose') || input.includes('dosage') || input.includes('medication') || input.includes('drug')) {
      return `For medication dosages and drug information:

💊 **Always verify with current prescribing information**
📋 Use the medicine database in E-Prescription module
🔍 Check drug interactions before prescribing
⚠️ Consider patient allergies and contraindications

Would you like me to guide you to the E-Prescription module or show you the medication management guide?`;
    }
    
    if (input.includes('icd') || input.includes('diagnosis')) {
      return `**ICD-10 Code Assistance:**

🔍 **Common codes:**
• I10 - Essential hypertension
• E11.9 - Type 2 diabetes without complications  
• J45.9 - Asthma, unspecified
• M79.3 - Panniculitis

💡 **Quick tip:** Use the search function in patient diagnosis section for code suggestions.

Need help with a specific diagnosis? Just describe the condition!`;
    }
    
    if (input.includes('blood pressure') || input.includes('bp') || input.includes('hypertension')) {
      return `**Blood Pressure Management Guidelines:**

📊 **Normal ranges:**
• Normal: <120/80 mmHg
• Elevated: 120-129/<80 mmHg  
• Stage 1 HTN: 130-139/80-89 mmHg
• Stage 2 HTN: ≥140/90 mmHg

🎯 **Management approach:**
1. Lifestyle modifications first
2. Dietary changes (DASH diet)
3. Regular exercise
4. Medication if needed

Check patient's BP trends in their profile for better assessment.`;
    }

    if (input.includes('fever') || input.includes('temperature')) {
      return `**Fever Management:**

🌡️ **Temperature ranges:**
• Normal: 97-99°F (36.1-37.2°C)
• Low-grade fever: 99.1-100.4°F
• Fever: >100.4°F (38°C)
• High fever: >103°F (39.4°C)

⚕️ **Treatment approach:**
• Identify underlying cause
• Symptomatic relief with acetaminophen/ibuprofen
• Maintain hydration
• Monitor for complications

Need help documenting fever in patient records?`;
    }
    
    // Navigation help
    if (input.includes('patient') && (input.includes('find') || input.includes('search'))) {
      return `**Finding Patients:**

🔍 **Search methods:**
• Patient ID (most accurate)
• Full name or partial name
• Phone number  
• Email address

📍 **Quick access:**
1. Go to **Patients** page
2. Use the search bar at the top
3. Apply filters if needed
4. Click on patient name to view profile

**Pro tip:** Use Ctrl+K for global search from any page!`;
    }
    
    if (input.includes('appointment') && input.includes('book')) {
      return `**Booking Appointments:**

📅 **Step-by-step process:**
1. Navigate to **Appointment Scheduler**
2. Select **Department** and **Doctor**
3. Choose **available date and time**
4. Enter **patient details** or search existing
5. Add **appointment notes** if needed
6. **Confirm booking**

⚡ **Quick tips:**
• Double-click calendar for quick booking
• Color codes: Green (Available), Orange (Busy), Red (Unavailable)
• System auto-checks for conflicts

Need help with a specific appointment issue?`;
    }
    
    if (input.includes('prescription') || input.includes('rx') || input.includes('medicine')) {
      return `**E-Prescription Guide:**

💊 **Creating prescriptions:**
1. Open **patient profile**
2. Go to **E-Prescription** tab  
3. Click **"New Prescription"**
4. Add medications from database
5. Set **dosage and instructions**
6. Include **diagnosis and advice**
7. **Print or email** to patient

🎯 **Best practices:**
• Use medicine database for accuracy
• Check drug interactions
• Include clear dosage instructions
• Save templates for common conditions

Want to see the detailed prescription guide?`;
    }
    
    // Page-specific help
    if (page === 'billing' && (input.includes('bill') || input.includes('invoice') || input.includes('payment'))) {
      return `**Billing & Payments Help:**

💰 **Creating bills:**
1. Go to **Billing** → **New Bill**
2. Select **patient**
3. Add **services** (consultation, tests, procedures)
4. Apply **discounts** if applicable
5. Choose **payment method**
6. **Generate receipt**

💳 **Payment methods:**
• Cash, Card, UPI
• Insurance (verify coverage first)
• Corporate/TPA billing

📊 **Reports:** Access financial reports for daily collections and analytics.

Need help with insurance claims?`;
    }

    if (input.includes('lab') || input.includes('test') || input.includes('report')) {
      return `**Laboratory Management:**

🔬 **Ordering tests:**
1. From **patient profile** → **Lab Reports**
2. Click **"Order Tests"**
3. Select tests from catalog
4. Set **urgency level**
5. **Submit order**

📋 **Workflow:**
• Sample collection → labeling
• Test processing → result entry  
• Doctor review → approval
• Report generation → patient delivery

🎯 **Tips:**
• Use test packages for common combinations
• Mark urgent tests clearly
• Review critical values immediately

Need help with specific test procedures?`;
    }

    // User guide requests
    if (input.includes('guide') || input.includes('help') || input.includes('how to') || input.includes('tutorial')) {
      return `**User Guide Available!**

📚 I have comprehensive guides for:

🏥 **Core Functions:**
• Patient Management
• Appointment Scheduling  
• E-Prescription
• Billing & Insurance
• Lab Management

⚙️ **Admin Features:**
• User Management
• System Configuration
• Reports & Analytics

🤖 **Advanced Features:**
• AI Assistant Usage
• Voice Commands
• Troubleshooting

Click the **"User Guide"** tab above to browse detailed step-by-step instructions, or tell me what specific feature you need help with!`;
    }
    
    // General responses
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return `Hello! 👋 I'm here to help with your healthcare management tasks.

🎯 **I can assist with:**
• Medical questions & clinical guidelines
• System navigation & feature location  
• Step-by-step user guides
• Troubleshooting common issues
• Quick access to system functions

💬 **Popular requests:**
"How do I book an appointment?"
"Help with prescription writing"
"Show me ICD codes for diabetes"
"Guide for user management"

What would you like help with today?`;
    }

    if (input.includes('thank') || input.includes('thanks')) {
      return `You're welcome! 😊 

I'm always here to help. Feel free to ask me:
• Medical questions anytime  
• System navigation help
• User guide instructions
• Troubleshooting assistance

Is there anything else I can help you with?`;
    }
    
    // Default response with suggestions
    return `I understand you're asking about "${userInput}". Let me help you with that!

🔍 **I can assist with:**
• **Medical queries:** Drug interactions, ICD codes, treatment guidelines
• **System features:** Navigation, patient management, appointments
• **User guides:** Step-by-step instructions for all features
• **Troubleshooting:** Common issues and solutions

💡 **Suggestions:**
• Try: "How to create prescription"
• Try: "Show me patient management guide"  
• Try: "Help with appointment booking"
• Try: "ICD codes for hypertension"

Click the **User Guide** tab for comprehensive documentation, or be more specific about what you need help with!`;
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
    { icon: Search, label: "ICD Codes", action: "Help me find ICD codes" },
    { icon: FileText, label: "Prescription", action: "Guide for creating prescriptions" },
    { icon: Calculator, label: "Billing", action: "How to create patient bills" },
    { icon: Stethoscope, label: "Lab Tests", action: "How to order lab tests" }
  ];

  const filteredGuides = guideSearchTerm 
    ? searchGuide(guideSearchTerm)
    : USER_GUIDE;

  const openGuideSection = (section: GuideSection) => {
    setSelectedGuideSection(section);
    setActiveTab('guide');
  };

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
      <Card className={`w-80 md:w-96 shadow-elegant transition-all duration-300 ${
        isMinimized ? 'h-16' : 'h-[85vh] sm:h-[600px]'
      }`}>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 bg-gradient-primary">
              <AvatarFallback className="text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm">AI Assistant & Guide</CardTitle>
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
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'guide')}>
              <TabsList className="mx-4 mt-2">
                <TabsTrigger value="chat" className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="guide" className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  User Guide
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex flex-col flex-1 mt-2">
                {/* Quick Actions */}
                <div className="p-2 md:p-4 border-b">
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-xs h-8 px-2 justify-start"
                        onClick={() => setInputMessage(action.action)}
                      >
                        <action.icon className="h-3 w-3" />
                        <span className="truncate">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-2 md:p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id}>
                        <div
                          className={`flex gap-3 ${
                            message.type === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {message.type !== 'user' && (
                            <Avatar className="h-6 w-6 bg-gradient-primary">
                              <AvatarFallback className="text-white">
                                <Bot className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div
                            className={`max-w-[85%] rounded-lg p-3 text-sm ${
                              message.type === 'user'
                                ? 'bg-gradient-primary text-white'
                                : message.type === 'guide' 
                                ? 'bg-blue-50 border border-blue-200' 
                                : 'bg-muted'
                            }`}
                          >
                            <p className="whitespace-pre-line">{message.content}</p>
                            
                            {message.type === 'guide' && (
                              <div className="mt-3 space-y-2">
                                {searchGuide(inputMessage).slice(0, 3).map((section) => (
                                  <Button
                                    key={section.id}
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-between text-xs"
                                    onClick={() => openGuideSection(section)}
                                  >
                                    <span className="truncate">{section.title}</span>
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                ))}
                              </div>
                            )}
                            
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
              </TabsContent>

              <TabsContent value="guide" className="flex flex-col flex-1 mt-2">
                {selectedGuideSection ? (
                  // Detailed Guide View
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-2 mb-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedGuideSection(null)}
                          className="p-1"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="font-semibold text-sm">{selectedGuideSection.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedGuideSection.description}</p>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {/* Steps */}
                        {selectedGuideSection.steps && (
                          <div>
                            <h4 className="font-medium text-sm mb-3 flex items-center gap-1">
                              <Activity className="h-4 w-4" />
                              Step-by-Step Guide
                            </h4>
                            <div className="space-y-3">
                              {selectedGuideSection.steps.map((step, index) => (
                                <div key={index} className="border rounded-lg p-3">
                                  <div className="flex items-start gap-2">
                                    <Badge variant="outline" className="text-xs mt-0.5">
                                      {step.step}
                                    </Badge>
                                    <div className="flex-1">
                                      <h5 className="font-medium text-sm">{step.title}</h5>
                                      <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                                      {step.note && (
                                        <div className="mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                                          <p className="text-xs text-blue-700">💡 {step.note}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quick Tips */}
                        {selectedGuideSection.quickTips && (
                          <div>
                            <h4 className="font-medium text-sm mb-3 flex items-center gap-1">
                              <Lightbulb className="h-4 w-4" />
                              Quick Tips
                            </h4>
                            <div className="space-y-2">
                              {selectedGuideSection.quickTips.map((tip, index) => (
                                <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                                  <span className="text-green-600 mt-0.5">💡</span>
                                  <p className="text-xs text-green-700">{tip}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Common Issues */}
                        {selectedGuideSection.commonIssues && (
                          <div>
                            <h4 className="font-medium text-sm mb-3 flex items-center gap-1">
                              <HelpCircle className="h-4 w-4" />
                              Troubleshooting
                            </h4>
                            <Accordion type="single" collapsible>
                              {selectedGuideSection.commonIssues.map((issue, index) => (
                                <AccordionItem key={index} value={`issue-${index}`}>
                                  <AccordionTrigger className="text-xs">
                                    ❌ {issue.issue}
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="p-2 bg-yellow-50 rounded border-l-2 border-yellow-200">
                                      <p className="text-xs text-yellow-700">✅ {issue.solution}</p>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  // Guide List View
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search guides..."
                          value={guideSearchTerm}
                          onChange={(e) => setGuideSearchTerm(e.target.value)}
                          className="pl-10 text-sm"
                        />
                      </div>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-2">
                        {filteredGuides.map((section) => (
                          <Card 
                            key={section.id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => openGuideSection(section)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{section.title}</h4>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {section.description}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
};