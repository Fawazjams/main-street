"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";

/**
 * Which half of the app do you want.
 *
 * The two tabs still live side by side once you are inside, so this is a
 * doorway rather than a fork - it exists because "check a listing someone sent
 * me" and "browse what has already been checked" are different errands, and
 * landing on the wrong one costs a click and a moment of confusion.
 */
export default function StartPage() {
  const router = useRouter();
  const [name, setName] = useState("there");

  useEffect(() => {
    // sessionStorage is only readable in the browser, so this cannot happen
    // during render without a hydration mismatch. Reading an external store is
    // exactly what the rule permits an effect for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(sessionStorage.getItem("ms.email")?.split("@")[0] || "there");
  }, []);

  function logout() {
    sessionStorage.removeItem("ms.email");
    router.push("/");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <header className="flex items-center justify-between gap-6 border-b border-line px-6 py-4 sm:px-8">
        <Wordmark />
        <Button variant="ink" size="pill-sm" onClick={logout}>
          Log out
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <p className="mb-1.5 text-[13px] text-muted-ink">Welcome back, {name}</p>
        <h1 className="mb-10 text-center font-heading text-[28px] font-semibold">
          Where do you want to go?
        </h1>

        <div className="grid w-full max-w-[760px] gap-6 sm:grid-cols-2">
          <Link
            href="/app"
            className="flex flex-col gap-4 rounded-3xl border-2 border-sky bg-panel p-8 no-underline transition-colors hover:bg-sky-tint"
          >
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-sky text-ink">
              <MapTrifoldIcon size={26} aria-hidden />
            </div>
            <div>
              <h2 className="mb-2 font-heading text-[19px] font-semibold text-ink">
                Map view
              </h2>
              <p className="text-sm leading-relaxed text-body">
                See every checked listing near campus, walking times, and rent splits on
                one shared map.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#3E6C8E]">
              Open map
              <ArrowRightIcon size={14} weight="bold" aria-hidden />
            </span>
          </Link>

          <Link
            href="/app?tab=checker"
            className="flex flex-col gap-4 rounded-3xl border-2 border-blush bg-panel p-8 no-underline transition-colors hover:bg-blush-tint"
          >
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-blush text-ink">
              <MagnifyingGlassIcon size={24} aria-hidden />
            </div>
            <div>
              <h2 className="mb-2 font-heading text-[19px] font-semibold text-ink">
                Background checker
              </h2>
              <p className="text-sm leading-relaxed text-body">
                Paste any listing and see what we can independently verify before you
                reach out.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-alert">
              Open checker
              <ArrowRightIcon size={14} weight="bold" aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
