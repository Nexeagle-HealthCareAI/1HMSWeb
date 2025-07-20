import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  Users,
  Calendar,
  DollarSign,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  UserCheck,
  FileText,
  Download,
  Search,
  Filter,
  Bell,
  Settings,
  LogOut,
  MoreVertical,
  Eye,
  Building2,
  Stethoscope
} from 'lucide-react';

// Mock data
const kpiData = {
  todayAppointments: { value: 42, change: +12, trend: 'up' },
  weeklyOPD: { value: 284, change: +8, trend: 'up' },
  monthlyRevenue: { value: 125400, change: -3, trend: 'down' },
  satisfaction: { value: 4.8, change: +0.2, trend: 'up' }
};

const appointmentTrend = [
  { date: '01', appointments: 35 },
  { date: '02', appointments: 42 },
  { date: '03', appointments: 38 },
  { date: '04', appointments: 51 },
  { date: '05', appointments: 49 },
  { date: '06', appointments: 46 },
  { date: '07', appointments: 52 },
  { date: '08', appointments: 48 },
  { date: '09', appointments: 55 },
  { date: '10', appointments: 42 },
  { date: '11', appointments: 47 },
  { date: '12', appointments: 53 },
  { date: '13', appointments: 49 },
  { date: '14', appointments: 58 },
  { date: '15', appointments: 61 }
];

const departmentLoad = [
  { name: 'Cardiology', value: 25, color: '#8884d8' },
  { name: 'Neurology', value: 20, color: '#82ca9d' },
  { name: 'Orthopedics', value: 18, color: '#ffc658' },
  { name: 'Pediatrics', value: 15, color: '#ff7c7c' },
  { name: 'General', value: 12, color: '#8dd1e1' },
  { name: 'Others', value: 10, color: '#d084d0' }
];

const revenueByDoctor = [
  { doctor: 'Dr. Smith', revenue: 28500 },
  { doctor: 'Dr. Johnson', revenue: 24200 },
  { doctor: 'Dr. Williams', revenue: 21800 },
  { doctor: 'Dr. Brown', revenue: 19600 },
  { doctor: 'Dr. Davis', revenue: 17400 },
  { doctor: 'Dr. Miller', revenue: 15200 }
];

const hourlyActivity = [
  { hour: '09:00', appointments: 8 },
  { hour: '10:00', appointments: 12 },
  { hour: '11:00', appointments: 15 },
  { hour: '12:00', appointments: 10 },
  { hour: '13:00', appointments: 6 },
  { hour: '14:00', appointments: 14 },
  { hour: '15:00', appointments: 18 },
  { hour: '16:00', appointments: 16 },
  { hour: '17:00', appointments: 12 },
  { hour: '18:00', appointments: 8 }
];

const recentAppointments = [
  { id: 'A001', patient: 'John Doe', doctor: 'Dr. Smith', time: '10:30 AM', status: 'confirmed', type: 'Follow-up' },
  { id: 'A002', patient: 'Jane Smith', doctor: 'Dr. Johnson', time: '11:00 AM', status: 'pending', type: 'New' },
  { id: 'A003', patient: 'Mike Wilson', doctor: 'Dr. Williams', time: '11:30 AM', status: 'confirmed', type: 'Consultation' },
  { id: 'A004', patient: 'Sarah Brown', doctor: 'Dr. Brown', time: '12:00 PM', status: 'cancelled', type: 'Follow-up' },
  { id: 'A005', patient: 'Tom Davis', doctor: 'Dr. Davis', time: '12:30 PM', status: 'confirmed', type: 'Surgery' }
];

const doctorPerformance = [
  { name: 'Dr. Smith', patients: 156, satisfaction: 4.9, revenue: 28500 },
  { name: 'Dr. Johnson', patients: 142, satisfaction: 4.8, revenue: 24200 },
  { name: 'Dr. Williams', patients: 138, satisfaction: 4.7, revenue: 21800 },
  { name: 'Dr. Brown', patients: 134, satisfaction: 4.6, revenue: 19600 },
  { name: 'Dr. Davis', patients: 128, satisfaction: 4.8, revenue: 17400 }
];

export const AdminDashboard = () => {
  const [dateFilter, setDateFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderKPICard = (title: string, icon: React.ReactNode, data: any, isCurrency = false) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {isCurrency ? `$${data.value.toLocaleString()}` : data.value.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            {icon}
          </div>
        </div>
        <div className="flex items-center mt-4">
          {data.trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm font-medium ${data.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {data.change > 0 ? '+' : ''}{data.change}%
          </span>
          <span className="text-sm text-muted-foreground ml-1">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );

  const sidebarItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Activity },
    { id: 'doctors', name: 'Doctors', icon: Stethoscope },
    { id: 'appointments', name: 'Appointments', icon: Calendar },
    { id: 'billing', name: 'Billing', icon: DollarSign },
    { id: 'reports', name: 'Reports', icon: FileText },
    { id: 'feedback', name: 'Feedback', icon: Star },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-healthcare-primary">NexEagle</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {sidebarItems.map((item) => (
            <Button
              key={item.id}
              variant={currentView === item.id ? "default" : "ghost"}
              className="w-full justify-start gap-3"
              onClick={() => setCurrentView(item.id)}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-500 hover:bg-red-50">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold capitalize">{currentView}</h1>
              <p className="text-muted-foreground">Hospital Management Overview</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        {currentView === 'dashboard' && (
          <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderKPICard(
                "Today's Appointments",
                <Calendar className="h-6 w-6 text-primary" />,
                kpiData.todayAppointments
              )}
              {renderKPICard(
                "OPD Visits This Week",
                <Users className="h-6 w-6 text-primary" />,
                kpiData.weeklyOPD
              )}
              {renderKPICard(
                "Revenue This Month",
                <DollarSign className="h-6 w-6 text-primary" />,
                kpiData.monthlyRevenue,
                true
              )}
              {renderKPICard(
                "Patient Satisfaction",
                <Star className="h-6 w-6 text-primary" />,
                kpiData.satisfaction
              )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Appointments Trend (Last 15 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={appointmentTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="appointments" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{ fill: '#8884d8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Department Load Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Load Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={departmentLoad}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {departmentLoad.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Revenue and Activity Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by Doctor */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Doctor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByDoctor}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="doctor" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Hourly Activity Heatmap */}
              <Card>
                <CardHeader>
                  <CardTitle>OPD Activity by Hour</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={hourlyActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="appointments" 
                        stroke="#ffc658" 
                        fill="#ffc658" 
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Appointments */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Appointments</CardTitle>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{appointment.patient}</p>
                          <p className="text-sm text-muted-foreground">{appointment.doctor} • {appointment.time}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{appointment.type}</Badge>
                          {getStatusBadge(appointment.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Doctor Performance */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Doctor Performance</CardTitle>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {doctorPerformance.map((doctor, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{doctor.name}</p>
                          <p className="text-sm text-muted-foreground">{doctor.patients} patients this month</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">{doctor.satisfaction}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">${doctor.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Other Views Placeholder */}
        {currentView !== 'dashboard' && (
          <div className="p-6">
            <Card>
              <CardContent className="p-12 text-center">
                <h2 className="text-2xl font-semibold mb-4 capitalize">{currentView} Module</h2>
                <p className="text-muted-foreground">This module is under development. It will include comprehensive {currentView} management features.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
