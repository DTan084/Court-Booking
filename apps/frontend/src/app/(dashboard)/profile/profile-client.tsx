'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/auth';
import { useUpdateProfile, useUploadAvatar } from '@/hooks/useUser';
import { useMyBookingStats } from '@/hooks/useBookings';
import { useRuntimeSettings } from '@/hooks/useRuntimeSettings';
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
import { User, Camera, Mail, Phone, ShieldCheck, CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const profileSchema = z.object({
  name: z.string().min(2, 'Ten phai co it nhat 2 ky tu'),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'So dien thoai khong hop le (phai la 10 chu so, bat dau bang 0)')
    .or(z.literal(''))
    .nullable(),
  avatarUrl: z.string().url('URL anh khong hop le').or(z.literal('')).nullable(),
  dob: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileClient() {
  const user = useAuthStore((state) => state.user);
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { mutate: uploadAvatar, isPending: isUploadingAvatar } = useUploadAvatar();
  const avatarFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string>('');
  const { data: myBookingStats } = useMyBookingStats();

  const { data: settings } = useRuntimeSettings();
  const cooldownDays = settings?.profileUpdateCooldownDays ?? 30;

  const updatedAt = user?.updatedAt ? new Date(user.updatedAt) : null;
  const nextProfileUpdateAt = updatedAt
    ? new Date(updatedAt.getTime() + cooldownDays * 24 * 60 * 60 * 1000)
    : null;
  const isProfileLocked =
    !!nextProfileUpdateAt &&
    Number.isFinite(nextProfileUpdateAt.getTime()) &&
    Date.now() < nextProfileUpdateAt.getTime();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      avatarUrl: user?.avatarUrl || '',
      dob: user?.dob || '',
    },
  });

  React.useEffect(() => {
    if (!user) return;
    setAvatarPreviewUrl(user.avatarUrl || '');
    form.reset({
      name: user.name || '',
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || '',
      dob: user.dob || '',
    });
  }, [user, form]);

  const onSubmit = (data: ProfileFormValues) => {
    const normalizedPhone = data.phone && data.phone.trim().length > 0 ? data.phone : null;
    const normalizedAvatarUrl =
      data.avatarUrl && data.avatarUrl.trim().length > 0 ? data.avatarUrl : null;
    const normalizedDob = data.dob && data.dob.trim().length > 0 ? data.dob : null;

    updateProfile(
      {
        name: data.name,
        phone: normalizedPhone,
        avatarUrl: normalizedAvatarUrl,
        dob: normalizedDob,
      },
      {
        onSuccess: () => {
          toast.success('Cap nhat thong tin thanh cong');
        },
        onError: (error: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toast.error((error as any).response?.data?.message || 'Co loi xay ra khi cap nhat ho so');
        },
      },
    );
  };

  if (!user) return null;

  const totalBookings = myBookingStats?.totalBookings ?? 0;
  const upcomingBookings = myBookingStats?.upcomingBookings ?? 0;
  const totalSpent = myBookingStats?.totalSpend ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-orange-500/30">
                  <AvatarImage src={avatarPreviewUrl || user.avatarUrl || ''} alt={user.name} />
                  <AvatarFallback className="bg-orange-500/10 text-xl font-bold text-orange-700">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 rounded-full border bg-background p-1.5 text-muted-foreground">
                  <button
                    type="button"
                    className="inline-flex"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUploadingAvatar || isProfileLocked}
                  >
                    <Camera size={14} />
                  </button>
                </div>
              </div>
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const localPreview = URL.createObjectURL(file);
                  setAvatarPreviewUrl(localPreview);
                  uploadAvatar(file, {
                    onSuccess: (uploadedUrl) => {
                      setAvatarPreviewUrl(uploadedUrl || localPreview);
                      form.setValue('avatarUrl', uploadedUrl || '');
                      toast.success('Upload avatar thanh cong, bam Luu thay doi de cap nhat DB');
                    },
                    onError: () => {
                      setAvatarPreviewUrl(user.avatarUrl || '');
                      toast.error('Upload avatar that bai');
                    },
                  });
                  e.currentTarget.value = '';
                }}
              />

              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-foreground">{user.name}</h2>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                  <ShieldCheck size={12} />
                  {user.role}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t pt-5">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="truncate font-medium text-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">So dien thoai</p>
                  <p className="font-medium text-foreground">{user.phone || 'Chua cap nhat'}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Activity
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total bookings</span>
                  <span className="font-semibold text-foreground">{totalBookings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Upcoming</span>
                  <span className="font-semibold text-foreground">{upcomingBookings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total spend</span>
                  <span className="font-semibold text-foreground">
                    {new Intl.NumberFormat('vi-VN').format(totalSpent)} VND
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8">
          <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Personal Information</h3>
                <p className="mt-1 text-sm text-muted-foreground">Cap nhat ho so cua ban</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {isProfileLocked && nextProfileUpdateAt ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Ban da cap nhat gan day. Co the cap nhat lai sau:{' '}
                    {nextProfileUpdateAt.toLocaleString('vi-VN')}
                  </div>
                ) : null}
                <fieldset
                  disabled={isProfileLocked || isPending || isUploadingAvatar}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Ho va ten</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Nhap ho va ten"
                                className="h-11 pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <Input value={user.email} disabled className="h-11 bg-muted/30" />
                      </FormControl>
                      <FormDescription>Email khong the thay doi.</FormDescription>
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">So dien thoai</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="0xxxxxxxxx"
                                className="h-11 pl-10"
                                {...field}
                                value={field.value || ''}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Ngay sinh (DOB)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input type="date" className="h-11 pl-10" {...field} />
                            </div>
                          </FormControl>
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
                        <FormLabel className="text-sm font-medium">URL anh dai dien</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Camera className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="https://..."
                              className="h-11 pl-10"
                              {...field}
                              value={field.value || ''}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="h-11 px-6"
                      disabled={isPending || isProfileLocked}
                    >
                      {isPending ? 'Dang cap nhat...' : 'Luu thay doi'}
                    </Button>
                  </div>
                </fieldset>
              </form>
            </Form>
          </div>
        </section>
      </div>
    </div>
  );
}
