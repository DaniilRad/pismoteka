# Pismotéka

Komunitná slovenská blogovacia a editoriálna platforma (v štýle Medium + blog.sme.sk). Ľudia píšu dlhšie texty, komunita ich posúva hore hlasovaním (**karma**), čitatelia čítajú v peknom typografickom prostredí a diskutujú vo vláknach.

## Stack

- **Next.js** (App Router) + TypeScript — ISR pre verejné stránky (read-heavy, SEO-first)
- **Supabase** — Postgres + Auth + Storage + RLS
- **TipTap** — rich-text editor
- **Tailwind CSS** — design systém *Atrament UI*
- **Vercel** — hosting

## MVP (fáza 1)

- **Verejná časť:** homepage feed (Hot / Top / Najnovšie), detail článku, vláknené diskusie, profil autora
- **Studio:** TipTap editor s auto-save, plánované publikovanie, správa článkov, dashboard so štatistikami
- **Karma:** hlasovanie článkov aj komentárov, prepínateľné radenie feedu

Admin moderácia + kurácia ("Výber redakcie") sú fáza 2.

## Plánovacia dokumentácia

Architektúra, dátový model (ERD) a flow diagramy sú v Obsidian vaulte:
`00 Human/32 Dev Projects/Pismotéka/` (`Pismotéka.md` + `Architecture.md`).
