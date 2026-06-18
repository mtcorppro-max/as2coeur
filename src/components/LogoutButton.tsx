"use client";

import { clearSessionCache } from "@/lib/hooks/useSession";

export function LogoutButton({ className = "" }: { className?: string }) {
  return (
    <form
      action="/api/logout"
      method="post"
      onSubmit={() => clearSessionCache()}
    >
      <button
        className={`text-sm text-slate-400 hover:text-brand ${className}`}
        type="submit"
      >
        Déconnexion
      </button>
    </form>
  );
}
