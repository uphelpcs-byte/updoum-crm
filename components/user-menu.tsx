"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function UserMenu({
  email, fullName, role,
}: { email: string; fullName: string | null; role: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-sm">
        <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs">
          {(fullName ?? email).slice(0, 1).toUpperCase()}
        </div>
        <div className="hidden sm:block text-left">
          <div className="font-medium">{fullName ?? email}</div>
          <div className="text-xs text-gray-500">{role}</div>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-10">
          <button onClick={signOut} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
