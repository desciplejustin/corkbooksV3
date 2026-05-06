import { useEffect, useState } from 'react';
import { importTemplatesApi, ImportTemplate, CSVParserConfig, PDFParserConfig } from '../api';

const DEFAULT_CSV_CONFIG: CSVParserConfig = {
  delimiter: ',',
  hasHeader: true,
  dateColumn: '',
  dateFormat: 'DD/MM/YYYY',
  descriptionColumn: '',
  amountColumn: '',
  debitColumn: '',
  creditColumn: '',
  referenceColumn: '',
  skipRows: 0,
};

const DEFAULT_PDF_CONFIG: PDFParserConfig = {
  linePattern: '',
  dateFormat: 'DD/MM/YYYY',
  skipLines: 0,
  skipLinesSubsequent: 0,
  pageStart: 1,
};

const EMPTY_META = {
  name: '',
  template_key: '',
  bank_name: '',
  format_type: 'csv' as 'csv' | 'pdf',
};

export function ImportTemplates() {
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [meta, setMeta] = useState(EMPTY_META);
  const [csvConfig, setCsvConfig] = useState<CSVParserConfig>(DEFAULT_CSV_CONFIG);
  const [pdfConfig, setPdfConfig] = useState<PDFParserConfig>(DEFAULT_PDF_CONFIG);
  const [csvAmountMode, setCsvAmountMode] = useState<'single' | 'split'>('single');
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; template: ImportTemplate | null }>({ show: false, template: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    const res = await importTemplatesApi.list({ includeInactive: true });
    if (res.success) setTemplates(res.data || []);
    else setError(res.error || 'Failed to load templates');
    setLoading(false);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setMeta(EMPTY_META);
    setCsvConfig(DEFAULT_CSV_CONFIG);
    setPdfConfig(DEFAULT_PDF_CONFIG);
    setCsvAmountMode('single');
  }

  function openCreate() {
    setError('');
    resetForm();
    setShowForm(true);
  }

  function openEdit(template: ImportTemplate) {
    setError('');
    setEditingId(template.id);
    setShowForm(true);
    setMeta({
      name: template.name,
      template_key: template.template_key,
      bank_name: template.bank_name || '',
      format_type: template.format_type === 'pdf' ? 'pdf' : 'csv',
    });

    const parsed = JSON.parse(template.parser_config) as CSVParserConfig | PDFParserConfig;
    if (template.format_type === 'pdf') {
      setPdfConfig({ ...DEFAULT_PDF_CONFIG, ...(parsed as PDFParserConfig) });
    } else {
      const nextCsv = { ...DEFAULT_CSV_CONFIG, ...(parsed as CSVParserConfig) };
      setCsvConfig(nextCsv);
      setCsvAmountMode(nextCsv.amountColumn ? 'single' : 'split');
    }
  }

  function buildParserConfig(): string {
    if (meta.format_type === 'pdf') {
      return JSON.stringify(pdfConfig);
    }

    const nextCsv = { ...csvConfig };
    if (csvAmountMode === 'single') {
      delete nextCsv.debitColumn;
      delete nextCsv.creditColumn;
    } else {
      delete nextCsv.amountColumn;
    }
    return JSON.stringify(nextCsv);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...meta,
      bank_name: meta.bank_name || null,
      parser_config: buildParserConfig(),
    };

    const res = editingId
      ? await importTemplatesApi.update(editingId, payload)
      : await importTemplatesApi.create(payload);

    setSaving(false);
    if (!res.success) {
      setError(res.error || 'Failed to save template');
      return;
    }

    await loadTemplates();
    resetForm();
  }

  async function toggleActive(template: ImportTemplate) {
    const res = await importTemplatesApi.update(template.id, { is_active: template.is_active === 1 ? 0 : 1 });
    if (!res.success) {
      setError(res.error || 'Failed to update template');
      return;
    }
    await loadTemplates();
  }

  function openDeleteModal(template: ImportTemplate) {
    setDeleteModal({ show: true, template });
  }

  function closeDeleteModal() {
    setDeleteModal({ show: false, template: null });
  }

  async function handleDelete() {
    if (!deleteModal.template) return;

    setDeleting(true);
    setError('');

    const res = await importTemplatesApi.delete(deleteModal.template.id);
    setDeleting(false);

    if (!res.success) {
      setError(res.error || 'Failed to delete template');
      closeDeleteModal();
      return;
    }

    await loadTemplates();
    closeDeleteModal();
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
          <input value={meta.name} onChange={e => setMeta({ ...meta, name: e.currentTarget.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Key</label>
          <input value={meta.template_key} onChange={e => setMeta({ ...meta, template_key: e.currentTarget.value })} placeholder="Auto-generated if left blank" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
          <input value={meta.bank_name} onChange={e => setMeta({ ...meta, bank_name: e.currentTarget.value })} placeholder="e.g. FNB" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Format *</label>
          <select value={meta.format_type} onChange={e => setMeta({ ...meta, format_type: e.currentTarget.value as 'csv' | 'pdf' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>

      {meta.format_type === 'csv' ? (
        <div className="space-y-4 border border-gray-100 rounded-xl p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800 m-0">CSV Mapping</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delimiter</label>
              <select value={csvConfig.delimiter} onChange={e => setCsvConfig({ ...csvConfig, delimiter: e.currentTarget.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value=",">Comma</option>
                <option value=";">Semicolon</option>
                <option value={'\t'}>Tab</option>
                <option value="|">Pipe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
              <input value={csvConfig.dateFormat} onChange={e => setCsvConfig({ ...csvConfig, dateFormat: e.currentTarget.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Column</label>
              <input value={csvConfig.dateColumn} onChange={e => setCsvConfig({ ...csvConfig, dateColumn: e.currentTarget.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description Column</label>
              <input value={csvConfig.descriptionColumn} onChange={e => setCsvConfig({ ...csvConfig, descriptionColumn: e.currentTarget.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Column</label>
              <input value={csvConfig.referenceColumn || ''} onChange={e => setCsvConfig({ ...csvConfig, referenceColumn: e.currentTarget.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skip Rows</label>
              <input type="number" min={0} value={csvConfig.skipRows || 0} onChange={e => setCsvConfig({ ...csvConfig, skipRows: parseInt(e.currentTarget.value, 10) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={csvConfig.hasHeader} onChange={e => setCsvConfig({ ...csvConfig, hasHeader: e.currentTarget.checked })} />
            First row contains headers
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount Layout</label>
            <div className="flex gap-4 text-sm text-gray-700">
              <label className="flex items-center gap-2"><input type="radio" checked={csvAmountMode === 'single'} onChange={() => setCsvAmountMode('single')} /> Single amount column</label>
              <label className="flex items-center gap-2"><input type="radio" checked={csvAmountMode === 'split'} onChange={() => setCsvAmountMode('split')} /> Separate debit / credit</label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {csvAmountMode === 'single' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Column</label>
                <input value={csvConfig.amountColumn || ''} onChange={e => setCsvConfig({ ...csvConfig, amountColumn: e.currentTarget.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Debit Column</label>
                  <input value={csvConfig.debitColumn || ''} onChange={e => setCsvConfig({ ...csvConfig, debitColumn: e.currentTarget.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Column</label>
                  <input value={csvConfig.creditColumn || ''} onChange={e => setCsvConfig({ ...csvConfig, creditColumn: e.currentTarget.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 border border-gray-100 rounded-xl p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800 m-0">PDF Mapping</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Data Page</label>
              <input type="number" min={1} value={pdfConfig.pageStart || 1} onChange={e => setPdfConfig({ ...pdfConfig, pageStart: parseInt(e.currentTarget.value, 10) || 1 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
              <input value={pdfConfig.dateFormat} onChange={e => setPdfConfig({ ...pdfConfig, dateFormat: e.currentTarget.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skip Lines (Page 1)</label>
              <input type="number" min={0} value={pdfConfig.skipLines || 0} onChange={e => setPdfConfig({ ...pdfConfig, skipLines: parseInt(e.currentTarget.value, 10) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skip Lines (Pages 2+)</label>
              <input type="number" min={0} value={pdfConfig.skipLinesSubsequent || 0} onChange={e => setPdfConfig({ ...pdfConfig, skipLinesSubsequent: parseInt(e.currentTarget.value, 10) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Line Pattern</label>
            <textarea value={pdfConfig.linePattern} onChange={e => setPdfConfig({ ...pdfConfig, linePattern: e.currentTarget.value })} rows={5} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg transition-colors">
          {saving ? 'Saving…' : editingId ? 'Update Template' : 'Create Template'}
        </button>
        <button type="button" onClick={resetForm} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Import Templates</h1>
          <p className="text-sm text-gray-500 m-0">Create named parser templates once, then link bank accounts to them.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          + New Template
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {showForm && !editingId && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{editingId ? 'Edit Import Template' : 'Create Import Template'}</h2>
          {formContent}
        </div>
      )}

      {showForm && !!editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={resetForm}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Edit Import Template</h2>
                <p className="mt-1 text-sm text-gray-500">Update the template without leaving the manage templates page.</p>
              </div>
              <button type="button" onClick={resetForm} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                Close
              </button>
            </div>
            <div className="px-6 py-5">
              {formContent}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Template</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Format</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Key</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No templates found</td></tr>
              ) : templates.map(template => (
                <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{template.name}</div>
                    <div className="text-xs text-gray-500">Version {template.version}{template.is_system === 1 ? ' · System' : ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{template.bank_name || 'Any bank'}</td>
                  <td className="px-4 py-3 text-gray-600 uppercase">{template.format_type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{template.template_key}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(template)} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer ${template.is_active === 1 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {template.is_active === 1 ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(template)} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors">
                        Edit
                      </button>
                      <button 
                        onClick={() => openDeleteModal(template)} 
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && deleteModal.template && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            {/* Modal Header */}
            <div className="bg-red-600 px-5 py-4 border-b border-red-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Delete Import Template
              </h2>
            </div>

            <div className="p-5">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete the template <strong>"{deleteModal.template.name}"</strong>?
              </p>
              <p className="text-sm text-gray-600 mb-4">
                This action cannot be undone. The template will be permanently removed from the system.
              </p>
              {deleteModal.template.is_system === 1 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ This is a system template. Deleting it may affect system functionality.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 text-sm bg-red-600 text-white font-medium rounded hover:bg-red-700 disabled:bg-red-400 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete Template'}
                </button>
                <button
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}