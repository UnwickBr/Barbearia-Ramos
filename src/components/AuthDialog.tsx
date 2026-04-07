import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [googleStatus, setGoogleStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!open || !googleClientId || !buttonRef.current) {
      return;
    }

    setGoogleStatus("loading");
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const initializeGoogle = () => {
      if (!window.google || !buttonRef.current) {
        setGoogleStatus("error");
        return;
      }

      buttonRef.current.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => {
          void loginWithGoogle(credential).then(() => onOpenChange(false));
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 320,
        logo_alignment: "left",
      });

      timeoutId = setTimeout(() => {
        const hasRenderedContent = Boolean(buttonRef.current?.childElementCount);
        setGoogleStatus(hasRenderedContent ? "ready" : "error");
      }, 1200);
    };

    if (window.google) {
      initializeGoogle();
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle, { once: true });
      return () => {
        existingScript.removeEventListener("load", initializeGoogle);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loginWithGoogle, onOpenChange, open]);

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

          {googleClientId ? (
            <div className="flex min-h-12 justify-center">
              <div ref={buttonRef} />
            </div>
          ) : (
            <p className="text-sm text-destructive">
              O login Google não está configurado neste ambiente.
            </p>
          )}

          {googleStatus === "loading" ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Carregando botão do Google...
            </p>
          ) : null}

          {googleStatus === "error" ? (
            <div className="mt-4 space-y-2 text-sm text-destructive">
              <p>Não foi possível renderizar o botão do Google neste domínio.</p>
              <p>
                Verifique no Google Cloud se o origin
                {" "}
                <span className="font-semibold">https://barbearia-ramos-demo.vercel.app</span>
                {" "}
                está cadastrado em
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
