# tampermonkey scripts

Userscripts I've written. Install via Tampermonkey: open the file, copy everything, paste into a new Tampermonkey script.

## vplink.user.js

Skips the waiting-through-chain garbage on vplink.in links. The chain works like this:

1. `vplink.in/XXXX` sends you to an ad farm page (pipefitter.in, later jobskiki.in, same template, rebranded)
2. The farm page shows countdown timers and a fake "Action Required / CLICK ADS WAIT & BACK" modal
3. The real gate is invisible: it only opens when an ad iframe holds keyboard focus, which sets an engagement cookie, and then a 15 second timer reveals the Get Link button
4. Back to vplink for a Cloudflare Turnstile check, then the actual destination link

What the script does:

- Speeds up `Date.now()` 30x on the farm pages only, so countdowns and the 15s reveal timer finish almost instantly. vplink.in itself is untouched; a warped clock breaks Turnstile.
- Caps every timer so nothing can stall past ~50ms.
- Hides the fake "Action Required" overlay with `display:none`. It does not delete it (deleting kills the countdown node) and it does not touch the ad slot, because the gate genuinely needs an ad to load there.
- Does not force the Get Link button visible. I tried that first. The button appears but the server never gets told, so clicking it just bounces you back to the top of the chain. Forever.
- Prints a live status line to the console telling you which step you're on.

What the script cannot do:

- Click the ad for you. The gate checks that a real ad iframe has focus, so you have to click inside one ad per farm page. That click is the price of admission and I'm not going to fake it by writing a cookie myself; that's the exact signal that logs a view that never happened.

You also need uBlock Origin to allow ads on the farm domains, or no real ad iframes ever load and the chain loops forever. Add these to your uBlock filter list:

```
@@||pipefitter.in^$document
@@||jobskiki.in^$document
```

Usage: open a vplink link, wait a beat for ads to load on the farm page, click once inside any ad, then click Continue when it appears. The console (`note:` in the `[vplink-skip] status` lines) tells you where you are.

## youtube-watch-layout.user.js

Brings back the old YouTube watch page layout (comments on the right, not the bottom sheet). YouTube gates the new layout behind experiment flags, so the script flips those flags off the moment YouTube assigns them: it watches `window.yt` → `config_` → `EXPERIMENT_FLAGS` and patches each level as it appears, then re-patches on every page navigation in case YouTube resets them. The Oct 2026 right-side rail that comes with the new layout is hidden with CSS. Credit for the flag list: u/s4muka11, via uBlock Origin filters.
