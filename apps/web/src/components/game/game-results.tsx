'use client';

import { FinalRanking } from '@/components/game/final-ranking';
import { MatchStats } from '@/components/game/match-stats';
import { Podium } from '@/components/game/podium';
import { ShareResultButton } from '@/components/game/share-result-button';
import { Button } from '@/components/ui/button';
import { MIN_PLAYERS_PER_ROOM } from '@wts/shared';
import type { RoomStateSnapshot } from '@wts/shared';
import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface GameResultsProps {
  snapshot: RoomStateSnapshot;
  isHost: boolean;
  onPlayAgain: () => void;
}

export function GameResults({ snapshot, isHost, onPlayAgain }: GameResultsProps) {
  const t = useTranslations('game.results');

  const sortedPlayers = useMemo(
    () => [...snapshot.players].sort((a, b) => b.totalScore - a.totalScore),
    [snapshot.players],
  );

  const connectedCount = useMemo(
    () => snapshot.players.filter((p) => p.connected).length,
    [snapshot.players],
  );
  const canStart = isHost && connectedCount >= MIN_PLAYERS_PER_ROOM;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-8">
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-text-primary">
        {t('title')}
      </h1>

      <Podium players={sortedPlayers} />

      <MatchStats snapshot={snapshot} players={sortedPlayers} />

      <FinalRanking players={sortedPlayers} />

      <div className="flex gap-3">
        <ShareResultButton players={sortedPlayers} />
        {isHost ? (
          <Button onClick={onPlayAgain} disabled={!canStart} className="gap-2">
            <Play className="h-4 w-4" />
            {canStart ? t('playAgain') : t('needMorePlayers')}
          </Button>
        ) : (
          <p className="flex items-center text-sm text-text-muted">{t('waitingForHost')}</p>
        )}
      </div>
    </div>
  );
}
