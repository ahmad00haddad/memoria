import { Fragment, type ReactNode } from "react";

// A package's features live in pricing_rules.description, one per line.
// A leading "★" marks an exclusive feature, "⚡" a fast-delivery one.
export type FeatureKind = "regular" | "exclusive" | "fast";
export type Feature = { kind: FeatureKind; text: string };

const PREFIX: Record<FeatureKind, string> = { regular: "", exclusive: "★ ", fast: "⚡ " };

export function parseFeatures(description: string | null | undefined): Feature[] {
  const raw = (description ?? "").trim();
  if (!raw) return [];
  // Older packages were written as one comma-separated line.
  const lines = raw.includes("\n") ? raw.split("\n") : raw.split(/[،,](?!\d)/);
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      if (l.startsWith("★")) return { kind: "exclusive" as const, text: l.slice(1).trim() };
      if (l.startsWith("⚡")) return { kind: "fast" as const, text: l.slice(1).trim() };
      return { kind: "regular" as const, text: l };
    });
}

export function serializeFeatures(features: Feature[]): string {
  return features
    .filter((f) => f.text.trim())
    .map((f) => PREFIX[f.kind] + f.text.trim())
    .join("\n");
}

// Bold each number together with the word after it: "6 ساعات", "250 صورة", "40×40 سم".
const NUMBER_RE = /([+]?[0-9٠-٩][0-9٠-٩.,×x+]*(?:\s+[^\s،,.()0-9٠-٩]+)?)/g;

export function emphasizeNumbers(text: string): ReactNode {
  const parts = text.split(NUMBER_RE);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
