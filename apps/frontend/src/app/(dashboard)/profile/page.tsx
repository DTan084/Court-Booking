import { Metadata } from 'next';
import { ProfileClient } from './profile-client';
import { UserAccountShell } from '@/components/account/UserAccountShell';

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân | Court Booking',
  description: 'Quản lý thông tin cá nhân của bạn trên Court Booking',
};

export default function ProfilePage() {
  return (
    <UserAccountShell title="Personal" subtitle="Manage your personal information and account.">
      <ProfileClient />
    </UserAccountShell>
  );
}
