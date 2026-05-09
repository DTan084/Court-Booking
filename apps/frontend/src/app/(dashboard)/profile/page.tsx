import { Metadata } from 'next';
import { ProfileClient } from './profile-client';

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân | Court Booking',
  description: 'Quản lý thông tin cá nhân của bạn trên Court Booking',
};

export default function ProfilePage() {
  return (
    <div className="container py-10">
      <ProfileClient />
    </div>
  );
}
