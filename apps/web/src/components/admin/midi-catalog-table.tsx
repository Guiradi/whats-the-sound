'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminCategories } from '@/hooks/admin/use-admin-categories';
import { useCatalogItems } from '@/hooks/admin/use-catalog-items';
import { Link } from '@/i18n/navigation';
import { authFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { type CatalogItem, MidiDifficulty } from '@wts/shared';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  PlayCircle,
  Power,
  PowerOff,
  Search,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

const DIFFICULTIES = Object.values(MidiDifficulty);
const PAGE_SIZE = 20;

type SortField =
  | 'title'
  | 'artist'
  | 'category'
  | 'difficulty'
  | 'play_count'
  | 'correct_rate'
  | 'created_at';

export function MidiCatalogTable() {
  const t = useTranslations('adminCatalog');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: categoriesData } = useAdminCategories();
  const categories = categoriesData?.categories ?? [];

  const {
    data: catalog,
    isLoading: loading,
    refetch: refetchCatalog,
  } = useCatalogItems({
    search,
    category,
    difficulty,
    showInactive,
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
  });

  const items = catalog?.items ?? [];
  const total = catalog?.total ?? 0;

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [toggleTarget, setToggleTarget] = useState<CatalogItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setTogglingId(toggleTarget.id);
    try {
      const res = await authFetch(`/api/catalog/${toggleTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !toggleTarget.is_active }),
      });
      if (res.ok) {
        toast.success(toggleTarget.is_active ? t('deactivated') : t('activated'));
        refetchCatalog();
      } else {
        toast.error(t('toggleError'));
      }
    } catch {
      toast.error(t('toggleError'));
    } finally {
      setTogglingId(null);
      setToggleTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/catalog/${deleteTarget.id}?permanent=true`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(t('deleted'));
        refetchCatalog();
      } else {
        toast.error(t('deleteError'));
      }
    } catch {
      toast.error(t('deleteError'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const from = page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
    >
      {children}
      <ArrowUpDown className={cn('h-3 w-3', sortBy === field && 'text-accent-cyan')} />
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t('search')}
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
          className="h-10 rounded-md border border-bg-border bg-bg-surface px-3 text-sm text-text-primary"
        >
          <option value="">{t('filters.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              {t(`categories.${c.name}`)}
              {c.isDisabled ? ` (${t('categoryDisabled')})` : ''}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            setPage(0);
          }}
          className="h-10 rounded-md border border-bg-border bg-bg-surface px-3 text-sm text-text-primary"
        >
          <option value="">{t('filters.allDifficulties')}</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {t(`difficulties.${d}`)}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
              setPage(0);
            }}
            className="h-4 w-4"
          />
          {t('filters.showInactive')}
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-muted">{t('empty')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-bg-border">
            <table className="w-full text-sm">
              <thead className="bg-bg-surface">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">
                    <SortHeader field="title">{t('columns.title')}</SortHeader>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <SortHeader field="artist">{t('columns.artist')}</SortHeader>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <SortHeader field="category">{t('columns.category')}</SortHeader>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <SortHeader field="difficulty">{t('columns.difficulty')}</SortHeader>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <SortHeader field="play_count">{t('columns.plays')}</SortHeader>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <SortHeader field="correct_rate">{t('columns.accuracy')}</SortHeader>
                  </th>
                  <th className="px-4 py-3 font-medium text-center">{t('columns.active')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-t border-bg-border transition-colors hover:bg-bg-surface/50',
                      !item.is_active && 'opacity-60',
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{item.title}</td>
                    <td className="px-4 py-3 text-text-secondary">{item.artist}</td>
                    <td className="px-4 py-3">
                      <Badge variant="cyan">{t(`categories.${item.category}`)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.difficulty === 'easy'
                            ? 'green'
                            : item.difficulty === 'medium'
                              ? 'yellow'
                              : 'red'
                        }
                      >
                        {t(`difficulties.${item.difficulty}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{item.play_count}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {(item.correct_rate * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={togglingId === item.id}
                        onClick={() => setToggleTarget(item)}
                        aria-label={item.is_active ? t('deactivate') : t('activate')}
                      >
                        {togglingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : item.is_active ? (
                          <Power className="h-4 w-4 text-accent-green" />
                        ) : (
                          <PowerOff className="h-4 w-4 text-text-muted" />
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/catalog/${item.id}/test-play`}>
                          <Button size="icon" variant="ghost" aria-label={t('testPlay')}>
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/catalog/${item.id}/edit`}>
                          <Button size="icon" variant="ghost" aria-label={t('view')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/catalog/${item.id}/edit`}>
                          <Button size="icon" variant="ghost" aria-label={t('edit')}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={t('delete')}
                        >
                          <Trash2 className="h-4 w-4 text-accent-red" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {t('pagination.showing', { from, to, total })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-text-secondary">
                {t('pagination.page', { current: page + 1, total: totalPages })}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {toggleTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80"
          onClick={() => setToggleTarget(null)}
          onKeyDown={(e) => e.key === 'Escape' && setToggleTarget(null)}
          // biome-ignore lint/a11y/useSemanticElements: custom modal overlay, not semantic <dialog>
          role="dialog"
          tabIndex={-1}
        >
          <div
            className="max-w-sm rounded-lg border border-bg-border bg-bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
          >
            <h3 className="font-semibold mb-2">
              {toggleTarget.is_active ? t('confirmDeactivate') : t('confirmActivate')}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {toggleTarget.title} — {toggleTarget.artist}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setToggleTarget(null)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleToggleActive} disabled={togglingId === toggleTarget.id}>
                {togglingId === toggleTarget.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : toggleTarget.is_active ? (
                  t('deactivate')
                ) : (
                  t('activate')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80"
          onClick={() => setDeleteTarget(null)}
          onKeyDown={(e) => e.key === 'Escape' && setDeleteTarget(null)}
          // biome-ignore lint/a11y/useSemanticElements: custom modal overlay, not semantic <dialog>
          role="dialog"
          tabIndex={-1}
        >
          <div
            className="max-w-sm rounded-lg border border-bg-border bg-bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
          >
            <h3 className="font-semibold mb-2 text-accent-red">{t('confirmDelete')}</h3>
            <p className="text-sm text-text-muted mb-4">
              {deleteTarget.title} — {deleteTarget.artist}
            </p>
            <p className="text-xs text-text-muted mb-4">{t('deleteWarning')}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                {t('cancel')}
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
