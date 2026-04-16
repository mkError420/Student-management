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
  Cell
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

    const transactionsQuery = query(
      collection(db, 'fees'),
      orderBy('date', 'desc'),
      limit(3)
    );

    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentTransactions(transactions);
    });

    return () => {
      unsubscribeStudents();
      unsubscribe();
      unsubscribeTransactions();
    };
  }, []);

  // Helper function to get student details
  const getStudentDetails = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student || { name: 'Unknown', rollNumber: 'N/A', classId: null };
  };

  // Helper function to get class name
  const getClassName = (classId: string) => {
    // This would ideally fetch from classes collection, but for now we'll return the ID
    return classId || 'N/A';
  };

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
            value="৳428.5k" 
            trend="8.2% vs target" 
          />
          <StatCard 
            title="Avg Attendance" 
            value="96.4%" 
            trend="0.2% vs prev" 
            trendDown
          />
          <StatCard 
            title="Library Circulation" 
            value="1,102" 
          />
          <StatCard 
            title="Total Students" 
            value="2,842" 
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
            <div className="flex-1 flex items-end gap-2 pt-2 min-h-[200px]">
              {data.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div 
                    className={cn(
                      "w-full rounded-t-md transition-all duration-300",
                      i === data.length - 1 ? "bg-primary" : "bg-[#23262D] group-hover:bg-[#2D3139]"
                    )}
                    style={{ height: `${(item.students / 600) * 100}%` }}
                  />
                  <span className="text-[9px] text-slate-600 font-bold uppercase">{item.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-8">
              <div>
                <p className="text-[11px] text-sidebar-foreground">Total Students</p>
                <p className="text-2xl font-bold text-white">2,842</p>
              </div>
              <div>
                <p className="text-[11px] text-sidebar-foreground">Growth Rate</p>
                <p className="text-2xl font-bold text-emerald-500">+12.4%</p>
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
              {recentTransactions.length > 0 ? recentTransactions.map((tx, i) => {
                const student = getStudentDetails(tx.studentId);
                return (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex-1">
                    <h4 className="text-[13px] font-medium text-white">{tx.studentName || student.name}</h4>
                    <p className="text-[11px] text-sidebar-foreground capitalize">{tx.type} Fee ৳{tx.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-sidebar-foreground">Class: {getClassName(student.classId)}  Roll No: {student.rollNumber}</p>
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
                );
              }) : (
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
