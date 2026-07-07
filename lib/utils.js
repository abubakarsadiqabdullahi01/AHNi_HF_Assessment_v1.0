import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui className combiner — merges conditional + conflicting Tailwind classes.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
