# $ign — budgeting & savings app

## Deploy to Netlify

**Option A — drag and drop (no git needed)**
1. Unzip this project locally, open a terminal in the folder, and run:
   ```
   npm install
   npm run build
   ```
2. This creates a `dist` folder.
3. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the `dist` folder in.
4. Netlify gives you a live URL immediately.

**Option B — connect a Git repo (auto-deploys on every push)**
1. Push this folder to a GitHub repo.
2. In Netlify: "Add new site" → "Import an existing project" → pick the repo.
3. Build command: `npm run build`. Publish directory: `dist`. (Already set in `netlify.toml`.)
4. Deploy.

## Installing on your OnePlus 15 (as an app icon, not just a bookmark)

1. Open the Netlify URL in **Chrome** on your phone.
2. Tap the **⋮** menu → **Add to Home screen** (Chrome may show this automatically as a banner).
3. Confirm. $ign now opens full-screen from your home screen, no browser bar, with its own icon.

## Important: how your data is stored

This version saves your ledger in **`localStorage`** — data lives in the browser on your phone, tied to that specific browser app. That means:

- It **persists** across closing and reopening $ign — your balance, transactions, and goals will be there.
- It does **not** sync to other devices or the cloud.
- Clearing your browser's site data/cache, or switching browsers (Chrome vs Samsung Internet, etc.), will erase it.
- **Use the in-app "Download backup file" button regularly** (Settings icon in the header → Your data). This saves a `.json` file to your phone's Downloads. You can restore from it any time, on this phone or a new one.

## Local development

```
npm install
npm run dev
```

Opens at `http://localhost:5173`.
