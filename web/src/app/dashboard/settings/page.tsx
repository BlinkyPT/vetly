import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
        <div className="text-sm uppercase tracking-wide text-slate-500">Account</div>
        <div className="mt-1">{user.email}</div>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
