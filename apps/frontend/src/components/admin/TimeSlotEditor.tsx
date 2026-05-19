'use client';

import { useState } from 'react';
import { Plus, Trash2, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpsertTimeSlots } from '@/hooks/useAdminCourts';
import { formatCurrency } from '@/lib/utils';
import type { CourtTimeSlot } from '@/types';

// ==================== CONSTANTS ====================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Display order: Mon-Sun (1-6, 0)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// ==================== TYPES ====================

interface SlotDraft {
  id?: string; // existing slot id
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  price: number;
  error?: string;
}

interface AddSlotFormState {
  dayOfWeek: number;
  startHour: string;
  endHour: string;
  price: string;
  error?: string;
}

interface TimeSlotEditorProps {
  courtId: string;
  timeSlots: CourtTimeSlot[];
}

// ==================== HELPERS ====================

function formatHour(h: number): string {
  return `${String(h === 24 ? 0 : h).padStart(2, '0')}:00`;
}

function validateSlots(slots: SlotDraft[]): SlotDraft[] {
  return slots.map((slot) => {
    if (slot.startHour >= slot.endHour) {
      return { ...slot, error: 'End hour must be after start hour' };
    }
    // Check overlap with other slots in same day
    const daySlots = slots.filter((s) => s !== slot && s.dayOfWeek === slot.dayOfWeek);
    const hasOverlap = daySlots.some(
      (s) => slot.startHour < s.endHour && slot.endHour > s.startHour,
    );
    if (hasOverlap) {
      return { ...slot, error: 'Timeslot overlaps with another slot on this day' };
    }
    return { ...slot, error: undefined };
  });
}

// ==================== COMPONENT ====================

export function TimeSlotEditor({ courtId, timeSlots }: TimeSlotEditorProps) {
  const { mutate: upsertTimeSlots, isPending } = useUpsertTimeSlots();

  // Initialize draft from existing time slots
  const [slots, setSlots] = useState<SlotDraft[]>(() =>
    timeSlots.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startHour: s.startHour,
      endHour: s.endHour,
      price: s.price,
    })),
  );

  // Per-day add form state
  const [addForms, setAddForms] = useState<Record<number, AddSlotFormState | null>>({});

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenAddForm = (dayOfWeek: number) => {
    setAddForms((prev) => ({
      ...prev,
      [dayOfWeek]: { dayOfWeek, startHour: '8', endHour: '9', price: '150000', error: undefined },
    }));
  };

  const handleCloseAddForm = (dayOfWeek: number) => {
    setAddForms((prev) => ({ ...prev, [dayOfWeek]: null }));
  };

  const handleAddSlot = (dayOfWeek: number) => {
    const form = addForms[dayOfWeek];
    if (!form) return;

    const startHour = parseInt(form.startHour, 10);
    const endHour = parseInt(form.endHour, 10);
    const price = parseFloat(form.price);

    if (isNaN(startHour) || isNaN(endHour) || isNaN(price)) {
      setAddForms((prev) => ({
        ...prev,
        [dayOfWeek]: { ...form, error: 'Please enter all valid information' },
      }));
      return;
    }
    if (startHour >= endHour) {
      setAddForms((prev) => ({
        ...prev,
        [dayOfWeek]: { ...form, error: 'End hour must be after start hour' },
      }));
      return;
    }
    if (price < 0) {
      setAddForms((prev) => ({
        ...prev,
        [dayOfWeek]: { ...form, error: 'Price cannot be negative' },
      }));
      return;
    }

    // Check overlap
    const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek);
    const hasOverlap = daySlots.some((s) => startHour < s.endHour && endHour > s.startHour);
    if (hasOverlap) {
      setAddForms((prev) => ({
        ...prev,
        [dayOfWeek]: { ...form, error: 'Timeslot overlaps with an existing slot' },
      }));
      return;
    }

    setSlots((prev) => [...prev, { dayOfWeek, startHour, endHour, price }]);
    handleCloseAddForm(dayOfWeek);
  };

  const handleSave = () => {
    const validated = validateSlots(slots);
    const hasErrors = validated.some((s) => s.error);
    if (hasErrors) {
      setSlots(validated);
      return;
    }

    if (slots.length === 0) {
      // Backend requires at least 1 slot — show warning
      alert('At least 1 timeslot is required before saving.');
      return;
    }

    upsertTimeSlots({
      courtId,
      dto: {
        slots: slots.map(({ dayOfWeek, startHour, endHour, price }) => ({
          dayOfWeek,
          startHour,
          endHour,
          price,
        })),
      },
    });
  };

  const totalSlots = slots.length;
  const hasErrors = slots.some((s) => s.error);
  const canSave = totalSlots > 0 && !hasErrors;

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600 mt-0.5" />
        <p className="text-sm text-yellow-800">
          Saving will <strong>replace the entire</strong> active schedule for this court. Please
          double check before saving.
        </p>
      </div>

      {/* 7-day grid */}
      <div className="space-y-4">
        {DAY_ORDER.map((dayOfWeek) => {
          const daySlots = slots
            .map((s, i) => ({ ...s, index: i }))
            .filter((s) => s.dayOfWeek === dayOfWeek)
            .sort((a, b) => a.startHour - b.startHour);
          const addForm = addForms[dayOfWeek];

          return (
            <div key={dayOfWeek} className="rounded-lg border bg-card p-4">
              {/* Day Header */}
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{DAY_NAMES[dayOfWeek]}</h3>
                <span className="text-xs text-muted-foreground">{daySlots.length} slot(s)</span>
              </div>

              {/* Slots */}
              {daySlots.length === 0 && !addForm && (
                <p className="mb-3 text-sm text-muted-foreground italic">No timeslots available</p>
              )}

              <div className="space-y-2">
                {daySlots.map((slot) => (
                  <div
                    key={slot.index}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                      slot.error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900">
                        {formatHour(slot.startHour)} – {formatHour(slot.endHour)}
                      </span>
                      <span className="text-primary font-medium">{formatCurrency(slot.price)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {slot.error && (
                        <span className="text-xs text-red-600" role="alert">
                          {slot.error}
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveSlot(slot.index)}
                        disabled={isPending}
                        aria-label={`Delete timeslot ${formatHour(slot.startHour)} - ${formatHour(slot.endHour)}`}
                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Form */}
                {addForm && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Start Hour
                        </label>
                        <select
                          value={addForm.startHour}
                          onChange={(e) =>
                            setAddForms((prev) => ({
                              ...prev,
                              [dayOfWeek]: {
                                ...addForm,
                                startHour: e.target.value,
                                error: undefined,
                              },
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {String(i).padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          End Hour
                        </label>
                        <select
                          value={addForm.endHour}
                          onChange={(e) =>
                            setAddForms((prev) => ({
                              ...prev,
                              [dayOfWeek]: {
                                ...addForm,
                                endHour: e.target.value,
                                error: undefined,
                              },
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h}>
                              {String(h === 24 ? 0 : h).padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Price (VND)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={addForm.price}
                          onChange={(e) =>
                            setAddForms((prev) => ({
                              ...prev,
                              [dayOfWeek]: { ...addForm, price: e.target.value, error: undefined },
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    {addForm.error && (
                      <p className="mb-2 text-xs text-red-600" role="alert">
                        {addForm.error}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddSlot(dayOfWeek)}
                        className="text-xs"
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCloseAddForm(dayOfWeek)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Button */}
              {!addForm && (
                <button
                  onClick={() => handleOpenAddForm(dayOfWeek)}
                  disabled={isPending}
                  className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Timeslot
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{totalSlots} slot(s)</span>
          {hasErrors && <span className="ml-2 text-red-600">— Resolve errors before saving</span>}
          {totalSlots === 0 && (
            <span className="ml-2 text-yellow-600">— At least 1 slot is required</span>
          )}
        </p>
        <Button onClick={handleSave} disabled={isPending || !canSave} className="gap-2">
          <Save className="h-4 w-4" />
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
