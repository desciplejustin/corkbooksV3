import { useState, useEffect } from 'react';
import { bankAccountsApi, reconciliationApi, BankAccount, ReconciliationResult } from '../api';

function fmtCurrency(n: number | null) {
  if (n === null) return '—';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(n);
}

export function Reconciliation() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    bankAccountsApi.list().then(res => {
      if (res.success && res.data) setAccounts(res.data.filter(a => a.is_active === 1));
    });
  }, []);

  async function runReport() {
    if (!accountId || !dateFrom || !dateTo) {
      setError('Please select an account and set both dates.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    const res = await reconciliationApi.get(accountId, dateFrom, dateTo);
    setLoading(false);
    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.error || 'Failed to run reconciliation.');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Bank Reconciliation</h1>
      <p className="text-sm text-gray-500 mb-6">
        Verify opening and closing balances tie back to your bank statement for any date range.
      </p>

      {/* Filter form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— select account —</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.bank_name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={runReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Running…' : 'Run Report'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">

          {/* No balance data warning */}
          {!result.has_balance_data && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm text-amber-800">
              <strong>No balance data found for this account.</strong> Statement balances are only
              captured from imports done after the reconciliation feature was enabled. Re-import
              your statements to populate the balance column.
            </div>
          )}

          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {result.bank_account.name}
                </h2>
                <p className="text-xs text-gray-500">{result.bank_account.bank_name}</p>
              </div>
              <span className="text-xs text-gray-400">
                {result.period.from} → {result.period.to}
              </span>
            </div>

            {/* Balance waterfall */}
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr className="text-gray-600">
                  <td className="py-2">Opening balance <span className="text-xs text-gray-400">(statement balance before {result.period.from})</span></td>
                  <td className="py-2 text-right font-mono font-medium text-gray-900">
                    {fmtCurrency(result.opening_balance)}
                  </td>
                </tr>
                <tr className="text-green-700">
                  <td className="py-2">+ Money in <span className="text-xs text-gray-400">({result.transaction_count} transactions)</span></td>
                  <td className="py-2 text-right font-mono font-medium">
                    {fmtCurrency(result.total_in)}
                  </td>
                </tr>
                <tr className="text-red-600">
                  <td className="py-2">− Money out</td>
                  <td className="py-2 text-right font-mono font-medium">
                    {fmtCurrency(result.total_out)}
                  </td>
                </tr>
                <tr className="border-t-2 border-gray-300 font-semibold text-gray-800">
                  <td className="py-2">= Computed closing balance</td>
                  <td className="py-2 text-right font-mono">
                    {fmtCurrency(result.computed_closing)}
                  </td>
                </tr>
                <tr className="text-gray-600">
                  <td className="py-2">Statement closing balance <span className="text-xs text-gray-400">(from imported PDF/CSV)</span></td>
                  <td className="py-2 text-right font-mono">
                    {fmtCurrency(result.closing_balance)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Variance result */}
            {result.variance !== null ? (
              result.balanced ? (
                <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded p-3">
                  <span className="text-green-600 text-lg">✓</span>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Balanced — variance is R 0.00</p>
                    <p className="text-xs text-green-600">
                      Your records match the bank statement for this period.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded p-3">
                  <span className="text-red-500 text-lg">⚠</span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Variance of {fmtCurrency(result.variance)} detected
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      This may indicate missing transactions, duplicate entries, or transactions
                      that haven't been finalised yet. Check the Transactions page for this period.
                    </p>
                  </div>
                </div>
              )
            ) : result.has_balance_data ? (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-500">
                Cannot compute variance — opening or closing balance is not available for this date range.
                There may be no transactions outside or at the end of the selected period.
              </div>
            ) : null}
          </div>

          {/* Period summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Opening', value: fmtCurrency(result.opening_balance), color: 'text-gray-800' },
              { label: 'Total In', value: fmtCurrency(result.total_in), color: 'text-green-700' },
              { label: 'Total Out', value: fmtCurrency(result.total_out), color: 'text-red-600' },
              { label: 'Closing', value: fmtCurrency(result.closing_balance), color: 'text-gray-800' },
            ].map(card => (
              <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className={`text-sm font-semibold font-mono ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
