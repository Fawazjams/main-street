# Main Street — Stellic Pathfinders 2026 submission

---

## 500-word write-up

### The problem

Four friends of mine at UT Austin applied for the same house. Each paid a $50
application fee — $200 between them. The plan fell through, the fees weren't refunded, and
by the time they started over the good listings were gone. They signed somewhere
worse and pay a few hundred more a month for it. Nobody defrauded them. The
market just charges you to find out.

A friend at Purdue described the other half: you start looking six to eight
months ahead, and the hard part isn't finding listings — it's getting four people
to agree on which places to tour, and when.

Underneath both sits the failure that takes real money: listings that were never
real. Three patterns, in order:

1. **Ghost listings** — the unit isn't real, isn't for rent, or isn't theirs to rent.
2. **Fee churning** — fees collected again and again with no intent to lease.
3. **Deposit traps** — money taken before a viewing, then no lease.

A student can't check any of it, and 18-to-29-year-olds are 42% likelier than
other renters to lose money to a fake listing. The records that would settle it
exist — just nowhere near where students look.

### The solution

Main Street takes a rental link, checks it against public records, and puts what
it found onto a shared campus map.

Seven checks run in about two and a half seconds, and three speak directly to my
friends' $200. We read the application fee out of the post and multiply it by the
household, so the real number is visible before anyone pays: our demo listing
advertises $65 per person — $260 for four — and never says so. We compare the
asking rent to HUD's benchmark, so overpaying is legible rather than a hunch. And
we check the pin against the stated address, that address against the county
appraisal roll, and the named agent against the state licence register.

It doesn't score. No risk number, no "verified" badge — each check states what
the post claims beside what an independent source says. On our demo listing three
facts land together: rent 45% below benchmark, pin 1.2 miles from the stated
address, title saying $1,095 over a body saying $1,025. We never call it a scam.
We don't have to.

### Business impact

Findings persist. A first check takes 2.6 seconds; the same link again returns in
0.3 seconds from the store, spending nothing. The second student reads what the
first one found.

It's also the only way to catch fee churning: one poster collecting fees across
many listings is invisible in one lookup and obvious in a corpus. Every check
runs on free public data.

### Tech stack

Next.js 16, React 19, TypeScript, Tailwind, Supabase, Mapbox, Vercel. Public data
from Travis County, HUD, the US Census, the Texas Real Estate Commission and
OpenStreetMap. Claude Haiku reads listings from sites we have no parser for,
$0.002 each.

### Limitations and what's next

Tours and shared shortlists are the Purdue half of the problem, and they aren't
built. They need accounts, which is what I'm building next; the group rent split
and the shareable listing link are the seams they plug into.

We can't verify photos: reverse-image search is an index, not intelligence, and
the usable ones are paid. Zillow and Apartments.com block automated readers, so
those go through paste-the-text. County records are Travis County only.

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
