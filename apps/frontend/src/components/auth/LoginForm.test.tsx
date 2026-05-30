import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LoginForm } from './LoginForm';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setUser: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  callbackUrl: '/bookings' as string | null,
  oauthError: null as string | null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'callbackUrl') return mocks.callbackUrl;
      if (key === 'error') return mocks.oauthError;
      return null;
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuthStore: (selector: (state: { setUser: (...args: unknown[]) => void }) => unknown) =>
    selector({ setUser: mocks.setUser }),
}));

describe('LoginForm OAuth', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.setUser.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.callbackUrl = '/bookings';
    mocks.oauthError = null;
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  it('redirects browser to backend Google OAuth start URL', () => {
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(window.location.href).toBe(
      'http://localhost:3001/api/v1/auth/oauth/google?callbackUrl=%2Fbookings',
    );
  });

  it('shows mapped OAuth error from query string', async () => {
    mocks.oauthError = 'google_oauth_failed';

    render(<LoginForm />);

    await waitFor(() => {
      expect(screen.getByText(/google sign-in failed\. please try again\./i)).toBeInTheDocument();
    });
    expect(mocks.toastError).toHaveBeenCalled();
  });
});
