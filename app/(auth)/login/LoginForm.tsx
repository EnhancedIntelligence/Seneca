'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithOtp, loginWithPassword, signup } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [authMethod, setAuthMethod] = useState<'magic-link' | 'password'>('magic-link');

  async function handleMagicLink(formData: FormData) {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await loginWithOtp(formData);
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Check your email for the magic link!' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Failed to send magic link. Is SMTP configured?' 
        });
        // Suggest password method if SMTP might not be configured
        if (result.error?.includes('SMTP') || result.error?.includes('email')) {
          setAuthMethod('password');
        }
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred. Try password login instead.' 
      });
      setAuthMethod('password');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordLogin(formData: FormData) {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await loginWithPassword(formData);
      
      if (!result.success) {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Invalid email or password' 
        });
      }
      // If successful, the server action will redirect
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred' 
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignup(formData: FormData) {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await signup(formData);
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Account created successfully!' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Failed to create account' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred' 
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
          Sign in to capture and cherish your family memories
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {message && (
          <Alert className={`mb-4 ${message.type === 'error' ? 'border-destructive' : 'border-green-500'}`}>
            <AlertDescription className={message.type === 'error' ? 'text-destructive' : 'text-green-600'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={authMethod === 'magic-link' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAuthMethod('magic-link')}
                  disabled={isLoading}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Magic Link
                </Button>
                <Button
                  type="button"
                  variant={authMethod === 'password' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAuthMethod('password')}
                  disabled={isLoading}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Password
                </Button>
              </div>
            </div>

            {authMethod === 'magic-link' ? (
              <form action={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="family@example.com"
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
                    'Send Magic Link'
                  )}
                </Button>
              </form>
            ) : (
              <form action={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="family@example.com"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            )}
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <form action={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  name="name"
                  type="text"
                  placeholder="Your Name"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="family@example.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="text-center text-sm text-muted-foreground">
        <p>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </CardFooter>
    </Card>
  );
}