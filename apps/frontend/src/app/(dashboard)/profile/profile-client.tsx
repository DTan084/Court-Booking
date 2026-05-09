'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/auth';
import { useUpdateProfile } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, Camera, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const profileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (phải là 10 chữ số, bắt đầu bằng 0)')
    .or(z.literal(''))
    .nullable(),
  avatarUrl: z.string().url('URL ảnh không hợp lệ').or(z.literal('')).nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileClient() {
  const user = useAuthStore((state) => state.user);
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      avatarUrl: user?.avatarUrl || '',
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile(data, {
      onSuccess: () => {
        toast.success('Cập nhật thông tin thành công');
      },
      onError: (error: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toast.error((error as any).response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ');
      },
    });
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Profile Sidebar */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="relative group flex flex-col items-center p-8 rounded-3xl border bg-card/50 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 -z-10" />

            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={user.avatarUrl || ''} alt={user.name} />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 p-2 bg-primary rounded-full border-2 border-background text-primary-foreground shadow-lg cursor-pointer hover:scale-110 transition-transform">
                <Camera size={18} />
              </div>
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1 text-muted-foreground">
                <ShieldCheck size={16} className="text-primary" />
                <span className="text-sm font-medium uppercase tracking-wider">{user.role}</span>
              </div>
            </div>

            <div className="w-full mt-8 pt-8 border-t space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Mail size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">Email</span>
                  <span className="font-semibold">{user.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Phone size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">Số điện thoại</span>
                  <span className="font-semibold">{user.phone || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="flex-1 space-y-6">
          <div className="p-8 rounded-3xl border bg-card/30 backdrop-blur-xl shadow-xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Hồ sơ của tôi</h1>
              <p className="text-muted-foreground mt-2">
                Quản lý thông tin cá nhân và cài đặt tài khoản của bạn.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase tracking-wider">
                        Họ và tên
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            placeholder="Nhập họ và tên"
                            className="pl-10 h-12 rounded-xl border-muted-foreground/20 focus:ring-primary/20 bg-background/50"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold uppercase tracking-wider">
                          Số điện thoại
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              placeholder="0xxxxxxxxx"
                              className="pl-10 h-12 rounded-xl border-muted-foreground/20 focus:ring-primary/20 bg-background/50"
                              {...field}
                              value={field.value || ''}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Dùng để liên hệ khi có thay đổi lịch đặt sân.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-bold uppercase tracking-wider">
                        URL ảnh đại diện
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            placeholder="https://..."
                            className="pl-10 h-12 rounded-xl border-muted-foreground/20 focus:ring-primary/20 bg-background/50"
                            {...field}
                            value={field.value || ''}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Dán URL hình ảnh của bạn vào đây.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full md:w-auto h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isPending}
                  >
                    {isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
