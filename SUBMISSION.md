# Main Street — Stellic Pathfinders 2026 submission

---

## 500-word write-up

> Prompt: *Describe the problem you identified, your solution, and the impact it
> would have.* Hard limit 500 words; this is **494**, and 495 even on a counter
> that splits hyphenated words. Three things, so three sections and nothing else —
> the tech stack has its own section below.

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

A student has no way to check any of it. The records that would settle it —
county property rolls, federal rent benchmarks, state licence registers — exist
nowhere near where students look.

### The solution

Main Street takes a rental link, checks it against those public records, and puts
what it found onto a shared campus map.

Seven checks run in about two and a half seconds, and three speak directly to my
friends' $200. We pull the application fee out of the post and multiply it by the
household, so the real cost shows before anyone pays — our demo listing
advertises $65 a person, $260 for four, and never says so. We compare the rent to
HUD's fair-market benchmark, so overpaying is legible. And we check the pin
against the stated address, that address against the county roll,
and the named agent against the state licence register.

It does not score. No risk number, no "verified" badge — each check states what
the post claims beside what an independent source says, because a badge is
exactly when someone stops reading. On
our demo listing three facts land together: rent 45% below benchmark, a pin 1.2
miles from the stated address, a title saying $1,095 over a body saying $1,025.
We never call it a scam. We don't have to.

### The impact

The findings stay. A first check takes 2.6 seconds; the same link checked again
comes back in 0.3 seconds from our store, spending nothing. The second student to
open that listing reads what the first one found, so covering a campus gets
cheaper the more students use it.

It is also the only way to catch fee churning: one poster collecting $50 from a
dozen applicants is invisible in one lookup and obvious across a corpus. The fee
is already extracted; the pattern needs only volume.

Everything runs on free public records: a check costs a fraction of a cent
against a $400 median loss. And with accounts, this same map becomes what my
friend at Purdue needed — one shortlist, one group, one set of tours.

## Tech stack

*Its own written section on the form — kept out of the 500 words and out of the
demo.*

**The shape of it.** Every check is a Next.js route handler, not a separate
service: the slowest lookup finishes in about two seconds, so the whole
investigation fits inside one request. Each check returns the same `Finding`
shape — a claim, what an independent source says, and a source link — so adding
a check is a new file plus one line, and nothing downstream needs to know what
any check does.

**Free public records, deliberately.** Travis County's appraisal district for
parcels, HUD for fair-market rents, the US Census geocoder to resolve an address
to a county, and the Texas Real Estate Commission's licence register through the
Texas Open Data Portal. Campus boundaries and building locations come from
OpenStreetMap. No paid provider is wired into anything, so the marginal cost of
checking a listing is zero and stays zero.

**Where a model is and isn't used.** Craigslist has one stable page shape, so a
regex parser reads it for nothing. Everywhere else, Claude Haiku turns a page or
pasted text into the same structured record, with the schema pinned by structured
outputs so the model transcribes rather than invents. It never judges a listing —
every finding still comes from a public record. That path costs about $0.002.

**Persistence is the product, not the plumbing.** Supabase holds listings and
investigations as separate tables: a listing is a place, an investigation is what
someone learned about it on a given day. Keeping them apart is what lets findings
survive onto the shared map and what will make fee-churn patterns visible once
the corpus grows.

**Front end.** Next.js 16 and React 19 in TypeScript, Tailwind v4, shadcn/ui on
Base UI, Phosphor icons, Mapbox GL for the map and walking routes. Deployed on
Vercel.

**Because the checker is public.** It resolves every user-supplied URL and
refuses private addresses before fetching, so pasting a cloud-metadata address
gets you nothing. It rations the paid path per IP, caps how much text can reach a
model, and runs two Mapbox tokens — the browser one can be locked to our domain
without breaking server-side geocoding, which carries no referer.

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

- [ ] Write-up — problem, solution, impact (494 words, limit 500)
- [ ] Tech stack — its own written section
- [ ] Tools used — the list
- [ ] 2-minute demo video
- [ ] Working project link — `https://main-street-bay.vercel.app`
