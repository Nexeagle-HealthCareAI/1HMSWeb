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

// TODO: Replace with actual API data
const kpiData = {
  todayAppointments: { value: 0, change: 0, trend: 'up' },
  weeklyOPD: { value: 0, change: 0, trend: 'up' },
  monthlyRevenue: { value: 0, change: 0, trend: 'down' },
  satisfaction: { value: 0, change: 0, trend: 'up' }
};

// TODO: Replace with actual API data
const appointmentTrend: Array<{ date: string; appointments: number }> = [];

// TODO: Replace with actual API data
const departmentLoad: Array<{ name: string; value: number; color: string }> = [];

// TODO: Replace with actual API data
const revenueByDoctor: Array<{ doctor: string; revenue: number }> = [];

// TODO: Replace with actual API data
const hourlyActivity: Array<{ hour: string; appointments: number }> = [];

// TODO: Replace with actual API data
const recentAppointments: Array<{ id: number; patient: string; doctor: string; time: string; type: string; status: string }> = [];

// TODO: Replace with actual API data
const doctorPerformance: Array<{ name: string; patients: number; satisfaction: number; revenue: number }> = [];

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
