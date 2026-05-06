import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { importsApi, importTemplatesApi, bankAccountsApi, BankAccount, ImportTemplate } from '../api';

export function ImportUpload() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [statementMonth, setStatementMonth] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      bankAccountsApi.list(),
      importTemplatesApi.list({ includeInactive: false }),
    ]).then(([accountsRes, templatesRes]) => {
      if (accountsRes.success) setBankAccounts((accountsRes.data || []).filter(a => a.is_active === 1));
      if (templatesRes.success) setTemplates(templatesRes.data || []);
      setLoadingAccounts(false);
    });
    // Default statement month to current month (optional, can be left blank for multi-month)
    const now = new Date();
    setStatementMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  function onAccountChange(accountId: string) {
    setSelectedAccount(accountId);
    const account = bankAccounts.find(item => item.id === accountId);
    setSelectedTemplateId(account?.default_import_template_id || '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!selectedAccount) { setError('Please select a bank account'); return; }
  if (!selectedTemplateId) { setError('Please choose an import template for this upload'); return; }
    if (!file) { setError('Please select a file'); return; }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_account_id', selectedAccount);
    formData.append('template_id', selectedTemplateId);
    formData.append('statement_month', statementMonth);
    if (notes) formData.append('notes', notes);

    // For PDF files, extract text in the browser before uploading
    if (selectedTemplate?.format_type === 'pdf') {
      try {
        setExtracting(true);
        const { extractPDFPages } = await import('../utils/pdf-extractor');
        const pages = await extractPDFPages(file);
        formData.append('extracted_text', JSON.stringify(pages));
        setExtracting(false);
      } catch (err) {
        setExtracting(false);
        setLoading(false);
        setError('Failed to extract text from PDF. Make sure the file is a readable PDF (not scanned image).');
        return;
      }
    }

    const res = await importsApi.upload(formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Upload failed');
      return;
    }

    // Navigate to review page
    navigate(`/imports/${res.data!.import.id}/review`);
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;

  return (
    <div className="p-6 max-w-2xl">
      {/* Breadcrumb + title */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/imports" className="text-gray-500 hover:text-gray-700 text-sm no-underline">← Imports</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-800 m-0">New Import</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Bank Account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
          {loadingAccounts ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : (
            <select
              value={selectedAccount}
              onChange={e => onAccountChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select bank account…</option>
              {bankAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.bank_name} – {acc.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Config status */}
        {selectedAccount && (
          <div className={`px-4 py-2.5 rounded-lg text-sm ${selectedTemplate ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {selectedTemplate
              ? `✓ Using template: ${selectedTemplate.name} (${selectedTemplate.format_type.toUpperCase()})`
              : <>⚠ No template linked yet. <Link to="/bank-accounts" className="font-semibold underline">Link one in Bank Accounts</Link> or <Link to="/import-templates" className="font-semibold underline">create a template</Link>.</>
            }
          </div>
        )}

        {selectedAccount && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Import Template *</label>
            <select
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select template…</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}{template.bank_name ? ` · ${template.bank_name}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">The linked default template is preselected, but you can override it for this upload.</p>
          </div>
        )}

        {/* Statement Period */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statement Period <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="month"
            value={statementMonth}
            onChange={e => setStatementMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* File drop zone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statement File *</label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver ? 'border-blue-400 bg-blue-50' :
              file ? 'border-green-400 bg-green-50' :
              'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            {dragOver ? (
              <div>
                <div className="text-3xl mb-2">📥</div>
                <div className="text-blue-600 font-semibold text-sm">Drop to load</div>
              </div>
            ) : file ? (
              <div>
                <div className="text-2xl mb-1">📄</div>
                <div className="font-semibold text-green-700 text-sm">{file.name}</div>
                <div className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                <div className="text-xs text-blue-500 mt-2">Click or drop to replace</div>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">📁</div>
                <div className="text-gray-600 text-sm">Drag &amp; drop or click to browse</div>
                <div className="text-xs text-gray-400 mt-1">CSV (.csv, .txt) or PDF</div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.pdf"
              onChange={e => { setFile(e.target.files?.[0] || null); e.target.value = ''; }}
              className="hidden"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. December 2024 statement"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !selectedTemplateId}
            className={`flex-1 py-2.5 text-white font-semibold rounded-lg text-sm transition-colors ${
              loading || !selectedTemplateId ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (extracting ? 'Extracting PDF…' : 'Uploading…') : 'Upload & Parse'}
          </button>
          <Link
            to="/imports"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm no-underline text-center transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Config hint */}
      {selectedTemplate && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
          <strong className="text-gray-700">Template config for {selectedTemplate.name}:</strong>
          <pre className="mt-2 overflow-auto text-xs">
            {JSON.stringify(JSON.parse(selectedTemplate.parser_config), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
