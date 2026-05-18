import { Metadata } from 'next';
import { ProfileClient } from './profile-client';
import { UserAccountShell } from '@/components/account/UserAccountShell';

export const metadata: Metadata = {
  title: 'My Profile | Court Booking',
  description: 'Manage your personal information on Court Booking',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return (
    <UserAccountShell title="Personal" subtitle="Manage your personal information and account.">
      <ProfileClient />
    </UserAccountShell>
  );
}
