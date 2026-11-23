# Tadka: notes for Claude Code

Personal recipe app for Jasjit (not a developer: explain changes in plain language, keep steps short). Single user, no App Store, free tiers only.

## How it fits together

- `docs/`: the whole app, served by **GitHub Pages** (branch `main`, folder `/docs`). The iPhone (Safari "Add to Home Screen") and the Mac app both load this site. **Pushing changes to `docs/` updates both devices**; nothing to reinstall.
  - `docs/index.html`: the app. One file: HTML, CSS and JS (plain JavaScript, no build step, no framework). It was originally a Claude.ai artifact and talks to `window.claude.use(...)`.
  - `docs/bridge.js`: provides `window.claude.use(name)` on top of Supabase and the Anthropic API. Capabilities: `db` (collection with `doc(id).set/delete` and `onSnapshot`), `user` (`id()`), `sample` (`json(prompt,{images})` calls Claude and returns parsed JSON; `limits()`), `downloads` (`save({filename,data})`). Also the sign-in screen and the Account panel (person icon, top right: API key, model, backup import, sign out).
  - `docs/config.js`: Supabase URL and anon key (public by design; Row Level Security protects data) and the default Claude model.
  - `docs/vendor/supabase.js`: supabase-js v2 UMD build.
- `mac/`: thin Electron shell that opens the GitHub Pages URL in its own window. It asks for the URL on first launch (stored in the app's userData `settings.json`; changeable via menu **Tadka → App Link…**). Rebuild only when the shell itself changes: `cd mac && npm install && npm run install-app`.
- `supabase/setup.sql`: one-time database setup (table `public.docs`, RLS, realtime).

## Data model (Supabase table `public.docs`)

One row per document: `user_id` (auth uid), `id` (text), `data` (jsonb). RLS limits each user to their own rows. Document ids and kinds:
- recipe docs (random ids, `kind:"recipe"`): title, description, tags[], servings, servingSize, prep, cook, calories, caloriesEst, ingredients (newline text; lines ending in ":" are group headers), steps (newline text), tip, source, video, photo (JPEG data URL, about 800px and 170KB max), links[], rating, cooked, lastCooked, fav, pinned, updatedAt
- `book` (`kind:"book"`): cookbook builder settings, including `chapters`
- `img_*` (`kind:"bookimg"`): cover and chapter images
- `plan` (`kind:"plan"`): `days: {"YYYY-MM-DD": [{id, s}]}`
- `grocery` (`kind:"grocery"`): items[], pantry[]
- `_settings` (`kind:"settings"`): anthropicKey, model. Shared across devices after sign-in.

New features can add new document kinds without any database change.

## Tag conventions
Exactly one course per recipe: Appetizers & Snacks, Soups, Salads, Main Dishes, Sides, Breads & Baked Goods, Sauces, Salsas & Pickles, Desserts, Drinks. Plus diet (Veg / Non-Veg / Contains Egg; any meat means Non-Veg; gelatin means Non-Veg), protein (Chicken, Beef, Pork, Lamb, Seafood, Paneer, Tofu), cuisine, dish type (Pasta, Rice, Noodles, Tacos, Sandwiches & Wraps, Bowls, Curry), and occasion tags (Thanksgiving, Christmas, Tried, Make-Ahead). Topping only on dessert components.

## Rules
- **Never commit** recipe backups, API keys (`sk-ant-…`), or the Supabase service role key. Only the anon key belongs in `config.js`. `.gitignore` covers `*backup*.json`.
- The repository is **public** (required for free GitHub Pages). Don't put personal data in it.
- Keep it a no-build static site: no npm build for `docs/`. External scripts only from cdnjs or jsdelivr at pinned versions.
- Test locally before pushing: `cd docs && python3 -m http.server 8000`, then open http://localhost:8000.
- After pushing, GitHub Pages takes 1–2 minutes to update, and the iPhone can cache for up to about 10 minutes.
- Keep the app working without an Anthropic key: AI features fail gracefully and open the Account panel.
- Writing style for any text the user sees: plain, warm, short. No em dashes.
