import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck,
  CalendarCheck, 
  CreditCard, 
  GraduationCap, 
  Library, 
  Banknote, 
  Settings, 
  LogOut, 
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth';
import { auth } from '@/src/lib/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'teacher', 'parent', 'student'] },
    { name: 'Classes', href: '/classes', icon: GraduationCap, roles: ['admin', 'teacher'] },
    { name: 'Students', href: '/students', icon: Users, roles: ['admin', 'teacher'] },
    { name: 'Teachers', href: '/teachers', icon: UserCheck, roles: ['admin'] },
    { name: 'Attendance', href: '/attendance', icon: CalendarCheck, roles: ['admin', 'teacher'] },
    { name: 'Fees', href: '/fees', icon: CreditCard, roles: ['admin', 'parent'] },
    { name: 'Exams', href: '/exams', icon: GraduationCap, roles: ['admin', 'teacher', 'student', 'parent'] },
    { name: 'Library', href: '/library', icon: Library, roles: ['admin', 'teacher', 'student'] },
    { name: 'Payroll', href: '/payroll', icon: Banknote, roles: ['admin'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'teacher', 'parent', 'student'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  const NavContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-8 mb-4">
        <h1 className="text-lg font-bold tracking-widest text-primary uppercase">EduFlow</h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Management System</p>
      </div>
      <nav className="flex-1 space-y-1">
        <div className="px-6 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Main Menu</p>
        </div>
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-6 py-3 text-[13px] font-medium transition-all relative",
                isActive 
                  ? "bg-sidebar-accent text-white border-r-3 border-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-[13px] text-sidebar-foreground hover:text-white hover:bg-sidebar-accent/50"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden print:h-auto print:overflow-visible">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[220px] lg:fixed lg:inset-y-0 print:hidden">
        <NavContent />
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 lg:pl-[220px] print:pl-0">
        {/* Header */}
        <header className="h-20 bg-background border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 print:hidden">
          <div className="flex items-center">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger render={
                <Button variant="ghost" size="icon" className="lg:hidden mr-2">
                  <Menu className="w-6 h-6" />
                </Button>
              } />
              <SheetContent side="left" className="p-0 w-64">
                <NavContent />
              </SheetContent>
            </Sheet>
            <div className="page-title">
              <h2 className="text-xl font-semibold text-white capitalize">
                {location.pathname === '/' ? 'Institutional Overview' : location.pathname.substring(1).replace('-', ' ')}
              </h2>
              <p className="text-xs text-sidebar-foreground">Welcome back, {profile?.displayName}. System status: Healthy.</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-[13px] text-sidebar-foreground hidden md:block">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" className="flex items-center space-x-3 bg-[#1A1D23] hover:bg-[#23262D] border border-border rounded-full px-4 py-6 h-auto">
                  <div className="text-right hidden sm:block">
                    <p className="text-[13px] font-medium text-white">{profile?.displayName}</p>
                  </div>
                  <Avatar className="h-7 w-7 border-none">
                    <AvatarImage src={profile?.photoURL} />
                    <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
                      {profile?.displayName?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              } />
              <DropdownMenuContent align="end" className="w-56 bg-card border-border text-foreground">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-sidebar-accent">Profile Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-rose-500 hover:bg-sidebar-accent">Logout</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
