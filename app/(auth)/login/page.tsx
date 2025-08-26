import { Suspense } from 'react';
import { LoginForm } from './LoginForm';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="absolute inset-0 bg-grid-small-black/[0.02] pointer-events-none" />
      
      <div className="relative w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Seneca Protocol</h1>
          </div>
        </div>
        
        <Suspense fallback={
          <div className="w-full h-[400px] bg-card rounded-lg animate-pulse" />
        }>
          <LoginForm />
        </Suspense>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Capture moments. Preserve memories. Cherish forever.</p>
        </div>
      </div>
    </div>
  );
}