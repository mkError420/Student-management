import React, { useState } from 'react';
import DashboardLayout from '@/src/components/layout/DashboardLayout';
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Save,
  Camera
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

export default function Settings() {
  const { profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Settings saved successfully');
    }, 1000);
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
            {profile?.role === 'admin' && <TabsTrigger value="system" className="data-[state=active]:bg-primary data-[state=active]:text-white">System</TabsTrigger>}
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
                    <Input id="name" defaultValue={profile?.displayName} className="bg-background border-border text-foreground" />
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
                    <Input id="phone" placeholder="+1 (555) 000-0000" className="bg-background border-border text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
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
                      <Label className="text-white">Email Notifications</Label>
                      <p className="text-xs text-sidebar-foreground">Receive updates via email about school activities.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Push Notifications</Label>
                      <p className="text-xs text-sidebar-foreground">Receive real-time alerts on your device.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Attendance Alerts</Label>
                      <p className="text-xs text-sidebar-foreground">Get notified when attendance is marked.</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card className="bg-card border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-white">System Management</CardTitle>
                <CardDescription className="text-sidebar-foreground">Configure global school settings and backups.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-between">
                    <div className="flex items-center">
                      <Database className="w-5 h-5 text-primary mr-3" />
                      <div>
                        <p className="text-sm font-medium text-white">Database Backup</p>
                        <p className="text-xs text-sidebar-foreground">Last backup: 2 hours ago</p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">Backup Now</Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sidebar-foreground">School Name</Label>
                    <Input defaultValue="EduFlow International School" className="bg-background border-border text-foreground" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sidebar-foreground">Academic Year</Label>
                    <Input defaultValue="2023-2024" className="bg-background border-border text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4 pt-4 border-t border-border">
          <Button variant="outline" className="border-border text-sidebar-foreground hover:bg-sidebar-accent">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
