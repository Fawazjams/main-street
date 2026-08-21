import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The house and the name, together.
 *
 * One component rather than four copies, because it appears in the marketing
 * header, the app header, the login card and the chooser, and the two are
 * always sized against each other.
 */
export function Wordmark({
  size = "default",
  className,
}: {
  size?: "default" | "sm";
  className?: string;
}) {
  const small = size === "sm";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/art/logo-house.png"
        alt=""
        width={874}
        height={285}
        priority
        className={cn("w-auto", small ? "h-[26px]" : "h-[30px]")}
      />
      <span
        className={cn(
          "font-heading font-semibold text-ink",
          small ? "text-base" : "text-[19px]",
        )}
      >
        Main Street
      </span>
    </div>
  );
}
