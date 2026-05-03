import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { importsApi, bankAccountsApi, categoriesApi, Import, StagedTransaction, Category, BankAccount } from '../api';

type RowUpdate = {
  assigned_category_id?: string;
  scope?: string;
  tax_deductible?: number;
  review_status?: string;
};

export function ImportReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [importRecord, setImportRecord] = useState<Import | null>(null);
  const [rows, setRows] = useState<StagedTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // row id being saved
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [quickAddCatRow, setQuickAddCatRow] = useState<string | null>(null);
  const [quickAddForm, setQuickAddForm] = useState<{ name: string; category_type: 'income' | 'expense'; scope: 'personal' | 'business' | 'shared' }>({ name: '', category_type: 'expense', scope: 'personal' });
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');
  // When true the modal was opened from the toolbar (no row to auto-select after save)
  const [quickAddStandalone, setQuickAddStandalone] = useState(false);
  const [autoAllocMessage, setAutoAllocMessage] = useState('');
  const [hideFinalized, setHideFinalized] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [impRes, rowsRes, catRes, baRes] = await Promise.all([
      importsApi.get(id),
      importsApi.getStagedTransactions(id),
      categoriesApi.list(),
      bankAccountsApi.list(),
    ]);
    if (impRes.success) setImportRecord(impRes.data!);
    else setError('Import not found');
    if (rowsRes.success) setRows(rowsRes.data || []);
    if (catRes.success) setCategories((catRes.data || []).filter(c => c.is_active === 1));
    if (baRes.success) setBankAccounts((baRes.data || []).filter(b => b.is_active === 1));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function updateRow(rowId: string, updates: RowUpdate) {
    setSaving(rowId);
    setAutoAllocMessage('');
    const res = await importsApi.updateStagedTransaction(rowId, updates);
    setSaving(null);
    if (res.success && res.data) {
      setRows(prev => prev.map(r => r.id === rowId ? res.data! : r));
    } else {
      setError(res.error || 'Failed to save');
    }
  }

  async function handleCategoryChange(rowId: string, categoryId: string, currentRows?: StagedTransaction[]) {
    await updateRow(rowId, {
      assigned_category_id: categoryId || undefined,
      review_status: categoryId ? 'allocated' : 'unallocated',
    });

    if (!categoryId) return;

    // Find unallocated rows with the same description (case-insensitive)
    const sourceRow = (currentRows ?? rows).find(r => r.id === rowId);
    if (!sourceRow) return;
    const desc = sourceRow.description.trim().toLowerCase();
    const matches = (currentRows ?? rows).filter(
      r => r.id !== rowId &&
        r.review_status === 'unallocated' &&
        r.is_transfer !== 1 &&
        r.description.trim().toLowerCase() === desc
    );
    if (matches.length === 0) return;

    setAutoAllocMessage('');
    // Update each match sequentially (no batch endpoint)
    for (const match of matches) {
      const res = await importsApi.updateStagedTransaction(match.id, {
        assigned_category_id: categoryId,
        review_status: 'allocated',
      });
      if (res.success && res.data) {
        setRows(prev => prev.map(r => r.id === match.id ? res.data! : r));
      }
    }
    setAutoAllocMessage(`Also auto-allocated ${matches.length} matching transaction${matches.length !== 1 ? 's' : ''} with the same description.`);
  }

  async function handleScopeChange(rowId: string, scope: string) {
    await updateRow(rowId, { scope });
  }

  async function handleTaxChange(rowId: string, checked: boolean) {
    await updateRow(rowId, { tax_deductible: checked ? 1 : 0 });
  }

  async function markNeedsReview(rowId: string) {
    await updateRow(rowId, { review_status: 'needs_review' });
  }

  async function markAsTransfer(rowId: string) {
    await updateRow(rowId, {
      is_transfer: 1,
      review_status: 'transfer',
      assigned_category_id: undefined,
    });
  }

  async function cancelTransfer(rowId: string) {
    await updateRow(rowId, {
      is_transfer: 0,
      transfer_account_id: null,
      review_status: 'unallocated',
    });
  }

  async function handleTransferAccountChange(rowId: string, accountId: string) {
    await updateRow(rowId, { transfer_account_id: accountId || null });
  }

  async function handleQuickAddCategory() {
    if (!quickAddForm.name.trim()) { setQuickAddError('Name is required'); return; }
    setQuickAddSaving(true);
    setQuickAddError('');
    const res = await categoriesApi.create({
      name: quickAddForm.name.trim(),
      category_type: quickAddForm.category_type,
      scope: quickAddForm.scope,
      sars_related: 0,
      is_active: 1,
    });
    setQuickAddSaving(false);
    if (res.success && res.data) {
      setCategories(prev => [...prev, res.data!]);
      const rowId = quickAddCatRow;
      setQuickAddCatRow(null);
      setQuickAddStandalone(false);
      setQuickAddForm({ name: '', category_type: 'expense', scope: 'personal' });
      if (rowId) {
        await handleCategoryChange(rowId, res.data!.id);
      }
    } else {
      setQuickAddError(res.error || 'Failed to create category');
    }
  }

  async function handleFinalize() {
    if (!id) return;
    setFinalizing(true);
    setError('');
    const res = await importsApi.finalize(id);
    setFinalizing(false);

    if (res.success) {
      const partial = res.data?.partial;
      const created = res.data?.transactions_created ?? 0;
      const remaining = res.data?.remaining_rows ?? 0;
      const dupes = res.data?.skipped_duplicates ?? 0;
      const parts: string[] = [`✓ ${created} transaction${created !== 1 ? 's' : ''} imported`];
      if (dupes > 0) parts.push(`${dupes} duplicate${dupes !== 1 ? 's' : ''} skipped`);
      if (partial && remaining > 0) parts.push(`${remaining} row${remaining !== 1 ? 's' : ''} still unallocated — keep going when ready`);
      setSuccess(parts.join(' · '));
      if (partial) setHideFinalized(true);
      load();
    } else {
      setError(res.error || 'Finalise failed');
    }
  }

  const baseRows = (hideFinalized && !filterStatus)
    ? rows.filter(r => r.review_status === 'unallocated' || r.review_status === 'needs_review')
    : rows;
  const filtered = filterStatus ? baseRows.filter(r => r.review_status === filterStatus) : baseRows;

  const allocatedCount = rows.filter(r => r.review_status === 'allocated').length;
  const unallocatedCount = rows.filter(r => r.review_status === 'unallocated').length;
  const needsReviewCount = rows.filter(r => r.review_status === 'needs_review').length;
  const duplicateCount = rows.filter(r => r.review_status === 'duplicate').length;
  const transferCount = rows.filter(r => r.review_status === 'transfer').length;
  const readyCount = allocatedCount + transferCount;
  const isFinalised = importRecord?.status === 'finalised';

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      allocated: 'bg-green-100 text-green-700',
      unallocated: 'bg-amber-100 text-amber-700',
      needs_review: 'bg-red-100 text-red-700',
      duplicate: 'bg-gray-200 text-gray-600',
      transfer: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls[status] || 'bg-gray-100 text-gray-600'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  return (
    <div>
      {/* Sticky compact header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
        {/* Row 1: breadcrumb + title + finalize */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/imports" className="text-gray-400 hover:text-gray-600 text-sm no-underline shrink-0">← Imports</Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-800 text-sm truncate">
              Review: {importRecord?.statement_month}
            </span>
            {isFinalised && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 shrink-0">Finalised</span>
            )}
            {importRecord?.source_file_key && (
              <a href={importsApi.downloadUrl(id!)} className="text-blue-500 hover:text-blue-700 text-xs no-underline shrink-0">↓ file</a>
            )}
          </div>
          {!isFinalised && (
            <button
              onClick={handleFinalize}
              disabled={finalizing || readyCount === 0}
              className={`ml-4 px-4 py-1.5 text-white text-sm font-semibold rounded-lg shrink-0 transition-colors ${
                readyCount > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {finalizing ? 'Importing…' : unallocatedCount > 0 ? `Import ${readyCount} ready rows` : `Finalise (${readyCount})`}
            </button>
          )}
        </div>

        {/* Row 2: stats + filter */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {[
            { label: 'Allocated', count: allocatedCount, cls: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Unallocated', count: unallocatedCount, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
            { label: 'Needs Review', count: needsReviewCount, cls: 'bg-red-50 text-red-700 border-red-200' },
            ...(transferCount > 0 ? [{ label: 'Transfer', count: transferCount, cls: 'bg-blue-50 text-blue-700 border-blue-200' }] : []),
            ...(duplicateCount > 0 ? [{ label: 'Duplicate', count: duplicateCount, cls: 'bg-gray-100 text-gray-600 border-gray-200' }] : []),
          ].map(s => (
            <span key={s.label} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
              <strong>{s.count}</strong> {s.label}
            </span>
          ))}

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="ml-auto border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All {hideFinalized ? `unfinished (${baseRows.length})` : `(${rows.length})`}</option>
            <option value="unallocated">Unallocated ({unallocatedCount})</option>
            <option value="allocated">Allocated ({allocatedCount})</option>
            <option value="needs_review">Needs Review ({needsReviewCount})</option>
            {transferCount > 0 && <option value="transfer">Transfer ({transferCount})</option>}
            {duplicateCount > 0 && <option value="duplicate">Duplicate ({duplicateCount})</option>}
          </select>
          <button
            onClick={() => { setQuickAddStandalone(true); setQuickAddCatRow(null); setQuickAddForm({ name: '', category_type: 'expense', scope: 'personal' }); setQuickAddError(''); }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            + New Category
          </button>
          {autoAllocMessage && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">✓ {autoAllocMessage}</span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-6 mt-3 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2.5 text-sm">{error}</div>
      )}
      {success && (
        <div className="mx-6 mt-3 bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-2.5 text-sm">{success}</div>
      )}

      {/* Quick-add category modal */}
      {(quickAddCatRow || quickAddStandalone) && (
        <div
          onClick={() => { setQuickAddCatRow(null); setQuickAddStandalone(false); }}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        >
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl p-6 w-80">
            <h3 className="text-base font-semibold text-gray-800 mb-4">New Category</h3>

            {quickAddError && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm mb-3">{quickAddError}</div>
            )}

            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
              <input
                autoFocus
                value={quickAddForm.name}
                onChange={e => setQuickAddForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleQuickAddCategory(); if (e.key === 'Escape') { setQuickAddCatRow(null); setQuickAddStandalone(false); } }}
                placeholder="e.g. Groceries"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                <select
                  value={quickAddForm.category_type}
                  onChange={e => setQuickAddForm(f => ({ ...f, category_type: e.target.value as 'income' | 'expense' }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Scope</label>
                <select
                  value={quickAddForm.scope}
                  onChange={e => setQuickAddForm(f => ({ ...f, scope: e.target.value as 'personal' | 'business' | 'shared' }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                  <option value="shared">Shared</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setQuickAddCatRow(null); setQuickAddStandalone(false); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleQuickAddCategory}
                disabled={quickAddSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {quickAddSaving ? 'Saving…' : quickAddCatRow ? 'Save & Select' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-100">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Out</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">In</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Tax</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              {!isFinalised && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr
                key={row.id}
                className={`border-b border-gray-100 transition-opacity ${
                  row.review_status === 'allocated' ? 'bg-green-50' :
                  row.review_status === 'needs_review' ? 'bg-red-50' :
                  row.review_status === 'duplicate' ? 'bg-gray-50' :
                  row.review_status === 'transfer' ? 'bg-blue-50' :
                  'bg-white'
                } ${saving === row.id || row.review_status === 'duplicate' ? 'opacity-60' : ''}`}
              >
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{row.transaction_date}</td>
                <td className="px-3 py-2 max-w-[220px]">
                  <div className="truncate text-gray-800">{row.description}</div>
                  {row.reference && <div className="text-gray-400 text-xs truncate">{row.reference}</div>}
                </td>
                <td className="px-3 py-2 text-right font-medium text-red-600">
                  {row.money_out > 0 ? row.money_out.toFixed(2) : ''}
                </td>
                <td className="px-3 py-2 text-right font-medium text-green-600">
                  {row.money_in > 0 ? row.money_in.toFixed(2) : ''}
                </td>
                <td className="px-3 py-2">
                  {isFinalised ? (
                    <span className="text-gray-600">
                      {row.is_transfer === 1
                        ? `⇄ ${bankAccounts.find(b => b.id === row.transfer_account_id)?.name || 'Transfer'}`
                        : categories.find(c => c.id === row.assigned_category_id)?.name || '—'}
                    </span>
                  ) : row.is_transfer === 1 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-blue-700">⇄</span>
                      <select
                        value={row.transfer_account_id || ''}
                        onChange={e => handleTransferAccountChange(row.id, e.target.value)}
                        disabled={saving === row.id}
                        className="px-1.5 py-1 border border-blue-300 rounded text-xs bg-blue-50 w-36 focus:outline-none"
                      >
                        <option value="">— Pick account —</option>
                        {bankAccounts
                          .filter(b => b.id !== importRecord?.bank_account_id)
                          .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <button onClick={() => cancelTransfer(row.id)} disabled={saving === row.id} title="Cancel transfer" className="text-gray-400 hover:text-gray-600 text-sm bg-transparent border-0 cursor-pointer p-0.5">×</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <select
                        value={row.assigned_category_id || ''}
                        onChange={e => {
                          if (e.target.value === '__new__') {
                            setQuickAddForm({ name: '', category_type: 'expense', scope: 'personal' });
                            setQuickAddError('');
                            setQuickAddCatRow(row.id);
                          } else {
                            handleCategoryChange(row.id, e.target.value);
                          }
                        }}
                        disabled={saving === row.id}
                        className="px-1.5 py-1 border border-gray-300 rounded text-xs w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">— category —</option>
                        {['income', 'expense'].map(type => (
                          <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
                            {categories.filter(c => c.category_type === type).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </optgroup>
                        ))}
                        <option value="__new__">+ New category…</option>
                      </select>
                      <button
                        onClick={() => markAsTransfer(row.id)}
                        disabled={saving === row.id}
                        title="Mark as transfer"
                        className="px-1.5 py-0.5 text-xs border border-blue-300 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer whitespace-nowrap"
                      >⇄</button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isFinalised ? (
                    <span className="text-gray-600 capitalize">{row.scope || '—'}</span>
                  ) : (
                    <select
                      value={row.scope || 'personal'}
                      onChange={e => handleScopeChange(row.id, e.target.value)}
                      disabled={saving === row.id}
                      className="px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none"
                    >
                      <option value="personal">Personal</option>
                      <option value="business">Business</option>
                      <option value="shared">Shared</option>
                    </select>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {isFinalised ? (
                    <span>{row.tax_deductible ? '✓' : ''}</span>
                  ) : (
                    <input type="checkbox" checked={row.tax_deductible === 1} onChange={e => handleTaxChange(row.id, e.target.checked)} disabled={saving === row.id} />
                  )}
                </td>
                <td className="px-3 py-2">{statusBadge(row.review_status)}</td>
                {!isFinalised && (
                  <td className="px-3 py-2">
                    {row.review_status !== 'needs_review' && (
                      <button
                        onClick={() => markNeedsReview(row.id)}
                        disabled={saving === row.id}
                        title="Flag for review"
                        className="text-red-400 hover:text-red-600 bg-transparent border-0 cursor-pointer text-sm p-0.5"
                      >⚑</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
