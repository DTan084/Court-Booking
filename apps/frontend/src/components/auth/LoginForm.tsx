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
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
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

      // Call login API - returns tokens wrapped in { success, data, meta }
      const loginResponse = await api.post('/auth/login', data);

      // Backend wraps response: { success, data: { access_token, ... }, meta }
      const responseData = loginResponse.data.data || loginResponse.data;
      if (!responseData) {
        console.error('Response structure:', loginResponse.data);
        throw new Error('Login response is empty');
      }

      // Fetch user data using httpOnly cookie
      const userResponse = await api.get('/auth/me');

      // Backend might also wrap /auth/me response
      const userData = userResponse.data.data || userResponse.data;

      // Save user to store
      setUser(userData);

      // Redirect to home
      toast.success('Đăng nhập thành công!');
      router.push('/');
    } catch (error: unknown) {
      console.error('Login error:', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setError('root', {
          message: 'Email hoặc mật khẩu không đúng',
        });
      } else {
        const errorMessage =
          (axios.isAxiosError(error) &&
            (error.response?.data as { error?: { message?: string } })?.error?.message) ||
          (error instanceof Error ? error.message : 'Đã xảy ra lỗi, vui lòng thử lại');
        setError('root', {
          message: errorMessage,
        });
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Đăng nhập</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {errors.root && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errors.root.message}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Mật khẩu
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            disabled={isLoading}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </div>
  );
}
