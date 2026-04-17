import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { FileQuestion, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('errors.notFound');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <FileQuestion className="h-12 w-12 text-accent-cyan" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold text-text-primary">
          404
        </h1>
        <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
          {t('title')}
        </p>
        <p className="max-w-md text-sm text-text-secondary">{t('description')}</p>
      </div>
      <Button asChild variant="primary">
        <Link href="/">
          <Home className="h-4 w-4" />
          {t('goHome')}
        </Link>
      </Button>
    </div>
  );
}
