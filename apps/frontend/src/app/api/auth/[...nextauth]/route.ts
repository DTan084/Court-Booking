// TODO: NextAuth route handler
// - Session management

import NextAuth from 'next-auth';

// TODO: Configure providers, callbacks, session strategy
const handler = NextAuth({
  // TODO: providers, callbacks, session
});

export { handler as GET, handler as POST };
