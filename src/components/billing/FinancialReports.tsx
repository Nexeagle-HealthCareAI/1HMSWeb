import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, Download, DollarSign, TrendingUp, Users, FileText, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePickerWithRange } from '../ui/date-range-picker';
import { Badge } from '../ui/badge';

interface RevenueData {
  date: string;
  opd: number;
  lab: number;
  pharmacy: number;
  radiology: number;
  total: number;
}

interface PaymentMethodData {
  method: string;
  amount: number;
  percentage: number;
}

interface DoctorCommission {
  doctor: string;
  department: string;
  consultations: number;
  revenue: number;
  commission: number;
}

const sampleRevenueData: RevenueData[] = [
  { date: '2024-01-01', opd: 45000, lab: 25000, pharmacy: 15000, radiology: 12000, total: 97000 },
  { date: '2024-01-02', opd: 52000, lab: 28000, pharmacy: 18000, radiology: 15000, total: 113000 },
  { date: '2024-01-03', opd: 48000, lab: 22000, pharmacy: 16000, radiology: 11000, total: 97000 },
  { date: '2024-01-04', opd: 55000, lab: 30000, pharmacy: 20000, radiology: 17000, total: 122000 },
  { date: '2024-01-05', opd: 50000, lab: 26000, pharmacy: 17000, radiology: 13000, total: 106000 }
];

const samplePaymentData: PaymentMethodData[] = [
  { method: 'UPI', amount: 250000, percentage: 45 },
  { method: 'Cash', amount: 150000, percentage: 27 },
  { method: 'Card', amount: 100000, percentage: 18 },
  { method: 'Insurance', amount: 55000, percentage: 10 }
];

const sampleDoctorCommissions: DoctorCommission[] = [
  { doctor: 'Dr. Sarah Johnson', department: 'Cardiology', consultations: 45, revenue: 67500, commission: 13500 },
  { doctor: 'Dr. Michael Chen', department: 'Pediatrics', consultations: 38, revenue: 57000, commission: 11400 },
  { doctor: 'Dr. Emily Davis', department: 'Orthopedics', consultations: 32, revenue: 64000, commission: 12800 },
  { doctor: 'Dr. James Wilson', department: 'Neurology', consultations: 28, revenue: 84000, commission: 16800 }
];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export const FinancialReports: React.FC = () => {
  const [reportType, setReportType] = useState('daily');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });

  const totalRevenue = sampleRevenueData.reduce((sum, data) => sum + data.total, 0);
  const totalRefunds = 15000;
  const outstandingDues = 45000;
  const avgDaily = totalRevenue / sampleRevenueData.length;

  const exportToExcel = () => {
    // Implementation for Excel export
    console.log('Exporting to Excel...');
  };

  const exportToPDF = () => {
    // Implementation for PDF export
    console.log('Exporting to PDF...');
  };

  const scheduleReport = () => {
    // Implementation for scheduling reports
    console.log('Scheduling report...');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Financial Reports</h2>
          <p className="text-muted-foreground">Comprehensive revenue and financial analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={scheduleReport}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="cardiology">Cardiology</SelectItem>
                <SelectItem value="pediatrics">Pediatrics</SelectItem>
                <SelectItem value="orthopedics">Orthopedics</SelectItem>
                <SelectItem value="neurology">Neurology</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1">
              {/* <DatePickerWithRange 
                date={dateRange} 
                onDateChange={setDateRange}
              /> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5% vs last week
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                <p className="text-2xl font-bold">₹{avgDaily.toLocaleString()}</p>
                <p className="text-sm text-blue-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.2% vs last week
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Refunds</p>
                <p className="text-2xl font-bold">₹{totalRefunds.toLocaleString()}</p>
                <p className="text-sm text-red-600">
                  {((totalRefunds / totalRevenue) * 100).toFixed(1)}% of revenue
                </p>
              </div>
              <FileText className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding Dues</p>
                <p className="text-2xl font-bold">₹{outstandingDues.toLocaleString()}</p>
                <p className="text-sm text-orange-600">
                  {((outstandingDues / totalRevenue) * 100).toFixed(1)}% of revenue
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sampleRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="opd" stackId="a" fill="hsl(var(--chart-1))" name="OPD" />
              <Bar dataKey="lab" stackId="a" fill="hsl(var(--chart-2))" name="Lab" />
              <Bar dataKey="pharmacy" stackId="a" fill="hsl(var(--chart-3))" name="Pharmacy" />
              <Bar dataKey="radiology" stackId="a" fill="hsl(var(--chart-4))" name="Radiology" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={samplePaymentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {samplePaymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Department-wise Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { dept: 'Cardiology', amount: 145000, percentage: 35 },
                { dept: 'Pediatrics', amount: 98000, percentage: 24 },
                { dept: 'Orthopedics', amount: 87000, percentage: 21 },
                { dept: 'Neurology', amount: 82000, percentage: 20 }
              ].map((item, index) => (
                <div key={item.dept} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="font-medium">{item.dept}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{item.amount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Commission Report */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Commission Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">Doctor</th>
                  <th className="text-left p-3 font-semibold">Department</th>
                  <th className="text-left p-3 font-semibold">Consultations</th>
                  <th className="text-left p-3 font-semibold">Revenue</th>
                  <th className="text-left p-3 font-semibold">Commission</th>
                  <th className="text-left p-3 font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {sampleDoctorCommissions.map((doctor, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{doctor.doctor}</td>
                    <td className="p-3">{doctor.department}</td>
                    <td className="p-3">{doctor.consultations}</td>
                    <td className="p-3">₹{doctor.revenue.toLocaleString()}</td>
                    <td className="p-3 font-semibold text-green-600">₹{doctor.commission.toLocaleString()}</td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {((doctor.commission / doctor.revenue) * 100).toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Claims Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance Claims Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">48</div>
              <div className="text-sm text-muted-foreground">Claims Submitted</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">32</div>
              <div className="text-sm text-muted-foreground">Claims Approved</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">8</div>
              <div className="text-sm text-muted-foreground">Claims Rejected</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">8</div>
              <div className="text-sm text-muted-foreground">Under Review</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};