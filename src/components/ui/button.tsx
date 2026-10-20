import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "solid" | "line" | "ghost";
};

export function Button({ tone = "line", className, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tone === "solid" && "bg-brass text-bg hover:bg-fg",
        tone === "line" && "border border-line bg-surface text-fg hover:border-brass",
        tone === "ghost" && "text-muted hover:bg-surface hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}
