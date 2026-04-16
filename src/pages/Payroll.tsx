import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Banknote, 
  Search, 
  Plus, 
  Download,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  FileText,
  Calculator,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Send
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
import { Label } from '@/components/ui/label';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  getDocs,
  where 
} from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  baseSalary: number;
  joinDate: string;
  status: 'active' | 'inactive';
}

interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  month: string;
  year: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  overtime: number;
  bonus: number;
  tax: number;
  netSalary: number;
  status: 'paid' | 'pending' | 'processing';
  paymentDate?: string;
  paymentMethod?: string;
}

interface PayslipDetails {
  basicSalary: number;
  houseRentAllowance: number;
  medicalAllowance: number;
  transportAllowance: number;
  overtimePay: number;
  bonus: number;
  grossSalary: number;
  incomeTax: number;
  providentFund: number;
  professionalTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
}

export default function Payroll() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    baseSalary: 0,
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active' as const
  });

  useEffect(() => {
    // Fetch staff
    const staffQuery = query(collection(db, 'staff'), orderBy('name'));
    const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Staff[];
      setStaff(staffData);
    });

    // Fetch payroll records
    const payrollQuery = query(collection(db, 'payroll'), orderBy('year', 'desc'), orderBy('month', 'desc'));
    const unsubscribePayroll = onSnapshot(payrollQuery, (snapshot) => {
      const payrollData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayrollRecord[];
      setPayroll(payrollData);
    });

    return () => {
      unsubscribeStaff();
      unsubscribePayroll();
    };
  }, []);

  const calculateSalary = (baseSalary: number, allowances: number = 0, deductions: number = 0, overtime: number = 0, bonus: number = 0) => {
    const grossSalary = baseSalary + allowances + overtime + bonus;
    const tax = grossSalary * 0.1; // 10% tax
    const netSalary = grossSalary - deductions - tax;
    return { grossSalary, tax, netSalary };
  };

  const testFirebaseConnection = async () => {
    try {
      console.log('Testing Firebase connection...');
      console.log('Auth state:', auth.currentUser);
      
      // Test reading staff collection
      const staffQuery = query(collection(db, 'staff'));
      const querySnapshot = await getDocs(staffQuery);
      console.log('Staff collection accessible, documents found:', querySnapshot.size);
      
      // Test writing to staff collection with minimal data
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'teacher',
        department: 'academics',
        baseSalary: 1000,
        joinDate: '2024-01-01',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      const testDoc = await addDoc(collection(db, 'staff'), testData);
      console.log('Test staff document created with ID:', testDoc.id);
      
      // Clean up test document
      await deleteDoc(doc(db, 'staff', testDoc.id));
      console.log('Test document cleaned up');
      
      toast.success('Firebase connection test successful! Staff collection is working.');
      return true;
    } catch (error) {
      console.error('Firebase connection test failed:', error);
      toast.error(`Connection test failed: ${(error as any).message}`);
      return false;
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Test connection first
    const isConnected = await testFirebaseConnection();
    if (!isConnected) {
      toast.error('Firebase connection test failed. Please check your connection.');
      return;
    }
    
    // Validation
    if (!newStaff.name.trim()) {
      toast.error('Please enter staff name');
      return;
    }
    if (!newStaff.email.trim()) {
      toast.error('Please enter email address');
      return;
    }
    if (!newStaff.role) {
      toast.error('Please select a role');
      return;
    }
    if (!newStaff.department) {
      toast.error('Please select a department');
      return;
    }
    if (newStaff.baseSalary <= 0) {
      toast.error('Please enter a valid base salary');
      return;
    }
    if (!newStaff.joinDate) {
      toast.error('Please select a join date');
      return;
    }
    
    try {
      console.log('Attempting to add staff with data:', {
        name: newStaff.name.trim(),
        email: newStaff.email.trim(),
        role: newStaff.role,
        department: newStaff.department,
        baseSalary: Number(newStaff.baseSalary),
        joinDate: newStaff.joinDate,
        status: newStaff.status
      });
      
      const staffData = {
        name: newStaff.name.trim(),
        email: newStaff.email.trim(),
        role: newStaff.role,
        department: newStaff.department,
        baseSalary: Number(newStaff.baseSalary),
        joinDate: newStaff.joinDate,
        status: newStaff.status,
        createdAt: new Date().toISOString()
      };
      
      console.log('Firebase db object:', db);
      console.log('Collection reference:', collection(db, 'staff'));
      
      const docRef = await addDoc(collection(db, 'staff'), staffData);
      console.log('Staff added successfully with ID:', docRef.id);
      
      setIsStaffDialogOpen(false);
      setNewStaff({
        name: '',
        email: '',
        role: '',
        department: '',
        baseSalary: 0,
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active'
      });
      toast.success('Staff member added successfully');
    } catch (error) {
      console.error('Detailed error adding staff:', error);
      console.error('Error code:', (error as any).code);
      console.error('Error message:', (error as any).message);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Provide more specific error messages
      if ((error as any).code === 'permission-denied') {
        toast.error('Permission denied. Firebase rules may not be deployed yet. Please try deploying the rules first.');
      } else if ((error as any).code === 'unavailable') {
        toast.error('Firebase is currently unavailable. Please try again.');
      } else if ((error as any).code === 'unauthenticated') {
        toast.error('You are not authenticated. Please log in again.');
      } else {
        toast.error(`Failed to add staff member: ${(error as any).message || 'Unknown error'}. Check console for details.`);
      }
    }
  };

  const handleProcessPayroll = async () => {
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }

    setIsProcessing(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const batch = writeBatch(db);
      
      const activeStaff = staff.filter(s => s.status === 'active');
      
      for (const staffMember of activeStaff) {
        const { grossSalary, tax, netSalary } = calculateSalary(staffMember.baseSalary);
        
        const payrollData = {
          staffId: staffMember.id,
          staffName: staffMember.name,
          role: staffMember.role,
          month,
          year,
          baseSalary: staffMember.baseSalary,
          allowances: 0,
          deductions: 0,
          overtime: 0,
          bonus: 0,
          tax,
          netSalary,
          status: 'pending' as const,
          createdAt: new Date().toISOString()
        };
        
        const payrollRef = doc(collection(db, 'payroll'));
        batch.set(payrollRef, payrollData);
      }
      
      await batch.commit();
      toast.success(`Payroll processed for ${activeStaff.length} staff members`);
      setIsPayrollDialogOpen(false);
    } catch (error) {
      console.error('Error processing payroll:', error);
      toast.error('Failed to process payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsPaid = async (recordId: string) => {
    try {
      await updateDoc(doc(db, 'payroll', recordId), {
        status: 'paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Bank Transfer'
      });
      toast.success('Payment marked as paid');
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  const generatePayslip = (record: PayrollRecord): PayslipDetails => {
    const hra = record.baseSalary * 0.4; // 40% HRA
    const medical = record.baseSalary * 0.15; // 15% Medical
    const transport = record.baseSalary * 0.1; // 10% Transport
    const grossSalary = record.baseSalary + hra + medical + transport + record.overtime + record.bonus;
    const pf = record.baseSalary * 0.12; // 12% PF
    const professionalTax = 200;
    const totalDeductions = record.tax + pf + professionalTax + record.deductions;
    const netSalary = grossSalary - totalDeductions;

    return {
      basicSalary: record.baseSalary,
      houseRentAllowance: hra,
      medicalAllowance: medical,
      transportAllowance: transport,
      overtimePay: record.overtime,
      bonus: record.bonus,
      grossSalary,
      incomeTax: record.tax,
      providentFund: pf,
      professionalTax,
      otherDeductions: record.deductions,
      totalDeductions,
      netSalary
    };
  };

  const downloadCSV = () => {
    const filteredPayroll = payroll.filter(record => 
      record.staffName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const headers = ['Staff Name', 'Role', 'Month', 'Base Salary', 'Allowances', 'Deductions', 'Tax', 'Net Salary', 'Status'];
    const csvData = filteredPayroll.map(record => [
      record.staffName,
      record.role,
      `${record.month}/${record.year}`,
      record.baseSalary.toFixed(2),
      record.allowances.toFixed(2),
      record.deductions.toFixed(2),
      record.tax.toFixed(2),
      record.netSalary.toFixed(2),
      record.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Payroll data exported successfully');
  };

  const filteredPayroll = payroll.filter(record => 
    record.staffName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedMonth ? `${record.year}-${record.month}` === selectedMonth : true)
  );

  const stats = {
    totalPayout: filteredPayroll.reduce((sum, record) => sum + record.netSalary, 0),
    pendingCount: filteredPayroll.filter(record => record.status === 'pending').length,
    paidCount: filteredPayroll.filter(record => record.status === 'paid').length,
    totalTax: filteredPayroll.reduce((sum, record) => sum + record.tax, 0)
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Payroll Management</h1>
            <p className="text-sidebar-foreground">Manage staff salaries, process payroll, and generate payslips.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadCSV} className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testFirebaseConnection}
              className="border-border text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Test Connection
            </Button>
            <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
                  <Users className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Staff Member</DialogTitle>
                  <DialogDescription className="text-sidebar-foreground">
                    Enter the details of the new staff member.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddStaff}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-sidebar-foreground">
                          Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input 
                          required 
                          value={newStaff.name} 
                          onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                          placeholder="John Doe" 
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-sidebar-foreground">
                          Email <span className="text-rose-500">*</span>
                        </Label>
                        <Input 
                          type="email"
                          required 
                          value={newStaff.email} 
                          onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                          placeholder="john@example.com" 
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-sidebar-foreground">
                          Role <span className="text-rose-500">*</span>
                        </Label>
                        <Select value={newStaff.role} onValueChange={(val) => setNewStaff({...newStaff, role: val})}>
                          <SelectTrigger className="w-full bg-background border-border">
                            <SelectValue placeholder="Select role *" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                            <SelectItem value="librarian">Librarian</SelectItem>
                            <SelectItem value="support">Support Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-sidebar-foreground">
                          Department <span className="text-rose-500">*</span>
                        </Label>
                        <Select value={newStaff.department} onValueChange={(val) => setNewStaff({...newStaff, department: val})}>
                          <SelectTrigger className="w-full bg-background border-border">
                            <SelectValue placeholder="Select department *" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="academics">Academics</SelectItem>
                            <SelectItem value="administration">Administration</SelectItem>
                            <SelectItem value="accounts">Accounts</SelectItem>
                            <SelectItem value="library">Library</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-sidebar-foreground">
                          Base Salary ($) <span className="text-rose-500">*</span>
                        </Label>
                        <Input 
                          type="number"
                          required 
                          value={newStaff.baseSalary} 
                          onChange={e => setNewStaff({...newStaff, baseSalary: Number(e.target.value)})}
                          placeholder="5000" 
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-sidebar-foreground">
                          Join Date <span className="text-rose-500">*</span>
                        </Label>
                        <Input 
                          type="date"
                          required 
                          value={newStaff.joinDate} 
                          onChange={e => setNewStaff({...newStaff, joinDate: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsStaffDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Add Staff</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
                  <Calculator className="w-4 h-4 mr-2" />
                  Process Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="text-white">Process Monthly Payroll</DialogTitle>
                  <DialogDescription className="text-sidebar-foreground">
                    Select a month to process payroll for all active staff members.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-sidebar-foreground">Month & Year</Label>
                    <Input 
                      type="month"
                      required 
                      value={selectedMonth} 
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="bg-sidebar-accent/20 rounded-lg p-3">
                    <p className="text-sm text-sidebar-foreground">
                      This will process payroll for <span className="font-semibold text-white">{staff.filter(s => s.status === 'active').length}</span> active staff members.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsPayrollDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleProcessPayroll} disabled={isProcessing} className="bg-primary hover:bg-primary/90 text-white">
                    {isProcessing ? "Processing..." : "Process Payroll"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-sidebar-foreground mb-5">Total Payout</span>
            <div className="text-[28px] font-bold text-white mb-1">${stats.totalPayout.toFixed(2)}</div>
            <div className="flex items-center text-xs text-emerald-500 mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              For selected period
            </div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-amber-500 mb-5">Pending Payments</span>
            <div className="text-[28px] font-bold text-white mb-1">{stats.pendingCount}</div>
            <div className="flex items-center text-xs text-sidebar-foreground mt-1">
              <Clock className="w-3 h-3 mr-1" />
              Awaiting payment
            </div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-emerald-500 mb-5">Paid</span>
            <div className="text-[28px] font-bold text-white mb-1">{stats.paidCount}</div>
            <div className="flex items-center text-xs text-sidebar-foreground mt-1">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Successfully paid
            </div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-sidebar-foreground mb-5">Tax Deductions</span>
            <div className="text-[28px] font-bold text-white mb-1">${stats.totalTax.toFixed(2)}</div>
            <div className="flex items-center text-xs text-rose-500 mt-1">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              Total tax amount
            </div>
          </Card>
        </div>

        <Tabs defaultValue="payroll" className="w-full">
          <TabsList className="bg-sidebar-accent/50 p-1 rounded-lg mb-6 border border-border">
            <TabsTrigger value="payroll" className="data-[state=active]:bg-primary data-[state=active]:text-white">Payroll Records</TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-primary data-[state=active]:text-white">Staff Management</TabsTrigger>
          </TabsList>

          <TabsContent value="payroll">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-white">Payroll History</h3>
                <div className="flex items-center gap-4">
                  <Input 
                    type="month"
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="w-40 h-9 bg-background border-border text-foreground"
                  />
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
                    <Input 
                      placeholder="Search staff..." 
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
                    <TableHead className="font-semibold text-sidebar-foreground">Staff Name</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Role</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Period</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Base Salary</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Net Salary</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                    <TableHead className="text-right font-semibold text-sidebar-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayroll.length > 0 ? (
                    filteredPayroll.map((record) => (
                      <TableRow key={record.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                        <TableCell className="font-semibold text-white">{record.staffName}</TableCell>
                        <TableCell className="capitalize text-sidebar-foreground">{record.role}</TableCell>
                        <TableCell className="text-sidebar-foreground">{`${record.month}/${record.year}`}</TableCell>
                        <TableCell className="font-medium text-white">${record.baseSalary.toFixed(2)}</TableCell>
                        <TableCell className="font-medium text-white">${record.netSalary.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className={cn(
                            "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                            record.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : 
                            record.status === 'processing' ? "bg-blue-500/10 text-blue-500" :
                            "bg-amber-500/10 text-amber-500"
                          )}>
                            {record.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : 
                             record.status === 'processing' ? <Clock className="w-3 h-3 mr-1" /> :
                             <AlertCircle className="w-3 h-3 mr-1" />}
                            {record.status}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedRecord(record);
                                setIsPayslipDialogOpen(true);
                              }}
                              className="text-primary hover:bg-sidebar-accent"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {record.status === 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleMarkAsPaid(record.id)}
                                className="text-emerald-500 hover:bg-emerald-500/10"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sidebar-foreground">
                        No payroll records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="staff">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-white">Staff Members</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
                  <Input 
                    placeholder="Search staff..." 
                    className="pl-10 h-9 bg-background border-border text-foreground" 
                  />
                </div>
              </div>
              <Table>
                <TableHeader className="bg-sidebar-accent/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-semibold text-sidebar-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Role</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Department</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Base Salary</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                    <TableHead className="text-right font-semibold text-sidebar-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.length > 0 ? (
                    staff.map((staffMember) => (
                      <TableRow key={staffMember.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                        <TableCell className="font-semibold text-white">{staffMember.name}</TableCell>
                        <TableCell className="text-sidebar-foreground">{staffMember.email}</TableCell>
                        <TableCell className="capitalize text-sidebar-foreground">{staffMember.role}</TableCell>
                        <TableCell className="capitalize text-sidebar-foreground">{staffMember.department}</TableCell>
                        <TableCell className="font-medium text-white">${staffMember.baseSalary.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className={cn(
                            "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                            staffMember.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          )}>
                            <div className={cn(
                              "w-2 h-2 rounded-full mr-1",
                              staffMember.status === 'active' ? "bg-emerald-500" : "bg-rose-500"
                            )} />
                            {staffMember.status}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" className="text-primary hover:bg-sidebar-accent">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-500/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sidebar-foreground">
                        No staff members found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Payslip Dialog */}
        <Dialog open={isPayslipDialogOpen} onOpenChange={setIsPayslipDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Payslip</DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Detailed salary breakdown for {selectedRecord?.staffName}
              </DialogDescription>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-6">
                <div className="bg-sidebar-accent/20 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-sidebar-foreground">Employee Name</p>
                      <p className="font-semibold text-white">{selectedRecord.staffName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sidebar-foreground">Designation</p>
                      <p className="font-semibold text-white">{selectedRecord.role}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sidebar-foreground">Pay Period</p>
                      <p className="font-semibold text-white">{`${selectedRecord.month}/${selectedRecord.year}`}</p>
                    </div>
                    <div>
                      <p className="text-sm text-sidebar-foreground">Payment Status</p>
                      <Badge variant={selectedRecord.status === 'paid' ? 'default' : 'secondary'}>
                        {selectedRecord.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-white">Earnings</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">Basic Salary</span>
                        <span className="text-sm font-medium text-white">${selectedRecord.baseSalary.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">House Rent Allowance</span>
                        <span className="text-sm font-medium text-white">${(selectedRecord.baseSalary * 0.4).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">Medical Allowance</span>
                        <span className="text-sm font-medium text-white">${(selectedRecord.baseSalary * 0.15).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">Transport Allowance</span>
                        <span className="text-sm font-medium text-white">${(selectedRecord.baseSalary * 0.1).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">Overtime Pay</span>
                        <span className="text-sm font-medium text-white">${selectedRecord.overtime.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">Bonus</span>
                        <span className="text-sm font-medium text-white">${selectedRecord.bonus.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-border pt-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-semibold text-white">Gross Salary</span>
                          <span className="text-sm font-bold text-emerald-500">
                            ${(selectedRecord.baseSalary + (selectedRecord.baseSalary * 0.4) + (selectedRecord.baseSalary * 0.15) + (selectedRecord.baseSalary * 0.1) + selectedRecord.overtime + selectedRecord.bonus).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-white">Deductions</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">Income Tax</span>
                        <span className="text-sm font-medium text-white">${selectedRecord.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">Provident Fund</span>
                        <span className="text-sm font-medium text-white">${(selectedRecord.baseSalary * 0.12).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">Professional Tax</span>
                        <span className="text-sm font-medium text-white">$200.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-sidebar-foreground">Other Deductions</span>
                        <span className="text-sm font-medium text-white">${selectedRecord.deductions.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-border pt-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-semibold text-white">Total Deductions</span>
                          <span className="text-sm font-bold text-rose-500">
                            ${(selectedRecord.tax + (selectedRecord.baseSalary * 0.12) + 200 + selectedRecord.deductions).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">Net Salary</span>
                    <span className="text-2xl font-bold text-primary">${selectedRecord.netSalary.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsPayslipDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
