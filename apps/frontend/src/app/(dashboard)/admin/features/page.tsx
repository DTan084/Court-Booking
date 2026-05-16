'use client';

import { useMemo, useState } from 'react';
import { EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import {
  useAdminFeatures,
  useCreateFeature,
  useDeleteFeature,
  useHardDeleteFeature,
  useUpdateFeature,
  type FeatureAdminItem,
} from '@/hooks/useAdminCatalog';

export default function AdminFeaturesPage() {
  const { data = [] } = useAdminFeatures();
  const { mutate: createFeature, isPending: creating } = useCreateFeature();
  const { mutate: updateFeature, isPending: updating } = useUpdateFeature();
  const { mutate: deleteFeature } = useDeleteFeature();
  const { mutate: hardDeleteFeature } = useHardDeleteFeature();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{
    mode: 'create' | 'edit';
    item?: FeatureAdminItem;
  } | null>(null);
  const [form, setForm] = useState({ name: '', icon: '', category: '', isActive: true });
  const [pendingDelete, setPendingDelete] = useState<FeatureAdminItem | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) =>
      `${item.name} ${item.icon ?? ''} ${item.category ?? ''}`.toLowerCase().includes(q),
    );
  }, [data, search]);

  const totalCourtsUsing = data.reduce((sum, item) => sum + Number(item.courtCount ?? 0), 0);
  const categories = new Set(data.map((i) => (i.category ?? '').trim()).filter(Boolean)).size;

  const openCreate = () => {
    setForm({ name: '', icon: '', category: '', isActive: true });
    setModal({ mode: 'create' });
  };

  const openEdit = (item: FeatureAdminItem) => {
    setForm({
      name: item.name ?? '',
      icon: item.icon ?? '',
      category: item.category ?? '',
      isActive: item.isActive ?? true,
    });
    setModal({ mode: 'edit', item });
  };

  const submit = () => {
    if (!form.name.trim()) return;
    if (modal?.mode === 'create') {
      createFeature(
        {
          name: form.name.trim(),
          icon: form.icon.trim() || undefined,
          category: form.category.trim() || undefined,
        },
        { onSuccess: () => setModal(null) },
      );
      return;
    }
    if (!modal?.item) return;
    updateFeature(
      {
        id: modal.item.id,
        dto: {
          name: form.name.trim(),
          icon: form.icon.trim() || null,
          category: form.category.trim() || null,
          isActive: form.isActive,
        },
      },
      { onSuccess: () => setModal(null) },
    );
  };

  return (
    <AdminShell
      title="Feature Management"
      subtitle="Manage amenities and court facilities from database."
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Features
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{data.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{categories}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Court Usage
          </p>
          <p className="mt-2 text-3xl font-black text-[#944a00]">{totalCourtsUsing}</p>
        </article>
      </div>

      <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feature, icon, category..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        </div>
        <Button onClick={openCreate} className="gap-2 bg-[#944a00] hover:bg-[#7f3f00]">
          <Plus className="h-4 w-4" />
          Add New Feature
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                {item.icon || 'feature'}
              </div>
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-[#944a00]">
                {item.courtCount ?? 0} courts
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.category || 'Uncategorized'}</p>
            <div className="mt-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.isActive ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => setPendingDelete(item)}
              >
                {Number(item.courtCount ?? 0) > 0 ? (
                  <>
                    <EyeOff className="mr-1 h-3.5 w-3.5" />
                    Hide
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </article>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-0 shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-xl font-black tracking-tight text-slate-900">
                {modal.mode === 'create' ? 'Add Feature' : 'Edit Feature'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Configure amenity metadata used across courts and filters.
              </p>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Feature Name
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                    placeholder="e.g. Floodlights"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Icon Key
                  </span>
                  <input
                    value={form.icon}
                    onChange={(e) => setForm((v) => ({ ...v, icon: e.target.value }))}
                    placeholder="e.g. lightbulb"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </span>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}
                    placeholder="e.g. Facility"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((v) => ({ ...v, isActive: e.target.checked }))}
                  />
                  Enabled
                </label>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Preview
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                    {form.icon.trim() || 'feature'}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {form.name.trim() || 'Feature name'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {form.category.trim() || 'Uncategorized'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <Button variant="outline" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={creating || updating}
                className="min-w-28 bg-[#944a00] hover:bg-[#7f3f00]"
              >
                {creating || updating ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {pendingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-0 shadow-2xl">
            <div className="px-6 py-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                <Trash2 className="h-7 w-7 text-rose-600" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900">
                {Number(pendingDelete.courtCount ?? 0) > 0 ? 'Hide Feature' : 'Delete Feature'}
              </h3>
              {Number(pendingDelete.courtCount ?? 0) > 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  You are about to hide <span className="font-semibold">{pendingDelete.name}</span>{' '}
                  from new assignments.
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  You are about to delete{' '}
                  <span className="font-semibold">{pendingDelete.name}</span> permanently.
                </p>
              )}
              {Number(pendingDelete.courtCount ?? 0) > 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  {pendingDelete.courtCount} san dang su dung feature nay - feature van hien thi
                  tren cac san do nhung khong the gan them.
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Feature is not used by any court. You can delete permanently.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              {Number(pendingDelete.courtCount ?? 0) === 0 ? (
                <Button
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => {
                    const id = pendingDelete.id;
                    hardDeleteFeature(id, { onSuccess: () => setPendingDelete(null) });
                  }}
                >
                  Delete Permanently
                </Button>
              ) : (
                <Button
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => {
                    const id = pendingDelete.id;
                    deleteFeature(id, { onSuccess: () => setPendingDelete(null) });
                  }}
                >
                  Hide
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
