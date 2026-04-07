import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/lib/api";
import type { User } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await authApi.me();
      setUser(response.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const loginWithGoogle = async (credential: string) => {
    const response = await authApi.google(credential);
    setUser(response.user);
    toast({
      title: "Login realizado",
      description: `Bem-vindo de volta, ${response.user.name}.`,
    });
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    toast({
      title: "Sessão encerrada",
      description: "Você saiu da sua conta.",
    });
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      loginWithGoogle,
      logout,
      refreshUser,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
