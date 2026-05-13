'use client';

import { useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { useCourts } from '@/hooks/useCourts';
import {
  useApplySlotTemplate,
  useCreateSlotTemplate,
  useDeleteSlotTemplate,
  useSlotTemplates,
} from '@/hooks/useSlotTemplates';
import { toast } from 'sonner';

export default function AdminSlotTemplatesPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

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
              rows={4}
            />
            <Button
              disabled={creating || !name.trim()}
              onClick={() =>
                createTemplate({
                  name,
                  description: description || undefined,
                  items: [
                    { dayOfWeek: 1, startHour: '09:00:00', endHour: '10:00:00', price: 200000 },
                    { dayOfWeek: 3, startHour: '18:00:00', endHour: '19:00:00', price: 250000 },
                  ],
                })
              }
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
              disabled={!selectedTemplate || !selectedCourtId || applying}
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
    </AdminShell>
  );
}
