"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SoignantForm } from "@/components/SoignantForm";

type Prestataire = { id: string; nom: string };
type Ctx = { isAdmin: boolean; email?: string; prestataires?: Prestataire[] };

export default function AdminPage() {
  const [ctx, setCtx] = useState<Ctx | null>(null);

  useEffect(() => {
    fetch("/api/admin/context")
      .then((r) => r.json())
      .then((d) => setCtx(d))
      .catch(() => setCtx({ isAdmin: false }));
  }, []);

  if (!ctx) {
    return <div className="h-40 animate-pulse rounded-2xl bg-white" />;
  }

  if (!ctx.isAdmin) {
    return (
      <div className="card grid gap-3 text-center">
        <p className="text-lg font-semibold text-slate-700">Accès administrateur requis</p>
        <p className="text-sm text-slate-500">
          Cette page est réservée aux administrateurs autorisés. Connectez-vous avec un
          compte administrateur.
        </p>
        <Link href="/login/pro" className="btn-primary mx-auto">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Création de comptes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connecté en tant qu&apos;administrateur ({ctx.email}). Créez les comptes soignants
          (coordinatrice, chirurgien/médecin, délégué) et leurs consignes.
        </p>
      </div>
      <SoignantForm prestataires={ctx.prestataires ?? []} />
    </div>
  );
}
