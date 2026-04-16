import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  Plus, 
  Search, 
  Book, 
  User, 
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRightLeft,
  MoreHorizontal,
  Edit,
  Trash2,
  BookOpen
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, deleteDoc, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { format, addDays, isAfter } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      // We don't have direct access to auth here easily without passing it, 
      // but we can log the error message which is the most important part for debugging rules.
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Permission denied for ${operationType} on ${path}`);
}

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  available: number;
  total: number;
}

interface Issue {
  id: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  studentClass?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'issued' | 'returned';
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

export default function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [issueSearchTerm, setIssueSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [issueSelectedClassId, setIssueSelectedClassId] = useState<string>('');
  const [editIssueSelectedClassId, setEditIssueSelectedClassId] = useState<string>('');

  // Search states for selects
  const [bookSearch, setBookSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [editBookSearch, setEditBookSearch] = useState('');
  const [editClassSearch, setEditClassSearch] = useState('');
  const [editStudentSearch, setEditStudentSearch] = useState('');
  
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isEditBookOpen, setIsEditBookOpen] = useState(false);
  const [isDeleteBookOpen, setIsDeleteBookOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isEditIssueOpen, setIsEditIssueOpen] = useState(false);
  const [isDeleteIssueOpen, setIsDeleteIssueOpen] = useState(false);
  
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'General',
    total: 1
  });
  
  const [newIssue, setNewIssue] = useState({
    bookId: '',
    studentId: '',
    days: 7
  });

  useEffect(() => {
    if (!isIssueOpen) {
      setBookSearch('');
      setClassSearch('');
      setStudentSearch('');
    }
  }, [isIssueOpen]);

  useEffect(() => {
    if (!isEditIssueOpen) {
      setEditBookSearch('');
      setEditClassSearch('');
      setEditStudentSearch('');
    }
  }, [isEditIssueOpen]);

  useEffect(() => {
    const q = query(collection(db, 'library_books'), orderBy('title'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];
      setBooks(bookData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'library_books');
    });

    const issuesQuery = query(collection(db, 'library_issues'), orderBy('issueDate', 'desc'));
    const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
      const issueData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Issue[];
      setIssues(issueData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'library_issues');
    });

    const studentsQuery = query(collection(db, 'students'), orderBy('name'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'students');
    });

    const classesQuery = query(collection(db, 'classes'), orderBy('name'));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Class[];
      setClasses(classData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'classes');
    });

    return () => {
      unsubscribe();
      unsubscribeIssues();
      unsubscribeStudents();
      unsubscribeClasses();
    };
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'library_books'), {
        ...newBook,
        available: Number(newBook.total),
        total: Number(newBook.total),
        createdAt: new Date().toISOString()
      });
      setIsAddBookOpen(false);
      setNewBook({ title: '', author: '', isbn: '', category: 'General', total: 1 });
      toast.success('Book added to inventory');
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error('Failed to add book');
    }
  };

  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    try {
      const bookRef = doc(db, 'library_books', selectedBook.id);
      // Calculate new availability based on change in total
      const diff = Number(selectedBook.total) - books.find(b => b.id === selectedBook.id)!.total;
      const newAvailable = Math.max(0, selectedBook.available + diff);
      
      await updateDoc(bookRef, {
        title: selectedBook.title,
        author: selectedBook.author,
        isbn: selectedBook.isbn,
        category: selectedBook.category,
        total: Number(selectedBook.total),
        available: newAvailable
      });
      setIsEditBookOpen(false);
      toast.success('Book updated successfully');
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Failed to update book');
    }
  };

  const handleDeleteBook = async () => {
    if (!selectedBook) return;
    try {
      await deleteDoc(doc(db, 'library_books', selectedBook.id));
      setIsDeleteBookOpen(false);
      setSelectedBook(null);
      toast.success('Book removed from inventory');
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to remove book');
    }
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const book = books.find(b => b.id === newIssue.bookId);
    const student = students.find(s => s.id === newIssue.studentId);
    const cls = classes.find(c => c.id === issueSelectedClassId);
    
    if (!book || !student) return;
    if (book.available <= 0) {
      toast.error('Book is currently out of stock');
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Create issue record
      const issueRef = doc(collection(db, 'library_issues'));
      const issueDate = new Date();
      const dueDate = addDays(issueDate, newIssue.days);
      
      batch.set(issueRef, {
        bookId: book.id,
        bookTitle: book.title,
        studentId: student.id,
        studentName: student.name,
        studentClass: cls ? `${cls.name} - ${cls.section}` : 'N/A',
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: 'issued'
      });
      
      // Update book availability
      const bookRef = doc(db, 'library_books', book.id);
      batch.update(bookRef, {
        available: book.available - 1
      });
      
      await batch.commit();
      setIsIssueOpen(false);
      setNewIssue({ bookId: '', studentId: '', days: 7 });
      toast.success(`Book issued to ${student.name}`);
    } catch (error) {
      console.error('Error issuing book:', error);
      toast.error('Failed to issue book');
    }
  };

  const handleReturnBook = async (issue: Issue) => {
    try {
      const batch = writeBatch(db);
      
      // Update issue record
      const issueRef = doc(db, 'library_issues', issue.id);
      batch.update(issueRef, {
        status: 'returned',
        returnDate: new Date().toISOString()
      });
      
      // Update book availability
      const bookRef = doc(db, 'library_books', issue.bookId);
      const book = books.find(b => b.id === issue.bookId);
      if (book) {
        batch.update(bookRef, {
          available: Math.min(book.total, book.available + 1)
        });
      }
      
      await batch.commit();
      toast.success('Book returned successfully');
    } catch (error) {
      console.error('Error returning book:', error);
      toast.error('Failed to return book');
    }
  };

  const handleEditIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    const originalIssue = issues.find(i => i.id === selectedIssue.id);
    if (!originalIssue) return;

    try {
      const batch = writeBatch(db);
      const issueRef = doc(db, 'library_issues', selectedIssue.id);
      
      const book = books.find(b => b.id === selectedIssue.bookId);
      const student = students.find(s => s.id === selectedIssue.studentId);
      const cls = classes.find(c => c.id === editIssueSelectedClassId);
      
      if (!book || !student) return;

      // If book changed, update availability for both
      if (selectedIssue.bookId !== originalIssue.bookId) {
        // Return old book
        const oldBookRef = doc(db, 'library_books', originalIssue.bookId);
        const oldBook = books.find(b => b.id === originalIssue.bookId);
        if (oldBook) {
          batch.update(oldBookRef, { available: oldBook.available + 1 });
        }

        // Issue new book
        const newBookRef = doc(db, 'library_books', selectedIssue.bookId);
        if (book.available <= 0) {
          toast.error('New selected book is out of stock');
          return;
        }
        batch.update(newBookRef, { available: book.available - 1 });
      }

      batch.update(issueRef, {
        bookId: selectedIssue.bookId,
        bookTitle: book.title,
        studentId: selectedIssue.studentId,
        studentName: student.name,
        studentClass: cls ? `${cls.name} - ${cls.section}` : 'N/A',
        dueDate: selectedIssue.dueDate,
        status: selectedIssue.status,
        returnDate: selectedIssue.status === 'returned' ? (selectedIssue.returnDate || new Date().toISOString()) : null
      });

      await batch.commit();
      setIsEditIssueOpen(false);
      toast.success('Issue record updated');
    } catch (error) {
      console.error('Error updating issue:', error);
      toast.error('Failed to update issue record');
    }
  };

  const handleDeleteIssue = async () => {
    if (!selectedIssue) return;
    try {
      const batch = writeBatch(db);
      
      // If it was still issued, return the book to stock
      if (selectedIssue.status === 'issued') {
        const bookRef = doc(db, 'library_books', selectedIssue.bookId);
        const book = books.find(b => b.id === selectedIssue.bookId);
        if (book) {
          batch.update(bookRef, { available: Math.min(book.total, book.available + 1) });
        }
      }
      
      batch.delete(doc(db, 'library_issues', selectedIssue.id));
      await batch.commit();
      
      setIsDeleteIssueOpen(false);
      setSelectedIssue(null);
      toast.success('Issue record deleted');
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('Failed to delete issue record');
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.isbn.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredIssues = issues.filter(issue => 
    issue.bookTitle.toLowerCase().includes(issueSearchTerm.toLowerCase()) ||
    issue.studentName.toLowerCase().includes(issueSearchTerm.toLowerCase()) ||
    issue.studentClass?.toLowerCase().includes(issueSearchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(books.map(b => b.category)));

  const stats = {
    totalBooks: books.reduce((acc, b) => acc + b.total, 0),
    issuedBooks: issues.filter(i => i.status === 'issued').length,
    overdue: issues.filter(i => i.status === 'issued' && isAfter(new Date(), new Date(i.dueDate))).length,
    available: books.reduce((acc, b) => acc + b.available, 0)
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Library Management</h1>
            <p className="text-sidebar-foreground">Manage book inventory and student borrowings.</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
              <DialogTrigger render={
                <Button variant="outline" size="sm" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Issue Book
                </Button>
              } />
              <DialogContent className="bg-card border-border text-foreground">
                <form onSubmit={handleIssueBook}>
                  <DialogHeader>
                    <DialogTitle className="text-white">Issue Book</DialogTitle>
                    <DialogDescription className="text-sidebar-foreground">Assign a book to a student.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Select Book</label>
                      <Select value={newIssue.bookId} onValueChange={val => setNewIssue({...newIssue, bookId: val})}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Choose a book">
                            {newIssue.bookId && books.find(b => b.id === newIssue.bookId)?.title}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <div className="p-2 sticky top-0 bg-card z-10 border-b border-border mb-1">
                            <Input 
                              placeholder="Search book..." 
                              value={bookSearch}
                              onChange={e => setBookSearch(e.target.value)}
                              className="h-8 text-xs bg-background"
                              onKeyDown={e => e.stopPropagation()}
                            />
                          </div>
                          {books
                            .filter(b => b.available > 0)
                            .filter(b => b.title.toLowerCase().includes(bookSearch.toLowerCase()) || b.author.toLowerCase().includes(bookSearch.toLowerCase()))
                            .map(book => (
                              <SelectItem key={book.id} value={book.id}>{book.title} ({book.available} left)</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Select Class</label>
                      <Select value={issueSelectedClassId} onValueChange={val => {
                        setIssueSelectedClassId(val);
                        setNewIssue({...newIssue, studentId: ''});
                      }}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Choose a class">
                            {issueSelectedClassId && classes.find(c => c.id === issueSelectedClassId) 
                              ? `${classes.find(c => c.id === issueSelectedClassId)?.name} - ${classes.find(c => c.id === issueSelectedClassId)?.section}`
                              : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <div className="p-2 sticky top-0 bg-card z-10 border-b border-border mb-1">
                            <Input 
                              placeholder="Search class..." 
                              value={classSearch}
                              onChange={e => setClassSearch(e.target.value)}
                              className="h-8 text-xs bg-background"
                              onKeyDown={e => e.stopPropagation()}
                            />
                          </div>
                          {classes
                            .filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase()) || c.section.toLowerCase().includes(classSearch.toLowerCase()))
                            .map(cls => (
                              <SelectItem key={cls.id} value={cls.id}>{cls.name} - {cls.section}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Select Student</label>
                      <Select 
                        value={newIssue.studentId} 
                        onValueChange={val => setNewIssue({...newIssue, studentId: val})}
                        disabled={!issueSelectedClassId}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder={issueSelectedClassId ? "Choose a student" : "Select a class first"}>
                            {newIssue.studentId && students.find(s => s.id === newIssue.studentId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <div className="p-2 sticky top-0 bg-card z-10 border-b border-border mb-1">
                            <Input 
                              placeholder="Search student..." 
                              value={studentSearch}
                              onChange={e => setStudentSearch(e.target.value)}
                              className="h-8 text-xs bg-background"
                              onKeyDown={e => e.stopPropagation()}
                            />
                          </div>
                          {students
                            .filter(s => s.classId === issueSelectedClassId)
                            .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.rollNumber.includes(studentSearch))
                            .map(student => (
                              <SelectItem key={student.id} value={student.id}>{student.name} ({student.rollNumber})</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Duration (Days)</label>
                      <Input 
                        type="number" 
                        value={newIssue.days} 
                        onChange={e => setNewIssue({...newIssue, days: Number(e.target.value)})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsIssueOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-primary text-white">Issue Book</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddBookOpen} onOpenChange={setIsAddBookOpen}>
              <DialogTrigger render={
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Book
                </Button>
              } />
              <DialogContent className="bg-card border-border text-foreground">
                <form onSubmit={handleAddBook}>
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Book</DialogTitle>
                    <DialogDescription className="text-sidebar-foreground">Enter book details for the inventory.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Title</label>
                      <Input 
                        required 
                        value={newBook.title} 
                        onChange={e => setNewBook({...newBook, title: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Author</label>
                        <Input 
                          required 
                          value={newBook.author} 
                          onChange={e => setNewBook({...newBook, author: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">ISBN</label>
                        <Input 
                          required 
                          value={newBook.isbn} 
                          onChange={e => setNewBook({...newBook, isbn: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Category</label>
                        <Input 
                          required 
                          value={newBook.category} 
                          onChange={e => setNewBook({...newBook, category: e.target.value})}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-sidebar-foreground">Total Copies</label>
                        <Input 
                          type="number" 
                          required 
                          value={newBook.total} 
                          onChange={e => setNewBook({...newBook, total: Number(e.target.value)})}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddBookOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-primary text-white">Add Book</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-xs font-medium text-sidebar-foreground uppercase tracking-wider mb-5">Total Books</span>
            <div className="text-[28px] font-bold text-white mb-1">{stats.totalBooks.toLocaleString()}</div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-xs font-medium text-primary uppercase tracking-wider mb-5">Issued Books</span>
            <div className="text-[28px] font-bold text-white mb-1">{stats.issuedBooks}</div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-xs font-medium text-rose-500 uppercase tracking-wider mb-5">Overdue</span>
            <div className="text-[28px] font-bold text-white mb-1">{stats.overdue}</div>
          </Card>
          <Card className="bg-card border-border p-5 flex flex-col shadow-none">
            <span className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-5">Available</span>
            <div className="text-[28px] font-bold text-white mb-1">{stats.available.toLocaleString()}</div>
          </Card>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="bg-sidebar-accent/50 p-1 rounded-lg mb-6 border border-border">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-primary data-[state=active]:text-white">Book Inventory</TabsTrigger>
            <TabsTrigger value="issues" className="data-[state=active]:bg-primary data-[state=active]:text-white">Issued Books</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-none">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
                <Input 
                  placeholder="Search by title, author, or ISBN..." 
                  className="pl-10 bg-background border-border text-foreground"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] bg-background border-border">
                  <SelectValue placeholder="Category">
                    {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
              <Table>
                <TableHeader className="bg-sidebar-accent/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-semibold text-sidebar-foreground">Book Details</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Category</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">ISBN</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Availability</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                    <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.length > 0 ? (
                    filteredBooks.map((book) => (
                      <TableRow key={book.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Book className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-white">{book.title}</p>
                              <p className="text-xs text-sidebar-foreground">{book.author}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-sidebar-accent text-sidebar-foreground border-none">
                            {book.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sidebar-foreground font-mono text-xs">{book.isbn}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="text-[10px] text-sidebar-foreground uppercase font-bold">
                              {book.available} / {book.total} available
                            </div>
                            <div className="w-24 h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${(book.available / book.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {book.available > 0 ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-none">In Stock</Badge>
                          ) : (
                            <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/10 border-none">Out of Stock</Badge>
                          )}
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
                                    setSelectedBook(book);
                                    setIsEditBookOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-rose-500 hover:bg-sidebar-accent cursor-pointer"
                                  onClick={() => {
                                    setSelectedBook(book);
                                    setIsDeleteBookOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove Book
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
                        No books found in the library.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="space-y-6">
            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-none">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground" />
                <Input 
                  placeholder="Search by student or book title..." 
                  className="pl-10 bg-background border-border text-foreground"
                  value={issueSearchTerm}
                  onChange={e => setIssueSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-none">
              <Table>
                <TableHeader className="bg-sidebar-accent/30">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-semibold text-sidebar-foreground">Student</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Class</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Book Title</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Issue Date</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Due Date</TableHead>
                    <TableHead className="font-semibold text-sidebar-foreground">Status</TableHead>
                    <TableHead className="text-right font-semibold text-sidebar-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues.length > 0 ? (
                    filteredIssues.map((issue) => {
                      const isOverdue = issue.status === 'issued' && isAfter(new Date(), new Date(issue.dueDate));
                      
                      // Fallback for older records without studentClass
                      let displayClass = issue.studentClass;
                      if (!displayClass) {
                        const student = students.find(s => s.id === issue.studentId);
                        const cls = classes.find(c => c.id === student?.classId);
                        displayClass = cls ? `${cls.name} - ${cls.section}` : 'N/A';
                      }

                      return (
                        <TableRow key={issue.id} className="border-border hover:bg-sidebar-accent/20 transition-colors">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-sidebar-accent rounded-lg">
                                <User className="w-4 h-4 text-sidebar-foreground" />
                              </div>
                              <span className="font-semibold text-white">{issue.studentName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-sidebar-accent text-sidebar-foreground border-none">
                              {displayClass}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sidebar-foreground">{issue.bookTitle}</TableCell>
                          <TableCell className="text-sidebar-foreground">{format(new Date(issue.issueDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-sm",
                              isOverdue ? "text-rose-500 font-bold" : "text-sidebar-foreground"
                            )}>
                              {format(new Date(issue.dueDate), 'MMM dd, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {issue.status === 'issued' ? (
                              <Badge className={cn(
                                "border-none",
                                isOverdue ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                              )}>
                                {isOverdue ? 'Overdue' : 'Issued'}
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-none">Returned</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {issue.status === 'issued' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-primary hover:bg-sidebar-accent h-8"
                                  onClick={() => handleReturnBook(issue)}
                                >
                                  Return
                                </Button>
                              )}
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
                                        const student = students.find(s => s.id === issue.studentId);
                                        setSelectedIssue(issue);
                                        setEditIssueSelectedClassId(student?.classId || '');
                                        setIsEditIssueOpen(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Record
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-rose-500 hover:bg-sidebar-accent cursor-pointer"
                                      onClick={() => {
                                        setSelectedIssue(issue);
                                        setIsDeleteIssueOpen(true);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Record
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sidebar-foreground">
                        No issue records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Book Dialog */}
        <Dialog open={isEditBookOpen} onOpenChange={setIsEditBookOpen}>
          <DialogContent className="bg-card border-border text-foreground">
            <form onSubmit={handleEditBook}>
              <DialogHeader>
                <DialogTitle className="text-white">Edit Book Details</DialogTitle>
                <DialogDescription className="text-sidebar-foreground">Update book information in the inventory.</DialogDescription>
              </DialogHeader>
              {selectedBook && (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Title</label>
                    <Input 
                      required 
                      value={selectedBook.title} 
                      onChange={e => setSelectedBook({...selectedBook, title: e.target.value})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Author</label>
                      <Input 
                        required 
                        value={selectedBook.author} 
                        onChange={e => setSelectedBook({...selectedBook, author: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">ISBN</label>
                      <Input 
                        required 
                        value={selectedBook.isbn} 
                        onChange={e => setSelectedBook({...selectedBook, isbn: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Category</label>
                      <Input 
                        required 
                        value={selectedBook.category} 
                        onChange={e => setSelectedBook({...selectedBook, category: e.target.value})}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-sidebar-foreground">Total Copies</label>
                      <Input 
                        type="number" 
                        required 
                        value={selectedBook.total} 
                        onChange={e => setSelectedBook({...selectedBook, total: Number(e.target.value)})}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditBookOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-white">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={isDeleteBookOpen} onOpenChange={setIsDeleteBookOpen}>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-white">Remove Book</DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Are you sure you want to remove <span className="text-white font-semibold">{selectedBook?.title}</span> from the inventory?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteBookOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteBook}>Remove Book</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Issue Dialog */}
        <Dialog open={isEditIssueOpen} onOpenChange={setIsEditIssueOpen}>
          <DialogContent className="bg-card border-border text-foreground">
            <form onSubmit={handleEditIssue}>
              <DialogHeader>
                <DialogTitle className="text-white">Edit Issue Record</DialogTitle>
                <DialogDescription className="text-sidebar-foreground">Update borrowing details.</DialogDescription>
              </DialogHeader>
              {selectedIssue && (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Book</label>
                    <Select value={selectedIssue.bookId} onValueChange={val => setSelectedIssue({...selectedIssue, bookId: val})}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Choose a book">
                          {selectedIssue.bookId && books.find(b => b.id === selectedIssue.bookId)?.title}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <div className="p-2 sticky top-0 bg-card z-10 border-b border-border mb-1">
                          <Input 
                            placeholder="Search book..." 
                            value={editBookSearch}
                            onChange={e => setEditBookSearch(e.target.value)}
                            className="h-8 text-xs bg-background"
                            onKeyDown={e => e.stopPropagation()}
                          />
                        </div>
                        {books
                          .filter(b => b.title.toLowerCase().includes(editBookSearch.toLowerCase()) || b.author.toLowerCase().includes(editBookSearch.toLowerCase()))
                          .map(book => (
                            <SelectItem key={book.id} value={book.id}>{book.title} ({book.available} left)</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Class</label>
                    <Select value={editIssueSelectedClassId} onValueChange={val => {
                      setEditIssueSelectedClassId(val);
                      setSelectedIssue({...selectedIssue, studentId: ''});
                    }}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Choose a class">
                          {editIssueSelectedClassId && classes.find(c => c.id === editIssueSelectedClassId) 
                            ? `${classes.find(c => c.id === editIssueSelectedClassId)?.name} - ${classes.find(c => c.id === editIssueSelectedClassId)?.section}`
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <div className="p-2 sticky top-0 bg-card z-10 border-b border-border mb-1">
                          <Input 
                            placeholder="Search class..." 
                            value={editClassSearch}
                            onChange={e => setEditClassSearch(e.target.value)}
                            className="h-8 text-xs bg-background"
                            onKeyDown={e => e.stopPropagation()}
                          />
                        </div>
                        {classes
                          .filter(c => c.name.toLowerCase().includes(editClassSearch.toLowerCase()) || c.section.toLowerCase().includes(editClassSearch.toLowerCase()))
                          .map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name} - {cls.section}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Student</label>
                    <Select 
                      value={selectedIssue.studentId} 
                      onValueChange={val => setSelectedIssue({...selectedIssue, studentId: val})}
                      disabled={!editIssueSelectedClassId}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder={editIssueSelectedClassId ? "Choose a student" : "Select a class first"}>
                          {selectedIssue.studentId && students.find(s => s.id === selectedIssue.studentId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <div className="p-2 sticky top-0 bg-card z-10 border-b border-border mb-1">
                          <Input 
                            placeholder="Search student..." 
                            value={editStudentSearch}
                            onChange={e => setEditStudentSearch(e.target.value)}
                            className="h-8 text-xs bg-background"
                            onKeyDown={e => e.stopPropagation()}
                          />
                        </div>
                        {students
                          .filter(s => s.classId === editIssueSelectedClassId)
                          .filter(s => s.name.toLowerCase().includes(editStudentSearch.toLowerCase()) || s.rollNumber.includes(editStudentSearch))
                          .map(student => (
                            <SelectItem key={student.id} value={student.id}>{student.name} ({student.rollNumber})</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Due Date</label>
                    <Input 
                      type="date" 
                      value={selectedIssue.dueDate.split('T')[0]} 
                      onChange={e => setSelectedIssue({...selectedIssue, dueDate: new Date(e.target.value).toISOString()})}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-sidebar-foreground">Status</label>
                    <Select value={selectedIssue.status} onValueChange={(val: 'issued' | 'returned') => setSelectedIssue({...selectedIssue, status: val})}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Status">
                          {selectedIssue.status === 'issued' ? 'Issued' : 'Returned'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="issued">Issued</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditIssueOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-white">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Issue Confirmation */}
        <Dialog open={isDeleteIssueOpen} onOpenChange={setIsDeleteIssueOpen}>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Issue Record</DialogTitle>
              <DialogDescription className="text-sidebar-foreground">
                Are you sure you want to delete the issue record for <span className="text-white font-semibold">{selectedIssue?.bookTitle}</span>?
                {selectedIssue?.status === 'issued' && " The book will be returned to stock."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteIssueOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteIssue}>Delete Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
