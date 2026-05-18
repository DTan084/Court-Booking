'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
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
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

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
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
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
