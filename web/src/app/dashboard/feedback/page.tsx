import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export default async function FeedbackHistoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createSupabaseServiceClient();
  const { data: rows } = await service
    .from("user_feedback")
    .select("id, url_hash, thumbs, notes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Your feedback</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Every thumbs up / down you submit re-weights that domain on the next refresh.
      </p>
      <div className="mt-6 space-y-3">
        {(!rows || rows.length === 0) && (
          <p className="text-sm text-slate-500">You haven&apos;t left any feedback yet.</p>
        )}
        {rows?.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-slate-500">{r.url_hash.slice(0, 12)}…</span>
              <span className={r.thumbs === "up" ? "text-vetly-green" : "text-vetly-red"}>
                {r.thumbs === "up" ? "👍" : "👎"}
              </span>
            </div>
            {r.notes && <p className="mt-2 text-sm">{r.notes}</p>}
            <p className="mt-1 text-xs text-slate-500">
              {new Date(r.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
