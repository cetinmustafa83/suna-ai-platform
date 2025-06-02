import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server'; // Kept for data fetching for now
// import { redirect } from 'next/navigation'; // redirect is part of the signOut action
import { signOut } from '@/app/auth/actions'; // Import the updated signOut action

export default async function UserAccountButton() {
  const supabaseClient = await createClient(); // Kept for data fetching
  // TODO: Replace this RPC call with local data fetching (e.g. RxDB or mock)
  // For now, if supabaseClient is null or errors due to no auth, this might fail.
  // Consider providing mock data for personalAccount if this breaks.
  let personalAccount = { name: 'User', email: 'user@example.com' };
  try {
    const { data } = await supabaseClient.rpc(
      'get_personal_account',
    );
    if (data) {
      personalAccount = data;
    } else {
      console.warn("Failed to fetch personal account, using mock data for UserAccountButton.");
    }
  } catch (error) {
    console.warn("Error fetching personal account, using mock data for UserAccountButton:", error);
  }
  // const signOut = async () => { // Original server action removed
  //   'use server';

  //   const supabase = await createClient();
  //   await supabase.auth.signOut();
  //   return redirect('/');
  // };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <UserIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {personalAccount.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {personalAccount.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard">My Account</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings/teams">Teams</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <form action={signOut}>
            <button>Log out</button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
