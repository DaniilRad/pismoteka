import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Sort = "hot" | "top" | "new";

const SORTS: { key: Sort; label: string }[] = [
  { key: "hot", label: "Hot" },
  { key: "top", label: "Najlepšie" },
  { key: "new", label: "Najnovšie" },
];

type FeedArticle = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  excerpt: string | null;
  reading_time: number;
  views: number;
  karma_score: number;
  published_at: string | null;
  author: { username: string; display_name: string } | null;
  category: { name: string; slug: string } | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; cat?: string }>;
}) {
  const { sort: sortParam, cat } = await searchParams;
  const sort: Sort =
    sortParam === "top" || sortParam === "new" ? sortParam : "hot";

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("name, slug")
    .order("name");

  let query = supabase
    .from("articles")
    .select(
      `id, title, subtitle, slug, excerpt, reading_time, views, karma_score, published_at,
       author:profiles!articles_author_id_fkey ( username, display_name ),
       category:categories ( name, slug )`,
    )
    .eq("status", "published")
    .limit(20);

  if (cat) query = query.eq("categories.slug", cat);

  if (sort === "top") query = query.order("karma_score", { ascending: false });
  else if (sort === "new")
    query = query.order("published_at", { ascending: false });
  else query = query.order("hot_score", { ascending: false });

  const { data } = await query;
  const articles = (data ?? []) as unknown as FeedArticle[];

  const sortHref = (s: Sort) => `/?sort=${s}${cat ? `&cat=${cat}` : ""}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {/* Sort tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 pb-3">
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={sortHref(s.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              sort === s.key
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Category chips */}
      {categories && categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/?sort=${sort}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              !cat
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            Všetko
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/?sort=${sort}&cat=${c.slug}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                cat === c.slug
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* Feed */}
      <div className="mt-8 space-y-8">
        {articles.length === 0 && (
          <p className="py-16 text-center text-neutral-400">
            Zatiaľ tu nie sú žiadne publikované články. Buď prvý —{" "}
            <Link href="/studio/write" className="underline">
              napíš článok
            </Link>
            .
          </p>
        )}

        {articles.map((a) => (
          <article key={a.id} className="border-b border-neutral-100 pb-8">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              {a.author && (
                <Link href={`/${a.author.username}`} className="hover:underline">
                  {a.author.display_name}
                </Link>
              )}
              <span>·</span>
              <span>{formatDate(a.published_at)}</span>
              {a.category && (
                <>
                  <span>·</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5">
                    {a.category.name}
                  </span>
                </>
              )}
            </div>

            <h2 className="mt-2 font-serif text-2xl font-bold leading-snug">
              {a.author ? (
                <Link
                  href={`/${a.author.username}/${a.slug}`}
                  className="hover:underline"
                >
                  {a.title}
                </Link>
              ) : (
                a.title
              )}
            </h2>
            {(a.subtitle || a.excerpt) && (
              <p className="mt-1 text-neutral-600">{a.subtitle ?? a.excerpt}</p>
            )}

            <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
              <span>▲ {a.karma_score}</span>
              <span>{a.reading_time} min čítania</span>
              <span>{a.views} zobrazení</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
