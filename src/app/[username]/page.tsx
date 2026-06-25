import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return { title: `@${username}` };
}

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  karma_score: number;
};

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, follower_count, karma_total")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  // Published articles by this author (RLS exposes only published rows to visitors).
  const { data: articles } = await supabase
    .from("articles")
    .select(
      "id, title, slug, excerpt, published_at, karma_score, author:profiles!articles_author_id_fkey(username)",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const mine = (
    (articles ?? []) as unknown as (ArticleRow & {
      author: { username: string } | null;
    })[]
  ).filter((a) => a.author?.username === username);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {profile.display_name}
        </h1>
        <p className="text-sm text-neutral-500">@{profile.username}</p>
        {profile.bio && <p className="mt-3 text-neutral-700">{profile.bio}</p>}
        <div className="mt-4 flex gap-6 text-sm text-neutral-500">
          <span>{profile.follower_count} sledovateľov</span>
          <span>{profile.karma_total} karma</span>
        </div>
      </header>

      <section className="mt-8 space-y-6">
        <h2 className="text-lg font-medium">Články</h2>
        {mine.length === 0 && (
          <p className="text-neutral-400">Zatiaľ žiadne publikované články.</p>
        )}
        {mine.map((a) => (
          <article key={a.id} className="border-b border-neutral-100 pb-6">
            <h3 className="font-serif text-xl font-bold">
              <Link href={`/${username}/${a.slug}`} className="hover:underline">
                {a.title}
              </Link>
            </h3>
            {a.excerpt && <p className="mt-1 text-neutral-600">{a.excerpt}</p>}
            <div className="mt-2 text-xs text-neutral-400">
              ▲ {a.karma_score}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
