# Tadka: Setup Guide (Mac + iPhone, private logins)

One-time setup, about 30–40 minutes. Do the parts in order. Each part ends with a **Check** so you know it worked. If a screen looks different, send Claude a screenshot.

## How it works
- **Supabase** (free) holds the recipes. Every login has its own private cookbook. Your 616 recipes go only into your account, so anyone you invite starts with an empty cookbook.
- **GitHub Pages** (free) hosts the app itself. It holds no recipes.
- Your **iPhone** (Home Screen app) and the **Mac app** both open the same link, and both update when you push a change to GitHub.
- You don't need **Railway** for this. Supabase does the database and logins, and GitHub Pages does the hosting.

## Part 1: Download (2 minutes)
From the Claude chat, download:
1. `tadka.zip`, the project folder.
2. `Tadka-backup.json`, your recipes. **Keep it out of the project folder.** It must never go to GitHub.

**Check:** both files are in Downloads.

## Part 2: Create the free database (10 minutes)
1. Go to **supabase.com** → **Start your project** → **Continue with GitHub**.
2. If asked for an organization, name it anything and choose **Free**.
3. **New project:** name it `tadka`, click **Generate a password** and save it in Notes, set the region to **East US**, then click **Create new project**. Wait 1–2 minutes.
4. Unzip `tadka.zip`. Open `supabase` → `setup.sql` (it opens in TextEdit). Press **⌘A**, then **⌘C**.
5. In Supabase, open **SQL Editor** (`>_` icon) → **New query**, click in the box, press **⌘V**, then click **Run**.
6. Go to **Project Settings** (gear) → **API** (may be called **Data API** or **API Keys**) and copy these two values into Notes:
   - **Project URL** (`https://….supabase.co`)
   - **anon public** key (long, starts with `eyJ`)
7. Go to **Authentication** → **Sign In / Providers** → **Email**, turn **off** "Confirm email", and click **Save**.

**Check:** step 5 says **Success. No rows returned.**

*Supabase pauses a free project after about a week with no use. If the app can't load, sign in at supabase.com and click **Restore project**. Your data is kept.*

## Part 3: Put it on GitHub with Claude Code (10 minutes)
1. Move the unzipped `tadka` folder to where you keep your projects (for example, **Documents**).
2. Open **VS Code** → **File → Open Folder…** → `tadka`.
3. Open **Claude Code** and paste this, replacing the two bracketed parts:

```
Please set up this project step by step and explain in plain language what you did:
1. In docs/config.js, set supabaseUrl to [PROJECT URL] and supabaseAnonKey to [ANON KEY].
2. Create a new PUBLIC GitHub repository named tadka under my account and push this folder to main. Double-check that no backup .json files or API keys are included.
3. Turn on GitHub Pages: deploy from main, /docs folder.
4. Give me the GitHub Pages link when it's live.
```

4. If Pages isn't turned on, do it by hand on github.com: open the repository → **Settings** → **Pages** → **Deploy from a branch**, choose **main** and **/docs**, then click **Save**.

**Check:** open the link (like `https://yourname.github.io/tadka/`) in Safari. You see a **Sign in** box. The first time can take 1–2 minutes.

## Part 4: Build the Mac app (5 minutes)
In Claude Code, paste:

```
Build and install the Mac app: run npm install, then npm run install-app, in the mac folder.
```

**Tadka** opens and asks for your **App link**. Paste your GitHub Pages link, then click **Open**. To keep it in the Dock, right-click its Dock icon → **Options** → **Keep in Dock**.

If macOS says the app "can't be opened", open Terminal and run:
```
xattr -cr "/Applications/Tadka.app" && codesign --force --deep --sign - "/Applications/Tadka.app"
```

**Check:** the Mac app shows the **Sign in** box.

## Part 5: Your account and recipes (5 minutes)
1. Enter your email and a password (8+ characters). Click **Create account**.
2. Click the **person icon** → **Import a backup file…** → choose `Tadka-backup.json`.
3. Wait for **Imported 620 items**. The file is large, so this takes a minute or two.

**Check:** Recipes shows **616**. Then move the backup file somewhere private.

## Part 6: iPhone (3 minutes)
1. In **Safari**, open your GitHub Pages link.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open **Tadka** and sign in with the **same** email and password.

**Check:** add a grocery item on the phone. It shows on the Mac within seconds.

## Part 7: Share with someone (and lock out strangers)
Each person gets their own login and an empty cookbook. They never see your recipes.
1. Send them the GitHub Pages link. They tap **Create account**.
2. Once everyone you want has an account, close sign-ups. In Supabase, go to **Authentication** → **Sign In / Providers**, turn **off** "Allow new users to sign up", and click **Save**.
3. To add someone later, go to **Authentication** → **Users** → **Add user** → **Create new user**, enter their email and a password, and tick **Auto Confirm User**.

## Adding features later
1. Open the `tadka` folder in VS Code and ask Claude Code, for example: *"Add a Leftovers filter. Test it, then commit and push."*
2. About 2 minutes after the push, press **⌘R** on the Mac. On the iPhone, swipe the app closed and reopen it.

You only rebuild the Mac app if its window or menus change.

## Optional: Anthropic API key (reading captions and photos, auto grams and calories)
At **console.anthropic.com**, add a small credit, set a monthly spend limit, and create a key. Paste it only in the app: **person icon** → **Save**. Never put it in a project file.
