import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Download,
  Edit,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserPlus
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  status: 'active' | 'inactive';
}

const DEPARTMENTS = [
  'General',
  'Mathematics',
  'Science',
  'English',
  'Bangla',
  'Social Science',
  'ICT',
  'Religion',
  'Sports'
];

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: 'General',
    status: 'active' as const
  });

  useEffect(() => {
    const q = query(collection(db, 'teachers'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teacherData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Teacher[];
      setTeachers(teacherData);
    });

    return () => unsubscribe();
  }, []);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch =
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = selectedDepartment === 'all' || t.department === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [teachers, searchTerm, selectedDepartment]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTeacher.name.trim()) {
      toast.error('Teacher name is required');
      return;
    }

    try {
      await addDoc(collection(db, 'teachers'), {
        ...newTeacher,
        createdAt: new Date().toISOString()
      });
      setIsAddDialogOpen(false);
      setNewTeacher({ name: '', email: '', phone: '', designation: '', department: 'General', status: 'active' });
      toast.success('Teacher added successfully');
    } catch (error) {
      console.error('Error adding teacher:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        toast.error('Permission denied. You must be an admin.');
      } else {
        toast.error('Failed to add teacher');
      }
    }
  };

  const handleEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;

    try {
      const teacherRef = doc(db, 'teachers', selectedTeacher.id);
      await updateDoc(teacherRef, {
        name: selectedTeacher.name,
        email: selectedTeacher.email,
        phone: selectedTeacher.phone,
        designation: selectedTeacher.designation,
        department: selectedTeacher.department,
        status: selectedTeacher.status,
        updatedAt: new Date().toISOString()
      });
      setIsEditDialogOpen(false);
      toast.success('Teacher updated successfully');
    } catch (error) {
      console.error('Error updating teacher:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        toast.error('Permission denied. You must be an admin.');
      } else {
        toast.error('Failed to update teacher');
      }
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;

    try {
      await deleteDoc(doc(db, 'teachers', selectedTeacher.id));
      setIsDeleteDialogOpen(false);
      setSelectedTeacher(null);
      toast.success('Teacher deleted');
    } catch (error) {
      console.error('Error deleting teacher:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        toast.error('Permission denied. You must be an admin.');
      } else {
        toast.error('Failed to delete teacher');
      }
    }
  };

  const handleExportTeachers = () => {
    if (filteredTeachers.length === 0) {
      toast.error('No teachers to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Department', 'Designation', 'Status'];
    const csvData = filteredTeachers.map(t => {
      return [
        t.name || '',
        t.email || '',
        t.phone || '',
        t.department || '',
        t.designation || '',
        t.status || ''
      ].map(field => `"${String(field).replaceAll('"', '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `teachers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Teachers exported successfully');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Teacher Management</h1>
            <p className="text-sidebar-foreground">Add and manage teacher profiles.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleExportTeachers}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger render={
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Teacher
                </Button>
              } />
              <DialogContent className="bg-card border-border text-foreground sm:max-w-[520px]">
                <form onSubmit={handleAddTeacher}>
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Teacher</DialogTitle>
                    <DialogDescription className="text-sidebar-foreground">
                      Enter the teacher details to create a profile.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Full Name</label>
                      <Input
                        required
                        value={newTeacher.name}
                        onChange={(e) => setNewTeacher(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Teacher name"
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Email</label>
                        <Input
                          type="email"
                          value={newTeacher.email}
                          onChange={(e) => setNewTeacher(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="teacher@school.com"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Phone</label>
                        <Input
                          value={newTeacher.phone}
                          onChange={(e) => setNewTeacher(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+880 1XXX XXXXXX"
                          className="bg-background border-border"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Department</label>
                        <Select
                          value={newTeacher.department}
                          onValueChange={(val) => setNewTeacher(prev => ({ ...prev, department: val }))}
                        >
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {DEPARTMENTS.map(dep => (
                              <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Designation</label>
                        <Input
                          value={newTeacher.designation}
                          onChange={(e) => setNewTeacher(prev => ({ ...prev, designation: e.target.value }))}
                          placeholder="Senior Teacher"
                          className="bg-background border-border"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                      <Select
                        value={newTeacher.status}
                        onValueChange={(val: any) => setNewTeacher(prev => ({ ...prev, status: val }))}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Save Teacher</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
            <Input
              placeholder="Search by name, email or phone..."
              className="pl-10 bg-background border-border text-foreground"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2 text-sidebar-foreground" />
                  <SelectValue placeholder="Filter by Department" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(dep => (
                  <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground hover:text-white"
            onClick={() => {
              setSearchTerm('');
              setSelectedDepartment('all');
            }}
          >
            Reset
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-sidebar-accent/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-sidebar-foreground">Teacher</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Department</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Designation</TableHead>
                <TableHead className="font-semibold text-sidebar-foreground">Phone</TableHead>
                <TableHead className="w-32 font-semibold text-sidebar-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-sidebar-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((t) => (
                  <TableRow key={t.id} className="border-border hover:bg-sidebar-accent/20 transition-colors group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white group-hover:text-primary transition-colors">{t.name}</span>
                        <span className="text-[11px] text-sidebar-foreground">{t.email || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sidebar-foreground">{t.department || '—'}</TableCell>
                    <TableCell className="text-sidebar-foreground">{t.designation || '—'}</TableCell>
                    <TableCell className="text-sidebar-foreground">{t.phone || '—'}</TableCell>
                    <TableCell>
                      <div className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        t.status === 'active'
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                      )}>
                        <span className={cn(
                          "w-1 h-1 rounded-full mr-1.5",
                          t.status === 'active' ? "bg-emerald-500" : "bg-slate-500"
                        )} />
                        {t.status}
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
                                setSelectedTeacher(t);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-rose-500 hover:bg-sidebar-accent cursor-pointer"
                              onClick={() => {
                                setSelectedTeacher(t);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sidebar-foreground">
                    No teachers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[520px]">
            <form onSubmit={handleEditTeacher}>
              <DialogHeader>
                <DialogTitle className="text-white">Edit Teacher</DialogTitle>
                <DialogDescription className="text-sidebar-foreground">
                  Update teacher profile information.
                </DialogDescription>
              </DialogHeader>

              {selectedTeacher && (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Full Name</label>
                    <Input
                      required
                      value={selectedTeacher.name || ''}
                      onChange={(e) => setSelectedTeacher(prev => prev ? ({ ...prev, name: e.target.value }) : prev)}
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Email</label>
                      <Input
                        type="email"
                        value={selectedTeacher.email || ''}
                        onChange={(e) => setSelectedTeacher(prev => prev ? ({ ...prev, email: e.target.value }) : prev)}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Phone</label>
                      <Input
                        value={selectedTeacher.phone || ''}
                        onChange={(e) => setSelectedTeacher(prev => prev ? ({ ...prev, phone: e.target.value }) : prev)}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Department</label>
                      <Select
                        value={selectedTeacher.department || 'General'}
                        onValueChange={(val) => setSelectedTeacher(prev => prev ? ({ ...prev, department: val }) : prev)}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {DEPARTMENTS.map(dep => (
                            <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Designation</label>
                      <Input
                        value={selectedTeacher.designation || ''}
                        onChange={(e) => setSelectedTeacher(prev => prev ? ({ ...prev, designation: e.target.value }) : prev)}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                    <Select
                      value={selectedTeacher.status || 'active'}
                      onValueChange={(val: any) => setSelectedTeacher(prev => prev ? ({ ...prev, status: val }) : prev)}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
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

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-white">Confirm Deletion</DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Are you sure you want to delete <span className="text-white font-semibold">{selectedTeacher?.name}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteTeacher}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
