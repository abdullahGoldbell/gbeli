'use client';

import { useState, useRef, useCallback } from 'react';

interface UploadResult {
  success: boolean;
  filename: string;
  diesel: number;
  electric: number;
  total: number;
  inserted: number;
  updated: number;
}

interface Props {
  onClose: () => void;
  onSuccess: (result: UploadResult) => void;
}

export default function UploadModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setError(null);
    setResult(null);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const validateFile = (f: File): string | null => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls'].includes(ext)) return 'Only .xlsx and .xls files are allowed';
    if (f.size > 20 * 1024 * 1024) return 'File exceeds 20 MB limit';
    return null;
  };

  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setError(null);
    setResult(null);
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Upload failed');
        setUploading(false);
        return;
      }
      setResult(data);
      setUploading(false);
      onSuccess(data);
    } catch {
      setError('Network error. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Upload FMS Excel</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Import or update fleet data from spreadsheet</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {!result ? (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-blue-400 bg-blue-50' :
                  file ? 'border-green-300 bg-green-50/30' :
                  'border-neutral-300 bg-neutral-50 hover:border-neutral-400'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                />

                {file ? (
                  <div>
                    <div className="text-3xl mb-2">&#128196;</div>
                    <p className="text-sm font-medium text-neutral-700">{file.name}</p>
                    <p className="text-xs text-neutral-400 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium mt-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-2">&#128229;</div>
                    <p className="text-sm font-medium text-neutral-600">Drop Excel file here or click to browse</p>
                    <p className="text-xs text-neutral-400 mt-1">.xlsx or .xls (max 20 MB)</p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
                <p className="font-medium mb-1">Supported sheet names:</p>
                <div className="flex gap-2">
                  <span className="bg-blue-100 px-2 py-0.5 rounded font-medium">DIESEL</span>
                  <span className="bg-blue-100 px-2 py-0.5 rounded font-medium">ELECTRIC</span>
                </div>
                <p className="mt-2 text-blue-600">Existing vehicles (by Veh No) will be updated. New vehicles will be added.</p>
              </div>

              {error && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Success */
            <div className="text-center py-4">
              <div className="text-4xl mb-3">&#9989;</div>
              <h3 className="text-lg font-bold text-neutral-900">Upload Complete</h3>
              <p className="text-sm text-neutral-500 mt-1">{result.filename}</p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-xl font-bold text-amber-700">{result.diesel}</p>
                  <p className="text-[11px] text-amber-600 font-medium">Diesel</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xl font-bold text-blue-700">{result.electric}</p>
                  <p className="text-[11px] text-blue-600 font-medium">Electric</p>
                </div>
              </div>

              <div className="flex justify-center gap-6 mt-4 text-sm">
                <span className="text-neutral-600"><span className="font-bold text-neutral-900">{result.inserted}</span> new</span>
                <span className="text-neutral-600"><span className="font-bold text-neutral-900">{result.updated}</span> updated</span>
                <span className="text-neutral-600"><span className="font-bold text-neutral-900">{result.total}</span> total</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          {!result ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upload & Import'
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium bg-neutral-800 text-white rounded-md hover:bg-neutral-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
