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
| Design | Claude Design project, imported into `globals.css` tokens |
| Map | Mapbox GL JS |
| Backend | Next route handlers. Supabase planned, not wired |

The npm package name is `main-street`. The project was called Arcosanti until
August 2026; the working directory on disk still uses the old name.

---

## Architecture

```
app/
  page.tsx                  landing page, a server component
  login/page.tsx            prototype login, no backend behind it
  start/page.tsx            map or checker
  app/page.tsx              tab state + shell, owns the listings array
  layout.tsx                Geist, Geist Mono and Lora via next/font
  globals.css               the palette, as shadcn tokens plus named ones
  api/investigate/route.ts  the checker endpoint (any URL, or pasted text)
  api/listings/route.ts     the shared map, with findings attached
components/
  Wordmark.tsx              the house and the name
  MapView.tsx               sidebar + map panel
  MapCanvas.tsx             mapbox-gl, dynamic ssr:false
  ListingCard.tsx
  BackgroundChecker.tsx     claim-vs-found rendering
  PhotoStrip.tsx            listing photos, lead image plus thumbnails
  ListingDetail.tsx         one listing: photos, split, walk, findings
  FindingList.tsx           claim-vs-record rendering, shared by both views
  GroupSizePicker.tsx       how many people are splitting the rent
  MajorPicker.tsx           which building the walk is measured to
  checks/
    FmrLadder.tsx           HUD bedroom ladder with the rent drawn across it
    PinMap.tsx              Mapbox static image, both pins and the distance
  ui/                       shadcn primitives
lib/
  types.ts                  Listing, perPersonRent
  accents.ts                card accent colours, derived from the listing id
  seedListings.ts           three real Austin Craigslist posts
  geocode.ts                Mapbox forward geocoding
  photos.ts                 Craigslist photo size variants
  campus.ts                 UT Austin outline and walking destination
  majors.ts                 major -> building, from OSM building centroids
  walk.ts                   Mapbox walking route to campus, cached
  db/
    client.ts               Supabase client, null when unconfigured
    listings.ts             listings + investigations read and write
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
public/art/                 the five illustrations the design ships with
scripts/
  check-hud.mjs             pin -> county -> HUD, prints the raw payload
  seed-db.mjs               loads the seed listings into Supabase
```

Every check returns the same `Finding` shape, so adding one is a new file plus a
line in `investigate.ts`. Nothing downstream needs to know what a check does.

---

## Status

### Done

**Look and feel**
- The whole app runs on the Claude Design project's palette: warm paper rather
  than white, green as the only action colour, and gold, blush and sky as
  accents that separate things without ranking them. Lora carries every heading,
  Geist the body, Geist Mono the small labels.
- It is one theme, stated once in `globals.css` as shadcn's own tokens, which is
  why button, badge, input and card picked up the design without being rewritten
  — the diff there is a pill size, two accent variants and a segmented-control
  tab variant.
- Five illustrations ship in `public/art/`, all served through `next/image`. The
  cut-out streetscape sits on a sky-coloured band rather than carrying its own
  sky, so the band is a token and not part of the artwork. Its height follows
  the image's aspect ratio up to a 340px ceiling rather than being fixed: a
  fixed band crops by an amount that depends on the viewport, and at 1900px a
  150px band was showing only the bottom sixth of the artwork. The ceiling is
  there because an uncropped band is 407px on a wide monitor, which pushed the
  call to action below the fold.

**Shell**
- Four screens, and they are real routes: `/` landing, `/login`, `/start`, and
  `/app`. The landing page is a server component and ships no JavaScript.
- Two tabs inside `/app`, Map view and Background checker. Tab state lives in
  `app/page.tsx`, not inside a tab component, so merging the two views later is
  a rearrange.
- Panels use `keepMounted` so switching tabs does not tear down the map.
- `/start` links to `/app` and `/app?tab=checker`. The tab rides in the URL with
  `replaceState` and the open listing with `pushState`, so back and forward move
  between listings rather than between tabs.
- The login screen is a prototype with nothing behind it: it checks both fields
  have something in them, keeps the name in `sessionStorage` for the greeting on
  `/start`, and continues. Nothing is guarded — typing `/app` straight into the
  address bar works. Replacing it is the standing P0.

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
- Seven checks run, results render as claim vs found.
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

**Photos**
- Craigslist's CDN has no hotlink protection — verified 200 `image/jpeg` with a
  foreign referer — so listing photos render directly, no proxy or re-hosting.
- Three sizes exist on the same URL: 300x300, 600x450, 1200x900. `photoAt()`
  swaps the suffix so a card thumbnail costs ~7KB instead of 75KB. No 50x50.
- Sidebar cards show a thumbnail; the checker shows a lead image with a
  thumbnail strip, each linking to the full size.
- This is only *displaying* the photos. Nothing checks whether they belong to
  the property — that needs a reverse-image index, which stays paid.

**Persistence**
- Supabase, with `listings` and `investigations` as separate tables. A listing
  is a place; an investigation is what someone learned about it on a given day.
  Keeping them apart is what makes the findings survive onto the shared map.
- Checking a listing saves it. Checking one that has already been checked
  returns the stored findings instantly, says who found them and when, and
  spends nothing — the accumulation claim, demonstrated rather than asserted.
- Every read and write goes through route handlers, never the browser. There is
  no auth yet, so the row-level policies are wide open; the server being the
  only caller is the one thing keeping the anon key off the client.
- The whole thing degrades: no Supabase means the seed listings and a "not
  saved yet" note, so a fresh clone still demos.
- `npm run db:seed` loads the three seed listings. Deliberately listings only,
  no findings — watching a check populate one is the demo.
- Live and verified against the `mainstreet` project. Measured: a first check
  runs in **2.6s** and stores seven findings; the same link checked again comes
  back from the store in **0.3s**, spending nothing. Re-checking matches on
  `source_url`, so it updates the listing rather than dropping a second pin.

**Listing detail**
- Clicking a pin or a card opens the listing in the sidebar: photos, layout,
  walk time, the rent split, and the full findings from whoever checked it.
- The open listing lives in the URL (`?listing=<id>`), so the view is
  shareable and survives a refresh, and back/forward move between listings.
  That link is what group invites will hang off.
- `FindingList` is shared with the checker, so a student arriving from the map
  sees exactly what the student who ran the check saw.

**Distance to campus**
- Every placed listing shows its walking time and distance to campus. Selecting
  one draws the real walking path as a dashed green line, with the campus
  outlined and filled in the same green.
- Directions rather than the Matrix API, even though Matrix would fetch every
  listing at once: the two disagree by a couple of minutes on the same pair, and
  a card reading "18 min" beside a line drawn as a 20-minute route is the kind
  of small lie that costs trust. One cached call per listing keeps the number
  and the drawn path the same thing.
- Walking only for now. Bikes and cars are the same endpoint with a different
  profile.
- The campus outline is the real OpenStreetMap boundary, fetched through
  Nominatim and simplified from 106 points to 38. OSM returns UT as eleven
  rings because the university owns land across Austin, so `campus.ts` keeps
  the ring containing the Tower. Overpass is unreachable from here; Nominatim
  with `polygon_geojson=1` is the route that works. Walking times measure to
  the Tower.
- Real figures: Dean Keeton is 20 min / 1.0 mi, 45th and Speedway 36 min /
  1.9 mi.

**Walking to your major**
- "Distance to campus" flattens 430 acres into one point. Picking a major moves
  the destination to that major's building, and every walking time and drawn
  route recomputes against it.
- 24 majors, each mapped to a named building whose coordinates come from
  OpenStreetMap via Overpass. The major-to-building mapping is a reasonable
  approximation, not gospel — departments share buildings and move.
- The spread is the point. From the Dean Keeton listing: **20 min** to the
  Tower, **6 min** to Townes Hall for Law, **18 min** to the Belo Center for
  Journalism, **22 min** to Sánchez for Education. A single "distance to
  campus" figure was hiding a 16-minute range.
- Routes are cached per origin *and* destination. Keying on origin alone would
  have served a Law student the Computer Science walk.
- **Building centroids route to the nearest entrance**, which is right for a
  named building and wrong for "campus in general" — the Tower's centroid sits
  inside the building and cost 7 minutes of detour, so that one entry uses the
  plaza outside. Two coordinates 21 metres apart, very different answers. Worth
  remembering when adding a major.

**Rent split**
- One group-size control for the whole sidebar, not per listing — a student
  searches as a group, and this is the value a real group replaces later.
- Deliberately independent of bedroom count. Students share rooms, and the
  question is "what do I pay", not "what does a bedroom cost".
- Cards show total next to your share once the group is bigger than one.

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

### What is missing, in priority order

**P0 — auth, and what it unlocks**

1. **Supabase auth.** Persistence is done; auth is not, and it is the
   prerequisite for tours and groups. It is also what lets the row-level
   policies stop being wide open. The screens now exist — `/login` and the
   `sessionStorage` read on `/start` are the only two places that fake it, so
   the swap is contained to those files plus a guard on `/app`.

**P1 — a judge notices these missing**

2. **Search and filters**: price, bedrooms, walking time. Three listings hide
   this; a real corpus makes it the first thing anyone reaches for.
3. **The school picker.** The landing page exists but the app is hardwired to UT
   Austin. `campus.ts` and `majors.ts` are already isolated for this, and it is
   what makes the pitch about students rather than about one campus.

**P2 — the named demo features**

4. **Tour scheduling.** Needs auth.
5. **Group invites and shared shortlists.** Needs auth. The largest build here.
   The group-size control is the seam it plugs into.

**P3 — rounds it out**

6. Saved listings / shortlist.
7. Bike and car travel times — same endpoint, different profile.
8. Majors for a second campus, once UT Dallas has a building list.

**Blocked on money**

- Photo reverse search — an index, not intelligence. SerpApi ~$75/mo.
- Who a phone number belongs to.
- Craigslist's gated reply contact — captcha, needs a paid browser.

**Unlocked by persistence, not money**

- Fee-churn detection: the same poster or phone collecting fees across many
  listings only becomes visible once a corpus accumulates.
- Photo reuse by perceptual hash across our own corpus.

**Known gaps in what already exists**

- The deposit-language check has never fired on a real scam listing, only on
  synthetic text. A genuine one is worth capturing as a fixture.
- UT Dallas needs a second county adapter behind `parcel.ts`.

### Not built

| | Needs |
|---|---|
| Fee-churn pattern detection | our own corpus over time; the fee itself is now extracted |
| Supabase auth | the screens exist and fake it; persistence itself is done |
| "Where are you going to school?" school picker | the landing page exists; it is single-campus |
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
Nothing else in the app calls a model, so a Craigslist-only demo spends nothing.
`ANTHROPIC_MODEL` overrides the default `claude-haiku-4-5`.

Measured, not estimated: a pasted listing is **1,223 in / 236 out** on Haiku,
about **$0.002** — roughly 10,000 pastes per $25. A full web page is bigger,
capped at 40K characters (~10K tokens), so about 1.2 cents each.

Supabase is live on the `mainstreet` project. Without
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` the map falls
back to the seed listings, says "not saved yet", and nothing persists. Use the
publishable key, never `service_role`. On a fresh project, apply the two tables
and their policies, then `npm run db:seed`.

`NEXT_PUBLIC_MAPBOX_TOKEN` is required or the map shows a placeholder.
`HUD_API_TOKEN` is free from huduser.gov; without it the rent check reports
itself as not run. Both are set. Next reads env files only at boot, so restart
the dev server after changing them.

```bash
npm run lint && npm run build   # build is the real check on the mapbox SSR import
npm run check:hud               # pin -> county -> rent, prints HUD's raw payload
npm run db:seed                 # load the seed listings; safe to re-run
```

HUD's own docs show rents as strings ("948.0"); the live API returns numbers.
The parser handles both, but if that check ever starts reporting "not run",
`npm run check:hud` shows the raw response and the cause in one command.

---

## Decisions worth not relitigating

**The checker endpoint is public, so it rations the paid path only.** It has no
auth, and it is the one thing in the app that can spend money, so it carries
two allowances per IP: thirty requests per ten minutes overall, and five per ten
minutes for anything that reaches a model. A Craigslist link is parsed by regex
and, once anyone has checked it, served from the store — free, and exactly what
a judge clicking around the demo does, so rationing it as hard as the paid path
would degrade the demo to protect nothing.

The limiter counts in memory, per serverless instance, so a burst spread across
warm lambdas gets a fresh allowance on each one and a distributed attack walks
through it. That is understood and accepted: it is a speed bump, not a security
boundary. The actual ceiling is that the Anthropic balance is prepaid with
auto-reload off, so the worst case is bounded by what is in the account rather
than by what a card will absorb. Upstash or Vercel's edge rate limiting would
count globally, and both cost money or an account.

**Per-request model cost is one shared constant.** `MAX_LISTING_CHARS` caps both
the fetched-page path and the pasted-text path at 12,000 characters. It was
40,000, which put a single request at roughly 1.2 cents and a $25 balance at
about two thousand requests. The two paths share the constant so the numbers
cannot drift; raising it raises the cost of being spammed, in direct proportion.

**`force` is not something a visitor gets to ask for.** It re-runs a check that
is already stored. The lookups it repeats are free, but they come from Travis
County, HUD, the Census and TREC, and letting anyone make those re-answer the
same question from one Vercel IP on demand is how that IP gets blocked — which
would break the checker for everyone, quietly. It is honoured only when
`RECHECK_SECRET` is set *and* the request carries a matching header. Unset,
which is the default and the state of every deployment, it is ignored entirely.


**The redesign kept the Base UI tab machinery.** The design file draws the tabs
as two plain buttons switching a variable. Porting that literally would have
thrown away `keepMounted` — the map would be torn down and rebuilt on every tab
switch — and re-inherited the both-panels-stacked bug the explicit `hidden`
class exists to fix. The pill treatment is a `variant` on `TabsList` instead, so
the design sits on top of the machinery rather than replacing it.

**The four screens are routes, not a `screen` variable.** The design file holds
them in one component's state, which is right for a design tool and wrong here:
`?listing=<id>` is the seam group invites hang off, and reconciling it with a
screen variable would have cost the shareable link. `/`, `/login`, `/start` and
`/app` keep it, and let the landing page be a server component that ships no
JavaScript.

**The findings chip stays neutral, against the design.** The design draws it
green for a check that ran and gold for one that found nothing. That is
defensible as check-status rather than verdict, but green and amber down a
column of findings is the traffic light this app exists not to show, and it is
the same affordance as the verdict banner that was built and deliberately
removed. All four states wear the same quiet chip; the words carry the
difference. The gold "Title says $1,095" chip on a card is different and stays —
it states a fact about the post and judges nothing.

**Card accents are derived from the listing id and mean nothing.** They exist so
adjacent cards in the sidebar are distinguishable. Keying them on array position
would have reshuffled every colour when the seed listings are replaced by the
shared map, which invites a reader to see a ranking that is not there. Green is
deliberately not in the rotation: it is the action colour and the colour of the
walking route, and a card wearing it would look picked out.

**One theme, and `@custom-variant dark` is load-bearing.** There is no dark
palette — a warm paper design has no honest dark counterpart, and half of one is
worse than none. But the shadcn primitives are peppered with `dark:` utilities,
and without redefining the variant against a `.dark` class nothing ever sets,
Tailwind's built-in variant would fire them off `prefers-color-scheme` and hand
a dark-mode visitor half a theme. Deleting that one line breaks the app for
everyone whose OS is in dark mode, and nothing in the light theme would show it.

**The map recoloured but kept `streets-v12`.** The campus fill, its outline, the
dashed walking route, the destination marker and the selected price pin are all
`#3d6b4f`, and the static pin-map in the checker matches: blush for the
poster-controlled pin, green for the address we resolved. One constant in
`MapCanvas.tsx` moves all three layers.

The base style was briefly changed to `light-v11`, which sits more quietly under
the cream, and changed back. `light-v11` thins out street labels at the zooms
this app actually uses, and cross-street names are the thing a student reads to
work out where a listing is. A calmer map is not worth less legible streets.
Swapping it is one line in each of `MapCanvas.tsx` and `checks/PinMap.tsx` if
that judgement ever changes.


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

**Haiku is the default model, deliberately.** The schema is pinned by structured
outputs, so the model transcribes into a fixed shape rather than reasoning —
the task class small models are strongest at. Opus 5 also runs adaptive thinking
by default, billing reasoning tokens at Opus output rates for a job that needs
none. `ANTHROPIC_MODEL` overrides it when a gnarly page justifies ~5x the cost.

**Parsed listings are cached by a hash of their text.** In memory for now, so it
dies with the server. This is the seed of the cache that belongs in Supabase,
where it stops being an optimisation and becomes the feature: the second student
to open a listing pays nothing to read it.

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

**Two Mapbox tokens, and the reason is Referer.** The map, the walking routes
and the static pin image all run in the browser, so the public token has to ship
in the JavaScript bundle where anyone can lift it off a deployed page. The
answer to that is a URL restriction — except `geocode.ts` runs on the server,
server requests carry no Referer, and a URL-restricted token rejects them. The
failure would be silent and total: every listing stops getting a pin, and the
pin-vs-address and rent-vs-benchmark checks skip on all of them.

So `MAPBOX_SERVER_TOKEN` is a second token, geocoding scope only, unrestricted,
never prefixed `NEXT_PUBLIC_`. `geocode.ts` falls back to the public token when
it is unset, so a fresh clone still works with one token — and logs once when it
does, because that fallback is precisely what breaks the day someone adds the
URL restriction.

**Reverse-address lookups, if ever added, only run on a real street address.**
A fuzzed map pin geocodes to an approximate house and would name the wrong
residents. That stage surfaces real people's names and deserves more care than
the others.
