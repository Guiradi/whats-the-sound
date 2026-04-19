import type { AbstractIntlMessages } from 'next-intl';
import { z } from 'zod';

const legalSectionSchema = z.object({
  title: z.string(),
  body: z.array(z.string()).optional(),
  intro: z.string().optional(),
  list: z.array(z.string()).optional(),
});

export type LegalSection = z.infer<typeof legalSectionSchema>;

const legalSectionsSchema = z.array(legalSectionSchema);

export function readLegalSections(
  messages: AbstractIntlMessages,
  namespace: 'terms' | 'privacy',
): LegalSection[] {
  const raw = (messages as Record<string, unknown>).legal as
    | { [key: string]: { sections?: unknown } }
    | undefined;
  const parsed = legalSectionsSchema.safeParse(raw?.[namespace]?.sections ?? []);
  return parsed.success ? parsed.data : [];
}
