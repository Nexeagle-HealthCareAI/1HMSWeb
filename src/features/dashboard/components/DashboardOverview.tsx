import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Calendar,
  Users,
  DollarSign,
  Star,
  TrendingUp,
  TrendingDown,
  Eye
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
  { name: 'Emergency', value: 10, color: '#d084d0' }
];

const revenueByDoctor = [
  { doctor: 'Dr. Smith', revenue: 45000 },
  { doctor: 'Dr. Johnson', revenue: 38000 },
  { doctor: 'Dr. Williams', revenue: 42000 },
  { doctor: 'Dr. Brown', revenue: 35000 },
  { doctor: 'Dr. Davis', revenue: 40000 }
];

const hourlyActivity = [
  { hour: '8AM', appointments: 12 },
  { hour: '9AM', appointments: 18 },
  { hour: '10AM', appointments: 25 },
  { hour: '11AM', appointments: 22 },
  { hour: '12PM', appointments: 15 },
  { hour: '1PM', appointments: 20 },
  { hour: '2PM', appointments: 28 },
  { hour: '3PM', appointments: 24 },
  { hour: '4PM', appointments: 19 },
  { hour: '5PM', appointments: 14 }
];

const recentAppointments = [
  { id: 1, patient: 'John Doe', doctor: 'Dr. Smith', time: '9:00 AM', type: 'Consultation', status: 'completed' },
  { id: 2, patient: 'Jane Smith', doctor: 'Dr. Johnson', time: '10:30 AM', type: 'Follow-up', status: 'in-progress' },
  { id: 3, patient: 'Mike Wilson', doctor: 'Dr. Williams', time: '2:00 PM', type: 'Emergency', status: 'scheduled' },
  { id: 4, patient: 'Sarah Brown', doctor: 'Dr. Brown', time: '3:30 PM', type: 'Consultation', status: 'cancelled' }
];

const doctorPerformance = [
  { name: 'Dr. Smith', patients: 45, satisfaction: 4.8, revenue: 45000 },
  { name: 'Dr. Johnson', patients: 38, satisfaction: 4.6, revenue: 38000 },
  { name: 'Dr. Williams', patients: 42, satisfaction: 4.9, revenue: 42000 },
  { name: 'Dr. Brown', patients: 35, satisfaction: 4.5, revenue: 35000 }
];

interface DashboardOverviewProps {
  renderKPICard: (title: string, icon: React.ReactNode, data: any, isCurrency?: boolean) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  renderKPICard, 
  getStatusBadge 
}) => {
  return (
    <div className="space-y-6 transition-all duration-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Appointments Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">Appointments Trend (Last 15 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={appointmentTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
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
            <CardTitle className="text-sm lg:text-base">Department Load Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={departmentLoad}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Revenue by Doctor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">Revenue by Doctor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueByDoctor}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="doctor" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  fontSize={10}
                />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Activity Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">OPD Activity by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" fontSize={12} />
                <YAxis fontSize={12} />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-sm lg:text-base">Recent Appointments</CardTitle>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAppointments.map((appointment) => (
                <div key={appointment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{appointment.patient}</p>
                    <p className="text-xs text-muted-foreground">{appointment.doctor} • {appointment.time}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-sm lg:text-base">Doctor Performance</CardTitle>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {doctorPerformance.map((doctor, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{doctor.name}</p>
                    <p className="text-xs text-muted-foreground">{doctor.patients} patients this month</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-sm">{doctor.satisfaction}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">${doctor.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
