import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ensureGoogleIdentityScript } from "@/lib/google";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const { connectGoogleServices } = useAuth();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [startingLogin, setStartingLogin] = useState(false);

  useEffect(() => {
    if (!open || !googleClientId) {
      return;
    }

    setGoogleReady(false);
    setGoogleError(null);

    void ensureGoogleIdentityScript()
      .then(() => setGoogleReady(true))
      .catch((error) => setGoogleError(error instanceof Error ? error.message : "Nao foi possivel carregar o script do Google."));
  }, [open]);

  const handleGoogleLogin = () => {
    if (!googleReady) {
      setGoogleError("O login Google ainda nao esta pronto.");
      return;
    }

    setStartingLogin(true);
    setGoogleError(null);
    void connectGoogleServices(true)
      .then(() => onOpenChange(false))
      .catch((error) => setGoogleError(error instanceof Error ? error.message : "Falha ao entrar com Google."))
      .finally(() => setStartingLogin(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide">Entrar com Google</DialogTitle>
          <DialogDescription className="font-body">
            O acesso a Barbearia Ramos acontece exclusivamente com sua conta Google.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-secondary/40 p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            Use sua conta Google para acessar reservas, adicionar o horario ao seu calendario e receber a confirmacao por e-mail.
          </p>

          <Button type="button" className="w-full" onClick={handleGoogleLogin} disabled={!googleReady || startingLogin}>
            {startingLogin ? <LoaderCircle className="animate-spin" /> : null}
            Continuar com Google
          </Button>

          {!googleClientId ? (
            <p className="mt-4 text-sm text-destructive">O login Google nao esta configurado neste ambiente.</p>
          ) : null}

          {googleClientId && !googleReady && !googleError ? (
            <div className="mt-4 rounded-md border border-border bg-background/60 px-4 py-3 text-center text-sm text-muted-foreground">
              Carregando integracao do Google...
            </div>
          ) : null}

          {googleError ? (
            <div className="mt-4 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <p>{googleError}</p>
              <p>
                Confirme no Google Cloud se o origin{" "}
                <span className="font-semibold">https://barbearia-ramos-demo.vercel.app</span>{" "}
                esta em <span className="font-semibold">Authorized JavaScript origins</span>.
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
