import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/lib/api";
import {
  clearStoredGoogleAccessToken,
  getStoredGoogleAccessToken,
  requestGoogleCalendarAccessToken,
  requestGoogleEmailAccessToken,
  requestGoogleLoginAccessToken,
  storeGoogleAccessToken,
} from "@/lib/google";
import type { User } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleAccessToken: string | null;
  loginWithGoogleAccessToken: (accessToken: string, scopes?: string) => Promise<void>;
  loginWithGoogle: (forceConsent?: boolean) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (payload: { firstName: string; lastName: string; birthDate: string; email: string; password: string; confirmPassword: string }) => Promise<void>;
  updateProfile: (payload: { firstName: string; lastName: string; birthDate?: string | null; phone?: string | null; photoUrl?: string | null }) => Promise<void>;
  connectGoogleCalendar: (forceConsent?: boolean) => Promise<string>;
  connectGoogleEmail: (forceConsent?: boolean) => Promise<string>;
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

  const loginWithGoogleAccessToken = useCallback(async (accessToken: string, scopes?: string) => {
    const response = await authApi.googleAccessToken(accessToken);
    setUser(response.user);
    setGoogleAccessToken(accessToken);
    storeGoogleAccessToken(accessToken, scopes);
    toast({
      title: "Login realizado",
      description: `Bem-vindo de volta, ${response.user.name}.`,
    });
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const response = await authApi.password({ action: "login", email, password });
    setUser(response.user);
    toast({
      title: "Login realizado",
      description: `Bem-vindo de volta, ${response.user.firstName || response.user.name}.`,
    });
  }, []);

  const registerWithPassword = useCallback(async (payload: { firstName: string; lastName: string; birthDate: string; email: string; password: string; confirmPassword: string }) => {
    const response = await authApi.password({ action: "register", ...payload });
    setUser(response.user);
    toast({
      title: "Conta criada",
      description: `Bem-vindo, ${response.user.firstName || response.user.name}.`,
    });
  }, []);

  const updateProfile = useCallback(async (payload: { firstName: string; lastName: string; birthDate?: string | null; phone?: string | null; photoUrl?: string | null }) => {
    const response = await authApi.updateProfile(payload);
    setUser(response.user);
    toast({
      title: "Perfil atualizado",
      description: "Seus dados foram salvos.",
    });
  }, []);

  const loginWithGoogle = useCallback(async (forceConsent = false) => {
    const response = await requestGoogleLoginAccessToken(forceConsent ? "consent" : "");
    await loginWithGoogleAccessToken(response.accessToken, response.scope);
  }, [loginWithGoogleAccessToken]);

  const connectGoogleCalendar = useCallback(async (forceConsent = false) => {
    const response = await requestGoogleCalendarAccessToken(forceConsent ? "consent" : "");
    await loginWithGoogleAccessToken(response.accessToken, response.scope);
    return response.accessToken;
  }, [loginWithGoogleAccessToken]);

  const connectGoogleEmail = useCallback(async (forceConsent = false) => {
    const response = await requestGoogleEmailAccessToken(forceConsent ? "consent" : "");
    await loginWithGoogleAccessToken(response.accessToken, response.scope);
    return response.accessToken;
  }, [loginWithGoogleAccessToken]);

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
      loginWithGoogle,
      loginWithPassword,
      registerWithPassword,
      updateProfile,
      connectGoogleCalendar,
      connectGoogleEmail,
      logout,
      refreshUser,
    }),
    [connectGoogleCalendar, connectGoogleEmail, googleAccessToken, loading, loginWithGoogle, loginWithGoogleAccessToken, loginWithPassword, registerWithPassword, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
