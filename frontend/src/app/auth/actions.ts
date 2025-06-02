'use server';

// import { createClient } from '@/lib/supabase/server'; // Supabase client removed
import { redirect } from 'next/navigation';
import * as LocalAuth from '@/lib/auth'; // Import local auth functions
import { revalidatePath } from 'next/cache'; // Added for revalidating paths

// Define the shape of the expected return value for actions
interface AuthActionResult {
  success?: boolean;
  message?: string;
  redirectTo?: string;
}

export async function signIn(prevState: any, formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const returnUrl = formData.get('returnUrl') as string | undefined;

  if (!email || !email.includes('@')) {
    return { message: 'Please enter a valid email address' };
  }

  if (!password || password.length < 6) { // Basic password check, adjust as needed for local auth
    return { message: 'Password must be at least 6 characters' };
  }

  // const supabase = await createClient(); // Supabase client removed

  // Simulate local login
  // For this mock, we'll assume any password for a known email is valid if you want to add check.
  console.log(`Attempting mock login for email: ${email}`);
  const user = LocalAuth.login(email); // name can be derived or passed if available

  if (user) {
    console.log('Mock login successful.');
    revalidatePath('/', 'layout'); // Revalidate paths
    return { success: true, redirectTo: returnUrl || '/dashboard' };
  } else {
    // This case might not be hit if LocalAuth.login always "succeeds" by creating a user
    console.log('Mock login failed.');
    return { message: 'Could not authenticate user (mock)' };
  }
}

export async function signUp(prevState: any, formData: FormData): Promise<AuthActionResult> {
  const origin = formData.get('origin') as string; // Still needed for emailRedirectTo if you keep that part
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const returnUrl = formData.get('returnUrl') as string | undefined;

  if (!email || !email.includes('@')) {
    return { message: 'Please enter a valid email address' };
  }

  if (!password || password.length < 6) {
    return { message: 'Password must be at least 6 characters' };
  }

  if (password !== confirmPassword) {
    return { message: 'Passwords do not match' };
  }

  // const supabase = await createClient(); // Supabase client removed

  // Simulate local sign up
  console.log(`Attempting mock signup for email: ${email}`);
  // In a real local setup, you might check if the user already exists.
  // For this mock, we'll just "create" and "log in" the user.
  const user = LocalAuth.login(email); // Effectively creates and logs in the user

  if (user) {
    console.log('Mock signup successful, user logged in.');
    revalidatePath('/', 'layout');
    return {
      success: true,
      message: 'Account created successfully and logged in (mock).',
      redirectTo: returnUrl || '/dashboard',
    };
  } else {
    // This case might not be hit with current LocalAuth.login
    return { message: 'Could not create account (mock)' };
  }
}

export async function forgotPassword(prevState: any, formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const origin = formData.get('origin') as string;

  if (!email || !email.includes('@')) {
    return { message: 'Please enter a valid email address' };
  }

  // const supabase = await createClient(); // Supabase client removed

  // Simulate forgot password
  console.log(`Mock forgot password for email: ${email}. Origin: ${origin}`);
  // In a real local setup, you might log this or have a way to "reset" mock user data.
  // For now, we just acknowledge the request.

  return {
    success: true,
    message: 'If this email is registered, a password reset link has been sent (mock).',
  };
}

export async function resetPassword(prevState: any, formData: FormData): Promise<AuthActionResult> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || password.length < 6) {
    return { message: 'Password must be at least 6 characters' };
  }

  if (password !== confirmPassword) {
    return { message: 'Passwords do not match' };
  }

  // const supabase = await createClient(); // Supabase client removed

  // Simulate password update
  console.log('Mock password update attempt.');
  // In a real local setup, you'd find the mock user and update their "password" if storing it.
  // For now, we just acknowledge. You might want to log out the user to force re-login.
  // LocalAuth.logout(); 
  // LocalAuth.login(email, newPassword); // if you store/update password

  return {
    success: true,
    message: 'Password updated successfully (mock). You may need to log in again.',
  };
}

export async function signOut(): Promise<AuthActionResult | void> { // Return type updated for consistency
  // const supabase = await createClient(); // Supabase client removed
  LocalAuth.logout();
  console.log('Mock user signed out.');

  revalidatePath('/', 'layout');
  // return redirect('/'); // redirect() should be called outside the try/catch or be the last statement
  // For actions, it's often better to return a redirectTo and let client handle it,
  // but since existing code uses redirect directly, we'll keep it for now.
  // However, for consistency with signIn/signUp, let's return redirectTo
  // return { success: true, redirectTo: '/' };
  // The original code for signOut used redirect() directly and didn't return.
  // To maintain that behavior while removing Supabase:
  redirect('/auth'); // Redirect to auth page after sign out
}
