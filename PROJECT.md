# Arcosanti

Student housing marketplace with a verification layer. Built for the Stellic
Pathfinders Challenge 2026.

Students paste a rental listing link, the app independently checks what it can
about the property and the contact, and verified listings accumulate onto a
shared campus map. The second student to look at a listing gets the first
student's findings.

Demo target is UT Austin. UT Dallas is the intended second test, mainly to prove
the county-records layer generalizes.

---

## The problems worth solving

Named in priority order by the project owner:

1. **Ghost listings** — the unit does not exist, is not for rent, or is not the
   poster's to rent.
2. **Fee churning** — application fees collected repeatedly with no real intent
   to lease.
3. **Deposit traps** — deposit taken before viewing, then no lease.

Note that only the first is primarily a *data* problem. Fee churning is a
pattern in our own accumulated corpus over time, and deposit traps live in the
language of the post. Neither needs a paid API, which is why they are the best
value remaining.

---

## Design principle: no scoring

**The app does not score, rank, or label listings.** No risk numbers, no
"verified safe" badges, no traffic lights. Each check states what the post
claims next to what an independent source says, and the reader draws the
conclusion.

Two reasons. A reassuring badge invites a student to stop reading, which is
exactly when they get hurt. And any score we compute is our opinion wearing the
costume of a fact — we would be accepting liability for a judgment the data does
not support.

A derived verdict banner was built and then deliberately removed. Do not
reintroduce one.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3.1, App Router, Turbopack |
| UI | React 19.2.8, TypeScript |
| Styling | Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.ts`) |
| Components | shadcn/ui — **on Base UI 1.7.0, not Radix** |
| Map | Mapbox GL JS |
| Backend | Next route handlers. Supabase planned, not wired |

The package name is `arcosanti` (lowercase) because npm rejects the capital in
the directory name.

---

## Architecture

```
app/
  page.tsx                  tab state + shell, owns the listings array
  layout.tsx
  api/investigate/route.ts  the checker endpoint (craigslist.org only)
components/
  MapView.tsx               sidebar + map panel
  MapCanvas.tsx             mapbox-gl, dynamic ssr:false
  ListingCard.tsx
  BackgroundChecker.tsx     claim-vs-found rendering
  ui/                       shadcn primitives
lib/
  types.ts                  Listing, perPersonRent
  seedListings.ts           three real Austin Craigslist posts
  geocode.ts                Mapbox forward geocoding
  checks/
    types.ts                Finding, ParsedListing, Investigation
    parseListing.ts         fetch + parse a Craigslist post
    pinDistance.ts          map pin vs stated address
    parcel.ts               Travis County appraisal records
    market.ts               Census geocoder -> HUD Fair Market Rent
    areaCode.ts             offline area-code region tagging
    investigate.ts          runs the checks concurrently
    toMapListing.ts         investigation -> map listing
  fixtures/
    autumn-dean-keeton.json a real Autumn response, kept as reference
```

Every check returns the same `Finding` shape, so adding one is a new file plus a
line in `investigate.ts`. Nothing downstream needs to know what a check does.

---

## Status

### Done

**Shell**
- Two tabs, Map view and Background checker. Tab state lives in `page.tsx`, not
  inside a tab component, so merging the two views later is a rearrange.
- Panels use `keepMounted` so switching tabs does not tear down the map.

**Map**
- Mapbox with `fitBounds` over the pins rather than a hardcoded center, so it
  survives the eventual school picker.
- Price-label pins, bidirectional selection between sidebar cards and pins.
- Listings without a location render in the sidebar with no pin rather than
  being placed at a guessed coordinate.

**Listings**
- Three real Austin Craigslist posts, coordinates from geocoding.
- `addressStatus: "published" | "on-request"` — a post that withholds its
  address until you make contact is a fact worth showing, not missing data.
- Listing 2 carries both `titlePrice` ($1,095) and `bodyPrice` ($1,025) because
  the post contradicts itself. Only the body figure divides evenly by two.

**Checker**
- `parseListing` pulls title, price, layout, sqft, posted date, photos, body,
  contacts, and the map pin from a live post.
- Four checks run concurrently, results render as claim vs found.
- "Add to map" dedupes by source URL, so checking a seeded listing upgrades that
  card instead of dropping a second pin.

### Verified against real listings

- Parse works on all three seed posts.
- Listing 1 resolves to Travis County parcel **0214070621**.
- Listing 3 skips every check cleanly; it publishes no address.
- HUD rent benchmark returns live 2026 data for the Austin-Round Rock-San Marcos
  MSA. `npm run check:hud` verifies the whole path and prints the raw payload.

**Three independent signals converge on listing 2**, which is the demo:

| | Listing 1 | Listing 2 |
|---|---|---|
| Rent vs HUD benchmark | 14% below | **45% below** |
| Pin vs stated address | 232 ft | **1.2 miles** |
| Title vs body price | consistent | **$1,095 vs $1,025** |

No single number declares listing 2 a scam, and the app never does either. Three
facts sitting next to each other do the work. That is the no-scoring principle
paying off, and it is worth showing exactly this way.

### Written but never executed

- **Area-code region.** None of the three seed listings publish a phone number,
  so that branch has never fired.

### Not built

| | Needs |
|---|---|
| Deposit-trap language check | nothing — body text is already parsed |
| Application fee extraction | nothing — it is in the markup already |
| Fee-churn pattern detection | our own corpus over time |
| Supabase auth + persistence | listings are in-memory, reset on reload |
| Caching by listing URL | — |
| "Where are you going to school?" landing page | — |
| Group tours + shared rent split | `perPersonRent` exists and cards show it |
| Photo reuse matching | SerpApi (~$75/mo) or our own hash index |
| Who a phone number belongs to | paid provider |
| Craigslist's gated reply contact | Bright Data or similar; captcha-gated |
| Person research | Autumn's API — the one piece not rebuildable from public records |
| UT Dallas | a second county adapter behind `parcel.ts` |

---

## Constraints

**Budget is zero.** No paid APIs. Everything currently wired is free public
records. Do not propose a paid provider as the default path for anything.

**Autumn AI was evaluated and dropped for housing.** A run took ~3.5 minutes and
cost 30–65 credits (500 → 251 across two runs), and the agent invented its own
output schema each time. It remains the right tool for person lookup. The key
is in `.env.local` and the captured response is in `lib/fixtures/`.

---

## Setup

```bash
cp .env.local.example .env.local   # then fill in the tokens
npm install
npm run dev
```

`NEXT_PUBLIC_MAPBOX_TOKEN` is required or the map shows a placeholder.
`HUD_API_TOKEN` is free from huduser.gov; without it the rent check reports
itself as not run. Both are set. Next reads env files only at boot, so restart
the dev server after changing them.

```bash
npm run lint && npm run build   # build is the real check on the mapbox SSR import
npm run check:hud               # pin -> county -> rent, prints HUD's raw payload
```

HUD's own docs show rents as strings ("948.0"); the live API returns numbers.
The parser handles both, but if that check ever starts reporting "not run",
`npm run check:hud` shows the raw response and the cause in one command.

---

## Decisions worth not relitigating

**Base UI tab panels, and the redundant `hidden` class.** `page.tsx` sets an
explicit `hidden` class on the inactive panel *in addition to* Base UI's own
attribute. This is not redundant. Base UI drops its `hidden` only after the
outgoing panel's animations settle, detected inside a `requestAnimationFrame`,
and rAF does not run in a backgrounded tab — without the class, both panels
stack on top of each other. Also: never put Tailwind's `flex` utility on a
panel, since it sits in a later cascade layer than the `[hidden]` base rule and
would win.

**Markers are gated on nothing.** Adding markers and moving the camera do not
require the Mapbox style to have loaded. An earlier version waited on
`map.on("load")` and rendered zero pins when that event was slow.

**Pipeline lives in Next route handlers, not a Python service.** Every check
finishes in seconds. A separate service only becomes necessary if the
captcha-gated browser stage is ever added, which is paid anyway.

**Craigslist needs no special browser.** A plain fetch with a browser user agent
returns the full post. The captcha only guards the reply contact, not the
listing.

**`NEXT_PUBLIC_MAPBOX_TOKEN` is also used server-side** in `geocode.ts`. It
works, but the geocoding quota rides on a token that ships in the browser
bundle. Add URL restrictions in Mapbox before this is public.

**Reverse-address lookups, if ever added, only run on a real street address.**
A fuzzed map pin geocodes to an approximate house and would name the wrong
residents. That stage surfaces real people's names and deserves more care than
the others.
