import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/lib/api";
import { clearStoredGoogleAccessToken, getStoredGoogleAccessToken, storeGoogleAccessToken } from "@/lib/google";
import type { User } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleAccessToken: string | null;
  loginWithGoogleAccessToken: (accessToken: string, scopes?: string) => Promise<void>;
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
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => getStoredGoogleAccessToken());

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

  const loginWithGoogleAccessToken = async (accessToken: string, scopes?: string) => {
    const response = await authApi.googleAccessToken(accessToken);
    setUser(response.user);
    setGoogleAccessToken(accessToken);
    storeGoogleAccessToken(accessToken, scopes);
    toast({
      title: "Login realizado",
      description: `Bem-vindo de volta, ${response.user.name}.`,
    });
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setGoogleAccessToken(null);
    clearStoredGoogleAccessToken();
    toast({
      title: "Sessao encerrada",
      description: "Voce saiu da sua conta.",
    });
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      googleAccessToken,
      loginWithGoogleAccessToken,
      logout,
      refreshUser,
    }),
    [user, loading, googleAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
