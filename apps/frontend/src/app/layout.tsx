// TODO: Root layout
// - Inject QueryClientProvider, AuthProvider
// - Fonts, metadata, viewport config

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Court Booking',
  description: 'Enterprise court booking platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        {/* TODO: <QueryClientProvider> */}
        {/* TODO: <AuthProvider> */}
        {children}
      </body>
    </html>
  );
}
