import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Plus, 
  Search, 
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronRight,
  Save,
  ArrowLeft
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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc, updateDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Exam {
  id: string;
  subject: string;
  classId: string;
  date: string;
  time: string;
  type: 'class_test' | 'midterm' | 'final';
  status: 'scheduled' | 'completed' | 'ongoing';
  totalMarks: number;
}

interface Result {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  marksObtained: number;
  grade: string;
  remarks: string;
}

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

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [reportClassId, setReportClassId] = useState<string>('');
  const [reportExamType, setReportExamType] = useState<'class_test' | 'midterm' | 'final'>('midterm');
  const [reportResults, setReportResults] = useState<Result[]>([]);
  const [reportExams, setReportExams] = useState<Exam[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    if (isReportDialogOpen) {
      document.body.classList.add('report-printing');
      // Inject print styles
      const style = document.createElement('style');
      style.textContent = `
        @media print {
          @page {
            size: landscape;
            margin: 0.5in;
          }
          
          body * {
            visibility: hidden;
          }
          
          #printable-report,
          #printable-report * {
            visibility: visible;
          }
          
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          #printable-report table {
            width: 100% !important;
            font-size: 7pt !important;
            table-layout: auto !important;
          }
          
          #printable-report th,
          #printable-report td {
            padding: 3px 5px !important;
            border: 1px solid #000 !important;
            vertical-align: middle !important;
            text-align: center !important;
            white-space: normal !important;
            word-wrap: break-word !important;
            line-height: 1.2 !important;
          }
          
          #printable-report th:first-child,
          #printable-report td:first-child {
            text-align: left !important;
            width: 20% !important;
            min-width: 100px !important;
            font-weight: bold !important;
          }
          
          #printable-report th:nth-child(2),
          #printable-report td:nth-child(2) {
            width: 8% !important;
            min-width: 40px !important;
            font-weight: bold !important;
          }
          
          #printable-report th:not(:first-child):not(:nth-child(2)):not(:last-child):not(:nth-last-child(2)),
          #printable-report td:not(:first-child):not(:nth-child(2)):not(:last-child):not(:nth-last-child(2)) {
            width: 10% !important;
            min-width: 70px !important;
            font-weight: bold !important;
          }
          
          #printable-report th:last-child,
          #printable-report td:last-child {
            width: 7% !important;
            min-width: 40px !important;
            text-align: right !important;
            font-weight: bold !important;
          }
          
          #printable-report th:nth-last-child(2),
          #printable-report td:nth-last-child(2) {
            width: 7% !important;
            min-width: 40px !important;
            font-weight: bold !important;
          }
          
          #printable-report h2 {
            font-size: 16pt !important;
            margin-bottom: 10px !important;
          }
          
          #printable-report p {
            font-size: 10pt !important;
            margin-bottom: 20px !important;
          }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.body.classList.remove('report-printing');
        document.head.removeChild(style);
      };
    } else {
      document.body.classList.remove('report-printing');
    }
  }, [isReportDialogOpen, reportExams.length]);
  
  const [viewMode, setViewMode] = useState<'list' | 'grading'>('list');
  const [gradingExam, setGradingExam] = useState<Exam | null>(null);
  const [gradingResults, setGradingResults] = useState<Record<string, { marks: string, remarks: string }>>({});

  const [newExam, setNewExam] = useState({
    subject: '',
    classId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'class_test' as const,
    status: 'scheduled' as const,
    totalMarks: 100
  });

  useEffect(() => {
    const q = query(collection(db, 'exams'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Exam[];
      setExams(examData);
    });

    const classesQuery = query(collection(db, 'classes'), orderBy('name'));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Class[];
      setClasses(classData);
    });

    const studentsQuery = query(collection(db, 'students'), orderBy('name'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentData);
    });

    return () => {
      unsubscribe();
      unsubscribeClasses();
      unsubscribeStudents();
    };
  }, []);

  useEffect(() => {
    setReportResults([]);
    setReportExams([]);
  }, [reportClassId, reportExamType]);

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'exams'), {
        ...newExam,
        totalMarks: Number(newExam.totalMarks),
        createdAt: new Date().toISOString()
      });
      setIsAddDialogOpen(false);
      setNewExam({ subject: '', classId: '', date: new Date().toISOString().split('T')[0], time: '09:00', type: 'midterm', status: 'scheduled', totalMarks: 100 });
      toast.success('Exam scheduled successfully');
    } catch (error) {
      console.error('Error adding exam:', error);
      toast.error('Failed to schedule exam');
    }
  };

  const handleEditExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    try {
      const examRef = doc(db, 'exams', selectedExam.id);
      await updateDoc(examRef, {
        subject: selectedExam.subject,
        classId: selectedExam.classId,
        date: selectedExam.date,
        time: selectedExam.time,
        type: selectedExam.type,
        status: selectedExam.status,
        totalMarks: Number(selectedExam.totalMarks)
      });
      setIsEditDialogOpen(false);
      toast.success('Exam updated successfully');
    } catch (error) {
      console.error('Error updating exam:', error);
      toast.error('Failed to update exam');
    }
  };

  const handleDeleteExam = async () => {
    if (!selectedExam) return;
    try {
      await deleteDoc(doc(db, 'exams', selectedExam.id));
      setIsDeleteDialogOpen(false);
      setSelectedExam(null);
      toast.success('Exam deleted successfully');
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Failed to delete exam');
    }
  };

  const startGrading = async (exam: Exam) => {
    setGradingExam(exam);
    setViewMode('grading');
    
    // Fetch existing results for this exam
    const resultsQuery = query(collection(db, 'results'), where('examId', '==', exam.id));
    const querySnapshot = await getDocs(resultsQuery);
    const existingResults: Record<string, { marks: string, remarks: string }> = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      existingResults[data.studentId] = {
        marks: data.marksObtained.toString(),
        remarks: data.remarks || ''
      };
    });
    
    setGradingResults(existingResults);
  };

  const calculateGrade = (marks: number, total: number, type: string) => {
    const percentage = (marks / total) * 100;
    
    if (type === 'class_test') {
      if (percentage >= 90) return 'A+';
      if (percentage >= 80) return 'A';
      if (percentage >= 70) return 'B';
      if (percentage >= 60) return 'C';
      if (percentage >= 40) return 'D';
      return 'F';
    } else if (type === 'midterm') {
      if (percentage >= 85) return 'A+';
      if (percentage >= 75) return 'A';
      if (percentage >= 65) return 'A-';
      if (percentage >= 55) return 'B';
      if (percentage >= 45) return 'C';
      if (percentage >= 33) return 'D';
      return 'F';
    } else { // final
      if (percentage >= 80) return 'A+';
      if (percentage >= 70) return 'A';
      if (percentage >= 60) return 'A-';
      if (percentage >= 50) return 'B';
      if (percentage >= 40) return 'C';
      if (percentage >= 33) return 'D';
      return 'F';
    }
  };

  const saveResults = async () => {
    if (!gradingExam) return;
    try {
      const batch = writeBatch(db);
      const examStudents = students.filter(s => s.classId === gradingExam.classId);
      
      for (const student of examStudents) {
        const resultData = gradingResults[student.id] || { marks: '0', remarks: '' };
        const marks = Number(resultData.marks) || 0;
        const grade = calculateGrade(marks, gradingExam.totalMarks, gradingExam.type);
        
        // We use a deterministic ID for results to avoid duplicates: examId_studentId
        const resultId = `${gradingExam.id}_${student.id}`;
        const resultRef = doc(db, 'results', resultId);
        
        batch.set(resultRef, {
          examId: gradingExam.id,
          studentId: student.id,
          studentName: student.name,
          marksObtained: marks,
          grade,
          remarks: resultData.remarks || '',
          updatedAt: new Date().toISOString()
        });
      }
      
      await batch.commit();
      
      // Update exam status to completed if it was ongoing
      if (gradingExam.status !== 'completed') {
        await updateDoc(doc(db, 'exams', gradingExam.id), { status: 'completed' });
      }
      
      toast.success('Results saved successfully');
      setViewMode('list');
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Failed to save results');
    }
  };

  const handleGenerateReport = async () => {
    if (!reportClassId || !reportExamType) return;
    setIsGeneratingReport(true);
    try {
      // 1. Find all exams for this class and type
      const classExams = exams.filter(e => e.classId === reportClassId && e.type === reportExamType && e.status === 'completed');
      setReportExams(classExams);

      if (classExams.length === 0) {
        setReportResults([]);
        toast.info('No completed exams found for this selection');
        return;
      }

      // 2. Fetch all results for these exams
      const examIds = classExams.map(e => e.id);
      const resultsQuery = query(collection(db, 'results'), where('examId', 'in', examIds));
      const querySnapshot = await getDocs(resultsQuery);
      const resultsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Result[];
      setReportResults(resultsData);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadCSV = () => {
    if (reportResults.length === 0 || reportExams.length === 0) return;
    
    const className = classes.find(c => c.id === reportClassId)?.name || '';
    const examType = reportExamType.replace('_', ' ').toUpperCase();
    
    // Create CSV headers
    const headers = ['Student Name', 'Roll No', ...reportExams.map(exam => exam.subject), 'Total', 'Average'];
    
    // Create CSV data
    const csvData = students
      .filter(s => s.classId === reportClassId)
      .map(student => {
        const studentResults = reportResults.filter(r => r.studentId === student.id);
        let total = 0;
        const marks = reportExams.map(exam => {
          const result = studentResults.find(r => r.examId === exam.id);
          if (result) total += result.marksObtained;
          return result ? result.marksObtained : '-';
        });
        const average = reportExams.length > 0 ? (total / reportExams.length).toFixed(1) : '0.0';
        
        return [student.name, student.rollNumber, ...marks, total, average];
      });
    
    // Create CSV content
    const csvContent = [
      `Exam Performance Report - ${examType} - ${className}`,
      '',
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Exam_Report_${examType}_${className}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Report downloaded successfully');
  };

  const filteredExams = exams.filter(exam => 
    exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classes.find(c => c.id === exam.classId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    upcoming: exams.filter(e => e.status === 'scheduled').length,
    ongoing: exams.filter(e => e.status === 'ongoing').length,
    completed: exams.filter(e => e.status === 'completed').length
  };

  if (viewMode === 'grading' && gradingExam) {
    const examStudents = students.filter(s => s.classId === gradingExam.classId);
    
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setViewMode('list')} className="text-sidebar-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Grading: {gradingExam.subject}</h1>
                <p className="text-sidebar-foreground">
                  {classes.find(c => c.id === gradingExam.classId)?.name} • {gradingExam.type} • Total Marks: {gradingExam.totalMarks}
                </p>
              </div>
            </div>
            <Button onClick={saveResults} className="bg-primary hover:bg-primary/90 text-white">
              <Save className="w-4 h-4 mr-2" />
              Save All Results
            </Button>
          </div>

          <Card className="bg-card border-border overflow-hidden shadow-none">
            <Table>
              <TableHeader className="bg-sidebar-accent/30">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-semibold text-sidebar-foreground">Roll No.</TableHead>
                  <TableHead className="font-semibold text-sidebar-foreground">Student Name</TableHead>
                  <TableHead className="font-semibold text-sidebar-foreground w-[150px]">Marks Obtained</TableHead>
                  <TableHead className="font-semibold text-sidebar-foreground w-[100px]">Grade</TableHead>
                  <TableHead className="font-semibold text-sidebar-foreground">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examStudents.length > 0 ? (
                  examStudents.map((student) => {
                    const result = gradingResults[student.id] || { marks: '', remarks: '' };
                    const grade = result.marks ? calculateGrade(Number(result.marks), gradingExam.totalMarks, gradingExam.type) : '-';
                    
                    return (
                      <TableRow key={student.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                        <TableCell className="text-sidebar-foreground font-medium">{student.rollNumber}</TableCell>
                        <TableCell className="text-white font-semibold">{student.name}</TableCell>
                        <TableCell>
                          <Input 
                            type="number"
                            max={gradingExam.totalMarks}
                            min={0}
                            value={result.marks || ''}
                            onChange={(e) => setGradingResults(prev => ({
                              ...prev,
                              [student.id]: { ...prev[student.id], marks: e.target.value }
                            }))}
                            className="bg-background border-border h-9"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "font-bold",
                            grade === 'A+' ? "text-emerald-500 border-emerald-500/50" :
                            grade === 'F' ? "text-rose-500 border-rose-500/50" :
                            "text-primary border-primary/50"
                          )}>
                            {grade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input 
                            value={result.remarks || ''}
                            onChange={(e) => setGradingResults(prev => ({
                              ...prev,
                              [student.id]: { ...prev[student.id], remarks: e.target.value }
                            }))}
                            className="bg-background border-border h-9"
                            placeholder="Good performance"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-sidebar-foreground">
                      No students found in this class.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Exam Portal</h1>
            <p className="text-sidebar-foreground">Schedule exams, manage results, and track student performance.</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger render={
                <Button variant="outline" size="sm" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Reports
                </Button>
              } />
              <DialogContent className="bg-card border-border text-foreground sm:max-w-[600px] max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:max-w-none print:w-full print:p-8">
                <DialogHeader className="print:hidden">
                  <DialogTitle className="text-white">Generate Exam Report</DialogTitle>
                  <DialogDescription className="text-sidebar-foreground">
                    Select an exam to generate a detailed performance report.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Select Class</label>
                      <Select value={reportClassId} onValueChange={setReportClassId}>
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Choose a class">
                            {reportClassId && classes.find(c => c.id === reportClassId) 
                              ? `${classes.find(c => c.id === reportClassId)?.name} - ${classes.find(c => c.id === reportClassId)?.section}`
                              : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name} - {cls.section}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Exam Type</label>
                      <Select value={reportExamType} onValueChange={(val: any) => setReportExamType(val)}>
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Exam Type">
                            {reportExamType ? reportExamType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="class_test">Class Test</SelectItem>
                          <SelectItem value="midterm">Midterm</SelectItem>
                          <SelectItem value="final">Final Exam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerateReport} 
                    disabled={!reportClassId || !reportExamType || isGeneratingReport}
                    className="w-full bg-primary hover:bg-primary/90 text-white print:hidden"
                  >
                    {isGeneratingReport ? "Generating..." : "Generate Report"}
                  </Button>

                  {reportResults.length > 0 && (
                    <div className="space-y-6 border-t border-border pt-6 print:border-none print:pt-0 print:w-full" id="printable-report">
                      <div className="text-center space-y-1 print:mb-8">
                        <h2 className="text-xl font-bold text-white print:text-black print:text-2xl">Exam Performance Report</h2>
                        <p className="text-sm text-sidebar-foreground print:text-gray-600">
                          {reportExamType.replace('_', ' ').toUpperCase()} • {classes.find(c => c.id === reportClassId)?.name}
                        </p>
                      </div>

                      <div className="rounded-md border border-border overflow-x-auto print:border-none print:overflow-visible" style={{'--exam-count': reportExams.length} as React.CSSProperties}>
                        <Table className="print:w-full print:text-black print:table-fixed">
                          <TableHeader className="bg-sidebar-accent/30 print:bg-gray-100">
                            <TableRow className="border-border hover:bg-transparent print:border-gray-300">
                              <TableHead className="text-[11px] font-bold text-sidebar-foreground uppercase min-w-[120px] print:text-black print:border print:border-gray-300 print:font-bold">Student Name</TableHead>
                              <TableHead className="text-[11px] font-bold text-sidebar-foreground uppercase text-center print:text-black print:border print:border-gray-300 print:font-bold">Roll No</TableHead>
                              {reportExams.map(exam => (
                                <TableHead key={exam.id} className="text-[11px] font-bold text-sidebar-foreground uppercase text-center print:text-black print:border print:border-gray-300 print:font-bold">
                                  <div className="print:whitespace-normal print:break-words">{exam.subject}</div>
                                </TableHead>
                              ))}
                              <TableHead className="text-[11px] font-bold text-sidebar-foreground uppercase text-center print:text-black print:border print:border-gray-300 print:font-bold">Total</TableHead>
                              <TableHead className="text-[11px] font-bold text-sidebar-foreground uppercase text-right print:text-black print:border print:border-gray-300 print:font-bold">Average</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students
                              .filter(s => s.classId === reportClassId)
                              .map(student => {
                                const studentResults = reportResults.filter(r => r.studentId === student.id);
                                let total = 0;
                                return (
                                  <TableRow key={student.id} className="border-border hover:bg-transparent print:border-gray-200">
                                    <TableCell className="text-sm text-white font-medium print:text-black print:border print:border-gray-200 print:font-normal">{student.name}</TableCell>
                                    <TableCell className="text-sm text-sidebar-foreground text-center print:text-black print:border print:border-gray-200 print:font-normal">{student.rollNumber}</TableCell>
                                    {reportExams.map(exam => {
                                      const result = studentResults.find(r => r.examId === exam.id);
                                      if (result) total += result.marksObtained;
                                      return (
                                        <TableCell key={exam.id} className="text-sm text-sidebar-foreground text-center print:text-black print:border print:border-gray-200 print:font-normal">
                                          {result ? result.marksObtained : '-'}
                                        </TableCell>
                                      );
                                    })}
                                    <TableCell className="text-sm text-white font-bold text-center print:text-black print:border print:border-gray-200 print:font-bold">{total}</TableCell>
                                    <TableCell className="text-sm text-primary font-bold text-right print:text-black print:border print:border-gray-200 print:font-bold">
                                      {reportExams.length > 0 ? (total / reportExams.length).toFixed(1) : '0.0'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="flex sm:justify-between gap-2 print:hidden">
                  <Button variant="outline" onClick={downloadCSV} disabled={reportResults.length === 0} className="border-border text-sidebar-foreground">
                    Download CSV
                  </Button>
                  <Button onClick={() => {
                    setIsReportDialogOpen(false);
                    setReportResults([]);
                    setReportExams([]);
                  }}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger render={
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Exam
                </Button>
              } />
              <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
                <form onSubmit={handleAddExam}>
                  <DialogHeader>
                    <DialogTitle className="text-white">Schedule New Exam</DialogTitle>
                    <DialogDescription className="text-sidebar-foreground">
                      Enter the exam details to notify students and teachers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Subject</label>
                      <Input 
                        required 
                        value={newExam.subject || ''} 
                        onChange={e => setNewExam({...newExam, subject: e.target.value})}
                        placeholder="Mathematics" 
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Class</label>
                        <Select 
                          value={newExam.classId || ''} 
                          onValueChange={val => setNewExam({...newExam, classId: val})}
                        >
                          <SelectTrigger className="w-full bg-background border-border">
                            <SelectValue placeholder="Select Class">
                              {newExam.classId && classes.find(c => c.id === newExam.classId) 
                                ? `${classes.find(c => c.id === newExam.classId)?.name}`
                                : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name} - {cls.section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Exam Type</label>
                        <Select 
                          value={newExam.type || ''} 
                          onValueChange={(val: any) => setNewExam({...newExam, type: val})}
                        >
                          <SelectTrigger className="w-full bg-background border-border">
                            <SelectValue>
                              {newExam.type ? newExam.type.charAt(0).toUpperCase() + newExam.type.slice(1) : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="class_test">Class Test</SelectItem>
                            <SelectItem value="midterm">Mid Term</SelectItem>
                            <SelectItem value="final">Final Exam</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Date</label>
                        <Input 
                          type="date"
                          required 
                          value={newExam.date || ''} 
                          onChange={e => setNewExam({...newExam, date: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Time</label>
                        <Input 
                          type="time"
                          required 
                          value={newExam.time || ''} 
                          onChange={e => setNewExam({...newExam, time: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Total Marks</label>
                      <Input 
                        type="number"
                        required 
                        value={newExam.totalMarks || ''} 
                        onChange={e => setNewExam({...newExam, totalMarks: Number(e.target.value)})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Schedule Exam</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="bg-sidebar-accent/50 p-1 rounded-lg mb-6 border border-border">
            <TabsTrigger value="schedule" className="data-[state=active]:bg-primary data-[state=active]:text-white">Exam Schedule</TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-white">Results & Grading</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border p-5 flex flex-col shadow-none">
                <span className="text-sm font-semibold text-sidebar-foreground mb-5">Upcoming Exams</span>
                <div className="text-[28px] font-bold text-white mb-1">{stats.upcoming}</div>
                <p className="text-xs text-sidebar-foreground mt-1">Next 30 days</p>
              </Card>
              <Card className="bg-card border-border p-5 flex flex-col shadow-none">
                <span className="text-sm font-semibold text-primary mb-5">Ongoing Exams</span>
                <div className="text-[28px] font-bold text-white mb-1">{stats.ongoing}</div>
                <p className="text-xs text-sidebar-foreground mt-1">Currently in progress</p>
              </Card>
              <Card className="bg-card border-border p-5 flex flex-col shadow-none">
                <span className="text-sm font-semibold text-emerald-500 mb-5">Completed</span>
                <div className="text-[28px] font-bold text-white mb-1">{stats.completed}</div>
                <p className="text-xs text-sidebar-foreground mt-1">This semester</p>
              </Card>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-white">Scheduled Exams</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
                  <Input 
                    placeholder="Search exams..." 
                    className="pl-10 h-9 bg-background border-border text-foreground" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {classes.map((cls) => {
                  const classExams = filteredExams.filter(e => e.classId === cls.id);
                  if (classExams.length === 0) return null;

                  return (
                    <div key={cls.id} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <div className="w-1.5 h-6 bg-primary rounded-full" />
                        <h4 className="text-lg font-bold text-white">
                          {cls.name} - {cls.section}
                        </h4>
                        <Badge variant="outline" className="ml-2 text-xs text-sidebar-foreground border-border">
                          {classExams.length} Exams
                        </Badge>
                      </div>
                      
                      <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-sidebar-accent/30">
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="font-semibold text-sidebar-foreground">Subject</TableHead>
                              <TableHead className="font-semibold text-sidebar-foreground">Date & Time</TableHead>
                              <TableHead className="font-semibold text-sidebar-foreground">Type</TableHead>
                              <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                              <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classExams.map((exam) => (
                              <TableRow key={exam.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <GraduationCap className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="font-semibold text-white">{exam.subject}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p className="font-medium text-white">{format(new Date(exam.date), 'MMM dd, yyyy')}</p>
                                    <p className="text-xs text-sidebar-foreground">{exam.time}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="capitalize bg-sidebar-accent/50 text-sidebar-foreground border-none">
                                    {exam.type.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className={cn(
                                    "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                                    exam.status === 'scheduled' ? "bg-primary/10 text-primary" :
                                    exam.status === 'ongoing' ? "bg-amber-500/10 text-amber-500" :
                                    "bg-emerald-500/10 text-emerald-500"
                                  )}>
                                    {exam.status === 'scheduled' && <Calendar className="w-3 h-3 mr-1" />}
                                    {exam.status === 'ongoing' && <Clock className="w-3 h-3 mr-1" />}
                                    {exam.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                    {exam.status}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger render={
                                      <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    } />
                                    <DropdownMenuContent align="end" className="bg-card border-border text-foreground min-w-[160px]">
                                      <DropdownMenuGroup>
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem 
                                          className="hover:bg-sidebar-accent cursor-pointer"
                                          onClick={() => {
                                            setSelectedExam(exam);
                                            setIsEditDialogOpen(true);
                                          }}
                                        >
                                          <Edit className="w-4 h-4 mr-2" />
                                          Edit Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="hover:bg-sidebar-accent cursor-pointer text-primary"
                                          onClick={() => startGrading(exam)}
                                        >
                                          <ChevronRight className="w-4 h-4 mr-2" />
                                          Enter Grades
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-rose-500 hover:bg-sidebar-accent cursor-pointer"
                                          onClick={() => {
                                            setSelectedExam(exam);
                                            setIsDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete Exam
                                        </DropdownMenuItem>
                                      </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
                
                {filteredExams.length === 0 && (
                  <div className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-sidebar-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white">No Exams Found</h3>
                    <p className="text-sidebar-foreground">Try adjusting your search or schedule a new exam.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <div className="space-y-8">
              {classes.map((cls) => {
                const classExams = exams.filter(e => e.classId === cls.id && (e.status === 'completed' || e.status === 'ongoing'));
                if (classExams.length === 0) return null;

                return (
                  <div key={cls.id} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                      <div className="w-1.5 h-6 bg-primary rounded-full" />
                      <h4 className="text-lg font-bold text-white">
                        {cls.name} - {cls.section}
                      </h4>
                      <Badge variant="outline" className="ml-2 text-xs text-sidebar-foreground border-border">
                        {classExams.length} Exam{classExams.length > 1 ? 's' : ''} for Grading
                      </Badge>
                    </div>
                    
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-sidebar-accent/30">
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="font-semibold text-sidebar-foreground">Subject</TableHead>
                            <TableHead className="font-semibold text-sidebar-foreground">Exam Type</TableHead>
                            <TableHead className="font-semibold text-sidebar-foreground">Total Marks</TableHead>
                            <TableHead className="font-semibold text-sidebar-foreground">Date</TableHead>
                            <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                            <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {classExams.map((exam) => (
                            <TableRow key={exam.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <GraduationCap className="w-4 h-4 text-primary" />
                                  </div>
                                  <span className="font-semibold text-white">{exam.subject}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize bg-sidebar-accent/50 text-sidebar-foreground border-none">
                                  {exam.type.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-white font-medium">{exam.totalMarks}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium text-white">{format(new Date(exam.date), 'MMM dd, yyyy')}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className={cn(
                                  "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                                  exam.status === 'ongoing' ? "bg-amber-500/10 text-amber-500" :
                                  "bg-emerald-500/10 text-emerald-500"
                                )}>
                                  {exam.status === 'ongoing' && <Clock className="w-3 h-3 mr-1" />}
                                  {exam.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {exam.status}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => startGrading(exam)}
                                  className="text-primary hover:bg-primary/10 h-8 px-3"
                                >
                                  Manage Results
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
              
              {exams.filter(e => e.status === 'completed' || e.status === 'ongoing').length === 0 && (
                <div className="py-12 text-center bg-card border border-border rounded-xl">
                  <FileText className="w-12 h-12 text-sidebar-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white">No Exams Ready for Grading</h3>
                  <p className="text-sidebar-foreground">Complete or start an exam to enter results.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Exam Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
            <form onSubmit={handleEditExam}>
              <DialogHeader>
                <DialogTitle className="text-white">Edit Exam Details</DialogTitle>
                <DialogDescription className="text-sidebar-foreground">
                  Update the exam schedule or information.
                </DialogDescription>
              </DialogHeader>
              {selectedExam && (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Subject</label>
                    <Input 
                      required 
                      value={selectedExam.subject || ''} 
                      onChange={e => setSelectedExam({...selectedExam, subject: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Class</label>
                      <Select 
                        value={selectedExam.classId || ''} 
                        onValueChange={val => setSelectedExam({...selectedExam, classId: val})}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue>
                            {selectedExam.classId && classes.find(c => c.id === selectedExam.classId) 
                              ? `${classes.find(c => c.id === selectedExam.classId)?.name}`
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} - {cls.section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Exam Type</label>
                      <Select 
                        value={selectedExam.type || ''} 
                        onValueChange={(val: any) => setSelectedExam({...selectedExam, type: val})}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue>
                            {selectedExam.type ? selectedExam.type.replace('_', ' ').charAt(0).toUpperCase() + selectedExam.type.replace('_', ' ').slice(1) : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="class_test">Class Test</SelectItem>
                          <SelectItem value="midterm">Mid Term</SelectItem>
                          <SelectItem value="final">Final Exam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                      <Select 
                        value={selectedExam.status || ''} 
                        onValueChange={(val: any) => setSelectedExam({...selectedExam, status: val})}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue>
                            {selectedExam.status ? selectedExam.status.charAt(0).toUpperCase() + selectedExam.status.slice(1) : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Date</label>
                      <Input 
                        type="date"
                        required 
                        value={selectedExam.date || ''} 
                        onChange={e => setSelectedExam({...selectedExam, date: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Time</label>
                      <Input 
                        type="time"
                        required 
                        value={selectedExam.time || ''} 
                        onChange={e => setSelectedExam({...selectedExam, time: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-white">Confirm Deletion</DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Are you sure you want to delete the exam for <span className="text-white font-semibold">{selectedExam?.subject}</span>? This will also delete any associated results.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteExam}>Delete Exam</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
