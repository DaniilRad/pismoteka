import Link from "next/link";
import { login } from "@/lib/auth-actions";

export const metadata = { title: "Prihlásenie — Pismotéka" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Prihlásenie</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Vitaj späť v Pismotéke.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={login} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? "/studio"} />
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Heslo
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 font-medium text-white hover:bg-neutral-800"
        >
          Prihlásiť sa
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-500">
        Nemáš účet?{" "}
        <Link href="/registracia" className="font-medium text-neutral-900 underline">
          Zaregistruj sa
        </Link>
      </p>
    </main>
  );
}
