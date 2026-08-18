import type { ComponentProps, ReactNode } from "react";
import { Link } from "@tanstack/react-router";

// Two shared CTA styles, defined once, applied everywhere.
//
//   <PrimaryCTA>      filled button, one per section, high-emphasis action
//   <SecondaryLink>   text-only link with →, everything else
//
// Both accept either `to` (internal route) or `href` (external URL). Any
// extra props (aria-label, target, etc.) pass through.

type LinkTo = ComponentProps<typeof Link>["to"];

interface CTABaseProps {
  children: ReactNode;
  className?: string;
}

interface InternalProps extends CTABaseProps {
  to: LinkTo;
  href?: never;
}

interface ExternalProps extends CTABaseProps {
  href: string;
  to?: never;
  target?: string;
  rel?: string;
}

type CTAProps = InternalProps | ExternalProps;

const PRIMARY_CLASSES =
  "inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--brand)] px-4 py-2.5 " +
  "text-sm font-medium text-[var(--paper)] transition-opacity hover:opacity-90 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]";

const SECONDARY_CLASSES =
  "inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] " +
  "transition-opacity hover:underline hover:underline-offset-4 " +
  "focus-visible:outline-none focus-visible:underline";

export function PrimaryCTA(props: CTAProps) {
  const cls = `${PRIMARY_CLASSES} ${props.className ?? ""}`;
  if ("to" in props && props.to !== undefined) {
    return (
      <Link to={props.to} className={cls}>
        {props.children}
      </Link>
    );
  }
  return (
    <a
      href={props.href}
      target={props.target}
      rel={props.rel ?? (props.target === "_blank" ? "noreferrer noopener" : undefined)}
      className={cls}
    >
      {props.children}
    </a>
  );
}

export function SecondaryLink(props: CTAProps) {
  const cls = `${SECONDARY_CLASSES} ${props.className ?? ""}`;
  if ("to" in props && props.to !== undefined) {
    return (
      <Link to={props.to} className={cls}>
        {props.children}
      </Link>
    );
  }
  return (
    <a
      href={props.href}
      target={props.target}
      rel={props.rel ?? (props.target === "_blank" ? "noreferrer noopener" : undefined)}
      className={cls}
    >
      {props.children}
    </a>
  );
}
