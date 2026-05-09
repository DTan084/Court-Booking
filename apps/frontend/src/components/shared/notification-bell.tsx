'use client';

import * as React from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function NotificationBell() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications(1, 10);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead();

  const [prevUnreadCount, setPrevUnreadCount] = React.useState(0);

  // REQ-24.8: Show toast when new notification arrives
  React.useEffect(() => {
    if (unreadCount > prevUnreadCount) {
      toast('Bạn có thông báo mới', {
        icon: <Bell className="h-4 w-4 text-primary" />,
      });
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount]);

  const handleNotificationClick = (id: string, bookingId: string | null) => {
    markAsRead(id);
    if (bookingId) {
      router.push(`/bookings?highlight=${bookingId}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-primary/10 transition-colors rounded-full"
        >
          <Bell
            className={cn(
              'h-5 w-5 transition-transform',
              unreadCount > 0 && 'animate-bounce-subtle',
            )}
          />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background animate-in zoom-in duration-300">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 rounded-2xl shadow-2xl border-primary/10 overflow-hidden"
      >
        <DropdownMenuLabel className="p-4 bg-muted/30 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Thông báo</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-primary hover:bg-transparent font-semibold"
                onClick={() => markAllAsRead()}
              >
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[400px] overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications?.data && notifications.data.length > 0 ? (
            notifications.data.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  'flex flex-col items-start gap-1 p-4 cursor-pointer transition-colors border-b last:border-0',
                  !notification.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50',
                )}
                onClick={() => handleNotificationClick(notification.id, notification.bookingId)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      !notification.isRead ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {notification.title}
                  </span>
                  {!notification.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1" />}
                </div>
                <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                  {notification.message}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                <Bell size={24} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Bạn không có thông báo nào
              </p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
