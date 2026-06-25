import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ username: string; slug: string }> };

type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  reading_time: number;
  views: number;
  karma_score: number;
  published_at: string | null;
  author: { username: string; display_name: string } | null;
  category: { name: string } | null;
};

export async function generateMetadata({ params }: Props) {
  const { username, slug } = await params;
  return { title: `${slug} — @${username}` };
}

export default async function ArticlePage({ params }: Props) {
  const { username, slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select(
      `id, title, subtitle, excerpt, reading_time, views, karma_score, published_at,
       author:profiles!articles_author_id_fkey ( username, display_name ),
       category:categories ( name )`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .limit(1);

  const article = (data?.[0] as unknown as Article) ?? null;
  if (!article || article.author?.username !== username) notFound();

  // Race-free view increment (atomic RPC).
  await supabase.rpc("increment_views", { article: article.id });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {article.category && (
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {article.category.name}
        </span>
      )}
      <h1 className="mt-2 font-serif text-4xl font-bold leading-tight">
        {article.title}
      </h1>
      {article.subtitle && (
        <p className="mt-3 text-xl text-neutral-500">{article.subtitle}</p>
      )}

      <div className="mt-6 flex items-center gap-3 border-b border-neutral-200 pb-6 text-sm text-neutral-500">
        {article.author && (
          <Link
            href={`/${article.author.username}`}
            className="font-medium text-neutral-900 hover:underline"
          >
            {article.author.display_name}
          </Link>
        )}
        <span>·</span>
        <span>{article.reading_time} min čítania</span>
        <span>·</span>
        <span>▲ {article.karma_score}</span>
      </div>

      <article className="prose mt-8 font-serif text-lg leading-relaxed text-neutral-800">
        {article.excerpt && <p>{article.excerpt}</p>}
        <p className="text-neutral-400">
          Plný čitateľský zážitok (render TipTap obsahu, hlasovanie, bookmark,
          zdieľanie a vláknené diskusie) pribúda v míľnikoch M2–M3.
        </p>
      </article>
    </main>
  );
}
