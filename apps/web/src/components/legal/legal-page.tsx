import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { useTranslations } from 'next-intl';
import { Fragment, type ReactNode } from 'react';

interface LegalSection {
  title: string;
  body?: string[];
  intro?: string;
  list?: string[];
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export function LegalPage({ title, lastUpdated, sections }: LegalPageProps) {
  const t = useTranslations('legal');

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16 text-left">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-widest text-text-muted">{t('brandLabel')}</p>
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-text-muted">{t('lastUpdated', { date: lastUpdated })}</p>
      </header>
      <article className="flex flex-col gap-6 text-base leading-relaxed text-text-primary">
        {sections.map((section) => (
          <Section key={section.title} section={section} />
        ))}
      </article>
      <footer className="flex justify-end pt-4">
        <LocaleSwitcher />
      </footer>
    </main>
  );
}

function Section({ section }: { section: LegalSection }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-accent-cyan">{section.title}</h2>
      <div className="flex flex-col gap-3 text-text-primary">
        {section.body?.map((paragraph) => (
          <p key={paragraph}>{renderInlineBold(paragraph)}</p>
        ))}
        {section.intro && <p>{section.intro}</p>}
        {section.list && (
          <ul className="list-disc space-y-1 pl-6">
            {section.list.map((item) => (
              <li key={item}>{renderInlineBold(item)}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * Split on `**...**` and render each bold run as a <strong>. Text comes from translated
 * JSON files under our control, so splitting is safe (no untrusted markup).
 */
function renderInlineBold(input: string): ReactNode {
  const parts = input.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const key = `${index}:${part.length}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}
