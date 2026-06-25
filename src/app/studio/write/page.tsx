export const metadata = { title: "Písať" };

export default function WritePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="font-serif text-3xl font-bold">Editor pribúda v M4</h1>
      <p className="mt-3 text-neutral-500">
        Tu bude TipTap editor s auto-save, nastaveniami článku (cover, kategória,
        tagy, SEO) a plánovaným publikovaním. Schéma a auth (M1) sú už hotové.
      </p>
    </main>
  );
}
