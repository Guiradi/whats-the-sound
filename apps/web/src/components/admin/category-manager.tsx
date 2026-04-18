'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { env } from '@/env';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface CategoryInfo {
  name: string;
  totalSongs: number;
  activeSongs: number;
  isDisabled: boolean;
}

export function CategoryManager() {
  const t = useTranslations('admin.categories');
  const catT = useTranslations('room.categories');
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    category: string;
    currentlyDisabled: boolean;
  } | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/admin/categories`, {
        headers: { 'x-user-id': user.id },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCategories(data.categories);
    } catch {
      // silently fail — stats page handles errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleCategory = async (category: string, currentlyDisabled: boolean) => {
    if (!user) return;
    setTogglingCategory(category);
    try {
      const action = currentlyDisabled ? 'enable' : 'disable';
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/admin/categories/${category}/${action}`,
        {
          method: 'PATCH',
          headers: { 'x-user-id': user.id },
          credentials: 'include',
        },
      );
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.name === category ? { ...c, isDisabled: !currentlyDisabled } : c)),
        );
      }
    } catch {
      // silently fail
    } finally {
      setTogglingCategory(null);
    }
  };

  const handleToggleClick = (category: string, currentlyDisabled: boolean) => {
    if (currentlyDisabled) {
      // Re-enabling doesn't need confirmation
      toggleCategory(category, currentlyDisabled);
    } else {
      // Disabling needs confirmation
      setConfirmTarget({ category, currentlyDisabled });
    }
  };

  const handleConfirm = () => {
    if (confirmTarget) {
      toggleCategory(confirmTarget.category, confirmTarget.currentlyDisabled);
      setConfirmTarget(null);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 w-32 rounded bg-bg-surface-hover" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {['skel-a', 'skel-b', 'skel-c', 'skel-d', 'skel-e', 'skel-f'].map((id) => (
              <div key={id} className="h-16 rounded-md bg-bg-surface-hover" />
            ))}
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <p className="text-sm text-text-secondary">{t('description')}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const isToggling = togglingCategory === cat.name;
            const hasNoActiveSongs = cat.activeSongs === 0;

            return (
              <div
                key={cat.name}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
                  cat.isDisabled
                    ? 'border-accent-red/30 bg-accent-red/5'
                    : 'border-bg-border bg-bg-surface',
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {catT(cat.name as never)}
                    </span>
                    {cat.isDisabled && <Badge variant="red">{t('disabled')}</Badge>}
                    {!cat.isDisabled && hasNoActiveSongs && (
                      <AlertTriangle className="h-3.5 w-3.5 text-accent-yellow" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{t('activeSongs', { count: cat.activeSongs })}</span>
                    <span className="text-text-muted/50">|</span>
                    <span>{t('songs', { count: cat.totalSongs })}</span>
                  </div>
                  {!cat.isDisabled && hasNoActiveSongs && (
                    <span className="text-xs text-accent-yellow">{t('warning')}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={cat.isDisabled ? 'secondary' : 'ghost'}
                  onClick={() => handleToggleClick(cat.name, cat.isDisabled)}
                  disabled={isToggling}
                >
                  {cat.isDisabled ? t('enable') : t('disable')}
                </Button>
              </div>
            );
          })}
        </div>
      </CardHeader>

      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDisableTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmDisableDescription', {
                category: confirmTarget ? catT(confirmTarget.category as never) : '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmTarget(null)}>
              {t('cancel')}
            </Button>
            <Button variant="danger" onClick={handleConfirm}>
              {t('confirmDisable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
