import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";

/** Top navigation. Reflects auth state (server-rendered). */
export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    username = data?.username ?? null;
  }

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Pismotéka
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/studio/write" className="hover:underline">
                Písať
              </Link>
              <Link href="/studio" className="hover:underline">
                Studio
              </Link>
              {username && (
                <Link href={`/${username}`} className="hover:underline">
                  Môj profil
                </Link>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50"
                >
                  Odhlásiť
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/prihlasenie" className="hover:underline">
                Prihlásenie
              </Link>
              <Link
                href="/registracia"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800"
              >
                Registrácia
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
