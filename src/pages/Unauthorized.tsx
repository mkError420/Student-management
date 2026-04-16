import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="p-4 bg-rose-500/10 rounded-full mb-6">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
      <p className="text-sidebar-foreground mb-8 max-w-md">
        You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
      </p>
      <Link to="/">
        <Button className="bg-primary hover:bg-primary/90 text-white">
          <Home className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
