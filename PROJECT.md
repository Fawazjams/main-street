# Main Street

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

The npm package name is `main-street`. The project was called Arcosanti until
August 2026; the working directory on disk still uses the old name.

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
  checks/
    FmrLadder.tsx           HUD bedroom ladder with the rent drawn across it
    PinMap.tsx              Mapbox static image, both pins and the distance
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
    depositLanguage.ts      payment-language patterns in the body
    applicationFee.ts       fee amount and household total
    license.ts              Texas real estate licence register (TREC)
    parseWithClaude.ts      reads non-Craigslist listings and pasted text
    safeFetch.ts            SSRF-guarded outbound fetch, HTML to text
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
  contacts, the application fee, and the map pin from a live post.
- Six checks run, results render as claim vs found.
- **Deposit-trap language.** Four categories: irreversible payment methods,
  money before viewing, a poster who says they are not local, and a unit that
  cannot be shown. Matches are quoted in context with the reason each is worth
  a second read. Generic urgency ("available now", "act fast") is deliberately
  not matched — it appears in most honest ads, and flagging it would train the
  reader to skip this section.
- **Application fee.** Reads Craigslist's own field, falling back to the body,
  and multiplies a per-person fee by the bedroom count so the household total
  is visible before anyone applies.
- **Named contact.** Extracts a contact name and company the poster published,
  then looks them up in the Texas real estate licence register — TREC's data on
  the Texas Open Data Portal, free Socrata JSON API, no key, refreshed daily.
  An exact company match reads differently from a partial one, and a name shared
  by several licence holders says so rather than picking one.
- Checks that read the post rather than an outside source set `foundLabel` so
  the UI does not print "Records say" over the listing's own words.
- "Add to map" dedupes by source URL, so checking a seeded listing upgrades that
  card instead of dropping a second pin.

**Result presentation**
- Listing facts render as a chip row, findings as titled sections.
- Two checks draw rather than describe. The rent check plots HUD's whole bedroom
  ladder with the asking rent as a line across it, so a rent below every bar in
  the area reads before the sentence does. The pin check shows both points on
  one static map with the distance stated on it.
- Every finding carries a `why` explaining the pattern it looks for, collapsed
  behind "Why this matters". It explains the pattern, never judges the listing
  in front of it.

**Beyond Craigslist**
- The checker takes a link from any site, or the listing text pasted straight in.
- Craigslist keeps its free regex parser. Everything else goes to Claude with a
  Zod schema pinned via `output_config.format`, then through the same checks.
- Paste-the-text exists because the big sites are walled. Measured: Zillow,
  Apartments.com, Trulia, and HotPads all return **403** to a plain fetch,
  Realtor.com 429, Facebook 400. PadMapper and Zumper serve HTML fine. A copy
  and paste has no bot wall to hit.
- Needs `ANTHROPIC_API_KEY`; without it those paths report why and Craigslist
  is unaffected.

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

Listing 1 publishes a `$65 per person` application fee; the other two publish
none.

Listing 2 names "Norice Taylor, Apartment Finders" in its body. TREC returns
**NORICE CLAUDE TAYLOR, Broker Individual 391926-B, Active** — a real licensed
broker. The company is a partial match only (APEX APARTMENT FINDERS, LLC) and
the UI says so.

### Written but never executed on real positives

- **Deposit-trap language.** All three seed listings are clean, so the detector
  has only ever returned its no-hits result on live data. Every category was
  verified against synthetic scam text (Zelle, wire transfer, "out of the
  country", "cannot show the unit", "secure the unit") and all four fired, with
  no false positive on listing 1's "Available for move in ASAP!". A real
  positive listing would be worth capturing as a fixture.
- **Area-code region.** None of the three seed listings publish a phone number,
  so that branch has never fired.

### Not built

| | Needs |
|---|---|
| Fee-churn pattern detection | our own corpus over time; the fee itself is now extracted |
| Supabase auth + persistence | listings are in-memory, reset on reload |
| Caching by listing URL | — |
| "Where are you going to school?" landing page | — |
| Group tours + shared rent split | `perPersonRent` exists and cards show it |
| Photo reuse matching | SerpApi (~$75/mo) or our own hash index |
| Who a phone number belongs to | paid provider |
| Craigslist's gated reply contact | Bright Data or similar; captcha-gated |
| Photo provenance | reverse image search is an index, which no model has — SerpApi, or our own hash index once listings persist |
| Person research beyond the licence register | a paid provider, or one bounded Claude call with web search (~$0.05–0.10 each) |
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

`ANTHROPIC_API_KEY` is needed only to read listings from outside Craigslist.
`ANTHROPIC_MODEL` overrides the default `claude-opus-5` — a parse runs roughly
10-15K tokens, so Haiku or Sonnet cut the per-listing cost several-fold if that
matters more than accuracy.

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

**Urgency language is not matched, on purpose.** `depositLanguage.ts` looks for
irreversible payment methods, money before viewing, an absent poster, and a unit
that cannot be shown. It deliberately ignores "available now", "act fast",
"first come first served", and "ASAP". Those phrases appear in most honest
rental ads — seed listing 1 says "Available for move in ASAP!" — so matching
them would flag legitimate posts constantly and teach students to skip this
section entirely. A check that cries wolf is worse than no check. Adding urgency
patterns looks like an easy win and is not one.

**Checks that read the post do not say "Records say".** The claim-vs-found
layout implies an independent source confirmed something. `depositLanguage` and
`applicationFee` read the listing itself, so they either set `foundLabel` to
something honest or omit the comparison entirely. Never let a check restate the
post's own words under a heading that implies verification.

**The pin map is a static image, not a second live map.** It is a fact to look
at, not something to pan, and it keeps a whole `mapbox-gl` instance out of the
checker panel. Two gotchas on Mapbox's static endpoint: `padding` is only legal
with the `auto` viewport and returns 422 alongside an explicit one, and `auto`
zooms absurdly close when the two pins nearly coincide — so near-identical
points get a fixed centre and zoom instead.

**The investigate endpoint fetches user-supplied URLs, so it resolves the host
first.** `safeFetch.ts` looks the hostname up and rejects loopback, private,
link-local, and CGNAT addresses before any request goes out, follows redirects
manually so a hop cannot land somewhere private after the check, and refuses
non-http schemes. Without that, pasting `http://169.254.169.254/` would have
us fetching cloud metadata from inside our own network and handing it back.

**Claude reads listings; it never judges them.** `parseWithClaude.ts` turns a
page or pasted text into `ParsedListing` and stops there. Every finding still
comes from a public record. The model is a parser for sites we have not written
a parser for — it does not decide whether anything is a scam, and it does not
extract photo URLs, since a plausible-looking wrong URL is exactly the error
nobody would catch. The response schema is pinned with structured outputs
rather than requested in the prompt, which is the direct lesson from the Autumn
run inventing its own fields despite an explicit list.

**Contact lookups only ever use a name the poster published.** `license.ts`
reads `contactName`/`contactOrg` straight out of the post body and asks one
narrow question: does that name hold a Texas licence. It never derives a name
from an address, a phone number, or a map pin. Autumn's pipeline had a
reverse-address stage that surfaced whoever is on record living at a property;
that stage is deliberately absent here, because a dragged pin geocodes to a
neighbour's house and would publish a stranger's name beside the word "scam".
Also state the limit wherever the result appears: the register matches on name,
and anyone can type a licensed agent's name into a post.

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
