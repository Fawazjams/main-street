# Main Street — Stellic Pathfinders 2026 submission

---

## 500-word write-up

### The problem

Moving off campus is most students' first lease, and the market assumes more
time and more recourse than they have. Application fees run $50–75
a listing. Sublets are informal by nature. Roommates get found in group chats.
And underneath all of it, some of the listings aren't real.

Three failures do the damage, in order of how much:

1. **Ghost listings** — the unit doesn't exist, isn't for rent, or isn't the
   poster's to rent.
2. **Fee churning** — application fees collected over and over with no intent
   to lease.
3. **Deposit traps** — money taken before a viewing, then no lease.

A student can't check any of this. The records exist. They're just nowhere near
where students are actually looking.

### The solution

Main Street takes a rental link and checks it against public records, then puts
what it found onto a shared campus map.

Seven checks run in about two and a half seconds: the map pin against the stated
address, the address against the county appraisal roll, the rent against HUD's
fair-market benchmark, the post's payment language, its application fee, the
named contact against the state real-estate licence register.

It deliberately doesn't score. No risk number, no "verified safe" badge. Each
check states what the post claims beside what an independent source says, and
the reader draws the conclusion — because a reassuring badge is precisely when
a student stops reading.

On our demo listing, three independent facts land next to each other: the rent
is 45% below HUD's benchmark, the map pin sits 1.2 miles from the stated
address, and the title says $1,095 while the body says $1,025. We never call it
a scam. We don't have to.

### Business impact

Findings persist. A first check takes 2.6 seconds; the same link checked again
comes back in 0.3 seconds from the store and spends nothing. **The second
student to open a listing reads what the first one found.**

That's the compounding asset, and it unlocks the problem no single check can
see. Fee churning is only visible once you can spot one poster collecting fees
across many listings — a pattern that emerges from a corpus, never from one
lookup. Every check runs on free public data, so marginal cost per listing is
effectively zero — and the corpus compounds.

### Tech stack

Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui on Base UI, Phosphor
icons. Mapbox GL for the map, geocoding and walking routes. Supabase for the
shared corpus. Vercel.

Data: Travis County appraisal district, HUD Fair Market Rents, the US Census
geocoder, the Texas Real Estate Commission register, OpenStreetMap. Claude Haiku
reads listings from sites we have no parser for, at about $0.002 each.

### Limitations and what's next

Auth is next and gates the rest: the login screen is a prototype, and both
tours and group shortlists wait on it.

We can't verify photos. Reverse-image search is an index, not intelligence, and
the usable ones are paid, so we show the photos and say plainly that nothing
verifies they belong to the property.

Zillow, Apartments.com and Trulia block automated readers, so those go through
paste-the-text. County records are Travis County today; a second campus needs a
second adapter.

---

## 2-minute demo video script

Target 2:00. Roughly 300 words spoken at a normal pace. Timings are cumulative.

### 0:00 – 0:14 — Hook

> **[Screen: the landing page]**
>
> Moving out is most students' first lease. Application fees, sublets, finding
> people to room with — it's a lot.
>
> But the worst thing that can happen isn't a bad apartment. It's a listing
> that was never real.

### 0:14 – 0:30 — What it is

> **[Screen: click Get started → the checker tab]**
>
> Main Street is a housing map with a verification layer. You paste a listing
> link, and we check what we can independently — against public records, not
> opinions.

### 0:30 – 1:12 — The demo

> **[Screen: paste the 45th & Speedway Craigslist link, hit Check listing]**
>
> Seven checks, about two and a half seconds.
>
> **[Scroll the findings slowly — pause on each]**
>
> HUD says fair market rent for a two-bedroom here is $1,852. This one's asking
> $1,025 — forty-five percent under.
>
> The map pin the poster dropped is a mile and a quarter from the address they
> wrote.
>
> And the title says $1,095 while the body says $1,025.
>
> **[Beat]**
>
> Notice what we never do: we don't score it. No risk number, no "verified"
> badge. We show you what the post claims next to what the record says. Three
> facts sitting together do the work — and you draw the conclusion, which means
> you're still reading.

### 1:12 – 1:32 — Why it compounds

> **[Screen: switch to Map view, click the listing's pin]**
>
> That check is now on the shared campus map. Anyone who opens this listing
> reads what we found — instantly, without paying to find it again.
>
> **[Screen: re-paste the same link, show the instant result]**
>
> Same link, second time: three tenths of a second, straight from the store.

### 1:32 – 1:52 — The feature that sells it

> **[Screen: the "Walking to" dropdown — switch from Campus to Law]**
>
> And "distance to campus" is a lie. It's four hundred acres.
>
> **[Route redraws]**
>
> This listing is twenty minutes to the Tower — but six minutes to the law
> school. One number was hiding a sixteen-minute range.

### 1:52 – 2:00 — Close

> Every check here runs on free public records. It costs nothing per listing,
> and it gets better the more students use it.
>
> Main Street.

---

## Tools used

**Framework and UI**
- Next.js 16.3.1 (App Router, Turbopack), React 19.2.8, TypeScript
- Tailwind CSS v4, shadcn/ui on Base UI 1.7.0
- Phosphor Icons
- Claude Design (design system), Claude Code (development)

**Services**
- Mapbox GL JS — map, forward geocoding, walking directions, static images
- Supabase — Postgres for the shared listing and investigation corpus
- Vercel — hosting and deployment
- GitHub — source control
- Anthropic API (Claude Haiku 4.5) — reads listings from sites with no parser

**Public data sources — all free, no paid providers**
- Travis County Appraisal District (ArcGIS) — parcel records
- HUD Fair Market Rents API — rent benchmarks
- US Census Geocoder — address to county
- Texas Real Estate Commission via the Texas Open Data Portal — licence register
- OpenStreetMap (Nominatim, Overpass) — campus boundary and building locations

---

## Submission checklist

- [ ] Write-up (above)
- [ ] 2-minute demo video
- [ ] Working project link — `https://main-street-bay.vercel.app`
- [ ] Tools used (above)
