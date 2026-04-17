'use client';

import { CreateRoomDialog } from '@/components/room/create-room-dialog';
import { RoomList } from '@/components/room/room-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

export default function RoomsPage() {
  const t = useTranslations('room');
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleJoinByCode = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 5) {
      setJoinError(t('join.invalidCode'));
      return;
    }
    setJoinError('');
    router.push(`/room/${code}`);
  }, [joinCode, router, t]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToHome')}
      </Link>

      <h1 className="mb-6 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-text-primary">
        {t('title')}
      </h1>

      {/* Join by code */}
      <div className="mb-6 flex gap-2">
        <Input
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value.toUpperCase());
            setJoinError('');
          }}
          placeholder={t('join.placeholder')}
          maxLength={5}
          className="font-mono uppercase tracking-widest"
          hasError={!!joinError}
          onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
        />
        <Button onClick={handleJoinByCode} variant="secondary">
          {t('join.submit')}
        </Button>
      </div>
      {joinError && <p className="-mt-4 mb-4 text-xs text-accent-red">{joinError}</p>}

      {/* Create room */}
      <div className="mb-8">
        <CreateRoomDialog />
      </div>

      {/* Public rooms */}
      <h2 className="mb-3 text-lg font-semibold text-text-secondary">{t('list.title')}</h2>
      <RoomList />
    </div>
  );
}
