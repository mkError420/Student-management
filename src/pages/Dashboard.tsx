import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { useAuth } from '@/src/lib/auth';
import { 
  Users, 
  UserCheck, 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { format, formatDistanceToNow } from 'date-fns';

import { cn } from '@/lib/utils';

const data = [
  { name: 'Jan', students: 400, revenue: 2400 },
  { name: 'Feb', students: 420, revenue: 2600 },
  { name: 'Mar', students: 450, revenue: 2800 },
  { name: 'Apr', students: 480, revenue: 3200 },
  { name: 'May', students: 500, revenue: 3500 },
  { name: 'Jun', students: 510, revenue: 3800 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { profile } = useAuth();
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    // Fetch students data
    const studentsQuery = query(collection(db, 'students'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentData);
    });

    // Fetch classes data
    const classesQuery = query(collection(db, 'classes'));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClasses(classData);
    });

    // Fetch attendance data
    const attendanceQuery = query(collection(db, 'attendance'));
    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAttendance(attendanceData);
    });

    // Fetch fees data
    const feesQuery = query(collection(db, 'fees'));
    const unsubscribeFees = onSnapshot(feesQuery, (snapshot) => {
      const feesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFees(feesData);
    });

    // Fetch library data
    const libraryQuery = query(collection(db, 'library'));
    const unsubscribeLibrary = onSnapshot(libraryQuery, (snapshot) => {
      const libraryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLibrary(libraryData);
    });

    const q = query(
      collection(db, 'exams'), 
      where('status', '==', 'scheduled'),
      orderBy('date', 'asc'),
      limit(3)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUpcomingExams(exams);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
      unsubscribeAttendance();
      unsubscribeFees();
      unsubscribeLibrary();
      unsubscribe();
    };
  }, []);

  // Separate useEffect for transactions that depends on students and classes
  useEffect(() => {
    if (students.length === 0 || classes.length === 0) return;

    const transactionsQuery = query(
      collection(db, 'fees'),
      orderBy('date', 'desc'),
      limit(3)
    );

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions = snapshot.docs.map(doc => {
        const data = doc.data();
        const student = students.find(s => s.id === data.studentId);
        const cls = classes.find(c => c.id === data.classId);
        return {
          id: doc.id,
          ...data,
          rollNumber: student?.rollNumber || 'N/A',
          className: cls ? `${cls.name} - ${cls.section}` : 'Unknown Class'
        };
      });
      setRecentTransactions(transactions);
    });

    return () => {
      unsubscribeTransactions();
    };
  }, [students, classes]);

  // Calculate dynamic stats
  const calculateStats = () => {
    const totalFeesCollected = fees
      .filter(fee => fee.status === 'paid')
      .reduce((sum, fee) => sum + (fee.amount || 0), 0);
    
    const totalStudents = students.length;
    
    const avgAttendance = attendance.length > 0 
      ? (attendance.filter(att => att.status === 'present').length / attendance.length * 100).toFixed(1)
      : '0';
    
    const libraryCirculation = library.length;
    
    return {
      totalFeesCollected,
      totalStudents,
      avgAttendance,
      libraryCirculation
    };
  };

  const stats = calculateStats();

  // Generate monthly data for charts
  useEffect(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentYear = new Date().getFullYear();
    const monthlyStats = months.map((month, index) => {
      // Filter students admitted in this month
      const monthStudents = students.filter(student => {
        if (student.admissionDate) {
          const admissionDate = new Date(student.admissionDate);
          const admissionMonth = admissionDate.getMonth();
          const admissionYear = admissionDate.getFullYear();
          return admissionMonth === index && admissionYear === currentYear;
        }
        return false;
      });
      
      // Filter fees paid in this month
      const monthFees = fees.filter(fee => {
        if (fee.date && fee.status === 'paid') {
          const feeDate = new Date(fee.date);
          const feeMonth = feeDate.getMonth();
          const feeYear = feeDate.getFullYear();
          return feeMonth === index && feeYear === currentYear;
        }
        return false;
      });
      
      // Calculate total revenue for this month
      const monthlyRevenue = monthFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
      
      // Calculate attendance rate for this month
      const monthAttendance = attendance.filter(att => {
        if (att.date) {
          const attDate = new Date(att.date);
          return attDate.getMonth() === index && attDate.getFullYear() === currentYear;
        }
        return false;
      });
      
      const attendanceRate = monthAttendance.length > 0 
        ? (monthAttendance.filter(att => att.status === 'present').length / monthAttendance.length * 100).toFixed(1)
        : '0';
      
      return {
        name: month,
        students: monthStudents.length,
        revenue: monthlyRevenue,
        attendanceRate: parseFloat(attendanceRate)
      };
    });
    
    setMonthlyData(monthlyStats);
  }, [students, fees, attendance]);

  const StatCard = ({ title, value, trend, color, trendDown }: any) => (
    <Card className="bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
      <div className="flex justify-between items-start mb-5">
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="text-[28px] font-bold text-white mb-1">{value}</div>
      {trend && (
        <div className={cn("text-xs flex items-center gap-1", trendDown ? "text-rose-500" : "text-emerald-500")}>
          {trendDown ? "↓" : "↑"} {trend}
        </div>
      )}
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Fees Collected" 
            value={`৳${(stats.totalFeesCollected / 1000).toFixed(1)}k`} 
            trend="8.2% vs target" 
          />
          <StatCard 
            title="Avg Attendance" 
            value={`${stats.avgAttendance}%`} 
            trend="0.2% vs prev" 
            trendDown
          />
          <StatCard 
            title="Library Circulation" 
            value={stats.libraryCirculation.toLocaleString()} 
          />
          <StatCard 
            title="Total Students" 
            value={stats.totalStudents.toLocaleString()} 
            trend="12.4% growth"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-2 lg:row-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-semibold text-white">Student Admission Trends</span>
              <span className="text-[11px] text-sidebar-foreground">Last 6 Months</span>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    labelStyle={{ color: '#F3F4F6', fontWeight: 'bold' }}
                    formatter={(value, name) => {
                      if (name === 'students') return [`${value} students`, 'Students'];
                      if (name === 'revenue') return [`৳${value.toLocaleString()}`, 'Revenue'];
                      if (name === 'attendanceRate') return [`${value}%`, 'Attendance Rate'];
                      return [value, name];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#9CA3AF' }}
                    iconType="rect"
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="students" 
                    fill="#3B82F6"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                    name="Students"
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="revenue" 
                    fill="#10B981"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1200}
                    name="Revenue (৳)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone"
                    dataKey="attendanceRate"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', r: 4 }}
                    animationDuration={800}
                    name="Attendance %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-[#1F2937] rounded-lg p-4 border border-[#374151]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#9CA3AF]">Total Students</p>
                    <p className="text-xl font-bold text-white">{stats.totalStudents.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="bg-[#1F2937] rounded-lg p-4 border border-[#374151]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#9CA3AF]">Growth Rate</p>
                    <p className="text-xl font-bold text-emerald-400">+12.4%</p>
                  </div>
                  <div className="bg-emerald-500/20 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-semibold text-white">Upcoming Examinations</span>
            </div>
            <div className="space-y-0">
              {upcomingExams.length > 0 ? upcomingExams.map((event, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <h4 className="text-[13px] font-medium text-white">{event.subject}</h4>
                    <p className="text-[11px] text-sidebar-foreground">{event.type} • {event.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] text-white">
                      {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                    </p>
                    <p className="text-[11px] text-sidebar-foreground">{format(new Date(event.date), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center text-sidebar-foreground text-sm">
                  No upcoming exams scheduled.
                </div>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2 bg-card border-border rounded-xl p-5 flex flex-col shadow-none">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-semibold text-white">Recent Transactions</span>
            </div>
            <div className="space-y-0">
              {recentTransactions.length > 0 ? recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex-1">
                    <h4 className="text-[13px] font-medium text-white">{tx.studentName}</h4>
                    <p className="text-[11px] text-sidebar-foreground capitalize">{tx.type} Fee ivo{tx.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-sidebar-foreground">Class: {tx.className}  Roll No: {tx.rollNumber}</p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                    tx.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : 
                    tx.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                    "bg-rose-500/10 text-rose-500"
                  )}>
                    {tx.status}
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center text-sidebar-foreground text-sm">
                  No recent transactions.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
