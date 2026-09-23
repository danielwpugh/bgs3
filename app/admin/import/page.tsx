'use client';

import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface ImportResult {
  rows?: number;
  created: number;
  updated: number;
  totalPlayersAfter?: number;
  errors: string[];
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleDownloadTemplate() {
    try {
      const res = await fetch('/api/admin/template.csv');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'players-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download template');
    }
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/admin/export-csv');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'players-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to export CSV');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('csv', file);

      const res = await fetch('/api/admin/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setResult(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-4xl font-bold mb-8">CSV Import / Export</h1>

        <div className="space-y-8">
          <div className="p-6 rounded-lg border-2 border-accent-blue bg-gray-900">
            <h2 className="text-2xl font-bold mb-4">Download Template</h2>
            <p className="text-gray-400 mb-4">
              Download the CSV template to see the required format for importing players, including the optional country column.
            </p>
            <button onClick={handleDownloadTemplate} className="btn-primary">
              Download Template CSV
            </button>
          </div>

          <div className="p-6 rounded-lg border-2 border-accent-green bg-gray-900">
            <h2 className="text-2xl font-bold mb-4">Export Players</h2>
            <p className="text-gray-400 mb-4">
              Export all players to a CSV file. The exported file includes an <code className="text-accent-green">id</code> column for reliable synchronization when re-importing. You can edit the CSV and re-import to bulk update players.
            </p>
            <button onClick={handleExport} className="btn-primary">
              Export Players CSV
            </button>
          </div>

          <div className="p-6 rounded-lg border-2 border-accent-pink bg-gray-900">
            <h2 className="text-2xl font-bold mb-4">Import Players</h2>
            <div className="mb-4 p-4 bg-gray-800 rounded-lg text-sm text-gray-300">
              <p className="mb-3">Use <code>country</code> for an English country name (Australia, France) or two-letter code (AU, FR). It is stored in extra fields and supplies the public country name and flag. A blank country clears it; omitting the column preserves the existing country. Other extra fields omitted from the CSV are preserved.</p>
              <p className="font-bold mb-2">Sync Mechanism:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>By ID</strong> (most reliable): If the <code className="text-accent-pink">id</code> column is provided, players are matched and updated by their internal ID.</li>
                <li><strong>By Player Number</strong>: If no ID is provided, players are matched by <code className="text-accent-pink">playerNumber</code>.</li>
                <li><strong>By Slug</strong>: If neither ID nor playerNumber is provided, players are matched by <code className="text-accent-pink">slug</code>.</li>
                <li>If no match is found, a new player is created.</li>
              </ul>
              <p className="mt-2 text-gray-400">💡 <strong>Tip:</strong> Export first, then edit and re-import for smooth bulk updates!</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-pink focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!file || uploading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Importing...' : 'Import CSV'}
              </button>
            </form>
          </div>

          {result && (
            <div className="p-6 rounded-lg border-2 border-gray-700 bg-gray-900">
              <h2 className="text-2xl font-bold mb-4">Import Results</h2>
              <div className="space-y-2">
                {typeof result.rows === 'number' && (
                  <p className="text-gray-300">Rows in CSV: {result.rows}</p>
                )}
                <p className="text-green-400">Created: {result.created} players</p>
                <p className="text-blue-400">Updated: {result.updated} players</p>
                {typeof result.totalPlayersAfter === 'number' && (
                  <p className="text-white">
                    Total players in database after import: <span className="font-bold">{result.totalPlayersAfter}</span>
                  </p>
                )}
                {result.errors.length > 0 && (
                  <div>
                    <p className="text-red-400 font-bold mb-2">Errors:</p>
                    <ul className="list-disc list-inside text-red-400 space-y-1">
                      {result.errors.map((error, idx) => (
                        <li key={idx} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

