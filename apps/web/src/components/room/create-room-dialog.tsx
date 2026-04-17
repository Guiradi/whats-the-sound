'use client';

import { RoomConfigForm } from '@/components/room/room-config';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRoom } from '@/hooks/use-room';
import { useRouter } from '@/i18n/navigation';
import type { RoomConfig } from '@wts/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

export function CreateRoomDialog() {
  const t = useTranslations('room');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { createRoom } = useRoom(null);

  const handleCreate = useCallback(
    (config: RoomConfig) => {
      setIsCreating(true);
      createRoom(config, (code) => {
        setOpen(false);
        setIsCreating(false);
        router.push(`/room/${code}`);
      });
    },
    [createRoom, router],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {t('create.title')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
        </DialogHeader>
        <RoomConfigForm onSubmit={handleCreate} isLoading={isCreating} />
      </DialogContent>
    </Dialog>
  );
}
