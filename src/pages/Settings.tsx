import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Save,
  Camera,
  Download,
  Upload,
  Key,
  Eye,
  EyeOff,
  School,
  Globe,
  Calendar,
  Users as UsersIcon,
  FileText,
  Trash2,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Lock,
  Mail,
  Smartphone,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/src/lib/auth';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { doc, updateDoc, getDoc, setDoc, collection, getDocs, query as firestoreQuery } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';

export default function Settings() {
  const { profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [settings, setSettings] = useState({
    profile: { 
      displayName: profile?.displayName || '',
      phone: '',
      bio: '',
      address: '',
      emergencyContact: '',
      dateOfBirth: ''
    },
    notifications: {
      email: true,
      push: true,
      attendance: true,
      fees: true,
      exams: true,
      announcements: true,
      homework: false,
      library: false
    },
    security: {
      twoFactorEnabled: false,
      loginAlerts: true,
      sessionTimeout: '30',
      passwordExpiry: '90'
    },
    school: {
      name: 'EduFlow International School',
      academicYear: '2023-2024',
      timezone: 'UTC+6',
      currency: 'BDT',
      language: 'English',
      address: '',
      phone: '',
      email: ''
    }
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUserSettings();
  }, [profile]);

  const loadUserSettings = async () => {
    if (!profile?.uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', profile.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSettings(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            ...userData.profile
          },
          notifications: {
            ...prev.notifications,
            ...userData.notifications
          },
          security: {
            ...prev.security,
            ...userData.security
          }
        }));
      }

      if (profile?.role === 'admin') {
        const schoolDoc = await getDoc(doc(db, 'settings', 'school'));
        if (schoolDoc.exists()) {
          const schoolData = schoolDoc.data();
          setSettings(prev => ({
            ...prev,
            school: {
              ...prev.school,
              ...schoolData
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async (section: string) => {
    setIsSaving(true);
    try {
      if (section === 'profile' && profile?.uid) {
        await updateProfile(auth.currentUser!, {
          displayName: settings.profile.displayName
        });
        
        await updateDoc(doc(db, 'users', profile.uid), {
          profile: settings.profile,
          updatedAt: new Date().toISOString()
        });
      }

      if (section === 'notifications' && profile?.uid) {
        await updateDoc(doc(db, 'users', profile.uid), {
          notifications: settings.notifications,
          updatedAt: new Date().toISOString()
        });
      }

      if (section === 'security' && profile?.uid) {
        await updateDoc(doc(db, 'users', profile.uid), {
          security: settings.security,
          updatedAt: new Date().toISOString()
        });
      }

      if (section === 'school' && profile?.role === 'admin') {
        await setDoc(doc(db, 'settings', 'school'), {
          ...settings.school,
          updatedAt: new Date().toISOString(),
          updatedBy: profile.uid
        });
      }

      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully`);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      const credential = EmailAuthProvider.credential(
        user.email,
        passwordForm.currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);
      
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to update password');
      }
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);
    
    try {
      const collections = ['students', 'classes', 'attendance', 'fees', 'exams', 'library'];
      const backupData: any = {};
      
      for (let i = 0; i < collections.length; i++) {
        const collectionName = collections[i];
        const q = firestoreQuery(collection(db, collectionName));
        const querySnapshot = await getDocs(q);
        backupData[collectionName] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBackupProgress(((i + 1) / collections.length) * 100);
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `school-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup completed successfully');
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const handleExportData = async (type: string) => {
    setIsLoading(true);
    try {
      const collections = type === 'all' ? ['students', 'classes', 'attendance', 'fees'] : [type];
      const exportData: any = {};
      
      for (const collectionName of collections) {
        const q = firestoreQuery(collection(db, collectionName));
        const querySnapshot = await getDocs(q);
        exportData[collectionName] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${type} data exported successfully`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sidebar-foreground">Manage your account and application preferences.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-sidebar-accent/50 p-1 rounded-lg mb-6 border border-border">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-white">Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-white">Notifications</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-white">Security</TabsTrigger>
            {profile?.role === 'admin' && <TabsTrigger value="school" className="data-[state=active]:bg-primary data-[state=active]:text-white">School</TabsTrigger>}
            {profile?.role === 'admin' && <TabsTrigger value="data" className="data-[state=active]:bg-primary data-[state=active]:text-white">Data</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-card border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-white">Personal Information</CardTitle>
                <CardDescription className="text-sidebar-foreground">Update your personal details and how others see you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-2 border-border">
                      <AvatarImage src={profile?.photoURL} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {profile?.displayName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full h-8 w-8 border-2 border-card bg-sidebar-accent hover:bg-sidebar-accent/80 text-white">
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-white">Profile Photo</h3>
                    <p className="text-xs text-sidebar-foreground">JPG, GIF or PNG. Max size of 800K</p>
                    <div className="flex space-x-2 mt-2">
                      <Button variant="outline" size="sm" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">Upload</Button>
                      <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-500/10">Remove</Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sidebar-foreground">Full Name</Label>
                    <Input 
                      id="name" 
                      value={settings.profile.displayName}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, displayName: e.target.value }
                      }))}
                      className="bg-background border-border text-foreground" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sidebar-foreground">Email Address</Label>
                    <Input id="email" defaultValue={profile?.email} disabled className="bg-sidebar-accent/30 border-border text-sidebar-foreground opacity-70" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sidebar-foreground">Role</Label>
                    <Input id="role" defaultValue={profile?.role} disabled className="capitalize bg-sidebar-accent/30 border-border text-sidebar-foreground opacity-70" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sidebar-foreground">Phone Number</Label>
                    <Input 
                      id="phone" 
                      value={settings.profile.phone}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, phone: e.target.value }
                      }))}
                      placeholder="+1 (555) 000-0000" 
                      className="bg-background border-border text-foreground" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="text-sidebar-foreground">Date of Birth</Label>
                    <Input 
                      id="dob" 
                      type="date"
                      value={settings.profile.dateOfBirth}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, dateOfBirth: e.target.value }
                      }))}
                      className="bg-background border-border text-foreground" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency" className="text-sidebar-foreground">Emergency Contact</Label>
                    <Input 
                      id="emergency" 
                      value={settings.profile.emergencyContact}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, emergencyContact: e.target.value }
                      }))}
                      placeholder="Emergency contact number" 
                      className="bg-background border-border text-foreground" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sidebar-foreground">Bio</Label>
                  <Textarea 
                    id="bio"
                    value={settings.profile.bio}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, bio: e.target.value }
                    }))}
                    placeholder="Tell us about yourself..."
                    className="bg-background border-border text-foreground"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sidebar-foreground">Address</Label>
                  <Textarea 
                    id="address"
                    value={settings.profile.address}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, address: e.target.value }
                    }))}
                    placeholder="Your address..."
                    className="bg-background border-border text-foreground"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => handleSave('profile')} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-card border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-white">Notification Preferences</CardTitle>
                <CardDescription className="text-sidebar-foreground">Choose what notifications you want to receive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white flex items-center"><Mail className="w-4 h-4 mr-2" />Email Notifications</Label>
                      <p className="text-xs text-sidebar-foreground">Receive updates via email about school activities.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.email}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, email: checked }
                      }))}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white flex items-center"><Smartphone className="w-4 h-4 mr-2" />Push Notifications</Label>
                      <p className="text-xs text-sidebar-foreground">Receive real-time alerts on your device.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.push}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, push: checked }
                      }))}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                  <Separator className="bg-border" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Attendance Alerts</Label>
                      <p className="text-xs text-sidebar-foreground">Get notified when attendance is marked.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.attendance}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, attendance: checked }
                      }))}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Fee Payment Reminders</Label>
                      <p className="text-xs text-sidebar-foreground">Notifications about upcoming fee payments.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.fees}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, fees: checked }
                      }))}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Exam Notifications</Label>
                      <p className="text-xs text-sidebar-foreground">Updates about exam schedules and results.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.exams}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, exams: checked }
                      }))}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">School Announcements</Label>
                      <p className="text-xs text-sidebar-foreground">Important announcements from school administration.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.announcements}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, announcements: checked }
                      }))}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Homework Updates</Label>
                      <p className="text-xs text-sidebar-foreground">Notifications about homework assignments.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.homework}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, homework: checked }
                      }))}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Library Alerts</Label>
                      <p className="text-xs text-sidebar-foreground">Book due dates and library notifications.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.library}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, library: checked }
                      }))}
                      className="data-[state=checked]:bg-primary" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => handleSave('notifications')} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Notifications'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="bg-card border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-white">Password & Security</CardTitle>
                <CardDescription className="text-sidebar-foreground">Manage your password and security preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-white">Change Password</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password" className="text-sidebar-foreground">Current Password</Label>
                      <div className="relative">
                        <Input 
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({
                            ...prev,
                            currentPassword: e.target.value
                          }))}
                          className="bg-background border-border text-foreground pr-10"
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4 text-sidebar-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-sidebar-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-sidebar-foreground">New Password</Label>
                      <div className="relative">
                        <Input 
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({
                            ...prev,
                            newPassword: e.target.value
                          }))}
                          className="bg-background border-border text-foreground pr-10"
                          placeholder="Enter new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-sidebar-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-sidebar-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-sidebar-foreground">Confirm New Password</Label>
                      <div className="relative">
                        <Input 
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({
                            ...prev,
                            confirmPassword: e.target.value
                          }))}
                          className="bg-background border-border text-foreground pr-10"
                          placeholder="Confirm new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-sidebar-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-sidebar-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button onClick={handlePasswordChange} className="bg-primary hover:bg-primary/90 text-white">
                      <Lock className="w-4 h-4 mr-2" />
                      Update Password
                    </Button>
                  </div>
                </div>
                
                <Separator className="bg-border" />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-white">Security Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-white">Two-Factor Authentication</Label>
                        <p className="text-xs text-sidebar-foreground">Add an extra layer of security to your account.</p>
                      </div>
                      <Switch 
                        checked={settings.security.twoFactorEnabled}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, twoFactorEnabled: checked }
                        }))}
                        className="data-[state=checked]:bg-primary" 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-white">Login Alerts</Label>
                        <p className="text-xs text-sidebar-foreground">Get notified when someone logs into your account.</p>
                      </div>
                      <Switch 
                        checked={settings.security.loginAlerts}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, loginAlerts: checked }
                        }))}
                        className="data-[state=checked]:bg-primary" 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sidebar-foreground">Session Timeout (minutes)</Label>
                        <Select 
                          value={settings.security.sessionTimeout}
                          onValueChange={(value) => setSettings(prev => ({
                            ...prev,
                            security: { ...prev.security, sessionTimeout: value }
                          }))}
                        >
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sidebar-foreground">Password Expiry (days)</Label>
                        <Select 
                          value={settings.security.passwordExpiry}
                          onValueChange={(value) => setSettings(prev => ({
                            ...prev,
                            security: { ...prev.security, passwordExpiry: value }
                          }))}
                        >
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="60">60 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                            <SelectItem value="180">180 days</SelectItem>
                            <SelectItem value="365">1 year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => handleSave('security')} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Security Settings'}
              </Button>
            </div>
          </TabsContent>
          {profile?.role === 'admin' && (
            <TabsContent value="school" className="space-y-6">
              <Card className="bg-card border-border shadow-none">
                <CardHeader>
                  <CardTitle className="text-white">School Information</CardTitle>
                  <CardDescription className="text-sidebar-foreground">Manage school details and configuration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sidebar-foreground">School Name</Label>
                      <Input 
                        value={settings.school.name}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          school: { ...prev.school, name: e.target.value }
                        }))}
                        className="bg-background border-border text-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sidebar-foreground">Academic Year</Label>
                      <Input 
                        value={settings.school.academicYear}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          school: { ...prev.school, academicYear: e.target.value }
                        }))}
                        className="bg-background border-border text-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sidebar-foreground">Timezone</Label>
                      <Select 
                        value={settings.school.timezone}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          school: { ...prev.school, timezone: value }
                        }))}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="UTC+6">UTC+6 (Bangladesh)</SelectItem>
                          <SelectItem value="UTC+5:30">UTC+5:30 (India)</SelectItem>
                          <SelectItem value="UTC+0">UTC+0 (London)</SelectItem>
                          <SelectItem value="UTC-5">UTC-5 (New York)</SelectItem>
                          <SelectItem value="UTC-8">UTC-8 (Los Angeles)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sidebar-foreground">Currency</Label>
                      <Select 
                        value={settings.school.currency}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          school: { ...prev.school, currency: value }
                        }))}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="BDT">BDT (৳)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sidebar-foreground">Language</Label>
                      <Select 
                        value={settings.school.language}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          school: { ...prev.school, language: value }
                        }))}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Bengali">বাংলা</SelectItem>
                          <SelectItem value="Spanish">Español</SelectItem>
                          <SelectItem value="French">Français</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sidebar-foreground">School Email</Label>
                      <Input 
                        type="email"
                        value={settings.school.email}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          school: { ...prev.school, email: e.target.value }
                        }))}
                        className="bg-background border-border text-foreground" 
                        placeholder="school@domain.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sidebar-foreground">School Address</Label>
                    <Textarea 
                      value={settings.school.address}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        school: { ...prev.school, address: e.target.value }
                      }))}
                      className="bg-background border-border text-foreground"
                      placeholder="Full school address..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sidebar-foreground">School Phone</Label>
                    <Input 
                      value={settings.school.phone}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        school: { ...prev.school, phone: e.target.value }
                      }))}
                      className="bg-background border-border text-foreground" 
                      placeholder="+880 1234-567890"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('school')} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save School Settings'}
                </Button>
              </div>
            </TabsContent>
          )}

          {profile?.role === 'admin' && (
            <TabsContent value="data" className="space-y-6">
              <Card className="bg-card border-border shadow-none">
                <CardHeader>
                  <CardTitle className="text-white">Data Management</CardTitle>
                  <CardDescription className="text-sidebar-foreground">Backup, export, and manage school data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-white">Database Backup</h4>
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Database className="w-5 h-5 text-primary mr-3" />
                          <div>
                            <p className="text-sm font-medium text-white">Complete System Backup</p>
                            <p className="text-xs text-sidebar-foreground">Last backup: 2 hours ago</p>
                          </div>
                        </div>
                        <Button 
                          onClick={handleBackup}
                          disabled={isBackingUp}
                          size="sm" 
                          className="bg-primary hover:bg-primary/90 text-white"
                        >
                          {isBackingUp ? (
                            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Backing Up...</>
                          ) : (
                            <><Download className="w-4 h-4 mr-2" />Backup Now</>
                          )}
                        </Button>
                      </div>
                      {isBackingUp && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-sidebar-foreground">
                            <span>Backup Progress</span>
                            <span>{backupProgress.toFixed(0)}%</span>
                          </div>
                          <Progress value={backupProgress} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-white">Export Data</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        onClick={() => handleExportData('students')}
                        disabled={isLoading}
                        variant="outline" 
                        className="border-border text-sidebar-foreground hover:bg-sidebar-accent justify-start"
                      >
                        <UsersIcon className="w-4 h-4 mr-2" />
                        Export Students
                      </Button>
                      <Button 
                        onClick={() => handleExportData('classes')}
                        disabled={isLoading}
                        variant="outline" 
                        className="border-border text-sidebar-foreground hover:bg-sidebar-accent justify-start"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Export Classes
                      </Button>
                      <Button 
                        onClick={() => handleExportData('attendance')}
                        disabled={isLoading}
                        variant="outline" 
                        className="border-border text-sidebar-foreground hover:bg-sidebar-accent justify-start"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Export Attendance
                      </Button>
                      <Button 
                        onClick={() => handleExportData('fees')}
                        disabled={isLoading}
                        variant="outline" 
                        className="border-border text-sidebar-foreground hover:bg-sidebar-accent justify-start"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Export Fees
                      </Button>
                    </div>
                    <Button 
                      onClick={() => handleExportData('all')}
                      disabled={isLoading}
                      className="bg-primary hover:bg-primary/90 text-white w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export All Data
                    </Button>
                  </div>

                  <Separator className="bg-border" />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-white text-amber-500">Danger Zone</h4>
                    <div className="p-4 bg-rose-500/10 rounded-lg border border-rose-500/20">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">Clear All Data</p>
                            <p className="text-xs text-sidebar-foreground">Permanently delete all school data. This action cannot be undone.</p>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear Data
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border">
                              <DialogHeader>
                                <DialogTitle className="text-white">Confirm Data Deletion</DialogTitle>
                                <DialogDescription className="text-sidebar-foreground">
                                  This will permanently delete all school data including students, classes, attendance, fees, and exams. This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">
                                  Cancel
                                </Button>
                                <Button variant="destructive" className="bg-rose-500 hover:bg-rose-600">
                                  Delete All Data
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}





