# Main Street — Stellic Pathfinders 2026 submission

---

## 500-word write-up

> Prompt: *Describe the problem you identified, your solution, and the impact it
> would have.* Three things — so three sections and nothing else. Tech stack and
> roadmap belong in the tools list and the demo, not here.

### The problem

Four friends of mine at UT Austin applied for the same house. Each paid a $50
application fee — $200 between them. The plan fell through, the fees weren't
refunded, and by the time they started over the good listings were gone. They
signed somewhere worse and pay a few hundred more a month for it. Nobody
defrauded them. The market simply charges you to find out.

A friend at Purdue described the other half: you start looking six to eight
months ahead, and the hard part isn't finding listings — it's getting four people
to agree on which places to tour, and when.

Both are expensive. The third failure isn't survivable: some listings were never
real. Three patterns, in order.

1. **Ghost listings** — the unit isn't real, isn't for rent, or isn't theirs to rent.
2. **Fee churning** — fees collected repeatedly with no intent to lease.
3. **Deposit traps** — money taken before a viewing, then no lease.

A student has no way to check any of it. The records that would settle it exist —
county property rolls, federal rent benchmarks, state licence registers — just
nowhere near where students look.

### The solution

Main Street takes a rental link, checks it against those public records, and puts
what it found onto a shared campus map.

Seven checks run in about two and a half seconds, and three speak directly to my
friends' $200. We pull the application fee out of the post and multiply it by the
household, so the real cost shows before anyone pays — our demo listing
advertises $65 a person, $260 for four, and never says so. We compare the rent to
HUD's fair-market benchmark, so overpaying is legible rather than a hunch. And we
check the pin against the stated address, that address against the county roll,
and the named agent against the state licence register.

It does not score. No risk number, no "verified" badge — each check states what
the post claims beside what an independent source says, because a reassuring
badge is exactly when someone stops reading. On
our demo listing three facts land together: rent 45% below benchmark, a pin 1.2
miles from the stated address, a title saying $1,095 over a body saying $1,025.
We never call it a scam. We don't have to.

### The impact

The findings stay. A first check takes 2.6 seconds; the same link checked again
comes back in 0.3 seconds from our store, spending nothing. The second student to
open that listing reads what the first one found, so covering a campus gets
cheaper as more students use it rather than costing each of them again.

It is also the only way to catch fee churning: one poster collecting $50 from a
dozen applicants is invisible in a single lookup and obvious across a corpus. The
fee is already extracted; the pattern arrives with volume.

Everything runs on free public records: a check costs a fraction of a cent
against a $400 median loss. And with accounts, this same map becomes what my
friend at Purdue needed — one shortlist, one group, one set of tours.

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
