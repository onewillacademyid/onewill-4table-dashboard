'use client';

/**
 * Section 4: Dukungan yang Dibutuhkan (Support Needed)
 * Fields: request, type, requestedFrom, neededBy, amount (optional), businessConsequence, status.
 * Supports explicit "No updates" with mandatory reason, repeatable rows, and reordering.
 */

import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, HelpCircle, CheckSquare, Square } from 'lucide-react';
import { SupportItem, SectionContainer, SupportType } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { formatDateIndonesian, formatRupiah } from '../../utils/dateUtils';

interface SupportSectionProps {
  data: SectionContainer<SupportItem>;
  onChange: (updated: SectionContainer<SupportItem>) => void;
  readOnly?: boolean;
}

export const SupportSection: React.FC<SupportSectionProps> = ({
  data,
  onChange,
  readOnly = false,
}) => {
  const handleAddItem = () => {
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 5);

    const newItem: SupportItem = {
      id: `sup-${Date.now()}`,
      request: '',
      type: 'decision',
      requestedFrom: '',
      neededBy: nextWeekDate.toISOString().split('T')[0],
      amount: undefined,
      businessConsequence: '',
      status: 'pending',
    };
    onChange({
      ...data,
      noUpdates: false,
      items: [...data.items, newItem],
    });
  };

  const handleUpdateItem = (id: string, updates: Partial<SupportItem>) => {
    const items = data.items.map((item) => (item.id === id ? { ...item, ...updates } : item));
    onChange({ ...data, items });
  };

  const handleDeleteItem = (id: string) => {
    const item = data.items.find((i) => i.id === id);
    if (item && (item.request || item.businessConsequence)) {
      const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus baris permohonan dukungan ini?');
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
        noUpdatesReason: data.noUpdatesReason || 'Semua sumber daya dan otorisasi mencukupi, tidak ada eskalasi dukungan.',
      });
    }
  };

  const getTypeLabel = (type: SupportType) => {
    switch (type) {
      case 'decision': return 'Keputusan Manajemen';
      case 'budget': return 'Alokasi Anggaran';
      case 'people': return 'SDM / Rekrutmen';
      case 'access': return 'Akses Sistem / IT';
      case 'material': return 'Material / Sarana';
      case 'other': return 'Dukungan Lainnya';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-full overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
            4
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Dukungan yang Dibutuhkan (Support Needed)
            </h3>
            <span className="text-[11px] text-slate-500">
              Eskalasi keputusan, alokasi anggaran, atau bantuan lintas divisi
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
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajukan Dukungan</span>
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
              Pernyataan Mandiri Tanpa Eskalasi
            </div>
            {readOnly ? (
              <p className="text-xs text-slate-600 italic">
                "{data.noUpdatesReason || 'Tidak ada permohonan dukungan pada periode ini.'}"
              </p>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Alasan wajib dicantumkan:
                </label>
                <textarea
                  value={data.noUpdatesReason || ''}
                  onChange={(e) => onChange({ ...data, noUpdatesReason: e.target.value })}
                  placeholder="Contoh: Sumber daya operasional dan kewenangan divisi telah mencukupi..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#6C2AA6] focus:ring-1 focus:ring-[#6C2AA6] outline-hidden bg-white"
                />
              </div>
            )}
          </div>
        ) : data.items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-600" />
            <p className="font-medium text-slate-600">Tidak ada eskalasi dukungan aktif</p>
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-2 text-xs text-purple-700 hover:underline font-semibold cursor-pointer"
              >
                + Ajukan permohonan dukungan
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
                    <span className="font-semibold text-slate-700">Dukungan #{index + 1}</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                      {getTypeLabel(item.type)}
                    </span>
                    <StatusBadge type="support" value={item.status} size="sm" />
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
                      <span className="font-semibold text-slate-800">Permintaan: </span>
                      <span className="text-slate-800 font-medium">{item.request}</span>
                    </div>
                    {item.amount && (
                      <div className="text-slate-700 tabular-nums">
                        <span className="font-semibold">Estimasi Anggaran: </span>
                        <span className="font-bold text-[#35115A]">{formatRupiah(item.amount)}</span>
                      </div>
                    )}
                    {item.businessConsequence && (
                      <div>
                        <span className="font-semibold text-rose-800">Konsekuensi jika Tertunda: </span>
                        <span className="text-slate-700">{item.businessConsequence}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-slate-500 text-[11px]">
                      <span>
                        <strong className="text-slate-700">Dimintakan Kepada:</strong> {item.requestedFrom || '-'}
                      </span>
                      <span>
                        <strong className="text-slate-700">Dibutuhkan Sebelum:</strong>{' '}
                        {formatDateIndonesian(item.neededBy)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Permintaan / Kebutuhan Dukungan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.request}
                        onChange={(e) => handleUpdateItem(item.id, { request: e.target.value })}
                        placeholder="Contoh: Otorisasi legal untuk penandatanganan NDA mitra korporasi..."
                        className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Pihak yang Dimintai (Approver / Stakeholder)
                        </label>
                        <input
                          type="text"
                          value={item.requestedFrom}
                          onChange={(e) => handleUpdateItem(item.id, { requestedFrom: e.target.value })}
                          placeholder="Nama pejabat atau divisi pengambil keputusan..."
                          className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Konsekuensi Bisnis jika Tidak Dipenuhi
                        </label>
                        <input
                          type="text"
                          value={item.businessConsequence}
                          onChange={(e) => handleUpdateItem(item.id, { businessConsequence: e.target.value })}
                          placeholder="Risiko bila tidak disetujui tepat waktu..."
                          className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Jenis Dukungan</label>
                        <select
                          value={item.type}
                          onChange={(e) => handleUpdateItem(item.id, { type: e.target.value as SupportType })}
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white"
                        >
                          <option value="decision">Keputusan Manajemen</option>
                          <option value="budget">Alokasi Anggaran</option>
                          <option value="people">SDM / Tim Kerja</option>
                          <option value="access">Akses Sistem / Kredensial</option>
                          <option value="material">Material / Fasilitas</option>
                          <option value="other">Lainnya</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          Nominal Anggaran (Rp, Opsional)
                        </label>
                        <input
                          type="number"
                          value={item.amount ?? ''}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              amount: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="Contoh: 7500000"
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Dibutuhkan Sebelum</label>
                        <input
                          type="date"
                          value={item.neededBy}
                          onChange={(e) => handleUpdateItem(item.id, { neededBy: e.target.value })}
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
