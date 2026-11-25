# 🎮 GameSwap

**A platform where gamers trade the game discs they've finished for ones they want to play.**

## How it works

1. **List:** post a game with its platform, condition and what you'd swap it for.
2. **Match:** browse listings and find someone who wants what you have.
3. **Swap:** agree on the trade and exchange discs.

## Features (demo)

- **Sign up / log in** with a gamer name, email and city
- **List a game** with platform, condition, description, the game you want and an optional cover image URL
- **Edit or delete** your listings under *My Listings*
- **Browse** every listing with **search** (title, wanted game or city) and a **platform filter**
- **Request a swap** by offering one of your own games, with an optional message
- **Accept or decline** requests you receive; once accepted, both traders see each other's email to arrange the swap

> **Demo mode:** accounts, listings and requests are stored in your browser's `localStorage`, so they only exist on that browser. Seeded demo accounts: `arjun@demo.com`, `meera@demo.com`, `rohan@demo.com` (password `demo123`).

## Tech

HTML, CSS, JavaScript

## Run locally

```bash
git clone https://github.com/saivishaldharisa-web/gameswap.git
cd gameswap
open index.html
```

## Project structure

```
index.html      page layout and modals (Bootstrap 5)
css/style.css   custom styles
js/app.js       auth, listings, search and swap requests (localStorage)
```

## Roadmap

- Backend (Node.js or Supabase) so accounts and listings are shared between users; replace the `db` helpers in `js/app.js` with API calls
- Matching suggestions based on wanted games
- Chat between traders

---
Built by [Sai Vishal Dharisa](https://www.linkedin.com/in/sai-vishal-dharisa-58b82a416/)
