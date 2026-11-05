# PlayShe Host Design System

## 1. Product

PlayShe is a static PS4 exploit host covering firmware-specific browser, kernel,
payload, cache, and restore flows. The interface must stay usable on old PS4
WebKit engines while making cache and exploit state understandable.

## 2. Users and Jobs

- PS4 owners need the correct firmware route without selecting an incompatible engine.
- Returning users need an immediate offline launch with no decorative waiting delay.
- First-time users need visible cache progress and a clear next step after failure.
- Operators need a manual landing page and access to the previous payload menu.

## 3. Visual Direction

- Raw cyberpunk rental-kiosk aesthetic inspired by the approved concept.
- Black scanline background, cyan structure, magenta edge accent, yellow progress,
  and green selected/ready state.
- The original `PROPIL.png` PlayShe logo is the dominant brand element.
- Copy is terse: firmware, engine, cache size, state, progress, and action only.
- Angular cards and HUD-like panels replace polished dashboard surfaces.
- No long descriptions, marketing copy, glass panels, or corporate-style cards.

## 4. Layout

Layout: one document scroller; desktop uses a two-column cyberpunk console with
firmware cards on the left and one install/launch panel on the right. Phone layout
stacks the logo, cards, and process panel into one column. No nested scroller.

- Maximum content width: 1440px.
- Desktop card matrix: three columns by two rows.
- Right process panel: target, segmented progress, four stages, primary action.
- Phone layout: two firmware cards per row where space permits, otherwise one.

## 5. Components

### Cyber Shell

Scanline/grid background, large cropped PlayShe logo, firmware/connection tags,
and compact footer status.

### Firmware Matrix

Six angular cards. Each card carries only firmware, engine, cache size, and state.
The detected or active card uses the green target treatment.

### Process Console

Target firmware, segmented progress bar, Cache/WebKit/Kernel/GoldHEN stages, one
launch action, and two compact secondary actions.

### State Tags

Online/offline, detected firmware, installed/not installed, and current process.
Every state includes text and does not rely on colour alone.

## 6. Screen Briefs

### Landing

- Primary action: install/open the detected firmware host.
- Priority 1: logo and detected firmware.
- Priority 2: six firmware cards.
- Priority 3: progress/launch console.
- Left out on purpose: hero description, explanatory paragraphs, marketing
  statistics, compatibility essay, and repeated firmware descriptions.
- Required content: PlayShe logo, firmware cards, cache states, target firmware,
  progress, launcher action, payload link, and restore link.

### Firmware Host

- Uses the same dashboard as landing with the active firmware card selected.
- Primary action: launch or retry GoldHEN.
- Priority 1: progress and stage state.
- Priority 2: active firmware card.
- Priority 3: payload and restore shortcuts.
- Left out on purpose: metadata grid, event log, long instructions, and large
  status paragraphs.
- Required content: firmware, engine, cache size, segmented progress, four stages,
  launch/retry action, payload menu, restore, and compact 6.72 counters.

## 7. Tokens

### Colour

- `--bg`: near-black background.
- `--panel`: blue-black HUD panel.
- `--text`: cold white.
- `--muted`: steel-blue secondary text.
- `--cyan`: structure and primary action.
- `--magenta`: offset/shadow accent.
- `--green`: selected and ready target.
- `--yellow`: progress and active stage.
- `--danger`: failed state.
- `--line`: blue-gray panel boundary.

### Type

- Display: 34px desktop, 30px phone.
- Card firmware: 30px desktop, 24px phone.
- Panel heading: 15px uppercase.
- Body: 17px.
- Secondary: 13px.
- Caption: 11px uppercase.

### Spacing

Base unit: 4px. Allowed spacing values: 4, 8, 12, 16, 24, 32, 48, 64.

### Radius

- Panels use clipped 10-16px corners.
- Fallback browsers receive square/low-radius panels.

## 8. Constraints and Accepted Debt

- JavaScript on PS4-facing pages uses ES5 syntax.
- CSS avoids Grid, `min()`, container queries, and unsupported modern selectors.
- Arial/Arial Black are intentional system fonts to avoid network font loading and
  unsupported font behavior on older PS4 WebKit builds.
- Application Cache remains required because target PS4 browsers predate modern
  Service Worker support.
- Exploit-internal delays are preserved unless console testing proves removal safe.
- Desktop browser QA validates routing, cache state, and UI only; it cannot prove
  PS4 exploit success or kernel stability.
