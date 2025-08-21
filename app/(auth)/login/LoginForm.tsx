'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginWithOtp } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail } from 'lucide-react';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams?.get('next') ?? '/';
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleMagicLink(formData: FormData) {
    setIsLoading(true);
    setMessage(null);
    
    // Ensure server receives next parameter
    formData.set('next', next);
    
    try {
      const result = await loginWithOtp(formData);
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: 'Check your email for the magic link!' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Failed to send magic link. Please try again.' 
        });
      }
    } catch {
      setMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Welcome to Seneca</CardTitle>
        <CardDescription>
          Sign in or sign up to capture and cherish your family memories
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <form action={handleMagicLink} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="family@example.com"
              autoComplete="email"
              autoFocus
              required
              disabled={isLoading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending magic link...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Continue with Email
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <p>We&apos;ll email you a secure link to access your account.</p>
          <p className="mt-1">New user? Your account will be created automatically.</p>
        </div>
      </CardContent>
      
      <CardFooter className="text-center text-sm text-muted-foreground">
        <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
      </CardFooter>
    </Card>
  );
}