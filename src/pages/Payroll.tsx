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
  ArrowDownRight
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface PayrollRecord {
  id: string;
  staffName: string;
  role: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending';
}

export default function Payroll() {
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'payroll'), orderBy('month', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const payrollData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayrollRecord[];
      setPayroll(payrollData);
    });
    return () => unsubscribe();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Staff Payroll</h1>
            <p className="text-sidebar-foreground">Manage staff salaries and payment history.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Process Payroll
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-sidebar-foreground mb-5">Total Monthly Payout</span>
            <div className="text-[28px] font-bold text-white mb-1">$84,200.00</div>
            <div className="flex items-center text-xs text-emerald-500 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              3.2% from last month
            </div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-amber-500 mb-5">Pending Payments</span>
            <div className="text-[28px] font-bold text-white mb-1">$4,500.00</div>
            <div className="flex items-center text-xs text-sidebar-foreground mt-1">
              3 staff members
            </div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-sm font-semibold text-sidebar-foreground mb-5">Tax Deductions</span>
            <div className="text-[28px] font-bold text-white mb-1">$8,420.00</div>
            <div className="flex items-center text-xs text-rose-500 mt-1">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              1.5% from last month
            </div>
          </Card>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-white">Payroll History</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
              <Input placeholder="Search staff..." className="pl-10 h-9 bg-background border-border text-foreground" />
            </div>
          </div>
          <Table>
            <TableHeader className="bg-sidebar-accent/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-sidebar-foreground">Staff Name</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Role</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Month</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Net Salary</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payroll.length > 0 ? (
                payroll.map((record) => (
                  <TableRow key={record.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                    <TableCell className="font-semibold text-white">{record.staffName}</TableCell>
                    <TableCell className="capitalize text-sidebar-foreground">{record.role}</TableCell>
                    <TableCell className="text-sidebar-foreground">{record.month}</TableCell>
                    <TableCell className="font-medium text-white">${record.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className={cn(
                        "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        record.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {record.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {record.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-sidebar-accent">View Payslip</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sidebar-foreground">
                    No payroll records found.
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
