# Rescue Dash — Cat's Meow Cat Rescue

Branded HTML mini-game for **Cat's Meow Cat Rescue** (Milwaukie / Portland metro, OR · 501(c)(3)).

**Intended live URL (after merge):** https://luckygoats33.github.io/cats-meow-rescue/game/

## How to play

1. Tap **Play** (or press Space / ↑).
2. **Tap, click, or Space / ↑** to jump.
3. Collect treats (fish, yarn, hearts) — reach **25** to win a round.
4. Avoid vacuums, puddles, and boxes. You have **3 lives**.
5. On win or game over, use **Adopt / Meet cats** (`#cats`) or **Donate** (`#help`) on the rescue site.

Honest framing: play for fun · support the rescue. The game does not process donations.

## Local preview

```bash
cd game   # or /workspace/cats-meow-game
python3 -m http.server 8776 --bind 0.0.0.0
```

Open http://127.0.0.1:8776/

## Branding

- Logos: `assets/catsm-logo.png`, `assets/logo-cats.png` (from live site)
- Colors: `--pri #B22222`, `--gold #D4A017`, `--ground #FFF9F2`, `--ink #2D1810`, etc.
- Fonts: Fredoka + Montserrat
- Contact on site: catsmeowcatrescue@gmail.com · (503) 850-6363 · Petfinder OR393

## Source note

Original Claude artifact could not be loaded (Cloudflare + frame 404). This is a reconstructed runner/collector (“Rescue Dash”) with rescue branding.
