"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch(admin ? "/api/admin-auth/logout" : "/api/auth/logout", { method: "POST" });
        } finally {
          router.push(admin ? "/admin/login" : "/auth");
          router.refresh();
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
