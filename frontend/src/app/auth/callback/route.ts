// import { createClient } from '@/lib/supabase/server'; // Supabase client removed
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // This route was for Supabase's server-side auth flow (exchanging code for session).
  // With local mock authentication, this specific code exchange is not needed.
  // We'll keep it as a simple redirector for now, as some flows (like a simulated email verification) might still land here.

  const requestUrl = new URL(request.url);
  const returnUrl = requestUrl.searchParams.get('returnUrl');
  const origin = requestUrl.origin;

  console.log('Auth callback hit (mock implementation). Returning to:', returnUrl);

  // URL to redirect to.
  // Handle the case where returnUrl is 'null' (string) or actual null
  const redirectPath =
    returnUrl && returnUrl !== 'null' ? returnUrl : '/dashboard';
  
  // Ensure the redirect path is absolute.
  let absoluteRedirectUrl = redirectPath;
  if (!redirectPath.startsWith('http')) {
    absoluteRedirectUrl = `${origin}${redirectPath.startsWith('/') ? '' : '/'}${redirectPath}`;
  }
  
  return NextResponse.redirect(absoluteRedirectUrl);
}
