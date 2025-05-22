"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Mail, KeyRound, Loader2, UserPlus } from 'lucide-react';
import { useLocale } from '@/context/locale-context';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { t } = useLocale();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      // Wait for the auth state to be updated
      await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            unsubscribe();
            resolve(true);
          }
        });
      });
      // Fetch user profile to check admin status
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const isAdmin = userDocSnap.exists() && userDocSnap.data().isAdmin;
      toast({
        title: t('login.successTitle'),
        description: t('login.successDescription'),
      });
      if (isAdmin) {
        router.push('/admin');
      } else {
        router.push(redirectPath);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = t('login.errorDefault');
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = t('login.errorInvalidCredentials');
      }
      toast({
        variant: 'destructive',
        title: t('login.errorTitle'),
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // Check if user profile exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        // Create user profile
        await setDoc(userDocRef, {
          id: user.uid,
          displayName: user.displayName || 'Google User',
          email: user.email,
          joinedAt: new Date().toISOString(),
          contributions: 0,
          isAdmin: false,
          isBlocked: false,
          profilePhotoUrl: user.photoURL || '',
        });
      }
      // Wait for the auth state to be updated
      await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            unsubscribe();
            resolve(true);
          }
        });
      });
      // Fetch user profile to check admin status
      const adminDocSnap = await getDoc(userDocRef);
      const isAdmin = adminDocSnap.exists() && adminDocSnap.data().isAdmin;
      toast({
        title: t('login.successTitle'),
        description: t('login.successDescription'),
      });
      if (isAdmin) {
        router.push('/admin');
      } else {
        router.push(redirectPath);
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      toast({
        variant: 'destructive',
        title: t('login.errorTitle'),
        description: t('login.errorDefault'),
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-grow items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-background">
      <Card className="w-full max-w-md shadow-2xl border border-border">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full mb-3 w-fit">
             <LogIn size={32} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.emailLabel')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  {...form.register('email')}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.passwordLabel')}</Label>
               <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('login.passwordPlaceholder')}
                  {...form.register('password')}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-lg shadow-sm border border-border bg-white text-black hover:bg-gray-100 my-2"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2"><g><path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.3-5.7 7-11.3 7-6.6 0-12-5.4-12-12s5.4-12 12-12c2.7 0 5.2.9 7.2 2.4l6-6C34.5 5.5 29.5 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5c11 0 20.5-8 20.5-20.5 0-1.4-.2-2.7-.4-4z"/><path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.8 13 24 13c2.7 0 5.2.9 7.2 2.4l6-6C34.5 5.5 29.5 3.5 24 3.5c-7.2 0-13.4 4.1-16.7 10.2z"/><path fill="#FBBC05" d="M24 44.5c5.5 0 10.5-1.8 14.4-4.9l-6.7-5.5c-2 1.4-4.5 2.2-7.7 2.2-5.6 0-10.3-3.7-12-8.7l-6.6 5.1C7.5 39.9 15.1 44.5 24 44.5z"/><path fill="#EA4335" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.1 3-4.1 5.5-7.3 5.5-4.2 0-7.7-3.5-7.7-7.7 0-1.2.3-2.3.8-3.3l-6.6-5.1C7.5 19.1 7 21.5 7 24c0 2.5.5 4.9 1.3 7.1l6.6-5.1c1.7 5 6.4 8.7 12 8.7 3.2 0 5.7-.8 7.7-2.2l6.7 5.5C34.5 42.7 29.5 44.5 24 44.5z"/></g></svg>
              )}
              Login with Google
            </Button>
            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-border" />
              <span className="mx-2 text-muted-foreground text-xs">or</span>
              <div className="flex-grow border-t border-border" />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('login.loadingButton')}
                </>
              ) : (
                t('login.submitButton')
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-sm">
           <Link href="/forgot-password" passHref className="text-primary hover:underline">
              {t('login.forgotPasswordLink')}
            </Link>
          <p className="text-muted-foreground">
            {t('login.noAccountPrompt')}{' '}
            <Link href="/signup" passHref className="text-primary hover:underline">
              <UserPlus className="inline-block mr-1 h-4 w-4" />
              {t('login.signUpLink')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}