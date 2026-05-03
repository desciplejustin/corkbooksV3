import { useState, useEffect } from 'react';
import { bankAccountsApi, importConfigsApi, BankAccount, BankImportConfig, CSVParserConfig, PDFParserConfig } from '../api';

interface SamplePreviewRow {
  date: string;
  description: string;
  moneyIn: number;
  moneyOut: number;
  reference: string | null;
  balance?: number;
}

interface LineDetail {
  raw: string;
  matched: boolean;
  date?: string;
  description?: string;
  moneyIn?: number;
  moneyOut?: number;
  balance?: number;
  skipReason?: string;
}

interface SamplePreviewResult {
  rowCount: number;
  skippedRows: number;
  preview: SamplePreviewRow[];
  rawHeaders?: string[];   // CSV: detected column headers
  rawLines?: string[];     // PDF: extracted text lines
  lineDetails?: LineDetail[]; // PDF: per-line annotated parse result
}

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

export function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Import config state
  const [configAccountId, setConfigAccountId] = useState<string | null>(null);
  const [existingConfig, setExistingConfig] = useState<BankImportConfig | null>(null);
  const [formatType, setFormatType] = useState<'csv' | 'pdf'>('csv');
  const [csvConfig, setCsvConfig] = useState<CSVParserConfig>({ ...DEFAULT_CSV_CONFIG });
  const [pdfConfig, setPdfConfig] = useState<PDFParserConfig>({ ...DEFAULT_PDF_CONFIG });
  const [amountMode, setAmountMode] = useState<'single' | 'split'>('split');
  const [pdfAmountMode, setPdfAmountMode] = useState<'single' | 'split'>('split');
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');

  // View config state
  const [viewConfigAccount, setViewConfigAccount] = useState<BankAccount | null>(null);
  const [viewConfigData, setViewConfigData] = useState<BankImportConfig | null>(null);
  const [viewConfigLoading, setViewConfigLoading] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [sampleText, setSampleText] = useState<string | null>(null);
  const [samplePages, setSamplePages] = useState<string[][] | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Sample test state
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleParsing, setSampleParsing] = useState(false);
  const [sampleResult, setSampleResult] = useState<SamplePreviewResult | null>(null);
  const [sampleError, setSampleError] = useState('');
  const [pickedLine, setPickedLine] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    bank_name: '',
    account_number_masked: '',
    owner_name: '',
    account_type: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    const response = await bankAccountsApi.list();
    if (response.success && response.data) {
      // Store all accounts (including inactive ones)
      setAccounts(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to load bank accounts');
    }
    setLoading(false);
  }

  function handleEdit(account: BankAccount) {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      bank_name: account.bank_name,
      account_number_masked: account.account_number_masked,
      owner_name: account.owner_name,
      account_type: account.account_type || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      let response;
      if (editingId) {
        response = await bankAccountsApi.update(editingId, formData);
      } else {
        response = await bankAccountsApi.create(formData);
      }

      if (response.success) {
        await loadAccounts();
        resetForm();
        setError(null);
      } else {
        setError(response.error || 'Failed to save bank account');
      }
    } catch (err) {
      setError('An error occurred');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      bank_name: '',
      account_number_masked: '',
      owner_name: '',
      account_type: '',
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function openViewConfig(account: BankAccount) {
    setViewConfigAccount(account);
    setViewConfigData(null);
    setViewConfigLoading(true);
    const res = await importConfigsApi.list(account.id);
    const active = res.data?.find(c => c.is_active === 1) || null;
    setViewConfigData(active);
    setViewConfigLoading(false);
  }

  async function openConfig(account: BankAccount) {
    setConfigAccountId(account.id);
    setConfigError('');
    setConfigSuccess('');
    setWizardStep(1);
    setSampleText(null);
    setSamplePages(null);
    setSampleLoading(false);
    setDragOver(false);
    setSampleFile(null);
    setSampleResult(null);
    setSampleError('');
    const res = await importConfigsApi.list(account.id);
    const active = res.data?.find(c => c.is_active === 1) || null;
    setExistingConfig(active);
    if (active) {
      const fmt = active.format_type as 'csv' | 'pdf';
      setFormatType(fmt);
      if (fmt === 'pdf') {
        const parsed: PDFParserConfig = JSON.parse(active.parser_config);
        // Migration: old configs stored skip-line count in `pageStart` instead of `skipLines`.
        // A pageStart > 5 almost certainly means skipLines was saved there by mistake.
        const migratedParsed = { ...parsed };
        if ((parsed.pageStart ?? 1) > 5 && !parsed.skipLines) {
          migratedParsed.skipLines = parsed.pageStart;
          migratedParsed.pageStart = 1;
        }
        setPdfConfig({ ...DEFAULT_PDF_CONFIG, ...migratedParsed });
        // Detect amount mode from the saved pattern
        setPdfAmountMode(parsed.linePattern.includes('<amount>') ? 'single' : 'split');
      } else {
        const parsed: CSVParserConfig = JSON.parse(active.parser_config);
        setCsvConfig({ ...DEFAULT_CSV_CONFIG, ...parsed });
        setAmountMode(parsed.amountColumn ? 'single' : 'split');
      }
    } else {
      setFormatType('csv');
      setCsvConfig({ ...DEFAULT_CSV_CONFIG });
      setPdfConfig({ ...DEFAULT_PDF_CONFIG });
      setAmountMode('split');
      setPdfAmountMode('split');
    }
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!configAccountId) return;
    setConfigSaving(true);
    setConfigError('');
    setConfigSuccess('');

    // Strip unused amount columns based on mode (CSV only)
    let parserConfigObj: CSVParserConfig | PDFParserConfig;
    if (formatType === 'pdf') {
      parserConfigObj = { ...pdfConfig };
    } else {
      const c: CSVParserConfig = { ...csvConfig };
      if (amountMode === 'single') {
        delete c.debitColumn;
        delete c.creditColumn;
      } else {
        delete c.amountColumn;
      }
      parserConfigObj = c;
    }

    const payload = {
      bank_account_id: configAccountId,
      format_type: formatType,
      parser_config: parserConfigObj,
    };

    let res;
    if (existingConfig) {
      res = await importConfigsApi.update(existingConfig.id, { parser_config: JSON.stringify(parserConfigObj) as any });
    } else {
      res = await importConfigsApi.create(payload);
    }

    setConfigSaving(false);
    if (res.success) {
      setConfigSuccess('Import configuration saved!');
      setExistingConfig(res.data || null);
    } else {
      setConfigError(res.error || 'Failed to save');
    }
  }

  async function runSampleTest() {
    if (!sampleFile) return;
    setSampleParsing(true);
    setSampleError('');
    setSampleResult(null);
    try {
      if (formatType === 'csv') {
        const text = await sampleFile.text();
        const allLines = text.split('\n').filter(l => l.trim());
        let startIdx = csvConfig.skipRows || 0;
        let headers: string[] = [];
        if (csvConfig.hasHeader && allLines.length > startIdx) {
          headers = sampleSplitLine(allLines[startIdx], csvConfig.delimiter);
          startIdx++;
        }
        const getVal = (rd: Record<string, string>, col: string, vals: string[]) => {
          if (rd[col] !== undefined) return rd[col];
          const idx = parseInt(col, 10);
          return (!isNaN(idx) && vals[idx] !== undefined) ? vals[idx] : '';
        };
        const preview: SamplePreviewRow[] = [];
        let skippedRows = 0;
        for (let i = startIdx; i < allLines.length; i++) {
          const vals = sampleSplitLine(allLines[i], csvConfig.delimiter);
          if (!vals.length || vals.every(v => !v.trim())) { skippedRows++; continue; }
          try {
            const rd: Record<string, string> = {};
            if (csvConfig.hasHeader && headers.length) {
              headers.forEach((h, j) => { rd[h] = vals[j] || ''; });
            } else {
              vals.forEach((v, j) => { rd[`col_${j}`] = v; });
            }
            const dateStr = getVal(rd, csvConfig.dateColumn, vals);
            const desc = getVal(rd, csvConfig.descriptionColumn, vals);
            if (!dateStr || !desc) { skippedRows++; continue; }
            const date = sampleParseDate(dateStr, csvConfig.dateFormat);
            const reference = csvConfig.referenceColumn ? getVal(rd, csvConfig.referenceColumn, vals) || null : null;
            let moneyIn = 0, moneyOut = 0;
            if (csvConfig.amountColumn) {
              const amt = sampleParseAmount(getVal(rd, csvConfig.amountColumn, vals));
              if (amt >= 0) moneyIn = amt; else moneyOut = Math.abs(amt);
            } else {
              moneyOut = sampleParseAmount(getVal(rd, csvConfig.debitColumn || '', vals));
              moneyIn = sampleParseAmount(getVal(rd, csvConfig.creditColumn || '', vals));
            }
            preview.push({ date, description: desc, moneyIn, moneyOut, reference });
          } catch { skippedRows++; }
        }
        setSampleResult({ rowCount: preview.length, skippedRows, preview: preview.slice(0, 5), rawHeaders: headers.length ? headers : undefined });
      } else {
        if (!pdfConfig.linePattern) throw new Error('Enter a line pattern regex before testing');
        if (!samplePages) throw new Error('No PDF data loaded — please re-upload the sample file');
        // Clamp pageStart the same way the preview does, so out-of-range values still work
        const pageStart = Math.min((pdfConfig.pageStart ?? 1) - 1, Math.max(0, samplePages.length - 1));
        const skipLines = pdfConfig.skipLines ?? 0;
        const skipLinesSubsequent = pdfConfig.skipLinesSubsequent ?? 0;
        const regex = new RegExp(pdfConfig.linePattern, 'i');
        const rawLines: string[] = [];
        const preview: SamplePreviewRow[] = [];
        const lineDetails: LineDetail[] = [];
        let skippedRows = 0;
        for (let p = pageStart; p < samplePages.length; p++) {
          const skip = p === pageStart ? skipLines : skipLinesSubsequent;
          const lines = samplePages[p].slice(skip);
          for (const line of lines) {
            const t = line.trim();
            if (!t) continue;
            rawLines.push(t);
          }
        }
        if (rawLines.length === 0) {
          throw new Error(`No text lines found — ${samplePages.length} page(s) extracted, starting at page ${pageStart + 1} with ${skipLines} lines skipped (${skipLinesSubsequent} on subsequent pages). Try reducing skip lines.`);
        }
        let prevBalance: number | null = null;
        for (const line of rawLines) {
          try {
            const match = regex.exec(line);
            if (!match?.groups) {
              skippedRows++;
              lineDetails.push({ raw: line, matched: false, skipReason: 'no match' });
              continue;
            }
            const g = match.groups;
            if (!g['date']) {
              skippedRows++;
              lineDetails.push({ raw: line, matched: false, skipReason: 'no date group' });
              continue;
            }
            const date = sampleParseDate(g['date'].trim(), pdfConfig.dateFormat);
            const description = g['description']?.trim() || '(bank charge)';
            const reference = g['reference']?.trim() || null;
            let moneyIn = 0, moneyOut = 0;
            let balance: number | undefined;

            if (g['balance'] !== undefined) {
              balance = sampleParseAmount(g['balance']);
              if (g['amount'] !== undefined) {
                const crdr = getCrDr(g['amount']);
                if (crdr === 'cr') {
                  moneyIn = sampleParseAmount(g['amount']);
                } else if (crdr === 'dr') {
                  moneyOut = sampleParseAmount(g['amount']);
                } else {
                  // No suffix: use balance delta
                  if (prevBalance !== null) {
                    const delta = balance - prevBalance;
                    if (delta > 0) moneyIn = Math.abs(delta);
                    else if (delta < 0) moneyOut = Math.abs(delta);
                  } else {
                    const amt = sampleParseAmount(g['amount']);
                    if (amt > 0) moneyIn = amt;
                  }
                }
              } else if (g['debit'] !== undefined || g['credit'] !== undefined) {
                moneyOut = sampleParseAmount(g['debit'] || '');
                moneyIn = sampleParseAmount(g['credit'] || '');
              }
              prevBalance = balance;
            } else if (g['amount'] !== undefined) {
              const amt = sampleParseAmount(g['amount']);
              if (amt >= 0) moneyIn = amt; else moneyOut = Math.abs(amt);
            } else {
              moneyOut = sampleParseAmount(g['debit'] || '');
              moneyIn = sampleParseAmount(g['credit'] || '');
            }

            preview.push({ date, description, moneyIn, moneyOut, reference, balance });
            lineDetails.push({ raw: line, matched: true, date, description, moneyIn, moneyOut, balance });
          } catch {
            skippedRows++;
            lineDetails.push({ raw: line, matched: false, skipReason: 'parse error' });
          }
        }
        setSampleResult({ rowCount: preview.length, skippedRows, preview, rawLines, lineDetails });
      }
    } catch (err) {
      setSampleError(err instanceof Error ? err.message : 'Failed to test configuration');
    }
    setSampleParsing(false);
  }

  function autoFillFromHeaders(headers: string[]) {
    const lc = headers.map(h => h.toLowerCase().trim());
    const find = (...terms: string[]) => {
      const idx = lc.findIndex(h => terms.some(t => h.includes(t)));
      return idx >= 0 ? headers[idx] : '';
    };
    setCsvConfig(prev => ({
      ...prev,
      dateColumn: find('date', 'dt') || prev.dateColumn,
      descriptionColumn: find('description', 'narr', 'detail', 'particulars', 'memo') || prev.descriptionColumn,
      referenceColumn: find('reference', 'ref', 'cheque', 'check', 'chq') || prev.referenceColumn,
      debitColumn: find('debit', 'dr', 'withdrawal', 'out', 'charge') || prev.debitColumn,
      creditColumn: find('credit', 'cr', 'deposit', 'in', 'payment') || prev.creditColumn,
      amountColumn: find('amount', 'amt', 'value') || prev.amountColumn,
    }));
  }

  async function handleSampleFile(file: File) {
    setSampleFile(file);
    setSampleResult(null);
    setSampleError('');
    const isPDF = file.name.toLowerCase().endsWith('.pdf');
    setFormatType(isPDF ? 'pdf' : 'csv');
    setSampleLoading(true);
    if (!isPDF) {
      const text = await file.text();
      setSampleText(text);
      const detected = detectCsvDelimiter(text);
      const firstLine = text.split('\n').filter(l => l.trim())[0] || '';
      const cols = sampleSplitLine(firstLine, detected);
      const looksLikeHeader = cols.length > 1 && cols.filter(c => isNaN(parseFloat(c.replace(/[,\s]/g, '')))).length > cols.length / 2;
      setCsvConfig(prev => ({ ...prev, delimiter: detected, hasHeader: looksLikeHeader }));
      setSampleLoading(false);
      setWizardStep(2);
    } else {
      try {
        const { extractPDFPages } = await import('../utils/pdf-extractor');
        const pages = await extractPDFPages(file);
        setSamplePages(pages);
        setSampleLoading(false);
        setWizardStep(2);
      } catch (err) {
        setSampleError(err instanceof Error ? err.message : 'Failed to read PDF');
        setSampleLoading(false);
      }
    }
  }

  function detectCsvDelimiter(text: string): string {
    const lines = text.split('\n').filter(l => l.trim()).slice(0, 5);
    const delimiters = [',', ';', '\t', '|'];
    let best = ',';
    let bestScore = -1;
    for (const d of delimiters) {
      const counts = lines.map(l => l.split(d).length - 1);
      const total = counts.reduce((a, b) => a + b, 0);
      const consistent = counts.every(c => c === counts[0]) && counts[0] > 0;
      const score = consistent ? total + 100 : total;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  async function toggleActive(account: BankAccount) {
    const response = await bankAccountsApi.update(account.id, {
      is_active: account.is_active === 1 ? 0 : 1,
    });

    if (response.success) {
      await loadAccounts();
    } else {
      setError(response.error || 'Failed to update bank account');
    }
  }

  const filteredAccounts = accounts.filter((acc) => {
    if (!showInactive && acc.is_active === 0) return false;
    return true;
  });

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Bank Accounts</h1>
        <button
          onClick={() => { setFormData({ name: '', bank_name: '', account_number_masked: '', owner_name: '', account_type: '' }); setEditingId(null); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + New Bank Account
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-[520px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">{editingId ? 'Edit Bank Account' : 'New Bank Account'}</h3>
              <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-xl bg-transparent border-0 cursor-pointer leading-none">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., Justin's Discovery Cheque" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                <input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} required placeholder="e.g., Discovery Bank" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number (Masked) *</label>
                <input type="text" value={formData.account_number_masked} onChange={(e) => setFormData({ ...formData, account_number_masked: e.target.value })} required placeholder="e.g., ****1234" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
                <input type="text" value={formData.owner_name} onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} required placeholder="e.g., Justin Smit" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <input type="text" value={formData.account_type} onChange={(e) => setFormData({ ...formData, account_type: e.target.value })} placeholder="e.g., Cheque, Savings, Credit Card" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={resetForm} className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Show Inactive
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Account #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAccounts.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No bank accounts found</td></tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800">{account.name}</td>
                  <td className="px-4 py-3 text-gray-600">{account.bank_name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{account.account_number_masked}</td>
                  <td className="px-4 py-3 text-gray-600">{account.owner_name}</td>
                  <td className="px-4 py-3 text-gray-500">{account.account_type || '–'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(account)} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer ${account.is_active === 1 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {account.is_active === 1 ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openViewConfig(account)} className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-lg transition-colors">⚙ Config</button>
                      <button onClick={() => handleEdit(account)} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors">Edit</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Import Config Modal */}
      {viewConfigAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewConfigAccount(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[560px] max-w-[90vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Import Config — {viewConfigAccount.bank_name} ({viewConfigAccount.name})</h3>
                <p className="text-xs text-gray-500 mt-0.5">{viewConfigAccount.account_number_masked}</p>
              </div>
              <button onClick={() => setViewConfigAccount(null)} className="text-gray-400 hover:text-gray-600 text-xl bg-transparent border-0 cursor-pointer ml-4 leading-none">✕</button>
            </div>

            {viewConfigLoading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : !viewConfigData ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4 text-sm">
                <div className="font-semibold text-amber-800 mb-1">No configuration set up yet</div>
                <p className="text-amber-700 text-xs">This account has no active import config. Set one up to enable statement imports.</p>
              </div>
            ) : (() => {
              const fmt = viewConfigData.format_type;
              const parsed: CSVParserConfig | PDFParserConfig = JSON.parse(viewConfigData.parser_config);
              const csv = fmt === 'csv' ? parsed as CSVParserConfig : null;
              const pdf = fmt === 'pdf' ? parsed as PDFParserConfig : null;
              const amtMode = csv ? (csv.amountColumn ? 'single' : 'split') : null;
              const row = (label: string, value: React.ReactNode) => (
                <div key={label} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-gray-800 font-medium break-all">{value}</span>
                </div>
              );
              return (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${fmt === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{fmt}</span>
                    <span className="text-xs text-gray-400">Created {new Date(viewConfigData.created_at).toLocaleDateString()}</span>
                    {viewConfigData.updated_at !== viewConfigData.created_at && (
                      <span className="text-xs text-gray-400">· Updated {new Date(viewConfigData.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-1 mb-4">
                    {fmt === 'csv' && csv && (<>
                      {row('Delimiter', csv.delimiter === '\t' ? 'Tab' : csv.delimiter === ',' ? 'Comma (,)' : csv.delimiter === ';' ? 'Semicolon (;)' : csv.delimiter)}
                      {row('Header row', csv.hasHeader ? 'Yes' : 'No')}
                      {csv.skipRows ? row('Skip rows', csv.skipRows) : null}
                      {row('Date column', <><span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">{csv.dateColumn}</span><span className="text-gray-400 text-xs ml-2">{csv.dateFormat}</span></>)}
                      {row('Description', <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">{csv.descriptionColumn}</span>)}
                      {csv.referenceColumn && row('Reference', <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">{csv.referenceColumn}</span>)}
                      {amtMode === 'split'
                        ? row('Amounts', <><span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">{csv.debitColumn}</span><span className="text-gray-400 text-xs mx-1.5">out /</span><span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">{csv.creditColumn}</span><span className="text-gray-400 text-xs ml-1.5">in</span></>)
                        : row('Amount', <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-xs">{csv.amountColumn}</span>)
                      }
                    </>)}
                    {fmt === 'pdf' && pdf && (<>
                      {row('Start page', pdf.pageStart ?? 1)}
                      {row('Skip lines (first page)', pdf.skipLines ?? 0)}
                    {row('Skip lines (pages 2+)', pdf.skipLinesSubsequent ?? 0)}
                      {row('Date format', pdf.dateFormat)}
                      {row('Line pattern', (
                        <span className="font-mono text-xs bg-gray-200 px-1.5 py-0.5 rounded block whitespace-pre-wrap break-all">{pdf.linePattern}</span>
                      ))}
                    </>)}
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => { setViewConfigAccount(null); openConfig(viewConfigAccount); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                ✏ Edit Config
              </button>
              <button
                onClick={() => setViewConfigAccount(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Config Wizard */}
      {configAccountId && (() => {
        const acc = accounts.find(a => a.id === configAccountId);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">Import Configuration — {acc?.bank_name} ({acc?.name})</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {existingConfig ? 'Update the parser settings below.' : 'No configuration yet. Set it up to enable imports.'}
                  </p>
                </div>
                <button onClick={() => setConfigAccountId(null)} className="text-gray-400 hover:text-gray-600 text-xl bg-transparent border-0 cursor-pointer ml-4 leading-none">✕</button>
              </div>

              {configError && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm mb-3">{configError}</div>
              )}
              {configSuccess && (
                <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-3 py-2 text-sm mb-3">{configSuccess}</div>
              )}

            <form onSubmit={saveConfig}>
              {/* Step indicator */}
              <div className="flex items-center mb-6">
                {(['Select File', 'Structure', 'Map Fields', 'Save'] as const).map((label, i) => {
                  const n = i + 1;
                  const done = wizardStep > n;
                  const active = wizardStep === n;
                  return (
                    <div key={n} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done || active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          {done ? '✓' : n}
                        </div>
                        <span className={`text-[10px] whitespace-nowrap ${active ? 'text-blue-600 font-semibold' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                          {label}
                        </span>
                      </div>
                      {i < 3 && <div className={`flex-1 h-0.5 mx-1 mb-3 ${done ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>

              {/* ── Step 1: Select File ── */}
              {wizardStep === 1 && (
                <div>
                  <div
                    onClick={() => (document.getElementById('wizard-file-input') as HTMLInputElement)?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOver(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleSampleFile(f);
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: '2px dashed',
                      borderColor: dragOver ? '#0056b3' : sampleFile ? '#007bff' : '#ccc',
                      borderRadius: '8px', padding: '32px 24px', cursor: 'pointer',
                      backgroundColor: dragOver ? '#e0f0ff' : sampleFile ? '#f0f7ff' : '#fafafa',
                      textAlign: 'center', gap: '10px',
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}>
                    {sampleLoading ? (<>
                      <div style={{ fontSize: '28px' }}>⏳</div>
                      <div style={{ fontWeight: 600, color: '#007bff' }}>Extracting PDF text…</div>
                    </>) : dragOver ? (<>
                      <div style={{ fontSize: '40px' }}>📥</div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: '#0056b3' }}>Drop to load</div>
                    </>) : sampleFile ? (<>
                      <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', backgroundColor: formatType === 'pdf' ? '#dc3545' : '#198754', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                        {formatType.toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{sampleFile.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{(sampleFile.size / 1024).toFixed(1)} KB · Click or drop to replace</div>
                      <div style={{ color: '#28a745', fontSize: '13px' }}>✓ File loaded — click Next to continue</div>
                    </>) : (<>
                      <div style={{ fontSize: '40px' }}>📂</div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>Drag &amp; drop or click to browse</div>
                      <div style={{ fontSize: '13px', color: '#888' }}>Accepts CSV (.csv, .txt) or PDF (.pdf)</div>
                      <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Used only to set up the configuration — not imported</div>
                    </>)}
                    <input id="wizard-file-input" type="file" accept=".csv,.txt,.pdf" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleSampleFile(f); e.target.value = ''; }} />
                  </div>
                  {sampleError && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '8px 12px', borderRadius: '4px', fontSize: '13px', marginTop: '10px' }}>⚠ {sampleError}</div>}
                  {sampleFile && !sampleLoading && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px' }}>
                        {formatType === 'pdf' ? 'Extracted text (first page):' : 'Raw file preview:'}
                      </div>
                      <pre style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '12px', borderRadius: '6px', fontSize: '11px', overflow: 'auto', maxHeight: '160px', margin: 0, lineHeight: '1.6' }}>
                        {formatType === 'csv' ? sampleText?.split('\n').slice(0, 8).join('\n') : samplePages?.[0]?.slice(0, 10).join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 2 CSV: File Structure ── */}
              {wizardStep === 2 && formatType === 'csv' && (
                <div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Delimiter</label>
                    <select value={csvConfig.delimiter} onChange={e => setCsvConfig({ ...csvConfig, delimiter: e.target.value })} style={cfgInput}>
                      <option value=",">, (comma)</option>
                      <option value=";">; (semicolon)</option>
                      <option value={'\t'}>Tab</option>
                      <option value="|">| (pipe)</option>
                    </select>
                  </div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>First row is a header</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={csvConfig.hasHeader} onChange={e => setCsvConfig({ ...csvConfig, hasHeader: e.target.checked })} />
                      <span style={{ fontSize: '14px' }}>Yes — first row contains column names</span>
                    </label>
                  </div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Rows to skip at top</label>
                    <input type="number" min={0} max={20} value={csvConfig.skipRows || 0}
                      onChange={e => setCsvConfig({ ...csvConfig, skipRows: parseInt(e.target.value) || 0 })}
                      style={{ ...cfgInput, width: '80px' }} />
                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>Bank branding rows before the data</span>
                  </div>
                  {sampleText && (() => {
                    const rawLines = sampleText.split('\n').filter(l => l.trim());
                    const start = csvConfig.skipRows || 0;
                    const hdrLine = csvConfig.hasHeader ? rawLines[start] : null;
                    const hdrs = hdrLine ? sampleSplitLine(hdrLine, csvConfig.delimiter) : [];
                    const dataLines = rawLines.slice(start + (csvConfig.hasHeader ? 1 : 0)).slice(0, 4);
                    if (!dataLines.length) return null;
                    return (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>
                          Column preview {hdrs.length > 0 ? `· ${hdrs.length} columns detected` : ''}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
                            {hdrs.length > 0 && (
                              <thead>
                                <tr>{hdrs.map((h, i) => <th key={i} style={{ padding: '4px 8px', backgroundColor: '#e8f4fd', border: '1px solid #ddd', whiteSpace: 'nowrap', fontWeight: 600 }}>{h}</th>)}</tr>
                              </thead>
                            )}
                            <tbody>
                              {dataLines.map((line, ri) => {
                                const cols = sampleSplitLine(line, csvConfig.delimiter);
                                return (
                                  <tr key={ri} style={{ backgroundColor: ri % 2 ? '#fafafa' : '#fff' }}>
                                    {cols.map((col, ci) => <td key={ci} style={{ padding: '3px 8px', border: '1px solid #eee', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col}</td>)}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Step 2 PDF: Page Settings ── */}
              {wizardStep === 2 && formatType === 'pdf' && (
                <div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>First page with data</label>
                    <input type="number" min={1} max={samplePages?.length ?? 99} value={pdfConfig.pageStart ?? 1}
                      onChange={e => setPdfConfig({ ...pdfConfig, pageStart: parseInt(e.target.value) || 1 })}
                      style={{ ...cfgInput, width: '80px' }} />
                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>1-based — skip cover pages</span>
                    {samplePages && (pdfConfig.pageStart ?? 1) > samplePages.length && (
                      <span style={{ fontSize: '12px', color: '#c0392b', marginLeft: '8px', fontWeight: 600 }}>
                        ⚠ Value {pdfConfig.pageStart} exceeds PDF page count ({samplePages.length}). Did you mean to set this in "Lines to skip"?
                      </span>
                    )}
                  </div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Lines to skip — first page</label>
                    <input type="number" min={0} value={pdfConfig.skipLines ?? 0}
                      onChange={e => setPdfConfig({ ...pdfConfig, skipLines: parseInt(e.target.value) || 0 })}
                      style={{ ...cfgInput, width: '80px' }} />
                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>Header rows at top of page 1 (statement address, account info)</span>
                  </div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Lines to skip — pages 2+</label>
                    <input type="number" min={0} value={pdfConfig.skipLinesSubsequent ?? 0}
                      onChange={e => setPdfConfig({ ...pdfConfig, skipLinesSubsequent: parseInt(e.target.value) || 0 })}
                      style={{ ...cfgInput, width: '80px' }} />
                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>Column header row(s) repeated at top of subsequent pages</span>
                  </div>
                  {samplePages && (() => {
                    const pi = (pdfConfig.pageStart ?? 1) - 1;
                    const page = samplePages[Math.min(pi, samplePages.length - 1)] || [];
                    const shown = page.slice(pdfConfig.skipLines ?? 0).slice(0, 60);
                    const remaining = page.slice(pdfConfig.skipLines ?? 0).length - 60;
                    return (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                          Extracted text — page {pdfConfig.pageStart ?? 1}, after skipping {pdfConfig.skipLines ?? 0} lines (first page):
                        </div>
                        <div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '11px', padding: '10px', borderRadius: '6px', maxHeight: '300px', overflowY: 'auto', lineHeight: '1.7' }}>
                          {shown.map((line, i) => <div key={i}>{line || <span style={{ color: '#555' }}>—</span>}</div>)}
                          {remaining > 0 && <div style={{ color: '#666', marginTop: '4px' }}>…{remaining} more lines (scroll up or increase Skip Lines to see transactions)</div>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Step 3 CSV: Map Columns ── */}
              {wizardStep === 3 && formatType === 'csv' && (
                <div>
                  {sampleText && (() => {
                    const lines = sampleText.split('\n').filter(l => l.trim());
                    const start = csvConfig.skipRows || 0;
                    const hdrLine = csvConfig.hasHeader ? lines[start] : null;
                    const hdrs = hdrLine ? sampleSplitLine(hdrLine, csvConfig.delimiter) : [];
                    if (!hdrs.length) return null;
                    return (
                      <div style={{ backgroundColor: '#e8f4fd', padding: '10px 14px', borderRadius: '4px', marginBottom: '14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span><strong>Detected columns:</strong> <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{hdrs.join(' · ')}</span></span>
                        <button type="button" onClick={() => autoFillFromHeaders(hdrs)}
                          style={{ padding: '3px 12px', fontSize: '12px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          ↑ Auto-fill
                        </button>
                      </div>
                    );
                  })()}
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Date column *</label>
                    <input type="text" value={csvConfig.dateColumn} onChange={e => setCsvConfig({ ...csvConfig, dateColumn: e.target.value })}
                      placeholder={csvConfig.hasHeader ? 'e.g. Date' : 'e.g. 0 (column index)'} style={cfgInput} />
                  </div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Date format *</label>
                    <select value={csvConfig.dateFormat} onChange={e => setCsvConfig({ ...csvConfig, dateFormat: e.target.value })} style={cfgInput}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="YYYYMMDD">YYYYMMDD</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="DD/MM/YY">DD/MM/YY</option>
                      <option value="MM/DD/YY">MM/DD/YY</option>
                    </select>
                  </div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Description column *</label>
                    <input type="text" value={csvConfig.descriptionColumn} onChange={e => setCsvConfig({ ...csvConfig, descriptionColumn: e.target.value })}
                      placeholder={csvConfig.hasHeader ? 'e.g. Description' : 'e.g. 1'} style={cfgInput} />
                  </div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Reference column</label>
                    <input type="text" value={csvConfig.referenceColumn || ''} onChange={e => setCsvConfig({ ...csvConfig, referenceColumn: e.target.value })}
                      placeholder="optional" style={cfgInput} />
                  </div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Amount columns</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {(['split', 'single'] as const).map(mode => (
                        <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                          <input type="radio" checked={amountMode === mode} onChange={() => setAmountMode(mode)} />
                          {mode === 'split' ? 'Separate Debit / Credit' : 'Single Amount column'}
                        </label>
                      ))}
                    </div>
                  </div>
                  {amountMode === 'split' ? (<>
                    <div style={cfgRow}>
                      <label style={cfgLabel}>Debit column (out) *</label>
                      <input type="text" value={csvConfig.debitColumn || ''} onChange={e => setCsvConfig({ ...csvConfig, debitColumn: e.target.value })}
                        placeholder={csvConfig.hasHeader ? 'e.g. Debit' : 'e.g. 3'} style={cfgInput} />
                    </div>
                    <div style={cfgRow}>
                      <label style={cfgLabel}>Credit column (in) *</label>
                      <input type="text" value={csvConfig.creditColumn || ''} onChange={e => setCsvConfig({ ...csvConfig, creditColumn: e.target.value })}
                        placeholder={csvConfig.hasHeader ? 'e.g. Credit' : 'e.g. 4'} style={cfgInput} />
                    </div>
                  </>) : (
                    <div style={cfgRow}>
                      <label style={cfgLabel}>Amount column *</label>
                      <input type="text" value={csvConfig.amountColumn || ''} onChange={e => setCsvConfig({ ...csvConfig, amountColumn: e.target.value })}
                        placeholder={csvConfig.hasHeader ? 'e.g. Amount' : 'e.g. 2'} style={cfgInput} />
                    </div>
                  )}
                  {sampleFile && (
                    <div style={{ borderTop: '1px solid #eee', paddingTop: '14px', marginTop: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Live test:</span>
                        <button type="button" onClick={runSampleTest} disabled={sampleParsing}
                          style={{ padding: '5px 14px', fontSize: '12px', backgroundColor: sampleParsing ? '#6c757d' : '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: sampleParsing ? 'not-allowed' : 'pointer' }}>
                          {sampleParsing ? 'Parsing…' : '▶ Preview rows'}
                        </button>
                      </div>
                      {sampleError && <div style={{ color: '#721c24', fontSize: '13px', marginBottom: '8px' }}>⚠ {sampleError}</div>}
                      {sampleResult && (
                        <div style={{ fontSize: '13px' }}>
                          <div style={{ marginBottom: '8px', fontWeight: 600, color: sampleResult.rowCount > 0 ? '#155724' : '#856404' }}>
                            {sampleResult.rowCount > 0
                              ? `✓ ${sampleResult.rowCount} transactions found${sampleResult.skippedRows > 0 ? ` · ${sampleResult.skippedRows} rows skipped` : ''}`
                              : `⚠ 0 transactions parsed · ${sampleResult.skippedRows} rows skipped`}
                          </div>
                          {sampleResult.preview.length > 0 && (
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead><tr style={{ backgroundColor: '#f0f0f0' }}>
                                  <th style={previewTh}>Date</th><th style={previewTh}>Description</th>
                                  <th style={{ ...previewTh, textAlign: 'right' }}>In</th>
                                  <th style={{ ...previewTh, textAlign: 'right' }}>Out</th>
                                </tr></thead>
                                <tbody>{sampleResult.preview.map((row, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={previewTd}>{row.date}</td>
                                    <td style={{ ...previewTd, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</td>
                                    <td style={{ ...previewTd, textAlign: 'right', color: row.moneyIn > 0 ? '#155724' : '#999' }}>{row.moneyIn > 0 ? row.moneyIn.toFixed(2) : '—'}</td>
                                    <td style={{ ...previewTd, textAlign: 'right', color: row.moneyOut > 0 ? '#721c24' : '#999' }}>{row.moneyOut > 0 ? row.moneyOut.toFixed(2) : '—'}</td>
                                  </tr>
                                ))}</tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 3 PDF: Build Pattern ── */}
              {wizardStep === 3 && formatType === 'pdf' && (
                <div>
                  {/* Amount layout selector */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ ...cfgLabel, display: 'block', marginBottom: '6px' }}>Amount layout *</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {([
                        { value: 'split', label: 'Separate Debit / Credit columns', desc: 'Two columns — one for money out, one for money in' },
                        { value: 'single', label: 'Single column (±)', desc: 'One column — positive = credit (in), negative = debit (out)' },
                      ] as const).map(opt => (
                        <label key={opt.value} style={{
                          flex: 1, display: 'flex', gap: '10px', alignItems: 'flex-start',
                          padding: '10px 12px', border: `2px solid ${pdfAmountMode === opt.value ? '#007bff' : '#ddd'}`,
                          borderRadius: '6px', cursor: 'pointer', backgroundColor: pdfAmountMode === opt.value ? '#e8f4ff' : '#fff',
                        }}>
                          <input type="radio" name="pdfAmountMode" value={opt.value}
                            checked={pdfAmountMode === opt.value}
                            onChange={() => { setPdfAmountMode(opt.value); setSampleResult(null); }}
                            style={{ marginTop: '2px' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{opt.label}</div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px', padding: '10px 14px', backgroundColor: '#fff8e1', borderRadius: '4px', fontSize: '13px', color: '#6d4c00' }}>
                    Write a regex with named groups:{' '}
                    <code>{'(?<date>…)'}</code> <code>{'(?<description>…)'}</code>{' '}
                    {pdfAmountMode === 'single'
                      ? <><code>{'(?<amount>…)'}</code> — positive = credit in, negative = debit out.</>
                      : <><code>{'(?<debit>…)'}</code> + <code>{'(?<credit>…)'}</code> — leave blank when zero.</>}
                    {' '}<span style={{ color: '#888' }}>Optional:</span> <code>{'(?<reference>…)'}</code>
                    <a href="https://regex101.com" target="_blank" rel="noreferrer" style={{ marginLeft: '8px', color: '#856404' }}>Test at regex101.com ↗</a>
                  </div>
                  <div style={{ ...cfgRow, alignItems: 'flex-start' }}>
                    <label style={{ ...cfgLabel, paddingTop: '6px' }}>Line pattern *</label>
                    <div style={{ flex: 1 }}>
                      <textarea value={pdfConfig.linePattern}
                        onChange={e => { setPdfConfig({ ...pdfConfig, linePattern: e.target.value }); setSampleResult(null); }}
                        placeholder={pdfAmountMode === 'single'
                          ? `e.g. (?<date>\\d{2}/\\d{2}/\\d{4})\\s+(?<description>.+?)\\s+(?<amount>-?[\\d,.]+)$`
                          : `e.g. (?<date>\\d{2}/\\d{2}/\\d{4})\\s+(?<description>.+?)\\s+(?<debit>[\\d,.]+)?\\s+(?<credit>[\\d,.]+)?$`}
                        rows={3}
                        style={{ ...cfgInput, width: '100%', minWidth: 0, fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }} />
                    </div>
                  </div>
                  <div style={cfgRow}>
                    <label style={cfgLabel}>Date format *</label>
                    <select value={pdfConfig.dateFormat} onChange={e => setPdfConfig({ ...pdfConfig, dateFormat: e.target.value })} style={cfgInput}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="YYYYMMDD">YYYYMMDD</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="DD/MM/YY">DD/MM/YY</option>
                      <option value="MM/DD/YY">MM/DD/YY</option>
                      <option value="DD MMM">DD MMM (e.g. 29 Apr)</option>
                    </select>
                  </div>
                  {samplePages && (() => {
                    const pi = (pdfConfig.pageStart ?? 1) - 1;
                    const page = samplePages[Math.min(pi, samplePages.length - 1)] || [];
                    const lines = page.slice(pdfConfig.skipLines ?? 0).slice(0, 30);
                    let regex: RegExp | null = null;
                    try { if (pdfConfig.linePattern) regex = new RegExp(pdfConfig.linePattern, 'i'); } catch {}
                    const matchCount = regex ? lines.filter(l => regex!.test(l)).length : 0;
                    return (
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span>
                            Lines {regex
                              ? <span style={{ color: matchCount > 0 ? '#155724' : '#856404' }}>{matchCount} matched</span>
                              : '— enter a pattern above'}
                          </span>
                          {sampleFile && pdfConfig.linePattern && (
                            <button type="button" onClick={runSampleTest} disabled={sampleParsing}
                              style={{ padding: '3px 12px', fontSize: '12px', backgroundColor: sampleParsing ? '#6c757d' : '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: sampleParsing ? 'not-allowed' : 'pointer' }}>
                              {sampleParsing ? 'Parsing…' : '▶ Parse'}
                            </button>
                          )}
                        </div>
                        {!pdfConfig.linePattern && (
                          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '6px', fontStyle: 'italic' }}>
                            ↑ Click any transaction line above to auto-generate a pattern
                          </div>
                        )}
                        <div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '11px', padding: '10px', borderRadius: '6px', maxHeight: '180px', overflowY: 'auto', lineHeight: '1.7' }}>
                          {lines.map((line, i) => {
                            const matched = regex ? regex.test(line) : false;
                            const isPicked = line === pickedLine;
                            return (
                              <div
                                key={i}
                                title="Click to auto-generate pattern from this line"
                                onClick={() => {
                                  const result = generatePatternFromLine(line, pdfAmountMode);
                                  if (result) {
                                    setPdfConfig(c => ({ ...c, linePattern: result.pattern, dateFormat: result.dateFormat }));
                                    setPickedLine(line);
                                    setSampleResult(null);
                                  }
                                }}
                                style={{
                                  color: isPicked ? '#ffd700' : matched ? '#4ec9b0' : '#d4d4d4',
                                  cursor: 'pointer',
                                  borderRadius: '2px',
                                  padding: '0 2px',
                                  backgroundColor: isPicked ? 'rgba(255,215,0,0.08)' : undefined,
                                }}
                              >{line || '\u00a0'}</div>
                            );
                          })}
                        </div>
                        {sampleError && <div style={{ color: '#721c24', fontSize: '13px', marginTop: '8px' }}>⚠ {sampleError}</div>}
                        {sampleResult && (() => {
                          const details = sampleResult.lineDetails || [];
                          return (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: sampleResult.rowCount > 0 ? '#155724' : '#856404' }}>
                                {sampleResult.rowCount > 0
                                  ? `✓ ${sampleResult.rowCount} transactions parsed · ${sampleResult.skippedRows} lines skipped`
                                  : `⚠ 0 transactions parsed · ${sampleResult.skippedRows} lines skipped`}
                              </div>
                              {details.length > 0 && (
                                <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
                                        <th style={{ ...previewTh, width: '30px', textAlign: 'center' }}>#</th>
                                        <th style={previewTh}>Raw line</th>
                                        <th style={{ ...previewTh, width: '88px' }}>Date</th>
                                        <th style={{ ...previewTh, width: '160px' }}>Description</th>
                                        <th style={{ ...previewTh, textAlign: 'right', width: '70px' }}>In</th>
                                        <th style={{ ...previewTh, textAlign: 'right', width: '70px' }}>Out</th>
                                        <th style={{ ...previewTh, textAlign: 'right', width: '80px' }}>Balance</th>
                                        <th style={{ ...previewTh, width: '90px' }}>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {details.map((d, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: d.matched ? '#f6fff8' : '#fafafa' }}>
                                          <td style={{ ...previewTd, textAlign: 'center', color: '#bbb' }}>{i + 1}</td>
                                          <td style={{ ...previewTd, fontFamily: 'monospace', fontSize: '10px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: d.matched ? '#333' : '#999' }} title={d.raw}>{d.raw}</td>
                                          <td style={{ ...previewTd, color: d.date ? '#155724' : '#bbb' }}>{d.date || '—'}</td>
                                          <td style={{ ...previewTd, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: d.description ? '#333' : '#bbb' }} title={d.description}>{d.description || '—'}</td>
                                          <td style={{ ...previewTd, textAlign: 'right', color: (d.moneyIn ?? 0) > 0 ? '#155724' : '#bbb' }}>{(d.moneyIn ?? 0) > 0 ? d.moneyIn!.toFixed(2) : '—'}</td>
                                          <td style={{ ...previewTd, textAlign: 'right', color: (d.moneyOut ?? 0) > 0 ? '#721c24' : '#bbb' }}>{(d.moneyOut ?? 0) > 0 ? d.moneyOut!.toFixed(2) : '—'}</td>
                                          <td style={{ ...previewTd, textAlign: 'right', color: '#888', fontSize: '10px', fontFamily: 'monospace' }}>{d.balance !== undefined ? d.balance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
                                          <td style={{ ...previewTd }}>
                                            {d.matched
                                              ? <span style={{ color: '#155724', fontWeight: 600 }}>✓ parsed</span>
                                              : <span style={{ color: '#999', fontSize: '10px' }}>{d.skipReason || 'skipped'}</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Step 4: Confirm & Save ── */}
              {wizardStep === 4 && (
                <div>
                  {configError && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>{configError}</div>}
                  {configSuccess && <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>{configSuccess}</div>}
                  <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '14px', marginBottom: '16px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '10px' }}>Configuration summary</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '6px 12px' }}>
                      <span style={{ color: '#888' }}>Format</span><span style={{ fontWeight: 600 }}>{formatType.toUpperCase()}</span>
                      {formatType === 'csv' && (<>
                        <span style={{ color: '#888' }}>Delimiter</span><span>{csvConfig.delimiter === '\t' ? 'Tab' : csvConfig.delimiter === ',' ? 'Comma' : csvConfig.delimiter === ';' ? 'Semicolon' : csvConfig.delimiter}</span>
                        <span style={{ color: '#888' }}>Header row</span><span>{csvConfig.hasHeader ? 'Yes' : 'No'}</span>
                        <span style={{ color: '#888' }}>Skip rows</span><span>{csvConfig.skipRows || 0}</span>
                        <span style={{ color: '#888' }}>Date</span><span>{csvConfig.dateColumn} ({csvConfig.dateFormat})</span>
                        <span style={{ color: '#888' }}>Description</span><span>{csvConfig.descriptionColumn}</span>
                        {csvConfig.referenceColumn && <><span style={{ color: '#888' }}>Reference</span><span>{csvConfig.referenceColumn}</span></>}
                        <span style={{ color: '#888' }}>Amounts</span>
                        <span>{amountMode === 'split' ? `Debit: ${csvConfig.debitColumn}, Credit: ${csvConfig.creditColumn}` : `Amount: ${csvConfig.amountColumn}`}</span>
                      </>)}
                      {formatType === 'pdf' && (<>
                        <span style={{ color: '#888' }}>Start page</span><span>{pdfConfig.pageStart ?? 1}</span>
                        <span style={{ color: '#888' }}>Skip lines</span><span>{pdfConfig.skipLines ?? 0} first page · {pdfConfig.skipLinesSubsequent ?? 0} subsequent</span>
                        <span style={{ color: '#888' }}>Date format</span><span>{pdfConfig.dateFormat}</span>
                        <span style={{ color: '#888' }}>Amount layout</span><span>{pdfAmountMode === 'single' ? 'Single column (±)' : 'Separate Debit / Credit'}</span>
                        <span style={{ color: '#888' }}>Pattern</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                          {pdfConfig.linePattern.substring(0, 80)}{pdfConfig.linePattern.length > 80 ? '…' : ''}
                        </span>
                      </>)}
                    </div>
                  </div>
                  {sampleResult && (
                    <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '6px', backgroundColor: sampleResult.rowCount > 0 ? '#d4edda' : '#fff3cd', color: sampleResult.rowCount > 0 ? '#155724' : '#856404', fontSize: '13px' }}>
                      {sampleResult.rowCount > 0
                        ? `✓ Sample parsed: ${sampleResult.rowCount} transactions found`
                        : `⚠ Sample parsed 0 transactions — review your settings before saving`}
                    </div>
                  )}
                  <button type="submit" disabled={configSaving}
                    style={{ width: '100%', padding: '12px', backgroundColor: configSaving ? '#6c757d' : '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: configSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                    {configSaving ? 'Saving…' : existingConfig ? '✓ Update Configuration' : '✓ Save Configuration'}
                  </button>
                </div>
              )}

              {/* Wizard navigation */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <button type="button"
                  onClick={() => wizardStep > 1 ? setWizardStep(s => s - 1) : setConfigAccountId(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
                  {wizardStep > 1 ? '← Back' : 'Cancel'}
                </button>
                {wizardStep < 4 && (
                  <button type="button"
                    onClick={() => setWizardStep(s => s + 1)}
                    disabled={(wizardStep === 1 && (!sampleFile || sampleLoading)) || (wizardStep === 3 && formatType === 'pdf' && !pdfConfig.linePattern.trim())}
                    className={`px-5 py-2 text-white text-sm font-semibold rounded-lg transition-colors ${
                      (wizardStep === 1 && (!sampleFile || sampleLoading)) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}>
                    Next →
                  </button>
                )}
              </div>
            </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function generatePatternFromLine(line: string, amountMode: 'single' | 'split'): { pattern: string; dateFormat: string } | null {
  const dateRules: Array<{ re: RegExp; group: string; fmt: string }> = [
    { re: /\d{4}-\d{2}-\d{2}/, group: '\\d{4}-\\d{2}-\\d{2}', fmt: 'YYYY-MM-DD' },
    { re: /\d{2}\/\d{2}\/\d{4}/, group: '\\d{2}\\/\\d{2}\\/\\d{4}', fmt: 'DD/MM/YYYY' },
    { re: /\d{2}\/\d{2}\/\d{2}/, group: '\\d{2}\\/\\d{2}\\/\\d{2}', fmt: 'DD/MM/YY' },
    { re: /\d{2}-\d{2}-\d{4}/, group: '\\d{2}-\\d{2}-\\d{4}', fmt: 'DD-MM-YYYY' },
    { re: /\b\d{8}\b/, group: '\\d{8}', fmt: 'YYYYMMDD' },
    { re: /\b\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i, group: '\\d{2}\\s+[A-Za-z]{3}', fmt: 'DD MMM' },
  ];
  let dateGroup = '';
  let dateFormat = 'DD/MM/YYYY';
  for (const rule of dateRules) {
    if (rule.re.test(line)) { dateGroup = rule.group; dateFormat = rule.fmt; break; }
  }
  if (!dateGroup) return null;

  const num = '[\\d,]+\\.\\d{2}';

  // Detect currency-prefixed amounts (e.g. "R 1,234.56") — common in SA bank statements
  const rAmtCount = (line.match(/R\s*[\d,]+\.\d{2}/g) || []).length;

  // Detect Cr/Dr-suffixed amounts (e.g. "1,500.00Cr") — FNB and similar
  const crDrCount = (line.match(/[\d,]+\.\d{2}(?:Cr|Dr)/gi) || []).length;

  // Detect DD MMM date format (e.g. "29 Apr")
  if (crDrCount >= 1) {
    // FNB-style: date [description] amount[Cr|Dr] balance[Cr|Dr] [accrued-charge]
    // Description is optional — some fee lines have no description text
    // Trailing number is optional — accrued bank charges appear on some lines
    const amtPat = `[\\d,]+\\.\\d{2}(?:Cr|Dr)?`;
    return {
      pattern: `(?<date>${dateGroup})(?:\\s+(?<description>.+?))?\\s+(?<amount>${amtPat})\\s+(?<balance>${amtPat})(?:\\s+[\\d,]+\\.\\d{2})?\\s*$`,
      dateFormat,
    };
  }

  if (rAmtCount >= 2) {
    // Discovery-style: date [description] [R amount] R balance
    const amtPart = amountMode === 'split'
      ? `(?:\\s+R\\s+(?<debit>${num}))?(?:\\s+R\\s+(?<credit>${num}))?`
      : `(?:\\s+R\\s+(?<amount>${num}))?`;
    return {
      pattern: `(?<date>${dateGroup})(?:\\s+(?<description>.+?))?${amtPart}\\s+R\\s+(?<balance>${num})\\s*$`,
      dateFormat,
    };
  }

  // Plain numeric amounts (no currency prefix)
  const amtPart = amountMode === 'single'
    ? `\\s+(?<amount>-?${num})`
    : `\\s+(?<debit>${num})?\\s*(?<credit>${num})?`;

  return { pattern: `(?<date>${dateGroup})\\s+(?<description>.+?)${amtPart}\\s*$`, dateFormat };
}

function sampleSplitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim()); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function sampleParseDate(raw: string, fmt: string): string {
  const c = raw.trim();
  let d = 0, m = 0, y = 0;
  if (fmt === 'DD/MM/YYYY' || fmt === 'DD-MM-YYYY') {
    const s = fmt.includes('/') ? '/' : '-';
    const p = c.split(s); d = +p[0]; m = +p[1]; y = +p[2];
  } else if (fmt === 'MM/DD/YYYY' || fmt === 'MM/DD/YY') {
    const p = c.split('/'); m = +p[0]; d = +p[1]; y = +p[2]; if (y < 100) y += 2000;
  } else if (fmt === 'YYYY-MM-DD') {
    const p = c.split('-'); y = +p[0]; m = +p[1]; d = +p[2];
  } else if (fmt === 'YYYYMMDD') {
    y = +c.substring(0, 4); m = +c.substring(4, 6); d = +c.substring(6, 8);
  } else if (fmt === 'DD/MM/YY') {
    const p = c.split('/'); d = +p[0]; m = +p[1]; y = +p[2] + 2000;
  } else if (fmt === 'DD MMM') {
    const months: Record<string, number> = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const p = c.split(/\s+/); d = +p[0]; m = months[p[1]?.toLowerCase()] || 0;
    const now = new Date(); y = now.getFullYear();
    // If the date is more than 60 days in the future, assume previous year
    if (m && new Date(y, m - 1, d).getTime() - now.getTime() > 60 * 24 * 60 * 60 * 1000) y--;
  } else return c;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getCrDr(raw: string): 'cr' | 'dr' | null {
  const t = raw.trim();
  if (/Cr$/i.test(t)) return 'cr';
  if (/Dr$/i.test(t)) return 'dr';
  return null;
}

function sampleParseAmount(raw: string): number {
  if (!raw?.trim()) return 0;
  // Strip currency symbols, Cr/Dr suffix, spaces, and thousand separators
  return parseFloat(raw.replace(/[R$£€\s,]/g, '').replace(/[Cc][Rr]$|[Dd][Rr]$/, '').trim()) || 0;
}

const previewTh: React.CSSProperties = {
  padding: '4px 8px',
  textAlign: 'left',
  fontWeight: '600',
  borderBottom: '1px solid #ddd',
  fontSize: '11px',
};

const previewTd: React.CSSProperties = {
  padding: '4px 8px',
};

const cfgRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '12px',
};

const cfgLabel: React.CSSProperties = {
  width: '200px',
  flexShrink: 0,
  fontWeight: '600',
  fontSize: '13px',
};

const cfgInput: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '14px',
  minWidth: '220px',
};
