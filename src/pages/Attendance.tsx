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
