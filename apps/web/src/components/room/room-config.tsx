'use client';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { env } from '@/env';
import { MidiCategory } from '@wts/shared';
import type { RoomConfig } from '@wts/shared';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface RoomConfigFormProps {
  onSubmit: (config: RoomConfig) => void;
  isLoading?: boolean;
}

const ALL_CATEGORIES: Array<MidiCategory | 'random'> = ['random', ...Object.values(MidiCategory)];

const ROUND_OPTIONS = [5, 10, 15] as const;
const TIME_OPTIONS = [25, 35, 45] as const;

export function RoomConfigForm({ onSubmit, isLoading }: RoomConfigFormProps) {
  const t = useTranslations('room');
  const [category, setCategory] = useState<MidiCategory | 'random'>('random');
  const [maxRounds, setMaxRounds] = useState<5 | 10 | 15>(5);
  const [timePerPhaseSec, setTimePerPhaseSec] = useState<25 | 35 | 45>(35);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPublic, setIsPublic] = useState(true);
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/admin/disabled-categories`)
      .then((res) => (res.ok ? res.json() : { disabledCategories: [] }))
      .then((data: { disabledCategories: string[] }) =>
        setDisabledCategories(data.disabledCategories),
      )
      .catch(() => {});
  }, []);

  const categories = ALL_CATEGORIES.filter(
    (cat) => cat === 'random' || !disabledCategories.includes(cat),
  );

  const handleSubmit = useCallback(() => {
    onSubmit({ category, maxRounds, timePerPhaseSec, maxPlayers, isPublic });
  }, [category, maxRounds, timePerPhaseSec, maxPlayers, isPublic, onSubmit]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="room-category"
          className="mb-1.5 block text-sm font-medium text-text-secondary"
        >
          {t('config.category')}
        </label>
        <Select
          id="room-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as MidiCategory | 'random')}
          className="w-full"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {t(`categories.${cat}`)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">
          {t('config.rounds')}
        </span>
        <div className="flex gap-2" aria-label={t('config.rounds')}>
          {ROUND_OPTIONS.map((n) => (
            <Button
              key={n}
              variant={maxRounds === n ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setMaxRounds(n)}
              type="button"
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">
          {t('config.timePerPhase')}
        </span>
        <div className="flex gap-2" aria-label={t('config.timePerPhase')}>
          {TIME_OPTIONS.map((n) => (
            <Button
              key={n}
              variant={timePerPhaseSec === n ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimePerPhaseSec(n)}
              type="button"
            >
              {n}s
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="room-max-players"
          className="mb-1.5 block text-sm font-medium text-text-secondary"
        >
          {t('config.maxPlayers')}
        </label>
        <input
          id="room-max-players"
          type="range"
          min={2}
          max={12}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="w-full accent-accent-cyan"
        />
        <span className="text-sm text-text-muted">{maxPlayers}</span>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="rounded accent-accent-cyan"
        />
        {t('config.isPublic')}
      </label>

      <Button onClick={handleSubmit} disabled={isLoading} className="mt-2">
        {isLoading ? t('create.creating') : t('create.submit')}
      </Button>
    </div>
  );
}
