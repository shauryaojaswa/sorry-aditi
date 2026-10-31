# Sorry, Aditi — an apology you can play

A small, phone-first browser game built around the apology site `paws-pepper-and-pardon.lovable.app`.

Pop twelve balloons to unlock the real apology. Three of them are **hot** — the actual sorries — and cannot be popped in anger. Press and hold, breathe for 1.2 seconds, and they pop calmly. Finish the trial to unlock the letter, the promise list, and a printable Certificate of Forgiveness.

## Run locally

```bash
python -m http.server 4173 --directory apology-game
```

Open `http://localhost:4173/`.

## Features

- 12 balloons, 3 note categories, shuffled positions on every run
- Hold-to-breathe mechanic for the 3 "actual sorry" balloons
- Forgiveness meter with changing levels
- Accessible balloon buttons, focus-trapped modals, reduced-motion support
- Synthesised pop/breathe sounds with a mute toggle
- Personalised recipient name (`?to=Priya` also works)
- Printable certificate, Web Share / clipboard share
- Mobile-first bottom-sheet modals and two-column balloon grid

No build step, no dependencies, no backend.
