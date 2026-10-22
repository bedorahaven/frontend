import { type NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

// Rename from 'middleware' to 'proxy'
export async function proxy(request: NextRequest) {
  // Refreshes auth tokens so server components read sessions instantly
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
