import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const { loginWithGoogleAccessToken } = useAuth();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [startingLogin, setStartingLogin] = useState(false);
  const tokenClientRef = useRef<{ requestAccessToken: (options?: { prompt?: string }) => void } | null>(null);

  useEffect(() => {
    if (!open || !googleClientId) {
      return;
    }

    setGoogleReady(false);
    setGoogleError(null);

    const initializeGoogle = () => {
      if (!window.google?.accounts?.oauth2) {
        setGoogleError("O SDK do Google foi carregado, mas o cliente OAuth não ficou disponível.");
        return;
      }

      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "openid email profile",
        callback: async (response) => {
          if (!response.access_token) {
            setStartingLogin(false);
            setGoogleError("O Google não retornou um token de acesso.");
            return;
          }

          try {
            await loginWithGoogleAccessToken(response.access_token);
            onOpenChange(false);
          } catch (error) {
            setGoogleError(error instanceof Error ? error.message : "Falha ao entrar com Google.");
          } finally {
            setStartingLogin(false);
          }
        },
      });

      setGoogleReady(true);
    };

    if (window.google?.accounts?.oauth2) {
      initializeGoogle();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle, { once: true });
      existingScript.addEventListener("error", () => setGoogleError("Não foi possível carregar o script do Google."), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => setGoogleError("Não foi possível carregar o script do Google.");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, loginWithGoogleAccessToken, onOpenChange, open]);

  const handleGoogleLogin = () => {
    if (!tokenClientRef.current) {
      setGoogleError("O login Google ainda não está pronto.");
      return;
    }

    setStartingLogin(true);
    setGoogleError(null);
    tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide">Entrar com Google</DialogTitle>
          <DialogDescription className="font-body">
            O acesso à Barbearia Ramos acontece exclusivamente com sua conta Google.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-secondary/40 p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            Use sua conta Google para acessar suas reservas e salvar novos agendamentos.
          </p>

          <Button type="button" className="w-full" onClick={handleGoogleLogin} disabled={!googleReady || startingLogin}>
            {startingLogin ? <LoaderCircle className="animate-spin" /> : null}
            Continuar com Google
          </Button>

          {!googleClientId ? (
            <p className="mt-4 text-sm text-destructive">
              O login Google não está configurado neste ambiente.
            </p>
          ) : null}

          {googleClientId && !googleReady && !googleError ? (
            <div className="mt-4 rounded-md border border-border bg-background/60 px-4 py-3 text-center text-sm text-muted-foreground">
              Carregando integração do Google...
            </div>
          ) : null}

          {googleError ? (
            <div className="mt-4 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <p>{googleError}</p>
              <p>
                Confirme no Google Cloud se o origin
                {" "}
                <span className="font-semibold">https://barbearia-ramos-demo.vercel.app</span>
                {" "}
                está em
                {" "}
                <span className="font-semibold">Authorized JavaScript origins</span>.
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
