# WAVELENGTH — AI Music Discovery

Paste any song → pick what to analyze → get 5 Spotify-linked recommendations.

Built with **Next.js** · **GPT-4o** · **Spotify Web API** · Deployable on **Vercel** (free).

---

## What You Need Before Starting

1. **OpenAI API key** — you already have this ✓
2. **Spotify API credentials** — free, takes 5 minutes (see below)
3. **GitHub account** — for deploying to Vercel (free at github.com)
4. **Vercel account** — free at vercel.com

---

## Step 1 — Get Your Spotify API Credentials (Free)

Spotify lets developers use their API for free. You need a **Client ID** and **Client Secret**.

1. Go to **https://developer.spotify.com/dashboard**
2. Log in with your Spotify account (or create one — it's free)
3. Click **"Create app"**
4. Fill in:
   - **App name**: Wavelength (or anything you like)
   - **App description**: Music recommendation tool
   - **Redirect URI**: `http://localhost:3000` (required but not used)
   - Check the **Web API** checkbox
5. Click **Save**
6. On your app page, click **Settings**
7. You'll see your **Client ID** and a button to reveal your **Client Secret** — copy both

---

## Step 2 — Run Locally (to test before deploying)

```bash
# 1. Unzip the project
unzip wavelength.zip
cd wavelength

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.local.example .env.local

# 4. Open .env.local in any text editor and fill in your keys:
#    OPENAI_API_KEY=sk-your-key-here
#    SPOTIFY_CLIENT_ID=your-client-id
#    SPOTIFY_CLIENT_SECRET=your-client-secret

# 5. Start the dev server
npm run dev

# 6. Open http://localhost:3000 in your browser
```

---

## Step 3 — Deploy to Vercel (Free, Public URL)

Vercel is completely free for personal projects and gives you a public `*.vercel.app` URL.

### 3a — Push to GitHub

```bash
# Inside the wavelength folder:
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/wavelength.git
git push -u origin main
```

### 3b — Deploy on Vercel

1. Go to **https://vercel.com** and sign in (use "Continue with GitHub")
2. Click **"Add New Project"**
3. Click **"Import"** next to your `wavelength` repo
4. Leave all settings as default — Vercel auto-detects Next.js
5. Before clicking Deploy, click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `OPENAI_API_KEY` | your OpenAI key |
| `SPOTIFY_CLIENT_ID` | your Spotify Client ID |
| `SPOTIFY_CLIENT_SECRET` | your Spotify Client Secret |

6. Click **Deploy**
7. In ~2 minutes, Vercel gives you a URL like `https://wavelength-abc123.vercel.app` — share it with anyone!

### Updating the app later

```bash
# Make your changes, then:
git add .
git commit -m "Update"
git push
# Vercel auto-redeploys in ~30 seconds
```

---

## Project Structure

```
wavelength/
├── pages/
│   ├── index.js          ← All UI (React)
│   ├── _app.js           ← App wrapper
│   └── api/
│       └── analyze.js    ← Backend: OpenAI + Spotify calls
├── styles/
│   └── globals.css       ← All styling
├── .env.local.example    ← Template for your API keys
├── package.json
└── next.config.js
```

**The API route** (`/api/analyze`) does all the heavy lifting:
1. Receives the song + user preferences
2. Calls GPT-4o to analyze the song and generate 5 recommendations (as JSON)
3. Calls Spotify to find each song and return embed links
4. Returns everything to the frontend

---

## Customization

**Change number of suggestions**: In `pages/api/analyze.js`, change `Return exactly 5 suggestions` to any number.

**Change the AI model**: In `pages/api/analyze.js`, change `model: 'gpt-4o'` to `'gpt-4o-mini'` for faster/cheaper responses.

**Change the color accent**: In `styles/globals.css`, change `--green: #1DB954` to any color.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Failed to get Spotify token" | Double-check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local |
| "Analysis failed" | Check your OPENAI_API_KEY and make sure it has credits |
| Songs not finding Spotify links | GPT may have returned a slightly different song title — this is normal, some songs just won't be on Spotify |
| Vercel shows 500 error | Go to Vercel → your project → Functions tab → check the logs |
