import { createSignedOAuthState, resolveOAuthStatePath } from './oauth-state.util';

describe('oauth-state util', () => {
  const secret = 'oauth-state-test-secret';

  it('resolves signed state path', () => {
    const state = createSignedOAuthState('/bookings', secret);
    expect(resolveOAuthStatePath(state, secret)).toBe('/bookings');
  });

  it('falls back on tampered signature', () => {
    const state = createSignedOAuthState('/bookings', secret);
    const [payload] = state.split('.');
    expect(resolveOAuthStatePath(`${payload}.tampered`, secret)).toBe('/courts');
  });

  it('falls back on unsigned path state', () => {
    expect(resolveOAuthStatePath('/admin', secret)).toBe('/courts');
  });
});
