import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token?: string, customRedirect?: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const storedObj = localStorage.getItem('lms_current_user_obj');
      if (storedObj) {
        return JSON.parse(storedObj);
      }
    } catch {
      // Ignore parse error
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('lms_auth_token') || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = useCallback((user: User, authToken?: string, customRedirect?: string) => {
    const generatedToken = authToken || `jwt-token-${user.id}-${Date.now()}`;
    
    // 1. Synchronously update state
    setCurrentUser(user);
    setToken(generatedToken);

    // 2. Persist to storage
    localStorage.setItem('lms_current_user_obj', JSON.stringify(user));
    localStorage.setItem('lms_current_user_id', user.id);
    localStorage.setItem('lms_user_role', user.role);
    localStorage.setItem('lms_user_email', user.email);
    localStorage.setItem('lms_auth_token', generatedToken);

    // Clean any temporary registration/invite tokens from URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('inviteToken');

    // 3. Programmatic Instant Navigation to Dashboard Route
    let targetPath = customRedirect;
    if (!targetPath) {
      if (user.role === 'Owner') {
        targetPath = '/master-dashboard';
      } else if (user.role === 'Labor') {
        targetPath = '/worker/portal';
      } else {
        targetPath = '/admin/dashboard';
      }
    }

    window.history.pushState({ userId: user.id }, '', targetPath);

    // 4. Notify app listeners immediately
    window.dispatchEvent(new CustomEvent('lms_auth_change', {
      detail: { user, token: generatedToken, route: targetPath }
    }));
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);

    localStorage.removeItem('lms_current_user_obj');
    localStorage.removeItem('lms_current_user_id');
    localStorage.removeItem('lms_user_role');
    localStorage.removeItem('lms_user_email');
    localStorage.removeItem('lms_auth_token');
    localStorage.removeItem('labor_admin_current_user_id_v1');

    window.history.pushState({}, '', '/');
    window.dispatchEvent(new CustomEvent('lms_auth_change', {
      detail: { user: null, token: null, route: '/' }
    }));
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('lms_current_user_obj', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
