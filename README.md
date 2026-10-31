# Sorry, Aditi — from the guy you met two years ago

A small, phone-first browser apology built around the site `paws-pepper-and-pardon.lovable.app`.

The page opens straight into the game — no intro gate, no “Begin the trial” button. Pop twelve balloons to unlock the real apology. Four of them are **hot** — the actual sorries — and cannot be popped in anger. Press and hold, breathe for 1.2 seconds, and they pop calmly. Finish the balloons to unlock the letter, the promise list, a then/now/plan card, and a printable Certificate of Forgiveness.

## Run locally

```bash
python -m http.server 4173 --directory apology-game
```

Open `http://localhost:4173/`.

## Features

- Opens directly into the personalized game — no start button or gate
- 12 balloons, 3 note categories, shuffled positions on every run
- Hold-to-breathe mechanic for the 4 "actual sorry" balloons
- Forgiveness meter with changing levels
- Two-year narrative woven through the hero, confession, letter, promises, and certificate
- Accessible balloon buttons, focus-trapped modals, reduced-motion support
- Synthesised pop/breathe sounds with a mute toggle
- Printable certificate, Web Share / clipboard share
- Mobile-first bottom-sheet modals and two-column balloon grid

Made for Aditi only — no personalization form, no generic template.

No build step, no dependencies, no backend.
