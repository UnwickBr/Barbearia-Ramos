import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(
    () => (mode === "login" ? "Entrar na Barbearia Ramos" : "Criar conta para agendar"),
    [mode],
  );

  const description = useMemo(
    () =>
      mode === "login"
        ? "Use seu e-mail e senha para acessar suas reservas."
        : "Crie sua conta para salvar seus dados e agendamentos no sistema.",
    [mode],
  );

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setMode("login");
      resetForm();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }

      handleOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide">{title}</DialogTitle>
          <DialogDescription className="font-body">{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-md bg-secondary p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-sm px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-background text-foreground" : "text-muted-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-sm px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "register" ? "bg-background text-foreground" : "text-muted-foreground"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <div className="space-y-2">
              <Label htmlFor="auth-name">Nome</Label>
              <Input
                id="auth-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="auth-email">E-mail</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Senha</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo de 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <LoaderCircle className="animate-spin" /> : null}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
