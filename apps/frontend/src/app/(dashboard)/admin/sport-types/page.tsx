'use client';

import { useMemo, useState } from 'react';
import { EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import {
  useAdminSportTypes,
  useCreateSportType,
  useDeleteSportType,
  useHardDeleteSportType,
  useUpdateSportType,
  type SportTypeAdminItem,
} from '@/hooks/useAdminCatalog';

export default function AdminSportTypesPage() {
  const { data = [] } = useAdminSportTypes();
  const { mutate: createSportType, isPending: creating } = useCreateSportType();
  const { mutate: updateSportType, isPending: updating } = useUpdateSportType();
  const { mutate: deleteSportType } = useDeleteSportType();
  const { mutate: hardDeleteSportType } = useHardDeleteSportType();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{
    mode: 'create' | 'edit';
    item?: SportTypeAdminItem;
  } | null>(null);
  const [form, setForm] = useState({
    name: '',
    icon: '',
    color: '#10B981',
    displayOrder: 0,
    isActive: true,
  });
  const [pendingDelete, setPendingDelete] = useState<SportTypeAdminItem | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) =>
      `${item.name} ${item.icon ?? ''} ${item.color ?? ''}`.toLowerCase().includes(q),
    );
  }, [data, search]);

  const totalCourts = data.reduce((sum, item) => sum + Number(item.courtCount ?? 0), 0);
  const activeSports = data.filter((item) => item.isActive).length;

  const openCreate = () => {
    setForm({ name: '', icon: '', color: '#10B981', displayOrder: data.length, isActive: true });
    setModal({ mode: 'create' });
  };

  const openEdit = (item: SportTypeAdminItem) => {
    setForm({
      name: item.name ?? '',
      icon: item.icon ?? '',
      color: item.color ?? '#10B981',
      displayOrder: item.displayOrder ?? 0,
      isActive: !!item.isActive,
    });
    setModal({ mode: 'edit', item });
  };

  const submit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      icon: form.icon.trim() || undefined,
      color: form.color.trim() || undefined,
      displayOrder: Number(form.displayOrder) || 0,
      isActive: form.isActive,
    };
    if (modal?.mode === 'create') {
      createSportType(payload, { onSuccess: () => setModal(null) });
      return;
    }
    if (!modal?.item) return;
    updateSportType({ id: modal.item.id, dto: payload }, { onSuccess: () => setModal(null) });
  };

  return (
    <AdminShell
      title="Sport Type Management"
      subtitle="Configure sports, colors, ordering, and active status from database."
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active Sports
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{activeSports}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Courts
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalCourts}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sport Types
          </p>
          <p className="mt-2 text-3xl font-black text-[#944a00]">{data.length}</p>
        </article>
      </div>

      <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sport type..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        </div>
        <Button onClick={openCreate} className="gap-2 bg-[#944a00] hover:bg-[#7f3f00]">
          <Plus className="h-4 w-4" />
          New Sport Type
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Sport Type</th>
              <th className="px-6 py-4">Calendar Color</th>
              <th className="px-6 py-4">Active Courts</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.icon || 'sports'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-8 rounded"
                      style={{ backgroundColor: item.color || '#CBD5E1' }}
                    />
                    <code className="text-xs text-slate-500">{item.color || '-'}</code>
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold">{item.courtCount ?? 0}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.isActive ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex gap-2">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-0 shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-xl font-black tracking-tight text-slate-900">
                {modal.mode === 'create' ? 'Create Sport Type' : 'Edit Sport Type'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Control sport identity, calendar color, visibility, and display ordering.
              </p>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sport Name
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                    placeholder="e.g. Tennis"
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
                    placeholder="e.g. sports_tennis"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Color
                  </span>
                  <input
                    value={form.color}
                    onChange={(e) => setForm((v) => ({ ...v, color: e.target.value }))}
                    placeholder="#RRGGBB"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Display Order
                  </span>
                  <input
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, displayOrder: Number(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 md:items-end">
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
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-5 w-10 rounded"
                      style={{ backgroundColor: form.color.trim() || '#CBD5E1' }}
                    />
                    <code className="text-xs text-slate-500">{form.color.trim() || '#CBD5E1'}</code>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {form.name.trim() || 'Sport name'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {form.isActive ? 'Enabled' : 'Disabled'} • Order {form.displayOrder}
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
                {Number(pendingDelete.courtCount ?? 0) > 0
                  ? 'Hide Sport Type'
                  : 'Delete Sport Type'}
              </h3>
              {Number(pendingDelete.courtCount ?? 0) > 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  You are about to hide <span className="font-semibold">{pendingDelete.name}</span>{' '}
                  from new court creation.
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  You are about to delete{' '}
                  <span className="font-semibold">{pendingDelete.name}</span> permanently.
                </p>
              )}
              {Number(pendingDelete.courtCount ?? 0) > 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  Khong the xoa - co {pendingDelete.courtCount} san dang dung sport type nay. Hay
                  chuyen san sang sport type khac truoc, hoac chon &quot;An&quot; thay vi xoa.
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Sport type is not used by any court. You can delete permanently.
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
                    hardDeleteSportType(id, { onSuccess: () => setPendingDelete(null) });
                  }}
                >
                  Delete Permanently
                </Button>
              ) : (
                <Button
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => {
                    const id = pendingDelete.id;
                    deleteSportType(id, { onSuccess: () => setPendingDelete(null) });
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
