import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/sidebar";
import UserMenu from "@/components/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, organization_id, organizations(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    // 회원가입은 됐지만 조직 합류가 안 된 상태 — 가입 마무리
    redirect("/signup");
  }

  // @ts-expect-error nested join
  const orgName = profile.organizations?.name ?? "조직";

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="text-sm text-gray-500">{orgName}</div>
          <UserMenu email={profile.email} fullName={profile.full_name} role={profile.role} />
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
