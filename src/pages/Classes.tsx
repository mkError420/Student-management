import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Plus, 
  Search, 
  GraduationCap,
  Users,
  BookOpen,
  MoreHorizontal,
  Trash2,
  Edit
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
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Class {
  id: string;
  name: string;
  section: string;
  teacher: string;
  roomNumber: string;
}

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [newClass, setNewClass] = useState({
    name: '',
    section: '',
    teacher: '',
    roomNumber: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'classes'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Class[];
      setClasses(classData);
    });
    return () => unsubscribe();
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'classes'), {
        ...newClass,
        createdAt: new Date().toISOString()
      });
      setIsAddDialogOpen(false);
      setNewClass({ name: '', section: '', teacher: '', roomNumber: '' });
      toast.success('Class added successfully');
    } catch (error) {
      console.error('Error adding class:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        toast.error('Permission denied. You must be an admin or teacher.');
      } else {
        toast.error('Failed to add class');
      }
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        name: selectedClass.name,
        section: selectedClass.section,
        teacher: selectedClass.teacher,
        roomNumber: selectedClass.roomNumber
      });
      setIsEditDialogOpen(false);
      toast.success('Class updated successfully');
    } catch (error) {
      console.error('Error updating class:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        toast.error('Permission denied. You do not have rights to edit this class.');
      } else {
        toast.error('Failed to update class');
      }
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    try {
      await deleteDoc(doc(db, 'classes', selectedClass.id));
      setIsDeleteDialogOpen(false);
      setSelectedClass(null);
      toast.success('Class deleted successfully');
    } catch (error) {
      console.error('Error deleting class:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        toast.error('Permission denied. You do not have rights to delete this class.');
      } else {
        toast.error('Failed to delete class');
      }
    }
  };

  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.teacher.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Class Management</h1>
            <p className="text-sidebar-foreground">Define and manage school classes and sections.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger render={
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add New Class
              </Button>
            } />
            <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
              <form onSubmit={handleAddClass}>
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Class</DialogTitle>
                  <DialogDescription className="text-sidebar-foreground">
                    Define a new class and assign a teacher.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Class Name</label>
                      <Input 
                        required 
                        value={newClass.name} 
                        onChange={e => setNewClass({...newClass, name: e.target.value})}
                        placeholder="e.g. Class 10" 
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Section</label>
                      <Input 
                        required 
                        value={newClass.section} 
                        onChange={e => setNewClass({...newClass, section: e.target.value})}
                        placeholder="e.g. A" 
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Class Teacher</label>
                    <Input 
                      required 
                      value={newClass.teacher} 
                      onChange={e => setNewClass({...newClass, teacher: e.target.value})}
                      placeholder="Teacher Name" 
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Room Number</label>
                    <Input 
                      value={newClass.roomNumber} 
                      onChange={e => setNewClass({...newClass, roomNumber: e.target.value})}
                      placeholder="e.g. 101" 
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Create Class</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
            <Input 
              placeholder="Search by class, section or teacher..." 
              className="pl-10 bg-background border-border text-foreground"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <div key={cls.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Class Options</DropdownMenuLabel>
                      <DropdownMenuItem 
                        className="hover:bg-sidebar-accent cursor-pointer"
                        onSelect={() => {
                          setSelectedClass(cls);
                          setIsEditDialogOpen(true);
                        }}
                        onClick={() => {
                          setSelectedClass(cls);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Class
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-rose-500 hover:bg-sidebar-accent cursor-pointer"
                        onSelect={() => {
                          setSelectedClass(cls);
                          setIsDeleteDialogOpen(true);
                        }}
                        onClick={() => {
                          setSelectedClass(cls);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Class
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{cls.name} - {cls.section}</h3>
              <div className="space-y-2 mt-4">
                <div className="flex items-center text-sm text-sidebar-foreground">
                  <Users className="w-4 h-4 mr-2 text-primary" />
                  <span>Teacher: <span className="text-white font-medium">{cls.teacher}</span></span>
                </div>
                <div className="flex items-center text-sm text-sidebar-foreground">
                  <BookOpen className="w-4 h-4 mr-2 text-primary" />
                  <span>Room: <span className="text-white font-medium">{cls.roomNumber || 'N/A'}</span></span>
                </div>
              </div>
            </div>
          ))}
          {filteredClasses.length === 0 && (
            <div className="col-span-full py-12 text-center bg-card border border-border border-dashed rounded-xl">
              <GraduationCap className="w-12 h-12 text-sidebar-foreground mx-auto mb-4 opacity-20" />
              <p className="text-sidebar-foreground">No classes found. Create your first class to get started.</p>
            </div>
          )}
        </div>

        {/* Edit Class Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
            <form onSubmit={handleEditClass}>
              <DialogHeader>
                <DialogTitle className="text-white">Edit Class Details</DialogTitle>
                <DialogDescription className="text-sidebar-foreground">
                  Update the class information.
                </DialogDescription>
              </DialogHeader>
              {selectedClass && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Class Name</label>
                      <Input 
                        required 
                        value={selectedClass.name} 
                        onChange={e => setSelectedClass({...selectedClass, name: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Section</label>
                      <Input 
                        required 
                        value={selectedClass.section} 
                        onChange={e => setSelectedClass({...selectedClass, section: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Class Teacher</label>
                    <Input 
                      required 
                      value={selectedClass.teacher} 
                      onChange={e => setSelectedClass({...selectedClass, teacher: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Room Number</label>
                    <Input 
                      value={selectedClass.roomNumber} 
                      onChange={e => setSelectedClass({...selectedClass, roomNumber: e.target.value})}
                      className="bg-background border-border"
                    />
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
                Are you sure you want to delete <span className="text-white font-semibold">{selectedClass?.name} - {selectedClass?.section}</span>? This will not delete students assigned to this class, but they will no longer be associated with it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="border-border text-sidebar-foreground">Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteClass}>Delete Class</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
