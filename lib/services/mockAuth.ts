/**
 * Mock Authentication Service
 * Simulates authentication flow for development
 * TODO: Replace with actual Supabase auth calls
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

// Mock user database
const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'demo@seneca.com',
    name: 'Demo User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'parent@seneca.com',
    name: 'Parent User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=parent',
    createdAt: '2024-01-15T00:00:00Z',
  },
];

// Store session in memory (would use localStorage/cookies in real app)
let currentSession: AuthSession | null = null;

class MockAuthService {
  /**
   * Simulate login with email
   * TODO: Replace with actual Supabase signInWithOtp
   */
  async login(email: string): Promise<{ success: boolean; message: string; session?: AuthSession }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Find or create user
    let user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      // Auto-create new user for demo
      user = {
        id: `user-${Date.now()}`,
        email,
        name: email.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        createdAt: new Date().toISOString(),
      };
      mockUsers.push(user);
    }

    // Create session
    const session: AuthSession = {
      user,
      token: `mock-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    currentSession = session;
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('seneca-mock-session', JSON.stringify(session));
    }

    return {
      success: true,
      message: 'Login successful! Redirecting...',
      session,
    };
  }

  /**
   * Simulate logout
   * TODO: Replace with actual Supabase signOut
   */
  async logout(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    currentSession = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('seneca-mock-session');
    }
  }

  /**
   * Get current session
   * TODO: Replace with actual Supabase getSession
   */
  async getSession(): Promise<AuthSession | null> {
    // Check memory first
    if (currentSession) {
      // Check if expired
      if (new Date(currentSession.expiresAt) > new Date()) {
        return currentSession;
      }
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('seneca-mock-session');
      if (stored) {
        try {
          const session = JSON.parse(stored) as AuthSession;
          // Check if expired
          if (new Date(session.expiresAt) > new Date()) {
            currentSession = session;
            return session;
          } else {
            // Clean up expired session
            localStorage.removeItem('seneca-mock-session');
          }
        } catch (e) {
          console.error('Failed to parse session:', e);
        }
      }
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession();
    return session?.user || null;
  }

  /**
   * Simulate user registration
   * TODO: Replace with actual Supabase signUp
   */
  async register(email: string, name: string): Promise<{ success: boolean; message: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if user exists
    if (mockUsers.find(u => u.email === email)) {
      return {
        success: false,
        message: 'User already exists with this email',
      };
    }

    // Create new user
    const user: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      createdAt: new Date().toISOString(),
    };

    mockUsers.push(user);

    // Auto-login after registration
    await this.login(email);

    return {
      success: true,
      message: 'Registration successful! Logging you in...',
    };
  }

  /**
   * Update user profile
   * TODO: Replace with actual Supabase updateUser
   */
  async updateProfile(updates: Partial<User>): Promise<{ success: boolean; user?: User }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const session = await this.getSession();
    if (!session) {
      return { success: false };
    }

    // Find and update user
    const userIndex = mockUsers.findIndex(u => u.id === session.user.id);
    if (userIndex > -1) {
      mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates };
      
      // Update session
      session.user = mockUsers[userIndex];
      currentSession = session;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('seneca-mock-session', JSON.stringify(session));
      }

      return { success: true, user: mockUsers[userIndex] };
    }

    return { success: false };
  }
}

// Export singleton instance
export const authService = new MockAuthService();

// Export auth hook for React components
export function useAuth() {
  // In a real app, this would be a proper React hook with state management
  // For now, it's a simple wrapper
  return {
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    getSession: authService.getSession.bind(authService),
    isAuthenticated: authService.isAuthenticated.bind(authService),
    getCurrentUser: authService.getCurrentUser.bind(authService),
    register: authService.register.bind(authService),
    updateProfile: authService.updateProfile.bind(authService),
  };
}