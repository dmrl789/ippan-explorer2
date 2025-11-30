import Link from "next/link";
import { isHashTimerId, shortHashTimer } from "@/lib/hashtimer";

interface HashTimerValueProps {
  id: string;
  short?: boolean;
  shortSize?: number;
  noLink?: boolean;
  className?: string;
  linkClassName?: string;
}

export function HashTimerValue({
  id,
  short = false,
  shortSize = 8,
  noLink = false,
  className,
  linkClassName
}: HashTimerValueProps) {
  const value = id?.trim() ?? "";

  if (isHashTimerId(value)) {
    const content = short ? shortHashTimer(value, shortSize) : value;
    const linkClasses = `text-emerald-200 underline-offset-4 hover:underline ${linkClassName ?? ""}`;

    if (noLink) {
      return <span className={linkClassName}>{content}</span>;
    }

    return (
      <Link href={`/hashtimers/${value}`} className={linkClasses}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="inline-flex w-max items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-tight text-red-200">
        Invalid
      </span>
      <span className="break-all font-mono text-[11px] text-slate-400">{value || "(empty)"}</span>
    </div>
  );
}
