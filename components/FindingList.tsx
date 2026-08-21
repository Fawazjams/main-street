"use client";

import { FmrLadder } from "@/components/checks/FmrLadder";
import { PinMap } from "@/components/checks/PinMap";
import type { Finding, FindingState } from "@/lib/checks/types";

/**
 * The findings, rendered as claim against record.
 *
 * Shared between the checker and a listing's detail panel, because a student
 * arriving at a listing from the map should see exactly what the student who
 * checked it saw — not a summary of it.
 */

const STATE_LABEL: Record<FindingState, string> = {
  found: "Checked",
  "not-found": "No record",
  skipped: "Not run",
  error: "Failed",
};

// One neutral treatment for every state. The design draws this chip green when
// a check ran and gold when it found nothing, which reads as pass and warn down
// a column of findings — the traffic light this app exists not to show. A
// lookup that merely succeeded is not reassurance, so all four states wear the
// same quiet chip and the words carry the difference.
const CHIP =
  "shrink-0 rounded-full border border-line bg-soft px-2.5 py-0.5 text-[11px] text-body";

// The section's own name.
const SECTION_LABEL =
  "text-[11px] font-bold uppercase tracking-[0.06em] text-muted-ink";

// The two column headings inside it, a step quieter so the values read first.
const FIELD_LABEL = "text-[11px] font-bold uppercase tracking-[0.06em] text-faint";

export function FindingList({ findings }: { findings: Finding[] }) {
  return (
    <div className="space-y-4">
      {findings.map((finding) => (
        <section
          key={finding.id}
          className="rounded-2xl border border-line bg-panel p-[18px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5">
            <h4 className={SECTION_LABEL}>{finding.label}</h4>
            <span className={CHIP}>{STATE_LABEL[finding.state]}</span>
          </div>

          {finding.claim && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className={FIELD_LABEL}>The post says</p>
                <p className="mt-1 text-sm text-ink">{finding.claim}</p>
              </div>
              <div>
                <p className={FIELD_LABEL}>{finding.foundLabel ?? "Records say"}</p>
                <p className="mt-1 text-sm text-ink">{finding.found ?? "—"}</p>
              </div>
            </div>
          )}

          {finding.data?.kind === "fmr-ladder" && (
            <FmrLadder
              bars={finding.data.bars}
              listingPrice={finding.data.listingPrice}
              area={finding.data.area}
              year={finding.data.year}
            />
          )}
          {finding.data?.kind === "pin-map" && (
            <PinMap
              pin={finding.data.pin}
              geocoded={finding.data.geocoded}
              miles={finding.data.miles}
              address={finding.data.address}
            />
          )}

          {finding.note && (
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink">
              {finding.note}
            </p>
          )}
          {finding.reason && (
            <p className="mt-3 text-sm text-muted-ink">{finding.reason}</p>
          )}

          {finding.why && (
            <details className="group mt-3">
              <summary className={`cursor-pointer list-none hover:text-body ${FIELD_LABEL}`}>
                <span className="inline-block transition-transform group-open:rotate-90">
                  ›
                </span>{" "}
                Why this matters
              </summary>
              <p className="mt-2 border-l-2 border-line pl-3 text-sm leading-relaxed text-body">
                {finding.why}
              </p>
            </details>
          )}

          {finding.source && (
            <p className="mt-3 text-[11px] text-faint">
              Source:{" "}
              {finding.source.url ? (
                <a
                  href={finding.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-body"
                >
                  {finding.source.label}
                </a>
              ) : (
                finding.source.label
              )}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
