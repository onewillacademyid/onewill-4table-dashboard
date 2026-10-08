/**
 * Section 2: Kendala & Hambatan (Issues)
 * Fields: title, businessImpact, severity, owner, mitigation, targetResolutionDate, state.
 * Supports explicit "No updates" with mandatory reason, repeatable rows, and reordering.
 */

import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, AlertOctagon, CheckSquare, Square } from 'lucide-react';
import { IssueItem, SectionContainer, IssueSeverity, IssueState } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { formatDateIndonesian } from '../../utils/dateUtils';

interface IssuesSectionProps {
  data: SectionContainer<IssueItem>;
  onChange: (updated: SectionContainer<IssueItem>) => void;
  readOnly?: boolean;
}

export const IssuesSection: React.FC<IssuesSectionProps> = ({
  data,
  onChange,
  readOnly = false,
}) => {
  const handleAddItem = () => {
    const newItem: IssueItem = {
      id: `iss-${Date.now()}`,
      title: '',
      businessImpact: '',
      severity: 'medium',
      owner: '',
      mitigation: '',
      targetResolutionDate: new Date().toISOString().split('T')[0],
      state: 'open',
    };
    onChange({
      ...data,
      noUpdates: false,
      items: [...data.items, newItem],
    });
  };

  const handleUpdateItem = (id: string, updates: Partial<IssueItem>) => {
    const items = data.items.map((item) => (item.id === id ? { ...item, ...updates } : item));
    onChange({ ...data, items });
  };

  const handleDeleteItem = (id: string) => {
    const item = data.items.find((i) => i.id === id);
    if (item && (item.title || item.businessImpact)) {
      const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus baris kendala ini?');
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
        noUpdatesReason: data.noUpdatesReason || 'Seluruh operasional berjalan lancar tanpa eskalasi kendala pekan ini.',
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-full overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Kendala & Hambatan (Issues)
            </h3>
            <span className="text-[11px] text-slate-500">
              Hambatan operasional, risiko bisnis, dan rencana mitigasi
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
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kendala</span>
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
              Pernyataan Bebas Kendala Operasional
            </div>
            {readOnly ? (
              <p className="text-xs text-slate-600 italic">
                "{data.noUpdatesReason || 'Tidak ada kendala pada periode ini.'}"
              </p>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Alasan wajib dicantumkan:
                </label>
                <textarea
                  value={data.noUpdatesReason || ''}
                  onChange={(e) => onChange({ ...data, noUpdatesReason: e.target.value })}
                  placeholder="Contoh: Seluruh indikator kinerja memenuhi SLA dan tidak ada insiden teknis..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#6C2AA6] focus:ring-1 focus:ring-[#6C2AA6] outline-hidden bg-white"
                />
              </div>
            )}
          </div>
        ) : data.items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <AlertOctagon className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-600" />
            <p className="font-medium text-slate-600">Tidak ada kendala terdaftar</p>
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddItem}
                className="mt-2 text-xs text-rose-700 hover:underline font-semibold cursor-pointer"
              >
                + Laporkan kendala
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
                    <span className="font-semibold text-slate-700">Kendala #{index + 1}</span>
                    <StatusBadge type="severity" value={item.severity} size="sm" />
                    <StatusBadge type="issue-state" value={item.state} size="sm" />
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
                      <span className="font-semibold text-slate-800">Judul Kendala: </span>
                      <span className="text-slate-800 font-medium">{item.title}</span>
                    </div>
                    {item.businessImpact && (
                      <div>
                        <span className="font-semibold text-rose-800">Dampak Bisnis: </span>
                        <span className="text-slate-700">{item.businessImpact}</span>
                      </div>
                    )}
                    {item.mitigation && (
                      <div>
                        <span className="font-semibold text-slate-800">Rencana Mitigasi: </span>
                        <span className="text-slate-700">{item.mitigation}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-slate-500 text-[11px]">
                      <span>
                        <strong className="text-slate-700">PIC:</strong> {item.owner || '-'}
                      </span>
                      <span>
                        <strong className="text-slate-700">Target Selesai:</strong>{' '}
                        {formatDateIndonesian(item.targetResolutionDate)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Judul Kendala <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                        placeholder="Contoh: Keterlambatan konfirmasi fasilitator tamu masterclass"
                        className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Dampak terhadap Operasional / Bisnis
                        </label>
                        <textarea
                          value={item.businessImpact}
                          onChange={(e) => handleUpdateItem(item.id, { businessImpact: e.target.value })}
                          placeholder="Jelaskan risiko terhadap timeline atau peserta..."
                          rows={2}
                          className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Tindakan Mitigasi / Penanganan
                        </label>
                        <textarea
                          value={item.mitigation}
                          onChange={(e) => handleUpdateItem(item.id, { mitigation: e.target.value })}
                          placeholder="Langkah antisipasi yang sedang dilakukan..."
                          rows={2}
                          className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Tingkat Keparahan</label>
                        <select
                          value={item.severity}
                          onChange={(e) => handleUpdateItem(item.id, { severity: e.target.value as IssueSeverity })}
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white"
                        >
                          <option value="low">Rendah (Low)</option>
                          <option value="medium">Sedang (Medium)</option>
                          <option value="high">Tinggi (High)</option>
                          <option value="critical">Kritis (Critical)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Status Kendala</label>
                        <select
                          value={item.state}
                          onChange={(e) => handleUpdateItem(item.id, { state: e.target.value as IssueState })}
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white"
                        >
                          <option value="open">Terbuka (Open)</option>
                          <option value="mitigating">Dalam Mitigasi</option>
                          <option value="resolved">Terselesaikan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Penanggung Jawab (PIC)</label>
                        <input
                          type="text"
                          value={item.owner}
                          onChange={(e) => handleUpdateItem(item.id, { owner: e.target.value })}
                          placeholder="Nama PIC"
                          className="w-full p-1.5 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Target Selesai</label>
                        <input
                          type="date"
                          value={item.targetResolutionDate}
                          onChange={(e) => handleUpdateItem(item.id, { targetResolutionDate: e.target.value })}
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
