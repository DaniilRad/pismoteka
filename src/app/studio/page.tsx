import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Studio" };

type Row = { status: string; views: number; karma_score: number };

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, follower_count, karma_total")
    .eq("id", user!.id)
    .single();

  const { data } = await supabase
    .from("articles")
    .select("status, views, karma_score")
    .eq("author_id", user!.id);

  const rows = (data ?? []) as Row[];
  const totalReads = rows.reduce((s, r) => s + r.views, 0);
  const published = rows.filter((r) => r.status === "published").length;
  const drafts = rows.filter((r) => r.status === "draft").length;
  const scheduled = rows.filter((r) => r.status === "scheduled").length;

  const metrics = [
    { label: "Prečítania", value: totalReads },
    { label: "Sledovatelia", value: profile?.follower_count ?? 0 },
    { label: "Karma", value: profile?.karma_total ?? 0 },
    { label: "Publikované", value: published },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Studio</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Vitaj, {profile?.display_name ?? "autor"}.
          </p>
        </div>
        <Link
          href="/studio/write"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Nový článok
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-neutral-200 p-5"
          >
            <div className="text-3xl font-semibold tabular-nums">{m.value}</div>
            <div className="mt-1 text-sm text-neutral-500">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-medium">Tvoje články</h2>
        <div className="mt-3 flex gap-6 text-sm text-neutral-600">
          <span>Koncepty: {drafts}</span>
          <span>Naplánované: {scheduled}</span>
          <span>Publikované: {published}</span>
        </div>
        <p className="mt-4 text-sm text-neutral-400">
          Správa článkov (tabuľka konceptov/publikovaných/naplánovaných) a editor
          pribudnú v míľniku M4.
        </p>
      </div>
    </main>
  );
}
