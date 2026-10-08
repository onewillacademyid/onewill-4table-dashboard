'use client';

/**
 * Section 1: Capaian Pekan Lalu (Achievements)
 * Fields: description, project, result, target/actual/unit (optional), evidenceUrl, linkedObjectiveId.
 * Supports explicit "No updates" with mandatory reason, repeatable rows, and reordering.
 */

import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, Award, CheckSquare, Square } from 'lucide-react';
import { AchievementItem, SectionContainer } from '../../types';

interface AchievementsSectionProps {
  data: SectionContainer<AchievementItem>;
  onChange: (updated: SectionContainer<AchievementItem>) => void;
  readOnly?: boolean;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  data,
  onChange,
  readOnly = false,
}) => {
  const handleAddItem = () => {
    const newItem: AchievementItem = {
      id: `ach-${Date.now()}`,
      description: '',
      project: '',
      result: '',
      targetValue: undefined,
      actualValue: undefined,
      unit: '',
      evidenceUrl: '',
    };
    onChange({
      ...data,
      noUpdates: false,
      items: [...data.items, newItem],
    });
  };

  const handleUpdateItem = (id: string, updates: Partial<AchievementItem>) => {
    const items = data.items.map((item) => (item.id === id ? { ...item, ...updates } : item));
    onChange({ ...data, items });
  };

  const handleDeleteItem = (id: string) => {
    const item = data.items.find((i) => i.id === id);
    if (item && (item.description || item.project || item.result)) {
      const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus baris capaian ini?');
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
        noUpdatesReason: data.noUpdatesReason || 'Tidak ada capaian signifikan baru pada periode pekan ini.',
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-full overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#6C2AA6]/10 text-[#6C2AA6] flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Capaian Pekan Lalu (Achievements)
            </h3>
            <span className="text-[11px] text-slate-500">
              Hasil kerja terverifikasi dan progres proyek tim
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
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6C2AA6] hover:text-[#35115A] bg-[#F4EFFA] hover:bg-[#ebdcf9] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris</span>
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
              Pernyataan Nihil Capaian Terverifikasi
            </div>
            {readOnly ? (
              <p className="text-xs text-slate-600 italic">
                "{data.noUpdatesReason || 'Tidak ada pembaruan pada seksi ini.'}"
              </p>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Alasan wajib dicantumkan untuk akuntabilitas:
                </label>
                <textarea
                  value={data.noUpdatesReason || ''}
                  onChange={(e) => onChange({ ...data, noUpdatesReason: e.target.value })}
                  placeholder="Contoh: Fokus penuh pekan ini dialokasikan pada persiapan audit akreditasi..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#6C2AA6] focus:ring-1 focus:ring-[#6C2AA6] outline-hidden bg-white"
                />
              </div>
            )}
          </div>
        ) : data.items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <Award className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#6C2AA6]" />
            <p className="font-medium text-slate-600">Belum ada capaian yang dicatat</p>
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-2 text-xs text-[#6C2AA6] hover:underline font-semibold cursor-pointer"
              >
                + Tambah capaian pertama
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
                    <span className="font-semibold text-slate-700">Item #{index + 1}</span>
                    {item.project && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {item.project}
                      </span>
                    )}
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
                      <span className="font-semibold text-slate-800">Deskripsi: </span>
                      <span className="text-slate-700">{item.description}</span>
                    </div>
                    {item.result && (
                      <div>
                        <span className="font-semibold text-emerald-800">Hasil / Dampak: </span>
                        <span className="text-slate-700">{item.result}</span>
                      </div>
                    )}
                    {(item.actualValue !== undefined || item.targetValue !== undefined) && (
                      <div className="text-slate-600 tabular-nums">
                        <span className="font-medium">Metrik: </span>
                        {item.actualValue !== undefined && <span>Realisasi: {item.actualValue} </span>}
                        {item.targetValue !== undefined && <span>(Target: {item.targetValue}) </span>}
                        {item.unit && <span>{item.unit}</span>}
                      </div>
                    )}
                    {item.evidenceUrl && (
                      <div className="pt-1">
                        <a
                          href={item.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#6C2AA6] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Tautan Bukti Deliverable</span>
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Deskripsi Capaian <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                          placeholder="Aktivitas atau milestone utama yang diselesaikan..."
                          className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] focus:ring-1 focus:ring-[#6C2AA6] outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Proyek / Inisiatif
                        </label>
                        <input
                          type="text"
                          value={item.project}
                          onChange={(e) => handleUpdateItem(item.id, { project: e.target.value })}
                          placeholder="Contoh: Kurikulum B2B"
                          className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] focus:ring-1 focus:ring-[#6C2AA6] outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Hasil Terukur / Bukti Dampak
                      </label>
                      <input
                        type="text"
                        value={item.result}
                        onChange={(e) => handleUpdateItem(item.id, { result: e.target.value })}
                        placeholder="Contoh: 100% modul selesai ditelaah oleh asesor industri"
                        className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] focus:ring-1 focus:ring-[#6C2AA6] outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Realisasi (Opsional)</label>
                        <input
                          type="number"
                          value={item.actualValue ?? ''}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              actualValue: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="Nilai riil"
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Target (Opsional)</label>
                        <input
                          type="number"
                          value={item.targetValue ?? ''}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              targetValue: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="Target awal"
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Satuan</label>
                        <input
                          type="text"
                          value={item.unit || ''}
                          onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                          placeholder="%, modul, peserta"
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Tautan Bukti (URL)</label>
                        <input
                          type="url"
                          value={item.evidenceUrl || ''}
                          onChange={(e) => handleUpdateItem(item.id, { evidenceUrl: e.target.value })}
                          placeholder="https://docs..."
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
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
