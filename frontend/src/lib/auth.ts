// Mock user data
const MOCK_USER_KEY = 'mockUser';

export interface MockUser {
  id: string;
  email: string;
  name?: string;
  isAdmin?: boolean; // Added isAdmin flag
  // Add any other user properties you might need
}

// --- Mock Admin Configuration ---
// For simplicity, we can designate a specific email or part of an email as admin
// or allow login function to set it.
const ADMIN_EMAIL_PATTERN = /admin@example\.com$/;


// Function to get the mock user from local storage
export const getMockUser = (): MockUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const userJson = localStorage.getItem(MOCK_USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

// Function to simulate user login
export const login = (email: string, name?: string, isAdminFlag?: boolean): MockUser => {
  const isDesignatedAdmin = ADMIN_EMAIL_PATTERN.test(email);
  const mockUser: MockUser = {
    id: 'mock-user-id-' + Date.now() + (isDesignatedAdmin || isAdminFlag ? '-admin' : ''),
    email,
    name: name || email.split('@')[0],
    isAdmin: isDesignatedAdmin || isAdminFlag || false,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
    // Dispatch a custom event to notify other parts of the app (e.g., AuthProvider)
    window.dispatchEvent(new CustomEvent('mockAuthChange', { detail: { user: mockUser } }));
  }
  return mockUser;
};

// Function to simulate user logout
export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MOCK_USER_KEY);
    // Dispatch a custom event
    window.dispatchEvent(new CustomEvent('mockAuthChange', { detail: { user: null } }));
  }
};

// Function to check if the user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getMockUser();
};

// Function to simulate onAuthStateChange
// The callback will be called with the user object or null
export const onAuthStateChange = (callback: (user: MockUser | null) => void): (() => void) => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ user: MockUser | null }>;
    callback(customEvent.detail.user);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('mockAuthChange', handler);
    // Immediately call with current state
    callback(getMockUser());
  }

  // Return an unsubscribe function
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mockAuthChange', handler);
    }
  };
};

// Example of how to get user data, similar to supabase.auth.getUser()
export const getUser = async (): Promise<{ data: { user: MockUser | null }, error: null }> => {
  // Simulate async behavior
  await new Promise(resolve => setTimeout(resolve, 50));
  const user = getMockUser();
  return { data: { user }, error: null };
};
