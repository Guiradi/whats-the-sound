'use client';

import { AdminStats } from '@/components/admin/admin-stats';
import { CategoryManager } from '@/components/admin/category-manager';

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-8">
        <AdminStats />
        <CategoryManager />
      </div>
    </main>
  );
}
