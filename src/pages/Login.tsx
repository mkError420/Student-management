import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user profile with default role 'student' (or based on email if needed)
        // For this demo, we'll make the first user an admin
        const isFirstUser = user.email === 'mk.rabbani.cse@gmail.com';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: isFirstUser ? 'admin' : 'student',
          createdAt: new Date().toISOString(),
        });
        toast.success(`Welcome ${user.displayName}! Your account has been created.`);
      } else {
        toast.success(`Welcome back, ${user.displayName}!`);
      }

      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('auth/configuration-not-found')) {
          toast.error('Google authentication is not configured. Please enable Google Auth in Firebase console.');
        } else if (error.message.includes('auth/popup-closed-by-user')) {
          toast.error('Login popup was closed. Please try again.');
        } else if (error.message.includes('auth/popup-blocked')) {
          toast.error('Popup was blocked. Please allow popups and try again.');
        } else if (error.message.includes('network')) {
          toast.error('Network error. Please check your internet connection.');
        } else {
          toast.error(`Login failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to login. Please try again.');
      }
    }
  };

  // Fallback login for testing - creates a mock user
  const handleTestLogin = async () => {
    try {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null
      };

      const userProfile = {
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        photoURL: mockUser.photoURL,
        role: 'admin' as const,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage for auth context
      localStorage.setItem('testUser', JSON.stringify(userProfile));

      // Try to save to Firestore (will work if Firebase is configured)
      try {
        await setDoc(doc(db, 'users', mockUser.uid), userProfile);
      } catch (firestoreError) {
        console.warn('Firestore not available, using localStorage only:', firestoreError);
      }

      toast.success(`Test login successful! Welcome ${mockUser.displayName}!`);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Test login error:', error);
      toast.error('Test login failed. Please check Firebase configuration.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">EduFlow</CardTitle>
          <CardDescription className="text-sidebar-foreground">
            Comprehensive School Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-sidebar-foreground">Secure Access</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full h-12 text-white font-medium border-border bg-sidebar-accent hover:bg-sidebar-accent/80 transition-all"
            onClick={handleGoogleLogin}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-5 h-5 mr-3"
            />
            Continue with Google
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12 text-white font-medium border-border bg-amber-600/20 hover:bg-amber-600/30 transition-all"
            onClick={handleTestLogin}
          >
            Test Login (Admin)
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center">
          <p className="text-xs text-sidebar-foreground px-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
