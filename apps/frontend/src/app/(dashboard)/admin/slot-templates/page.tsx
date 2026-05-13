'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { useCourts } from '@/hooks/useCourts';
import {
  useApplySlotTemplate,
  useCreateSlotTemplate,
  useDeleteSlotTemplate,
  useSlotTemplates,
} from '@/hooks/useSlotTemplates';

type DraftItem = {
  dayOfWeek: number;
  startHour: string;
  endHour: string;
  price: number;
};

const DAY_OPTIONS = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
];

export default function AdminSlotTemplatesPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftItem[]>([
    { dayOfWeek: 1, startHour: '09:00:00', endHour: '10:00:00', price: 200000 },
  ]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: templates = [] } = useSlotTemplates();
  const { data: courtsData } = useCourts({ page: 1, limit: 100 });
  const courts = courtsData?.data ?? [];

  const { mutate: createTemplate, isPending: creating } = useCreateSlotTemplate();
  const { mutate: deleteTemplate } = useDeleteSlotTemplate();
  const { mutate: applyTemplate, isPending: applying } = useApplySlotTemplate();

  const groupedItems = useMemo(() => {
    return DAY_OPTIONS.map((day) => ({
      ...day,
      items: items.filter((item) => item.dayOfWeek === day.value),
    }));
  }, [items]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { dayOfWeek: 1, startHour: '09:00:00', endHour: '10:00:00', price: 200000 },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const create = () => {
    if (!name.trim()) return;
    createTemplate(
      {
        name,
        description: description || undefined,
        items,
      },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setItems([{ dayOfWeek: 1, startHour: '09:00:00', endHour: '10:00:00', price: 200000 }]);
        },
      },
    );
  };

  return (
    <AdminShell
      title="Slot Templates"
      subtitle="Create and apply reusable weekly slot presets to courts"
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-bold">Create Template</h3>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              rows={3}
            />
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Template Items</p>
                <Button variant="outline" onClick={addItem} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add item
                </Button>
              </div>
              {items.map((item, idx) => (
                <div key={`${item.dayOfWeek}-${idx}`} className="grid grid-cols-12 gap-2">
                  <select
                    value={item.dayOfWeek}
                    onChange={(e) => updateItem(idx, { dayOfWeek: Number(e.target.value) })}
                    className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-xs"
                  >
                    {DAY_OPTIONS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={item.startHour}
                    onChange={(e) => updateItem(idx, { startHour: e.target.value })}
                    className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-xs"
                    placeholder="09:00:00"
                  />
                  <input
                    value={item.endHour}
                    onChange={(e) => updateItem(idx, { endHour: e.target.value })}
                    className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-xs"
                    placeholder="10:00:00"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                    className="col-span-2 rounded-md border border-slate-300 px-2 py-2 text-xs"
                    placeholder="200000"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="col-span-1 inline-flex items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              disabled={creating || !name.trim() || items.length === 0}
              onClick={create}
              className="bg-[#944a00] hover:bg-[#7f3f00]"
            >
              {creating ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-bold">Apply Template</h3>
          <div className="space-y-3">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            >
              <option value="">Select template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            >
              <option value="">Select court</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <Button
              disabled={!selectedTemplateId || !selectedCourtId || applying}
              onClick={() =>
                applyTemplate(
                  {
                    templateId: selectedTemplateId,
                    courtId: selectedCourtId,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                  },
                  {
                    onSuccess: (res) => {
                      toast.success(`Đã tạo ${res.inserted} slot mới, bỏ qua ${res.skipped} slot`);
                    },
                  },
                )
              }
              className="bg-[#944a00] hover:bg-[#7f3f00]"
            >
              {applying ? 'Applying...' : 'Apply Template'}
            </Button>
          </div>
        </section>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4">Courts Applied</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-6 py-4 font-semibold">{item.name}</td>
                <td className="px-6 py-4">{item.itemCount ?? 0}</td>
                <td className="px-6 py-4">{item.courtCount ?? 0}</td>
                <td className="px-6 py-4">
                  <Button
                    variant="outline"
                    className="text-rose-600"
                    onClick={() => deleteTemplate(item.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-3 text-lg font-bold">Draft Preview By Day</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {groupedItems.map((day) => (
            <div key={day.value} className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm font-semibold">{day.label}</p>
              {day.items.length === 0 ? (
                <p className="text-xs text-slate-500">No slots</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700">
                  {day.items.map((item, idx) => (
                    <li key={`${day.value}-${idx}`}>
                      {item.startHour} - {item.endHour} | {item.price.toLocaleString('vi-VN')}đ
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
