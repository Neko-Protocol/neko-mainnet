import type { ShareTweetParams } from "@/lib/share";
import { generateShareTweet } from "@/lib/share";
import { cn } from "@/lib/utils";

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("h-[15px] w-[15px] shrink-0", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export type ShareOnXButtonProps = ShareTweetParams & {
  className?: string;
  label?: string;
};

export function ShareOnXButton({
  amount,
  vaultName,
  apy,
  shareId,
  className,
  label = "Share on X",
}: ShareOnXButtonProps) {
  const href = generateShareTweet({ amount, vaultName, apy, shareId });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-black px-4 py-3 text-sm font-semibold text-white transition-colors duration-150",
        "hover:bg-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400/80",
        className
      )}
    >
      <XIcon />
      {label}
    </a>
  );
}
