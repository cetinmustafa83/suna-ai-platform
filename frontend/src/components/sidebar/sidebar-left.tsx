'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bot, Menu, Store } from 'lucide-react';

import { NavAgents } from '@/components/sidebar/nav-agents';
import { NavUserWithTeams } from '@/components/sidebar/nav-user-with-teams';
import { KortixLogo } from '@/components/sidebar/kortix-logo';
import { CTACard } from '@/components/sidebar/cta';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useEffect, useState } from 'react';
// import { createClient } from '@/lib/supabase/client'; // Supabase client removed
import * as LocalAuth from '@/lib/auth'; // Import local auth functions
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react'; // Icon for Admin

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { state, setOpen, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  // const [user, setUser] = useState<{ // User state now comes from LocalAuth directly in useEffect or via AuthProvider
  //   name: string;
  //   email: string;
  //   avatar: string;
  //   isAdmin?: boolean; 
  // }>({
  //   name: 'Loading...',
  //   email: 'loading@example.com',
  //   avatar: '',
  //   isAdmin: false,
  // });
  
  // Use a combined state for user data including admin status
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    avatar: string;
    isAdmin?: boolean;
  } | null>(null);


  const pathname = usePathname();

  // Fetch user data & admin status
  useEffect(() => {
    const fetchUserData = async () => {
      const authUser = LocalAuth.getMockUser(); // Get full MockUser object

      if (authUser) {
        setUserData({
          name: authUser.name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          avatar: '', // Mock avatar
          isAdmin: authUser.isAdmin || false,
        });
      } else {
        setUserData(null); // No user logged in
      }
    };

    fetchUserData();
    // Add an event listener for auth changes if users can log in/out while sidebar is mounted
    // This ensures isAdmin status is updated if a different user logs in.
    const handleAuthChange = () => fetchUserData();
    window.addEventListener('mockAuthChange', handleAuthChange);
    return () => window.removeEventListener('mockAuthChange', handleAuthChange);
  }, []);

  // Handle keyboard shortcuts (CMD+B) for consistency
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        // We'll handle this in the parent page component
        // to ensure proper coordination between panels
        setOpen(!state.startsWith('expanded'));

        // Broadcast a custom event to notify other components
        window.dispatchEvent(
          new CustomEvent('sidebar-left-toggled', {
            detail: { expanded: !state.startsWith('expanded') },
          }),
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, setOpen]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 bg-background/95 backdrop-blur-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      {...props}
    >
      <SidebarHeader className="px-2 py-2">
        <div className="flex h-[40px] items-center px-1 relative">
          <Link href="/dashboard">
            <KortixLogo />
          </Link>
          {state !== 'collapsed' && (
            <div className="ml-2 transition-all duration-200 ease-in-out whitespace-nowrap">
              {/* <span className="font-semibold"> SUNA</span> */}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {state !== 'collapsed' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="h-8 w-8" />
                </TooltipTrigger>
                <TooltipContent>Toggle sidebar (CMD+B)</TooltipContent>
              </Tooltip>
            )}
            {isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setOpenMobile(true)}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Open menu</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
      <SidebarGroup>
        <Link href="/agents">
          <SidebarMenuButton className={cn({
            'bg-primary/10 font-medium': pathname === '/agents',
          })}>
            <Bot className="h-4 w-4 mr-2" />
            <span className="flex items-center justify-between w-full">
              Agent Playground
              <Badge variant="new">
                New
              </Badge>
            </span>
          </SidebarMenuButton>
        </Link>
        
        <Link href="/marketplace">
          <SidebarMenuButton className={cn({
            'bg-primary/10 font-medium': pathname === '/marketplace',
          })}>
            <Store className="h-4 w-4 mr-2" />
            <span className="flex items-center justify-between w-full">
              Marketplace
              <Badge variant="new">
                New
              </Badge>
            </span>
          </SidebarMenuButton>
        </Link>
      </SidebarGroup>
        <NavAgents />
        
        {/* Admin Navigation Section - Visible only to admin users */}
        {userData?.isAdmin && (
          <SidebarGroup label="Admin Console" className="mt-4">
            <Link href="/admin/site-settings">
              <SidebarMenuButton className={cn({
                'bg-primary/10 font-medium': pathname === '/admin/site-settings',
              })}>
                <ShieldCheck className="h-4 w-4 mr-2 text-destructive" />
                Site Settings
              </SidebarMenuButton>
            </Link>
            <Link href="/admin/editable-content">
              <SidebarMenuButton className={cn({
                'bg-primary/10 font-medium': pathname === '/admin/editable-content',
              })}>
                <ShieldCheck className="h-4 w-4 mr-2 text-destructive" />
                Editable Content
              </SidebarMenuButton>
            </Link>
            <Link href="/admin/page-seo">
              <SidebarMenuButton className={cn({
                'bg-primary/10 font-medium': pathname === '/admin/page-seo',
              })}>
                <ShieldCheck className="h-4 w-4 mr-2 text-destructive" />
                Page SEO
              </SidebarMenuButton>
            </Link>
          </SidebarGroup>
        )}
      </SidebarContent>
      {state !== 'collapsed' && (
        <div className="px-3 py-2">
          <CTACard />
        </div>
      )}
      <SidebarFooter>
        {state === 'collapsed' && (
          <div className="mt-2 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="h-8 w-8" />
              </TooltipTrigger>
              <TooltipContent>Expand sidebar (CMD+B)</TooltipContent>
            </Tooltip>
          </div>
        )}
        <NavUserWithTeams user={userData || { name: 'Guest', email: '', avatar: ''}} /> 
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
