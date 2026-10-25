"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { trackBookEvent } from "../../analytics";
/** group: "tasks" = the seven tasks the book leaves out, "more" = Lv.5 of the book's own tasks. */
export default function BookNextLink({ href, sku, group, children }: { href: string; sku: string; group: "tasks" | "more"; children: ReactNode }) {
  return <Link href={href} onClick={() => trackBookEvent("book_next_level", sku, group)}>{children}</Link>;
}
