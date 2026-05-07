import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  theme?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  loginWithCredentials: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (user) {
      fetch(getApiUrl(`/api/users/${user.id}/theme`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newMode ? 'dark' : 'light' }),
      });
    }
  };

  const loginWithCredentials = async (username: string, password: string) => {
    const res = await fetch(getApiUrl('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }

    const profile = await res.json();
    setUser(profile);
    if (profile.theme === 'dark') setDarkMode(true);
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    setDarkMode(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile: user, loading, darkMode, toggleDarkMode, loginWithCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
