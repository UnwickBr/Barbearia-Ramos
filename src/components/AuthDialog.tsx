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

type AuthMode = "login" | "register";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const { loginWithGoogle, loginWithPassword, registerWithPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [startingGoogleLogin, setStartingGoogleLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerBirthDate, setRegisterBirthDate] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

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

    setStartingGoogleLogin(true);
    setGoogleError(null);
    void loginWithGoogle(true)
      .then(() => onOpenChange(false))
      .catch((error) => setGoogleError(error instanceof Error ? error.message : "Falha ao entrar com Google."))
      .finally(() => setStartingGoogleLogin(false));
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setFormError(null);

    const action = mode === "login"
      ? loginWithPassword(loginEmail, loginPassword)
      : registerWithPassword({
          firstName: registerFirstName,
          lastName: registerLastName,
          birthDate: registerBirthDate,
          email: registerEmail,
          password: registerPassword,
          confirmPassword: registerConfirmPassword,
        });

    void action
      .then(() => onOpenChange(false))
      .catch((error) => setFormError(error instanceof Error ? error.message : "Nao foi possivel concluir a autenticacao."))
      .finally(() => setSubmitting(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide">{mode === "login" ? "Entrar" : "Criar conta"}</DialogTitle>
          <DialogDescription className="font-body">
            Use e-mail e senha normalmente. O Google fica opcional para quem preferir entrar por ele ou sincronizar com o calendario.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button type="button" variant={mode === "login" ? "default" : "outline"} className="flex-1" onClick={() => setMode("login")}>
            Entrar
          </Button>
          <Button type="button" variant={mode === "register" ? "default" : "outline"} className="flex-1" onClick={() => setMode("register")}>
            Criar conta
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-secondary/40 p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            {mode === "login"
              ? "Entre com sua conta para acessar reservas e agenda."
              : "Crie sua conta com nome, sobrenome, data de nascimento, e-mail e senha."}
          </p>

          {mode === "login" ? (
            <div className="grid gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">E-mail</label>
                <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Senha</label>
                <input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Nome</label>
                  <input value={registerFirstName} onChange={(event) => setRegisterFirstName(event.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Sobrenome</label>
                  <input value={registerLastName} onChange={(event) => setRegisterLastName(event.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Data de nascimento</label>
                <input value={registerBirthDate} onChange={(event) => setRegisterBirthDate(event.target.value)} type="date" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">E-mail</label>
                <input value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} type="email" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Senha</label>
                  <input value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} type="password" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Confirmar senha</label>
                  <input value={registerConfirmPassword} onChange={(event) => setRegisterConfirmPassword(event.target.value)} type="password" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          <Button type="button" className="mt-4 w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <LoaderCircle className="animate-spin" /> : null}
            {mode === "login" ? "Entrar com e-mail" : "Criar conta"}
          </Button>

          <div className="my-4 h-px bg-border" />

          <p className="mb-3 text-xs text-muted-foreground">
            Vincule o Google somente se quiser entrar com sua conta Google ou receber alertas no Google Calendar.
          </p>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={!googleReady || startingGoogleLogin}>
            {startingGoogleLogin ? <LoaderCircle className="animate-spin" /> : null}
            Continuar com Google
          </Button>

          {formError ? (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formError}
            </div>
          ) : null}

          {googleError ? (
            <div className="mt-4 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <p>{googleError}</p>
              <p>
                Confirme no Google Cloud se o origin <span className="font-semibold">https://barbearia-ramos-demo.vercel.app</span> esta autorizado.
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
