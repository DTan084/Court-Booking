'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/shared/Pagination';
import { useCourts } from '@/hooks/useCourts';
import {
  useApplySlotTemplate,
  useCreateSlotTemplate,
  useDeleteSlotTemplate,
  useReplaceSlotTemplateItems,
  useSlotTemplateDetail,
  useSlotTemplates,
  useUpdateSlotTemplate,
} from '@/hooks/useSlotTemplates';

type DraftItem = {
  dayOfWeek: number;
  startHour: string;
  endHour: string;
  price: number;
  error?: string;
};

type ApplyOption = 'SKIP_CONFLICTS' | 'OVERWRITE_CONFLICTS';

type PreviewResult = {
  toInsert: number;
  toSkip: number;
  conflicts: Array<{
    dayOfWeek: number;
    startHour: string;
    endHour: string;
    existingPrice: number;
    templatePrice: number;
  }>;
};
type PreviewRow = {
  dayOfWeek: number;
  startHour: string;
  endHour: string;
  existingPrice: number | null;
  templatePrice: number;
  impact: 'Conflict' | 'No conflict';
};

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

const DEFAULT_ITEM: DraftItem = {
  dayOfWeek: 1,
  startHour: '09:00',
  endHour: '10:00',
  price: 200000,
};
const money = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} d`;

const toHour = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m !== 0) return null;
  return h;
};

export default function AdminSlotTemplatesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftItem[]>([DEFAULT_ITEM]);

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [option, setOption] = useState<ApplyOption>('SKIP_CONFLICTS');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewPage, setPreviewPage] = useState(1);

  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editItems, setEditItems] = useState<DraftItem[]>([]);

  const { data: templates = [] } = useSlotTemplates();
  const { data: selectedTemplateDetail } = useSlotTemplateDetail(selectedTemplateId);
  const { data: editingTemplateDetail } = useSlotTemplateDetail(editingTemplateId);
  const { data: courtsData } = useCourts({ page: 1, limit: 50 });
  const courts = courtsData?.data ?? [];

  const { mutate: createTemplate, isPending: creating } = useCreateSlotTemplate();
  const { mutate: updateTemplate, isPending: updatingTemplate } = useUpdateSlotTemplate();
  const { mutate: replaceTemplateItems, isPending: replacingItems } = useReplaceSlotTemplateItems();
  const { mutate: deleteTemplate, isPending: deleting } = useDeleteSlotTemplate();
  const { mutate: applyTemplate, isPending: applying } = useApplySlotTemplate();

  const addItem = () => setItems((prev) => [...prev, DEFAULT_ITEM]);
  const updateItem = (idx: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateEditItem = (idx: number, patch: Partial<DraftItem>) => {
    setEditItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };
  const removeEditItem = (idx: number) => setEditItems((prev) => prev.filter((_, i) => i !== idx));

  const create = () => {
    if (!name.trim()) return;
    createTemplate(
      { name: name.trim(), description: description || undefined, items },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setItems([DEFAULT_ITEM]);
        },
      },
    );
  };

  const startEdit = (id: string) => {
    setEditingTemplateId(id);
    const t = templates.find((x) => x.id === id);
    setEditName(t?.name ?? '');
    setEditDescription(t?.description ?? '');
    setEditItems([]);
  };

  useEffect(() => {
    if (!editingTemplateDetail || editingTemplateDetail.id !== editingTemplateId) return;
    setEditItems(
      editingTemplateDetail.items.map((item) => ({
        dayOfWeek: item.dayOfWeek,
        startHour: item.startHour.slice(0, 5),
        endHour: item.endHour.slice(0, 5),
        price: Number(item.price),
      })),
    );
  }, [editingTemplateDetail, editingTemplateId]);

  const saveEdit = () => {
    if (!editingTemplateId || !editName.trim()) return;
    updateTemplate(
      {
        id: editingTemplateId,
        name: editName.trim(),
        description: editDescription || null,
      },
      {
        onSuccess: () => {
          replaceTemplateItems({ id: editingTemplateId, items: editItems });
        },
      },
    );
  };

  const validatedEditItems = useMemo(() => {
    return editItems.map((item, idx) => {
      const start = toHour(item.startHour);
      const end = toHour(item.endHour);
      if (start === null || end === null) {
        return { ...item, error: 'Time must be full-hour format (HH:00)' };
      }
      if (end <= start) {
        return { ...item, error: 'End time must be after start time' };
      }
      if (item.price < 0) {
        return { ...item, error: 'Price must be >= 0' };
      }

      const hasOverlap = editItems.some((other, otherIdx) => {
        if (otherIdx === idx || other.dayOfWeek !== item.dayOfWeek) return false;
        const otherStart = toHour(other.startHour);
        const otherEnd = toHour(other.endHour);
        if (otherStart === null || otherEnd === null) return false;
        return start < otherEnd && end > otherStart;
      });
      if (hasOverlap) {
        return { ...item, error: 'Overlapping with another slot in this day' };
      }
      return { ...item, error: undefined };
    });
  }, [editItems]);

  const hasEditErrors = validatedEditItems.some((item) => item.error);
  const validatedCreateItems = useMemo(() => {
    return items.map((item, idx) => {
      const start = toHour(item.startHour);
      const end = toHour(item.endHour);
      if (start === null || end === null)
        return { ...item, error: 'Time must be full-hour format (HH:00)' };
      if (end <= start) return { ...item, error: 'End time must be after start time' };
      if (item.price < 0) return { ...item, error: 'Price must be >= 0' };
      const hasOverlap = items.some((other, otherIdx) => {
        if (otherIdx === idx || other.dayOfWeek !== item.dayOfWeek) return false;
        const os = toHour(other.startHour);
        const oe = toHour(other.endHour);
        if (os === null || oe === null) return false;
        return start < oe && end > os;
      });
      if (hasOverlap) return { ...item, error: 'Overlapping with another slot in this day' };
      return { ...item, error: undefined };
    });
  }, [items]);
  const hasCreateErrors = validatedCreateItems.some((item) => item.error);

  const runPreview = () => {
    if (!selectedTemplateId || !selectedCourtId) return;

    applyTemplate(
      {
        templateId: selectedTemplateId,
        courtId: selectedCourtId,
        option,
        confirmed: false,
      },
      {
        onSuccess: (res) => {
          if ('toInsert' in res) {
            setPreview(res);
            setPreviewPage(1);
            toast.success('Preview generated');
          }
        },
      },
    );
  };

  const runApply = () => {
    if (!selectedTemplateId || !selectedCourtId) return;

    applyTemplate(
      {
        templateId: selectedTemplateId,
        courtId: selectedCourtId,
        option,
        confirmed: true,
      },
      {
        onSuccess: (res) => {
          if ('inserted' in res) {
            toast.success(
              `Applied: ${res.inserted} inserted, ${res.overwritten} overwritten, ${res.skipped} skipped`,
            );
            setPreview(null);
            setPreviewPage(1);
          }
        },
      },
    );
  };

  const previewRows = useMemo<PreviewRow[]>(() => {
    if (!preview) return [];
    const conflictRows: PreviewRow[] = preview.conflicts.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      startHour: row.startHour,
      endHour: row.endHour,
      existingPrice: row.existingPrice,
      templatePrice: row.templatePrice,
      impact: 'Conflict',
    }));
    const conflictKey = new Set(
      preview.conflicts.map(
        (row) => `${row.dayOfWeek}-${row.startHour.slice(0, 5)}-${row.endHour.slice(0, 5)}`,
      ),
    );
    const templateItems = selectedTemplateDetail?.items ?? [];
    const newRows: PreviewRow[] = templateItems
      .filter(
        (item) =>
          !conflictKey.has(
            `${item.dayOfWeek}-${item.startHour.slice(0, 5)}-${item.endHour.slice(0, 5)}`,
          ),
      )
      .map((item) => ({
        dayOfWeek: item.dayOfWeek,
        startHour: item.startHour.slice(0, 5),
        endHour: item.endHour.slice(0, 5),
        existingPrice: null,
        templatePrice: Number(item.price),
        impact: 'No conflict',
      }));
    return [...conflictRows, ...newRows];
  }, [preview, selectedTemplateDetail]);

  const PREVIEW_PAGE_SIZE = 5;
  const previewTotalPages = Math.max(1, Math.ceil(previewRows.length / PREVIEW_PAGE_SIZE));
  const previewRowsPaged = previewRows.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE,
  );

  return (
    <AdminShell
      title="Slot Templates"
      subtitle="Create reusable weekly patterns and apply to courts with conflict preview"
    >
      <div className="mb-6 flex justify-end">
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 bg-[#944a00] hover:bg-[#7f3f00]"
        >
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-5">
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
            <select
              value={option}
              onChange={(e) => setOption(e.target.value as ApplyOption)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            >
              <option value="SKIP_CONFLICTS">Skip conflicts</option>
              <option value="OVERWRITE_CONFLICTS">Overwrite conflicts</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Button
                disabled={!selectedTemplateId || !selectedCourtId || applying}
                onClick={runPreview}
                variant="outline"
              >
                {applying ? 'Processing...' : 'Preview'}
              </Button>
              <Button
                disabled={!selectedTemplateId || !selectedCourtId || !preview || applying}
                onClick={runApply}
                className="bg-[#944a00] hover:bg-[#7f3f00]"
              >
                {applying ? 'Processing...' : 'Apply'}
              </Button>
            </div>
            {selectedTemplateDetail && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedTemplateDetail.name}
                </p>
                {selectedTemplateDetail.description && (
                  <p className="mt-1 text-xs text-slate-600">
                    {selectedTemplateDetail.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {selectedTemplateDetail.items.length} slots in template
                </p>
                <div className="mt-3 rounded-md border border-slate-200 bg-white p-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Selected Mode
                  </p>
                  {option === 'SKIP_CONFLICTS' ? (
                    <p className="mt-1 text-xs text-slate-700">
                      Keep existing court slots when conflict happens. Only non-conflicting template
                      slots will be inserted.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-700">
                      Remove conflicting existing slots first, then create new slots from the
                      template for those time ranges.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-7">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-bold">Conflict Preview</h3>
            <p className="text-xs text-slate-500">Preview before apply.</p>
          </div>
          {preview ? (
            <>
              <div className="grid gap-4 border-b border-slate-100 px-6 py-4 md:grid-cols-3">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm">
                  <p className="text-slate-600">Slots To Insert</p>
                  <p className="text-xl font-bold text-emerald-700">{preview.toInsert}</p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm">
                  <p className="text-slate-600">Conflicts</p>
                  <p className="text-xl font-bold text-amber-700">{preview.toSkip}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-600">Option</p>
                  <p className="text-sm font-semibold text-slate-800">{option}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Day / Time</th>
                    <th className="px-6 py-3">Existing Price</th>
                    <th className="px-6 py-3">Template Price</th>
                    <th className="px-6 py-3">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 ? (
                    <tr>
                      <td className="px-6 py-5 text-slate-500" colSpan={4}>
                        No rows to preview.
                      </td>
                    </tr>
                  ) : (
                    previewRowsPaged.map((row, idx) => (
                      <tr
                        key={`${row.dayOfWeek}-${row.startHour}-${idx}`}
                        className="border-t border-slate-100"
                      >
                        <td className="px-6 py-3">
                          <p className="font-medium text-slate-800">
                            {DAY_OPTIONS.find((d) => d.value === row.dayOfWeek)?.label}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.startHour} - {row.endHour}
                          </p>
                        </td>
                        <td className="px-6 py-3">
                          {row.existingPrice === null ? '-' : money(row.existingPrice)}
                        </td>
                        <td className="px-6 py-3 font-semibold text-amber-700">
                          {money(row.templatePrice)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={
                              row.impact === 'Conflict'
                                ? 'rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'
                                : 'rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'
                            }
                          >
                            {row.impact}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {previewTotalPages > 1 && (
                <div className="px-6 py-4">
                  <Pagination
                    page={previewPage}
                    totalPages={previewTotalPages}
                    onPageChange={setPreviewPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 px-6 py-8 text-sm text-slate-500">
              <AlertTriangle className="h-4 w-4" />
              No preview yet.
            </div>
          )}
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        startEdit(item.id);
                      }}
                    >
                      {' '}
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit{' '}
                    </Button>
                    <Button
                      variant="outline"
                      className="text-rose-600"
                      disabled={deleting}
                      onClick={() => deleteTemplate(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h3 className="text-lg font-bold">Create Template</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                aria-label="Close create modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto px-6 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Template Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter template name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter short description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  rows={3}
                />
              </div>
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Template Items</p>
                    <p className="text-xs text-slate-500">
                      {validatedCreateItems.length} slot
                      {validatedCreateItems.length === 1 ? '' : 's'}
                      {hasCreateErrors
                        ? ` • ${validatedCreateItems.filter((item) => item.error).length} error(s)`
                        : ''}
                    </p>
                  </div>
                  <Button variant="outline" onClick={addItem} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add slot
                  </Button>
                </div>
                {validatedCreateItems.map((item, idx) => (
                  <div key={`${item.dayOfWeek}-${idx}`} className="space-y-1">
                    <div
                      className={`grid grid-cols-12 gap-2 rounded-md ${
                        item.error ? 'border border-rose-200 bg-rose-50 p-2' : ''
                      }`}
                    >
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
                      <select
                        value={item.startHour}
                        onChange={(e) => updateItem(idx, { startHour: e.target.value })}
                        className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-xs"
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={`create-start-${hour}`} value={hour}>
                            {hour}
                          </option>
                        ))}
                      </select>
                      <select
                        value={item.endHour}
                        onChange={(e) => updateItem(idx, { endHour: e.target.value })}
                        className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-xs"
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={`create-end-${hour}`} value={hour}>
                            {hour}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={item.price}
                        onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                        className="col-span-2 rounded-md border border-slate-300 px-2 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="col-span-1 inline-flex items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.error && <p className="text-xs text-rose-600">{item.error}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={creating || !name.trim() || items.length === 0 || hasCreateErrors}
                onClick={create}
                className="bg-[#944a00] hover:bg-[#7f3f00]"
              >
                {creating ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h3 className="text-lg font-bold">Edit Template</h3>
              <button
                type="button"
                onClick={() => setEditingTemplateId('')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                aria-label="Close edit modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto px-6 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Template Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter template name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter short description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  rows={3}
                />
              </div>
              <p className="text-sm text-slate-600">
                Items loaded from DB. Edit directly and save.
              </p>
              <div className="space-y-4">
                {DAY_OPTIONS.map((day) => {
                  const dayItems = validatedEditItems
                    .map((item, idx) => ({ ...item, idx }))
                    .filter((item) => item.dayOfWeek === day.value);
                  const dayErrorCount = dayItems.filter((item) => item.error).length;
                  return (
                    <div
                      key={day.value}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{day.label}</p>
                          <p className="text-xs text-slate-500">
                            {dayItems.length} slot{dayItems.length === 1 ? '' : 's'}
                            {dayErrorCount > 0 ? ` â€¢ ${dayErrorCount} error(s)` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEditItems((prev) => [
                              ...prev,
                              { ...DEFAULT_ITEM, dayOfWeek: day.value },
                            ])
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add item
                        </button>
                      </div>
                      {dayItems.length === 0 ? (
                        <p className="text-xs text-slate-500">No slots</p>
                      ) : (
                        <div className="space-y-2">
                          {dayItems.map((item) => (
                            <div key={`edit-${item.idx}`} className="space-y-1">
                              <div
                                className={`grid grid-cols-12 gap-2 rounded-md ${item.error ? 'border border-rose-200 bg-rose-50 p-2' : ''}`}
                              >
                                <select
                                  value={item.dayOfWeek}
                                  onChange={(e) =>
                                    updateEditItem(item.idx, { dayOfWeek: Number(e.target.value) })
                                  }
                                  className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-xs"
                                >
                                  {DAY_OPTIONS.map((d) => (
                                    <option key={d.value} value={d.value}>
                                      {d.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={item.startHour}
                                  onChange={(e) =>
                                    updateEditItem(item.idx, { startHour: e.target.value })
                                  }
                                  className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-xs"
                                >
                                  {HOUR_OPTIONS.map((hour) => (
                                    <option key={`edit-start-${hour}`} value={hour}>
                                      {hour}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={item.endHour}
                                  onChange={(e) =>
                                    updateEditItem(item.idx, { endHour: e.target.value })
                                  }
                                  className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-xs"
                                >
                                  {HOUR_OPTIONS.map((hour) => (
                                    <option key={`edit-end-${hour}`} value={hour}>
                                      {hour}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.price}
                                  onChange={(e) =>
                                    updateEditItem(item.idx, { price: Number(e.target.value) })
                                  }
                                  className="col-span-2 rounded-md border border-slate-300 px-2 py-2 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditItem(item.idx)}
                                  className="col-span-1 inline-flex items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              {item.error && <p className="text-xs text-rose-600">{item.error}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <Button variant="outline" onClick={() => setEditingTemplateId('')}>
                Cancel
              </Button>
              <Button
                disabled={updatingTemplate || replacingItems || !editName.trim() || hasEditErrors}
                onClick={saveEdit}
                className="bg-[#944a00] hover:bg-[#7f3f00]"
              >
                {updatingTemplate || replacingItems ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
