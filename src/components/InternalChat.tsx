import React, { useState } from 'react';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Users, 
  Search,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  User
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface ChatUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'file';
  fileName?: string;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

const staffMembers: ChatUser[] = [
  { id: '1', name: 'Dr. Sarah Johnson', role: 'Cardiologist', isOnline: true },
  { id: '2', name: 'Dr. Michael Chen', role: 'Neurologist', isOnline: true },
  { id: '3', name: 'Nurse Emily', role: 'ICU Nurse', isOnline: false, lastSeen: new Date(Date.now() - 30 * 60 * 1000) },
  { id: '4', name: 'Reception Lisa', role: 'Receptionist', isOnline: true },
  { id: '5', name: 'Lab Tech John', role: 'Lab Technician', isOnline: false, lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000) }
];

const chatRooms: ChatRoom[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    type: 'direct',
    participants: ['1'],
    lastMessage: {
      id: '1',
      senderId: '1',
      content: 'Patient in room 302 needs immediate attention',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      type: 'text'
    },
    unreadCount: 2
  },
  {
    id: '2',
    name: 'Emergency Team',
    type: 'group',
    participants: ['1', '2', '3'],
    lastMessage: {
      id: '2',
      senderId: '2',
      content: 'All clear on floor 3',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      type: 'text'
    },
    unreadCount: 0
  },
  {
    id: '3',
    name: 'Reception Lisa',
    type: 'direct',
    participants: ['4'],
    lastMessage: {
      id: '3',
      senderId: '4',
      content: 'New appointment scheduled for tomorrow',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      type: 'text'
    },
    unreadCount: 1
  }
];

const sampleMessages: ChatMessage[] = [
  {
    id: '1',
    senderId: '1',
    content: 'Patient in room 302 needs immediate attention',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    type: 'text'
  },
  {
    id: '2',
    senderId: 'current',
    content: 'On my way, what seems to be the issue?',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    type: 'text'
  },
  {
    id: '3',
    senderId: '1',
    content: 'Blood pressure dropped suddenly, bringing crash cart',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    type: 'text'
  },
  {
    id: '4',
    senderId: 'current',
    content: 'ECG report attached',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    type: 'file',
    fileName: 'ecg_report.pdf'
  }
];

export const InternalChat: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<ChatRoom>(chatRooms[0]);
  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'current',
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const getUserById = (id: string) => {
    return staffMembers.find(user => user.id === id);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 60) {
      return `Last seen ${minutes}m ago`;
    } else {
      return `Last seen ${hours}h ago`;
    }
  };

  const filteredStaff = staffMembers.filter(staff =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-12rem)] flex">
      {/* Left Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Internal Chat</h2>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Online Staff */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Online Now</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {staffMembers
              .filter(staff => staff.isOnline)
              .map((staff) => (
                <div key={staff.id} className="flex-shrink-0 text-center">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={staff.avatar} />
                      <AvatarFallback>{staff.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <p className="text-xs mt-1 truncate w-16">{staff.name.split(' ')[0]}</p>
                </div>
              ))}
          </div>
        </div>

        <Separator />

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">Recent Chats</h3>
            {chatRooms.map((chat) => {
              const otherUser = chat.type === 'direct' ? getUserById(chat.participants[0]) : null;
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChat.id === chat.id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={otherUser?.avatar} />
                      <AvatarFallback>
                        {chat.type === 'group' ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          otherUser?.name.split(' ').map(n => n[0]).join('')
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {otherUser?.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">{chat.name}</h4>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage?.content}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge className="h-5 min-w-5 p-0 text-xs flex items-center justify-center">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={getUserById(selectedChat.participants[0])?.avatar} />
                <AvatarFallback>
                  {selectedChat.type === 'group' ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    getUserById(selectedChat.participants[0])?.name.split(' ').map(n => n[0]).join('')
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{selectedChat.name}</h3>
                {selectedChat.type === 'direct' && (
                  <p className="text-sm text-muted-foreground">
                    {getUserById(selectedChat.participants[0])?.isOnline 
                      ? 'Online' 
                      : formatLastSeen(getUserById(selectedChat.participants[0])?.lastSeen || new Date())
                    }
                  </p>
                )}
                {selectedChat.type === 'group' && (
                  <p className="text-sm text-muted-foreground">
                    {selectedChat.participants.length} members
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost">
                <Phone className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Video className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>View Profile</DropdownMenuItem>
                  <DropdownMenuItem>Clear Chat</DropdownMenuItem>
                  <DropdownMenuItem>Block User</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-subtle">
          {messages.map((message) => {
            const isCurrentUser = message.senderId === 'current';
            const sender = getUserById(message.senderId);
            
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={sender?.avatar} />
                      <AvatarFallback>
                        {sender?.name.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`p-3 rounded-lg ${
                      isCurrentUser
                        ? 'bg-healthcare-primary text-white'
                        : 'bg-white border'
                    }`}
                  >
                    {message.type === 'file' ? (
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        <span className="text-sm">{message.fileName}</span>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className={`text-xs mt-1 ${isCurrentUser ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-card">
          <div className="flex gap-2">
            <Button size="sm" variant="ghost">
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};