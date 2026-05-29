'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import axios from 'axios';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Please enter your password'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const oauthErrorMessage = useMemo(() => {
    const errorCode = searchParams.get('error');
    if (!errorCode) return null;
    if (errorCode === 'google_oauth_failed') return 'Google sign-in failed. Please try again.';
    return 'Unable to complete OAuth sign-in. Please try again.';
  }, [searchParams]);

  useEffect(() => {
    if (!oauthErrorMessage) return;
    setError('root', { message: oauthErrorMessage });
    toast.error(oauthErrorMessage);
  }, [oauthErrorMessage, setError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);

      const loginResponse = await api.post('/auth/login', data);
      const responseData = loginResponse.data.data || loginResponse.data;
      if (!responseData) throw new Error('Login response is empty');

      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data.data || userResponse.data;
      setUser(userData);

      toast.success('Signed in successfully');
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get('callbackUrl') || '/courts';
      router.push(callbackUrl);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setError('root', {
          message: 'Incorrect email or password',
        });
      } else {
        const errorMessage =
          (axios.isAxiosError(error) &&
            (error.response?.data as { error?: { message?: string } })?.error?.message) ||
          (error instanceof Error ? error.message : 'Something went wrong, please try again');
        setError('root', { message: errorMessage });
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsOAuthLoading(true);
    const callbackUrl = searchParams.get('callbackUrl') || '/courts';
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const oauthStartUrl = `${apiBaseUrl}/api/v1/auth/oauth/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    window.location.href = oauthStartUrl;
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#0b1c30]">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to your Tana account.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {errors.root && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-700">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="coach@tana.app"
            {...register('email')}
            disabled={isLoading}
            className="h-12 border-slate-300 bg-white focus-visible:ring-[#fd933d]"
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </label>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            disabled={isLoading}
            className="h-12 border-slate-300 bg-white focus-visible:ring-[#fd933d]"
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          className="h-12 w-full bg-[#944a00] text-white hover:bg-[#7f3f00]"
          disabled={isLoading || isOAuthLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
          disabled={isLoading || isOAuthLoading}
          onClick={handleGoogleSignIn}
        >
          {isOAuthLoading ? 'Redirecting to Google...' : 'Continue with Google'}
        </Button>

        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-[#944a00] hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
