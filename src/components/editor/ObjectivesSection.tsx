'use client';

/**
 * Section 3: Sasaran Pekan Depan (Next Objectives)
 * Fields: objective, measurableOutcome, assignee, dueDate, priority, linkedIssueId.
 * Supports explicit "No updates" with mandatory reason, repeatable rows, and reordering.
 */

import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Target, CheckSquare, Square } from 'lucide-react';
import { ObjectiveItem, SectionContainer, ObjectivePriority } from '../../types';
import { formatDateIndonesian } from '../../utils/dateUtils';

interface ObjectivesSectionProps {
  data: SectionContainer<ObjectiveItem>;
  onChange: (updated: SectionContainer<ObjectiveItem>) => void;
  readOnly?: boolean;
}

export const ObjectivesSection: React.FC<ObjectivesSectionProps> = ({
  data,
  onChange,
  readOnly = false,
}) => {
  const handleAddItem = () => {
    // Default to next week Friday
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);

    const newItem: ObjectiveItem = {
      id: `obj-${Date.now()}`,
      objective: '',
      measurableOutcome: '',
      assignee: '',
      dueDate: nextWeekDate.toISOString().split('T')[0],
      priority: 'medium',
    };
    onChange({
      ...data,
      noUpdates: false,
      items: [...data.items, newItem],
    });
  };

  const handleUpdateItem = (id: string, updates: Partial<ObjectiveItem>) => {
    const items = data.items.map((item) => (item.id === id ? { ...item, ...updates } : item));
    onChange({ ...data, items });
  };

  const handleDeleteItem = (id: string) => {
    const item = data.items.find((i) => i.id === id);
    if (item && (item.objective || item.measurableOutcome)) {
      const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus baris sasaran ini?');
      if (!confirmDelete) return;
    }
    const items = data.items.filter((item) => item.id !== id);
    onChange({ ...data, items });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newItems = [...data.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    onChange({ ...data, items: newItems });
  };

  const handleToggleNoUpdates = () => {
    if (data.noUpdates) {
      onChange({ ...data, noUpdates: false, noUpdatesReason: '' });
    } else {
      onChange({
        ...data,
        noUpdates: true,
        noUpdatesReason: data.noUpdatesReason || 'Sasaran pekan depan mengikuti kelanjutan inisiatif berjalan tanpa target baru.',
      });
    }
  };

  const getPriorityBadge = (p: ObjectivePriority) => {
    switch (p) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
            <span>Prioritas Tinggi</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 font-medium text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
            <span>Prioritas Sedang</span>
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 font-medium text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            <span>Prioritas Rendah</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-full overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Sasaran Pekan Depan (Next Objectives)
            </h3>
            <span className="text-[11px] text-slate-500">
              Target prioritas yang terukur untuk periode berikutnya
            </span>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleNoUpdates}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {data.noUpdates ? (
                <CheckSquare className="w-4 h-4 text-[#6C2AA6]" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Tidak ada pembaruan</span>
            </button>
            {!data.noUpdates && (
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Sasaran</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 overflow-y-auto">
        {data.noUpdates ? (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-1">
              Pernyataan Tanpa Sasaran Baru
            </div>
            {readOnly ? (
              <p className="text-xs text-slate-600 italic">
                "{data.noUpdatesReason || 'Tidak ada sasaran baru.'}"
              </p>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Alasan wajib dicantumkan:
                </label>
                <textarea
                  value={data.noUpdatesReason || ''}
                  onChange={(e) => onChange({ ...data, noUpdatesReason: e.target.value })}
                  placeholder="Contoh: Periode pekan depan didedikasikan untuk penutupan siklus akuntansi semesteran..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#6C2AA6] focus:ring-1 focus:ring-[#6C2AA6] outline-hidden bg-white"
                />
              </div>
            )}
          </div>
        ) : data.items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-600" />
            <p className="font-medium text-slate-600">Belum ada sasaran direncanakan</p>
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-2 text-xs text-indigo-700 hover:underline font-semibold cursor-pointer"
              >
                + Rencanakan sasaran pekan depan
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map((item, index) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
              >
                {/* Row Header */}
                <div className="flex items-center justify-between text-xs pb-2 mb-2 border-b border-slate-100 text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Sasaran #{index + 1}</span>
                    {getPriorityBadge(item.priority)}
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        title="Pindahkan ke atas"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === data.items.length - 1}
                        title="Pindahkan ke bawah"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Hapus baris ini"
                        className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {readOnly ? (
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">Sasaran Kerja: </span>
                      <span className="text-slate-800 font-medium">{item.objective}</span>
                    </div>
                    {item.measurableOutcome && (
                      <div>
                        <span className="font-semibold text-indigo-800">Hasil Terukur / Bukti: </span>
                        <span className="text-slate-700">{item.measurableOutcome}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-slate-500 text-[11px]">
                      <span>
                        <strong className="text-slate-700">Penerima Tanggung Jawab:</strong> {item.assignee || '-'}
                      </span>
                      <span>
                        <strong className="text-slate-700">Tenggat Waktu:</strong>{' '}
                        {formatDateIndonesian(item.dueDate)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Sasaran Kerja (Objective) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.objective}
                        onChange={(e) => handleUpdateItem(item.id, { objective: e.target.value })}
                        placeholder="Contoh: Rilis instrumen evaluasi kepuasan peserta terstandardisasi"
                        className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Hasil Terukur / Definisi Sukses (Measurable Outcome)
                      </label>
                      <textarea
                        value={item.measurableOutcome}
                        onChange={(e) => handleUpdateItem(item.id, { measurableOutcome: e.target.value })}
                        placeholder="Indikator terukur, misal: Tingkat pengisian kuesioner min 85% di 3 kohort..."
                        rows={2}
                        className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Tingkat Prioritas</label>
                        <select
                          value={item.priority}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { priority: e.target.value as ObjectivePriority })
                          }
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white"
                        >
                          <option value="high">Tinggi (High)</option>
                          <option value="medium">Sedang (Medium)</option>
                          <option value="low">Rendah (Low)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Penerima Tanggung Jawab</label>
                        <input
                          type="text"
                          value={item.assignee}
                          onChange={(e) => handleUpdateItem(item.id, { assignee: e.target.value })}
                          placeholder="Nama penanggung jawab"
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Tenggat Waktu</label>
                        <input
                          type="date"
                          value={item.dueDate}
                          onChange={(e) => handleUpdateItem(item.id, { dueDate: e.target.value })}
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
