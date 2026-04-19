'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { authFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { type CategoryInfo, MidiDifficulty, adminCategoriesResponseSchema } from '@wts/shared';
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
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  title: string;
  artist: string;
  category: string;
  difficulty: string;
  play_count: number;
  correct_rate: number;
  is_active: boolean;
  midi_file_url: string;
}

interface CatalogResponse {
  items: CatalogItem[];
  total: number;
}

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
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [categories, setCategories] = useState<CategoryInfo[]>([]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await authFetch('/api/admin/categories');
        if (res.ok) {
          const parsed = adminCategoriesResponseSchema.safeParse(await res.json());
          if (parsed.success) setCategories(parsed.data.categories);
        }
      } catch {
        // silent
      }
    }
    loadCategories();
  }, []);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (difficulty) params.set('difficulty', difficulty);
      params.set('activeOnly', showInactive ? 'false' : 'true');
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);

      const res = await authFetch(`/api/catalog?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = (await res.json()) as CatalogResponse;
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, category, difficulty, showInactive, page, sortBy, sortDir]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

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
        fetchCatalog();
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
        fetchCatalog();
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
      {/* Filters */}
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
            className="rounded border-bg-border"
          />
          {t('filters.showInactive')}
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-bg-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border bg-bg-surface">
              <th className="px-4 py-3 text-left font-medium">
                <SortHeader field="title">{t('table.title')}</SortHeader>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <SortHeader field="artist">{t('table.artist')}</SortHeader>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <SortHeader field="category">{t('table.category')}</SortHeader>
              </th>
              <th className="px-4 py-3 text-left font-medium">
                <SortHeader field="difficulty">{t('table.difficulty')}</SortHeader>
              </th>
              <th className="px-4 py-3 text-right font-medium">
                <SortHeader field="play_count">{t('table.playCount')}</SortHeader>
              </th>
              <th className="px-4 py-3 text-right font-medium">
                <SortHeader field="correct_rate">{t('table.correctRate')}</SortHeader>
              </th>
              <th className="px-4 py-3 text-center font-medium">{t('table.status')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-2">{t('table.loading')}</p>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                  {t('table.empty')}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-bg-border transition-colors hover:bg-bg-surface-hover',
                    !item.is_active && 'opacity-50',
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
                          : item.difficulty === 'hard'
                            ? 'red'
                            : 'yellow'
                      }
                    >
                      {t(`difficulties.${item.difficulty}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                    {item.play_count}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                    {(item.correct_rate * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={item.is_active ? 'green' : 'default'}>
                      {item.is_active ? t('table.active') : t('table.inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link href={`/admin/catalog/${item.id}/edit`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => setToggleTarget(item)}
                        disabled={togglingId === item.id}
                        title={item.is_active ? t('actions.deactivate') : t('actions.activate')}
                      >
                        {togglingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : item.is_active ? (
                          <PowerOff className="h-4 w-4 text-accent-red" />
                        ) : (
                          <Power className="h-4 w-4 text-accent-green" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link
                          href={`/admin/catalog/${item.id}/test-play`}
                          title={t('actions.testPlay')}
                        >
                          <PlayCircle className="h-4 w-4 text-accent-cyan" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <a
                          href={item.midi_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('actions.preview')}
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => setDeleteTarget(item)}
                        disabled={deleting && deleteTarget?.id === item.id}
                        title={t('actions.delete')}
                      >
                        <Trash2 className="h-4 w-4 text-accent-red" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>{t('pagination.showing', { from, to, total })}</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('pagination.previous')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('pagination.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Toggle active confirmation dialog */}
      {toggleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-lg border border-bg-border bg-bg-surface p-6">
            <h3 className="text-lg font-semibold text-text-primary">
              {toggleTarget.is_active
                ? t('toggleConfirm.deactivateTitle')
                : t('toggleConfirm.activateTitle')}
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              {toggleTarget.is_active
                ? t('toggleConfirm.deactivateMessage')
                : t('toggleConfirm.activateMessage')}
            </p>
            <p className="mt-2 text-sm font-medium text-text-secondary">
              {toggleTarget.title} — {toggleTarget.artist}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="cursor-pointer"
                onClick={() => setToggleTarget(null)}
              >
                {t('toggleConfirm.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className={cn(
                  'cursor-pointer',
                  toggleTarget.is_active
                    ? 'bg-accent-red hover:bg-accent-red/80'
                    : 'bg-accent-green hover:bg-accent-green/80',
                )}
                disabled={togglingId === toggleTarget.id}
                onClick={handleToggleActive}
              >
                {togglingId === toggleTarget.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {toggleTarget.is_active
                  ? t('toggleConfirm.deactivateConfirm')
                  : t('toggleConfirm.activateConfirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-lg border border-bg-border bg-bg-surface p-6">
            <h3 className="text-lg font-semibold text-text-primary">{t('deleteConfirm.title')}</h3>
            <p className="mt-2 text-sm text-text-muted">{t('deleteConfirm.message')}</p>
            <p className="mt-2 text-sm font-medium text-text-secondary">
              {deleteTarget.title} — {deleteTarget.artist}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="cursor-pointer"
                onClick={() => setDeleteTarget(null)}
              >
                {t('deleteConfirm.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="cursor-pointer bg-accent-red hover:bg-accent-red/80"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('deleteConfirm.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
