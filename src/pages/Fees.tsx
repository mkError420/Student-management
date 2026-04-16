import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Plus, 
  Search, 
  CreditCard, 
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Edit,
  Trash2,
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
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Print styles for receipt
const printStyles = `
@media print {
  /* Hide everything except receipt */
  body > *:not(.receipt-print-container),
  .receipt-print-container > *:not(.receipt-content) {
    display: none !important;
  }
  
  /* Show only receipt content */
  .receipt-print-container,
  .receipt-print-container .receipt-content,
  .receipt-print-container .receipt-content * {
    display: block !important;
    visibility: visible !important;
  }
  
  /* Receipt container styling */
  .receipt-print-container {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: white !important;
    z-index: 9999 !important;
  }
  
  .receipt-content {
    max-width: 600px !important;
    margin: 40px auto !important;
    padding: 30px !important;
    background: white !important;
    color: black !important;
    border: 1px solid #ccc !important;
    border-radius: 8px !important;
    box-shadow: none !important;
  }
  
  /* Text colors for print */
  .receipt-content * {
    color: black !important;
    background: white !important;
    border-color: #ccc !important;
  }
  
  .receipt-content .text-white {
    color: black !important;
    font-weight: bold !important;
  }
  
  .receipt-content .text-sidebar-foreground {
    color: #666 !important;
  }
  
  .receipt-content .text-primary {
    color: #000 !important;
    font-weight: bold !important;
  }
  
  .receipt-content .text-emerald-500 {
    color: #059669 !important;
    font-weight: bold !important;
  }
  
  .receipt-content .text-amber-500 {
    color: #d97706 !important;
    font-weight: bold !important;
  }
  
  .receipt-content .bg-sidebar-accent {
    background: #f5f5f5 !important;
    padding: 15px !important;
    border-radius: 6px !important;
  }
  
  .receipt-content .border-border {
    border-color: #ccc !important;
  }
  
  /* Layout improvements */
  .receipt-content .flex {
    display: flex !important;
  }
  
  .receipt-content .grid {
    display: grid !important;
  }
  
  .receipt-content .space-y-6 > * + * {
    margin-top: 1.5rem !important;
  }
  
  .receipt-content .space-y-3 > * + * {
    margin-top: 0.75rem !important;
  }
  
  .receipt-content .space-y-1 > * + * {
    margin-top: 0.25rem !important;
  }
  
  .receipt-content .text-right {
    text-align: right !important;
  }
  
  .receipt-content .font-bold {
    font-weight: bold !important;
  }
  
  .receipt-content .text-lg {
    font-size: 1.125rem !important;
  }
  
  .receipt-content .text-xl {
    font-size: 1.25rem !important;
  }
  
  .receipt-content .text-sm {
    font-size: 0.875rem !important;
  }
  
  .receipt-content .text-xs {
    font-size: 0.75rem !important;
  }
  
  .receipt-content .uppercase {
    text-transform: uppercase !important;
  }
  
  .receipt-content .tracking-wider {
    letter-spacing: 0.05em !important;
  }
  
  /* Page setup */
  @page {
    margin: 15mm;
    size: A4 portrait;
  }
  
  /* Ensure proper print formatting */
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }
  
  html {
    background: white !important;
  }
}
`;

interface FeeRecord {
  id: string;
  studentName: string;
  studentId: string;
  rollNumber: string;
  classId: string;
  className: string;
  amount: number;
  type: string;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
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

export default function Fees() {
  const [fees, setFees] = useState<FeeRecord[]>([]);

  // Inject print styles when component mounts
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [newFee, setNewFee] = useState({
    studentId: '',
    studentName: '',
    classId: '',
    amount: '',
    type: 'tuition',
    status: 'paid' as const,
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const q = query(collection(db, 'fees'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feeData = snapshot.docs.map(doc => {
        const data = doc.data();
        const student = students.find(s => s.id === data.studentId);
        const cls = classes.find(c => c.id === data.classId);
        return {
          id: doc.id,
          ...data,
          rollNumber: student?.rollNumber || '',
          className: cls ? `${cls.name} - ${cls.section}` : 'Unknown Class'
        } as FeeRecord;
      });
      setFees(feeData);
    });

    const studentsQuery = query(collection(db, 'students'), orderBy('name'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        rollNumber: doc.data().rollNumber,
        classId: doc.data().classId
      })) as Student[];
      setStudents(studentData);
    });

    const classesQuery = query(collection(db, 'classes'), orderBy('name'));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Class[];
      setClasses(classData);
    });

    return () => {
      unsubscribe();
      unsubscribeStudents();
      unsubscribeClasses();
    };
  }, []);

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'fees'), {
        studentId: newFee.studentId,
        classId: newFee.classId,
        studentName: newFee.studentName,
        amount: parseFloat(newFee.amount),
        type: newFee.type,
        status: newFee.status,
        date: newFee.date,
        createdAt: new Date().toISOString()
      });
      setIsAddDialogOpen(false);
      setNewFee({ studentId: '', studentName: '', classId: '', amount: '', type: 'tuition', status: 'paid', date: new Date().toISOString().split('T')[0] });
      toast.success('Fee record added successfully');
    } catch (error) {
      console.error('Error adding fee:', error);
      toast.error('Failed to add fee record');
    }
  };

  const handleEditFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;
    try {
      const feeRef = doc(db, 'fees', selectedFee.id);
      await updateDoc(feeRef, {
        amount: Number(selectedFee.amount),
        status: selectedFee.status,
        type: selectedFee.type,
        date: selectedFee.date
      });
      setIsEditDialogOpen(false);
      toast.success('Fee record updated successfully');
    } catch (error) {
      console.error('Error updating fee:', error);
      toast.error('Failed to update fee record');
    }
  };

  const handleDeleteFee = async () => {
    if (!selectedFee) return;
    try {
      await deleteDoc(doc(db, 'fees', selectedFee.id));
      setIsDeleteDialogOpen(false);
      setSelectedFee(null);
      toast.success('Fee record deleted');
    } catch (error) {
      console.error('Error deleting fee:', error);
      toast.error('Failed to delete fee record');
    }
  };

  const handleExportFees = () => {
    if (filteredFees.length === 0) {
      toast.error('No fee records to export');
      return;
    }

    const headers = ['Date', 'Student Name', 'Fee Type', 'Amount (৳)', 'Status'];
    const csvData = filteredFees.map(fee => {
      return [
        format(new Date(fee.date), 'yyyy-MM-dd'),
        fee.studentName,
        fee.type,
        fee.amount.toFixed(2),
        fee.status
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fees_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Fee records exported successfully');
  };

  const handlePrintReceipt = () => {
    if (!selectedFee) return;
    
    // Create print container
    const printContainer = document.createElement('div');
    printContainer.className = 'receipt-print-container';
    
    // Create receipt content
    const receiptContent = document.createElement('div');
    receiptContent.className = 'receipt-content space-y-6 py-4';
    
    // Build receipt HTML
    receiptContent.innerHTML = `
      <div class="flex justify-between items-start border-b border-border pb-4">
        <div>
          <h4 class="text-lg font-bold text-white">School Management System</h4>
          <p class="text-xs text-sidebar-foreground">123 Education Lane, Learning City</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Receipt No.</p>
          <p class="text-sm font-bold text-white">#${selectedFee.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-6">
        <div class="space-y-1">
          <p class="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Student Name</p>
          <p class="text-sm font-semibold text-white">${selectedFee.studentName}</p>
          <p class="text-xs font-medium text-sidebar-foreground uppercase tracking-wider mt-2">Class</p>
          <p class="text-sm font-semibold text-white">${selectedFee.className}</p>
          <p class="text-xs font-medium text-sidebar-foreground uppercase tracking-wider mt-2">Roll Number</p>
          <p class="text-sm font-semibold text-white">${selectedFee.rollNumber}</p>
        </div>
        <div class="space-y-1 text-right">
          <p class="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Payment Date</p>
          <p class="text-sm font-semibold text-white">${format(new Date(selectedFee.date), 'MMMM dd, yyyy')}</p>
        </div>
      </div>
      
      <div class="bg-sidebar-accent/20 rounded-lg p-4 space-y-3">
        <div class="flex justify-between text-sm">
          <span class="text-sidebar-foreground">Fee Description</span>
          <span class="text-white font-medium capitalize">${selectedFee.type} Fee</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-sidebar-foreground">Status</span>
          <span class="font-bold uppercase text-[10px] ${selectedFee.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}">${selectedFee.status}</span>
        </div>
        <div class="pt-3 border-t border-border flex justify-between items-center">
          <span class="text-base font-bold text-white">Total Amount</span>
          <span class="text-xl font-bold text-primary">৳${selectedFee.amount.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="text-center space-y-2">
        <p class="text-[10px] text-sidebar-foreground italic">
          This is a computer-generated receipt and does not require a physical signature.
        </p>
      </div>
    `;
    
    printContainer.appendChild(receiptContent);
    document.body.appendChild(printContainer);
    
    // Print and cleanup
    window.print();
    
    setTimeout(() => {
      document.body.removeChild(printContainer);
    }, 100);
  };

  const filteredFees = fees.filter(fee => {
    const matchesSearch = fee.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fee.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fee.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fee.className.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || fee.type === selectedType;
    const matchesClass = selectedClass === 'all' || fee.classId === selectedClass;
    return matchesSearch && matchesType && matchesClass;
  });

  const stats = {
    totalCollected: fees.filter(f => f.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0),
    pendingDues: fees.filter(f => f.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0),
    overduePayments: fees.filter(f => f.status === 'overdue').reduce((acc, curr) => acc + curr.amount, 0),
    pendingCount: fees.filter(f => f.status === 'pending').length,
    overdueCount: fees.filter(f => f.status === 'overdue').length
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Fee Collection</h1>
            <p className="text-sidebar-foreground">Manage student fees and payment history.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleExportFees}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger render={
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              } />
            <DialogContent className="bg-card border-border text-foreground">
              <form onSubmit={handleAddFee}>
                <DialogHeader>
                  <DialogTitle className="text-white">Record New Payment</DialogTitle>
                  <DialogDescription className="text-sidebar-foreground">Enter payment details for the student.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Class</label>
                      <Select 
                        value={newFee.classId || ''} 
                        onValueChange={val => setNewFee({...newFee, classId: val, studentId: '', studentName: ''})}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Select Class">
                            {newFee.classId && classes.find(c => c.id === newFee.classId) 
                              ? `${classes.find(c => c.id === newFee.classId)?.name} - ${classes.find(c => c.id === newFee.classId)?.section}`
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
                      <label className="text-sm font-medium text-sidebar-foreground">Student Name</label>
                      <Select 
                        value={newFee.studentId || ''} 
                        onValueChange={val => {
                          const student = students.find(s => s.id === val);
                          setNewFee({...newFee, studentId: val, studentName: student?.name || ''});
                        }}
                        disabled={!newFee.classId}
                      >
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Select Student">
                            {newFee.studentName || undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {students
                            .filter(s => s.classId === newFee.classId)
                            .map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name} ({student.rollNumber})
                              </SelectItem>
                            ))}
                          {students.filter(s => s.classId === newFee.classId).length === 0 && (
                            <SelectItem value="none" disabled>No students in this class</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Amount (৳)</label>
                      <Input 
                        type="number" 
                        required 
                        value={newFee.amount || ''} 
                        onChange={e => setNewFee({...newFee, amount: e.target.value})}
                        placeholder="0.00" 
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Fee Type</label>
                      <Select value={newFee.type || ''} onValueChange={val => setNewFee({...newFee, type: val})}>
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Select Type">
                            {newFee.type === 'tuition' && 'Tuition Fee'}
                            {newFee.type === 'exam' && 'Exam Fee'}
                            {newFee.type === 'library' && 'Library Fee'}
                            {newFee.type === 'transport' && 'Transport Fee'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="tuition">Tuition Fee</SelectItem>
                          <SelectItem value="exam">Exam Fee</SelectItem>
                          <SelectItem value="library">Library Fee</SelectItem>
                          <SelectItem value="transport">Transport Fee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Payment Date</label>
                      <Input 
                        type="date" 
                        required 
                        value={newFee.date || ''} 
                        onChange={e => setNewFee({...newFee, date: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                      <Select value={newFee.status || ''} onValueChange={(val: any) => setNewFee({...newFee, status: val})}>
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue placeholder="Select Status">
                            {newFee.status === 'paid' && 'Paid'}
                            {newFee.status === 'pending' && 'Pending'}
                            {newFee.status === 'overdue' && 'Overdue'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Record Payment</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-emerald-500 mb-5">Total Collected</span>
            <div className="text-[28px] font-bold text-white mb-1">৳{stats.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-sidebar-foreground mt-1">This academic year</p>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-amber-500 mb-5">Pending Dues</span>
            <div className="text-[28px] font-bold text-white mb-1">৳{stats.pendingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-sidebar-foreground mt-1">From {stats.pendingCount} records</p>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-rose-500 mb-5">Overdue Payments</span>
            <div className="text-[28px] font-bold text-white mb-1">৳{stats.overduePayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-sidebar-foreground mt-1">Requires immediate action ({stats.overdueCount})</p>
          </Card>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center">
              <History className="w-4 h-4 mr-2 text-primary" />
              Recent Transactions
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[140px] h-9 bg-background border-border text-foreground">
                  <SelectValue placeholder="All Classes">
                    {selectedClass === 'all' ? 'All Classes' : 
                     classes.find(c => c.id === selectedClass) ? 
                     `${classes.find(c => c.id === selectedClass)?.name} - ${classes.find(c => c.id === selectedClass)?.section}` : 
                     'Select Class'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[140px] h-9 bg-background border-border text-foreground">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="tuition">Tuition Fee</SelectItem>
                  <SelectItem value="exam">Exam Fee</SelectItem>
                  <SelectItem value="library">Library Fee</SelectItem>
                  <SelectItem value="transport">Transport Fee</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
                <Input 
                  placeholder="Search by name, roll, class..." 
                  className="pl-10 h-9 bg-background border-border text-foreground" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-sidebar-accent/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-sidebar-foreground">Date</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Class</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Roll No.</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Student</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Fee Type</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Amount</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFees.length > 0 ? (
                filteredFees.map((fee) => (
                  <TableRow key={fee.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                    <TableCell className="text-sidebar-foreground">{format(new Date(fee.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-sidebar-foreground text-sm">{fee.className}</TableCell>
                    <TableCell className="text-sidebar-foreground font-mono text-sm">{fee.rollNumber}</TableCell>
                    <TableCell className="font-semibold text-white">{fee.studentName}</TableCell>
                    <TableCell className="capitalize text-sidebar-foreground">{fee.type}</TableCell>
                    <TableCell className="font-medium text-white">৳{fee.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className={cn(
                        "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        fee.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" :
                        fee.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                        "bg-rose-500/10 text-rose-500"
                      )}>
                        {fee.status === 'paid' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {fee.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {fee.status === 'overdue' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {fee.status}
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
                                setSelectedFee(fee);
                                setIsReceiptDialogOpen(true);
                              }}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              View Receipt
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="hover:bg-sidebar-accent cursor-pointer"
                              onClick={() => {
                                setSelectedFee(fee);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Record
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-rose-500 hover:bg-sidebar-accent cursor-pointer"
                              onClick={() => {
                                setSelectedFee(fee);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sidebar-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Receipt Dialog */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Receipt
              </DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Official payment confirmation for student fees.
              </DialogDescription>
            </DialogHeader>
            
            {selectedFee && (
              <div className="receipt-content space-y-6 py-4">
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">School Management System</h4>
                    <p className="text-xs text-sidebar-foreground">123 Education Lane, Learning City</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Receipt No.</p>
                    <p className="text-sm font-bold text-white">#{selectedFee.id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Student Name</p>
                    <p className="text-sm font-semibold text-white">{selectedFee.studentName}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider">Payment Date</p>
                    <p className="text-sm font-semibold text-white">{format(new Date(selectedFee.date), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>

                <div className="bg-sidebar-accent/20 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground">Fee Description</span>
                    <span className="text-white font-medium capitalize">{selectedFee.type} Fee</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground">Status</span>
                    <span className={cn(
                      "font-bold uppercase text-[10px]",
                      selectedFee.status === 'paid' ? "text-emerald-500" : "text-amber-500"
                    )}>{selectedFee.status}</span>
                  </div>
                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-base font-bold text-white">Total Amount</span>
                    <span className="text-xl font-bold text-primary">৳{selectedFee.amount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-[10px] text-sidebar-foreground italic">
                    This is a computer-generated receipt and does not require a physical signature.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex sm:justify-between gap-2">
              <Button variant="outline" onClick={handlePrintReceipt} className="border-border text-sidebar-foreground">
                Print Receipt
              </Button>
              <Button onClick={() => setIsReceiptDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Fee Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
            <form onSubmit={handleEditFee}>
              <DialogHeader>
                <DialogTitle className="text-white">Edit Fee Record</DialogTitle>
                <DialogDescription className="text-sidebar-foreground">
                  Update payment details for <span className="text-white font-semibold">{selectedFee?.studentName}</span>.
                </DialogDescription>
              </DialogHeader>
              {selectedFee && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Amount (৳)</label>
                      <Input 
                        type="number" 
                        required 
                        value={selectedFee.amount || ''} 
                        onChange={e => setSelectedFee({...selectedFee, amount: Number(e.target.value)})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Fee Type</label>
                      <Select value={selectedFee.type || ''} onValueChange={val => setSelectedFee({...selectedFee, type: val})}>
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue>
                            {selectedFee.type === 'tuition' && 'Tuition Fee'}
                            {selectedFee.type === 'exam' && 'Exam Fee'}
                            {selectedFee.type === 'library' && 'Library Fee'}
                            {selectedFee.type === 'transport' && 'Transport Fee'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="tuition">Tuition Fee</SelectItem>
                          <SelectItem value="exam">Exam Fee</SelectItem>
                          <SelectItem value="library">Library Fee</SelectItem>
                          <SelectItem value="transport">Transport Fee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Payment Date</label>
                      <Input 
                        type="date" 
                        required 
                        value={selectedFee.date || ''} 
                        onChange={e => setSelectedFee({...selectedFee, date: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                      <Select value={selectedFee.status || ''} onValueChange={(val: any) => setSelectedFee({...selectedFee, status: val})}>
                        <SelectTrigger className="w-full bg-background border-border">
                          <SelectValue>
                            {selectedFee.status === 'paid' && 'Paid'}
                            {selectedFee.status === 'pending' && 'Pending'}
                            {selectedFee.status === 'overdue' && 'Overdue'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Save Changes</Button>
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
                Are you sure you want to delete the fee record for <span className="text-white font-semibold">{selectedFee?.studentName}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteFee}>Delete Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
