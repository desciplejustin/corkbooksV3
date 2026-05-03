import { useState, useEffect } from 'react';
import { transactionsApi, bankAccountsApi, categoriesApi, Transaction, BankAccount, Category } from '../api';

const PAGE_SIZE = 100;

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(n);
}

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');

  // Filter state
  const [accountFilter, setAccountFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchDraft); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // Load lookups once
  useEffect(() => {
    Promise.all([bankAccountsApi.list(), categoriesApi.list()]).then(([baRes, catRes]) => {
      if (baRes.success) setBankAccounts(baRes.data || []);
      if (catRes.success) setCategories((catRes.data || []).filter(c => c.is_active === 1));
    });
  }, []);

  // Fetch transactions when filters or page change
  useEffect(() => {
    setLoading(true);
    setError('');
    transactionsApi.list({
      bank_account_id: accountFilter || undefined,
      month: monthFilter || undefined,
      scope: scopeFilter || undefined,
      search: search || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }).then(res => {
      if (res.success && res.data) {
        setTransactions(res.data.transactions);
        setTotal(res.data.total);
        setTotalIn(res.data.total_in);
        setTotalOut(res.data.total_out);
      } else {
        setError(res.error || 'Failed to load transactions');
      }
      setLoading(false);
    });
  }, [accountFilter, monthFilter, scopeFilter, search, page]);

  function clearFilters() {
    setAccountFilter('');
    setMonthFilter('');
    setScopeFilter('');
    setSearchDraft('');
    setSearch('');
    setPage(0);
  }

  const hasFilters = !!(accountFilter || monthFilter || scopeFilter || search);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="text-xl font-bold text-gray-800">Transactions</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600 font-semibold" title="Total in (filtered)">↑ {fmt(totalIn)}</span>
            <span className="text-red-600 font-semibold" title="Total out (filtered)">↓ {fmt(totalOut)}</span>
            <span className="text-gray-400 text-xs">{total} transaction{total !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search description…"
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
          <select
            value={accountFilter}
            onChange={e => { setAccountFilter(e.target.value); setPage(0); }}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All accounts</option>
            {bankAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <input
            type="month"
            value={monthFilter}
            onChange={e => { setMonthFilter(e.target.value); setPage(0); }}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={scopeFilter}
            onChange={e => { setScopeFilter(e.target.value); setPage(0); }}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All scopes</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="shared">Shared</option>
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2.5 text-sm">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="p-6 text-gray-400 text-sm">Loading…</div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="text-5xl mb-4 opacity-30">≡</div>
          <div className="font-medium text-gray-500">No transactions found</div>
          <div className="text-sm mt-1">
            {hasFilters ? 'Try adjusting your filters.' : 'Transactions appear here after you import and finalise bank statements.'}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Amount</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap font-mono">{t.transaction_date}</td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <div className="font-medium text-gray-800 truncate">{t.description}</div>
                    {t.reference && <div className="text-xs text-gray-400 truncate">{t.reference}</div>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-gray-700 text-xs font-medium">{t.bank_account_name || '—'}</div>
                    {t.bank_name && <div className="text-gray-400 text-xs">{t.bank_name}</div>}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(t.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.category_name ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.category_type === 'income' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {t.category_name}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${
                      t.scope === 'business' ? 'bg-purple-100 text-purple-700' :
                      t.scope === 'shared' ? 'bg-amber-100 text-amber-700' :
                      'text-gray-400'
                    }`}>
                      {t.scope}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {t.tax_deductible ? (
                      <span className="text-xs text-purple-600 font-bold">✓</span>
                    ) : (
                      <span className="text-gray-200 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= total}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
