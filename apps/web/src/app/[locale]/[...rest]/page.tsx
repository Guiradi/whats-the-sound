import { notFound } from 'next/navigation';

/**
 * Catch-all route that triggers the custom not-found.tsx for any unmatched path
 * under /[locale]/... . Without this, Next.js renders its default 404 page.
 */
export default function CatchAll() {
  notFound();
}
