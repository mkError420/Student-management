import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Save,
  Calendar as CalendarIcon,
  Download
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { collection, onSnapshot, query, where, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart
} from 'recharts';

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
}

interface Class {
  id: string;
  name: string;
  section: string;
}

export default function Attendance() {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);

  useEffect(() => {
    const classesQuery = query(collection(db, 'classes'), orderBy('name'));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Class[];
      setClasses(classData);
      if (classData.length > 0 && !selectedClass) {
        setSelectedClass(classData[0].id);
      }
    });
    return () => unsubscribeClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    const q = query(collection(db, 'students'), where('classId', '==', selectedClass));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentData);
      
      // Initialize attendance with 'present'
      const initialAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
      studentData.forEach(s => initialAttendance[s.id] = 'present');
      setAttendance(initialAttendance);
    });
    return () => unsubscribe();
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    const attQuery = query(
      collection(db, 'attendance'),
      where('classId', '==', selectedClass),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(attQuery, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAttendanceRecords(records);
    });

    return () => unsubscribe();
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;

    const days = 30;
    const today = new Date();
    const range: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      range.push(format(d, 'yyyy-MM-dd'));
    }

    const trend = range.map((day) => {
      const dayRecords = attendanceRecords.filter(r => r.date === day);
      const total = dayRecords.length;
      const present = dayRecords.filter(r => r.status === 'present').length;
      const absent = dayRecords.filter(r => r.status === 'absent').length;
      const late = dayRecords.filter(r => r.status === 'late').length;
      const presentRate = total > 0 ? (present / total) * 100 : 0;

      return {
        date: day,
        day: format(new Date(day), 'MMM dd'),
        present,
        absent,
        late,
        total,
        presentRate: Number(presentRate.toFixed(1))
      };
    });

    setAttendanceTrend(trend);
  }, [attendanceRecords, selectedClass]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    setIsSaving(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const batch = Object.entries(attendance).map(([studentId, status]) => {
        return addDoc(collection(db, 'attendance'), {
          studentId,
          classId: selectedClass,
          date: dateStr,
          status,
          createdAt: new Date().toISOString()
        });
      });
      
      await Promise.all(batch);
      toast.success(`Attendance for ${selectedClass} on ${dateStr} saved successfully`);
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportAttendance = () => {
    if (students.length === 0) {
      toast.error('No attendance data to export');
      return;
    }

    const selectedCls = classes.find(c => c.id === selectedClass);
    const className = selectedCls ? `${selectedCls.name}-${selectedCls.section}` : 'Class';
    const dateStr = format(date, 'yyyy-MM-dd');

    const headers = ['Roll Number', 'Student Name', 'Status', 'Date', 'Class'];
    const csvData = students.map(student => {
      return [
        student.rollNumber,
        student.name,
        attendance[student.id] || 'present',
        dateStr,
        className
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${className}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendance exported successfully');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Attendance Tracking</h1>
            <p className="text-sidebar-foreground">Mark daily attendance for your classes.</p>
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger render={
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal border-border bg-card text-sidebar-foreground hover:bg-sidebar-accent", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              } />
              <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="bg-card text-foreground" />
              </PopoverContent>
            </Popover>
            
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[200px] bg-card border-border text-sidebar-foreground">
                <SelectValue placeholder="Select Class">
                  {selectedClass && classes.find(c => c.id === selectedClass)
                    ? `${classes.find(c => c.id === selectedClass)?.name} - ${classes.find(c => c.id === selectedClass)?.section}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section}
                  </SelectItem>
                ))}
                {classes.length === 0 && (
                  <SelectItem value="none" disabled>No classes</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              className="border-border text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleExportAttendance}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button onClick={saveAttendance} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Attendance Overview</h2>
              <p className="text-xs text-sidebar-foreground">Last 30 days • Class-wise trend</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {(() => {
              const flat = attendanceTrend.reduce(
                (acc, d) => ({
                  total: acc.total + d.total,
                  present: acc.present + d.present,
                  absent: acc.absent + d.absent,
                  late: acc.late + d.late
                }),
                { total: 0, present: 0, absent: 0, late: 0 }
              );
              const presentPct = flat.total ? ((flat.present / flat.total) * 100).toFixed(1) : '0.0';
              const absentPct = flat.total ? ((flat.absent / flat.total) * 100).toFixed(1) : '0.0';
              const latePct = flat.total ? ((flat.late / flat.total) * 100).toFixed(1) : '0.0';

              return (
                <>
                  <div className="bg-sidebar-accent/20 rounded-lg border border-border p-4">
                    <p className="text-[11px] text-sidebar-foreground">Total Marked</p>
                    <p className="text-xl font-bold text-white">{flat.total}</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg border border-emerald-500/20 p-4">
                    <p className="text-[11px] text-sidebar-foreground">Present</p>
                    <p className="text-xl font-bold text-emerald-400">{presentPct}%</p>
                  </div>
                  <div className="bg-rose-500/10 rounded-lg border border-rose-500/20 p-4">
                    <p className="text-[11px] text-sidebar-foreground">Absent</p>
                    <p className="text-xl font-bold text-rose-400">{absentPct}%</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg border border-amber-500/20 p-4">
                    <p className="text-[11px] text-sidebar-foreground">Late</p>
                    <p className="text-xl font-bold text-amber-400">{latePct}%</p>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={attendanceTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#374151' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  labelStyle={{ color: '#F3F4F6', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 11 }} />
                <Bar dataKey="present" name="Present" stackId="a" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absent" name="Absent" stackId="a" fill="#EF4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="late" name="Late" stackId="a" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="presentRate" name="Present %" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
          <Table>
            <TableHeader className="bg-sidebar-accent/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[100px] font-semibold text-sidebar-foreground">Roll No.</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Student Name</TableHead>
                <TableHead className="text-center font-semibold text-sidebar-foreground">Attendance Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                    <TableCell className="font-medium text-sidebar-foreground">{student.rollNumber}</TableCell>
                    <TableCell className="font-semibold text-white">{student.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "rounded-full px-4 border-border",
                            attendance[student.id] === 'present' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                          onClick={() => handleStatusChange(student.id, 'present')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Present
                        </Button>
                        <Button 
                          variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "rounded-full px-4 border-border",
                            attendance[student.id] === 'absent' ? "bg-rose-600 hover:bg-rose-700 text-white" : "text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                          onClick={() => handleStatusChange(student.id, 'absent')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Absent
                        </Button>
                        <Button 
                          variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "rounded-full px-4 border-border",
                            attendance[student.id] === 'late' ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                          onClick={() => handleStatusChange(student.id, 'late')}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Late
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-sidebar-foreground">
                    No students found for this class.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
