import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LoaderCircle, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Perfil = () => {
  const { user, loading, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl ?? "");
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        firstName,
        lastName,
        birthDate: birthDate || null,
        phone: phone || null,
        photoUrl: photoUrl || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <Link to="/agendamentos" className="mb-8 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground">
          Voltar
        </Link>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <UserCog className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-display text-3xl font-bold">Gerenciar perfil</h1>
              <p className="text-sm text-muted-foreground">Atualize seus dados pessoais.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Nome</label>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Sobrenome</label>
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">E-mail</label>
              <input value={user.email} disabled className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Data de nascimento</label>
              <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Telefone</label>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">URL da foto</label>
              <input value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>

          <button onClick={() => void handleSave()} disabled={saving} className="mt-6 inline-flex rounded-md border border-border px-4 py-3 text-sm text-foreground hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar perfil"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
