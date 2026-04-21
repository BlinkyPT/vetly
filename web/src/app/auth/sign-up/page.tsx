"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user && !data.session) {
      setMsg("Check your email to confirm. You can close this tab.");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Create your Vetly account</h1>
      <form onSubmit={handleSignUp} className="mt-6 space-y-3">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        />
        {error && <p className="text-sm text-vetly-red">{error}</p>}
        {msg && <p className="text-sm text-vetly-green">{msg}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-vetly-green py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-2 text-sm text-slate-500">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /> or <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <button
        onClick={handleGoogle}
        className="rounded-md border border-slate-300 py-2 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-sm text-slate-500">
        Already have an account? <Link href="/auth/sign-in" className="underline">Sign in</Link>.
      </p>
    </main>
  );
}
