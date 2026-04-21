import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <nav className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">Vetly</Link>
          <Link href="/dashboard" className="text-sm text-slate-600 hover:underline dark:text-slate-300">Overview</Link>
          <Link href="/dashboard/feedback" className="text-sm text-slate-600 hover:underline dark:text-slate-300">Feedback</Link>
          <Link href="/dashboard/support" className="text-sm text-slate-600 hover:underline dark:text-slate-300">Support Vetly</Link>
          <Link href="/dashboard/settings" className="text-sm text-slate-600 hover:underline dark:text-slate-300">Settings</Link>
        </div>
        <span className="text-sm text-slate-500">{user.email}</span>
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
