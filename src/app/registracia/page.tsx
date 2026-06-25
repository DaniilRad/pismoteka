import Link from "next/link";
import { signup } from "@/lib/auth-actions";

export const metadata = { title: "Registrácia — Pismotéka" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Registrácia</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Založ si účet a začni písať.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={signup} className="mt-8 space-y-4">
        <div>
          <label htmlFor="display_name" className="block text-sm font-medium">
            Meno
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium">
            Používateľské meno
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            pattern="[a-z0-9_]{3,30}"
            title="3–30 znakov: malé písmená, číslice, podčiarkovník"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Tvoja adresa profilu: pismoteka.sk/@používateľské-meno
          </p>
        </div>
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
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 font-medium text-white hover:bg-neutral-800"
        >
          Zaregistrovať sa
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-500">
        Už máš účet?{" "}
        <Link href="/prihlasenie" className="font-medium text-neutral-900 underline">
          Prihlás sa
        </Link>
      </p>
    </main>
  );
}
