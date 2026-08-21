import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The landing page.
 *
 * A server component on purpose: it holds no state, and everything below is
 * static, so none of it needs to reach the browser as JavaScript.
 */

const STEPS = [
  {
    step: "Step 1",
    title: "Paste a link",
    body: "Any rental listing link, or the text itself if the site blocks automated readers.",
    art: "/art/step-1-paste-link.png",
    alt: "A friendly computer showing a link",
    surface: "bg-blush",
    ink: "text-ink",
    frame: "bg-white/35",
    eyebrow: "text-ink/60",
  },
  {
    step: "Step 2",
    title: "Checks run",
    body: "Independent checks against public records: county rolls, HUD rent benchmarks, the state licence register.",
    art: "/art/step-2-checks-run.png",
    alt: "A magnifying glass checking papers",
    surface: "bg-green",
    ink: "text-cream",
    frame: "bg-white/12",
    eyebrow: "text-cream/65",
  },
  {
    step: "Step 3",
    title: "Joins the map",
    body: "Checked once, useful to everyone after: the next student who opens it reads what you found.",
    art: "/art/step-3-joins-map.png",
    alt: "A map pin in a green landscape",
    surface: "bg-sky",
    ink: "text-ink",
    frame: "bg-white/35",
    eyebrow: "text-ink/60",
  },
];

// Priority order, and it is the order PROJECT.md names them in.
const PROBLEMS = [
  {
    title: "Ghost listings",
    body: "The unit doesn't exist, isn't for rent, or isn't the poster's to rent.",
    surface: "bg-blush",
  },
  {
    title: "Fee churning",
    body: "Application fees collected repeatedly with no real intent to lease.",
    surface: "bg-gold",
  },
  {
    title: "Deposit traps",
    body: "Deposit taken before a viewing, then no lease.",
    surface: "bg-sky",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <header className="flex items-center justify-between gap-6 border-b border-line px-6 py-4 sm:px-8">
        <Wordmark />
        <Link
          href="/login"
          className={cn(buttonVariants({ size: "pill" }), "uppercase tracking-[0.05em]")}
        >
          Log in
        </Link>
      </header>

      {/*
        The art is cut out — 23% of it is transparent and the top tenth is
        empty — so the sky is the band behind it rather than part of the image.

        Height follows the width rather than being fixed, up to a ceiling. A
        fixed 150px band plus object-cover threw away everything above the
        ground floor, and how much it cropped depended on the viewport — at
        1900px the image renders 407px tall, so five sixths of it was gone.

        The ceiling exists because the band is not the point of the page. Left
        unbounded it is 407px on a 1900px monitor, which pushed the call to
        action below the fold. At 340px the art is uncropped at any width up to
        1571px — every normal laptop — and beyond that it trims the roof tips
        rather than the whole upper storey.
      */}
      <div className="bg-sky">
        <Image
          src="/art/neighborhood-streetscape.png"
          alt="Illustration of a neighbourhood streetscape"
          width={1073}
          height={232}
          priority
          className="block h-auto max-h-[340px] w-full object-cover object-bottom"
        />
      </div>

      <section className="px-6 pt-12 pb-24 text-center">
        <div className="mx-auto max-w-[1000px]">
          <p className="mb-5 text-[11px] font-bold tracking-[0.1em] text-muted-ink uppercase">
            Student housing near your campus
          </p>
          <h1 className="mb-6 font-heading text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl md:text-[52px] lg:text-[64px]">
            Every listing gets a little safer once someone&rsquo;s looked.
          </h1>
          <p className="mx-auto mb-9 max-w-[760px] text-lg leading-relaxed text-pretty text-body lg:text-xl">
            Paste a rental link, and we independently check what we can about the property
            and the contact. It joins a shared map, so the next student who finds it reads
            what you found instead of paying to find it again.
          </p>
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "pill-lg" }), "uppercase")}
          >
            Get started
          </Link>
        </div>
      </section>

      <section className="px-6 pt-3 pb-24">
        <div className="mx-auto max-w-[1020px]">
          <h2 className="mb-11 text-center font-heading text-3xl font-semibold">
            How it works
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.step}
                className={cn("rounded-3xl px-7 py-8", step.surface, step.ink)}
              >
                <p
                  className={cn(
                    "mb-2.5 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase",
                    step.eyebrow,
                  )}
                >
                  {step.step}
                </p>
                <h3 className="mb-3 font-heading text-xl font-semibold">{step.title}</h3>
                <div
                  className={cn(
                    "mb-3.5 flex h-[90px] items-center justify-center rounded-xl",
                    step.frame,
                  )}
                >
                  <Image
                    src={step.art}
                    alt={step.alt}
                    width={857}
                    height={291}
                    className="h-4/5 w-4/5 object-contain"
                  />
                </div>
                <p className="text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-[1040px]">
          <h2 className="mb-2 text-center font-heading text-3xl font-semibold">
            Three problems worth solving
          </h2>
          <p className="mb-6 text-center text-sm text-muted-ink">
            In priority order, and only the first is really a data problem.
          </p>

          {/* Three arrows fanning out of one point. Only meaningful once the
              cards are side by side, so it goes with the single-column layout. */}
          <svg
            viewBox="0 0 1040 56"
            aria-hidden="true"
            className="mb-2 hidden h-14 w-full overflow-visible md:block"
          >
            <defs>
              <marker
                id="probArrow"
                markerWidth="8"
                markerHeight="8"
                refX="4"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="#2B2115" />
              </marker>
            </defs>
            <path
              d="M520,0 C520,20 170,20 170,48"
              stroke="#2B2115"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#probArrow)"
            />
            <path
              d="M520,0 L520,48"
              stroke="#2B2115"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#probArrow)"
            />
            <path
              d="M520,0 C520,20 870,20 870,48"
              stroke="#2B2115"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#probArrow)"
            />
          </svg>

          <div className="grid gap-5 md:grid-cols-3">
            {PROBLEMS.map((problem) => (
              <div
                key={problem.title}
                className={cn("rounded-3xl px-7 py-7 text-ink", problem.surface)}
              >
                <h3 className="mb-2.5 font-heading text-lg font-semibold">
                  {problem.title}
                </h3>
                <p className="text-sm leading-relaxed">{problem.body}</p>
              </div>
            ))}
          </div>

          {/* The no-scoring principle, stated on the way in rather than
              discovered later. */}
          <div className="mt-7 rounded-2xl border border-dashed border-line-strong bg-soft px-7 py-6">
            <p className="text-[13px] leading-[1.7] text-body">
              <span className="font-bold text-ink">
                We don&rsquo;t score, rank, or label listings.
              </span>{" "}
              Each check states what the post claims next to what an independent source
              says. You draw the conclusion.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-ink px-6 pt-18 text-center">
        <h2 className="mb-6 font-heading text-[28px] font-semibold text-cream">
          Ready to check your first listing?
        </h2>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "gold", size: "pill-lg" }),
            "uppercase",
          )}
        >
          Get started
        </Link>
      </section>
      <div className="bg-cream pt-7">
        <Image
          src="/art/neighborhood-streetscape.png"
          alt=""
          width={1073}
          height={232}
          className="block h-[90px] w-full object-cover object-bottom"
        />
      </div>
    </div>
  );
}
