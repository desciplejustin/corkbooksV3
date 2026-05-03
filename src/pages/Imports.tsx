import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { importsApi, bankAccountsApi, Import, BankAccount } from '../api';

export function Imports() {
  const [imports, setImports] = useState<Import[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [importsRes, accountsRes] = await Promise.all([
      importsApi.list(),
      bankAccountsApi.list(),
    ]);
    if (importsRes.success) setImports(importsRes.data || []);
    else setError(importsRes.error || 'Failed to load imports');
    if (accountsRes.success) setBankAccounts(accountsRes.data || []);
    setLoading(false);
  }

  function getBankAccountName(id: string) {
    const acc = bankAccounts.find(a => a.id === id);
    return acc ? `${acc.bank_name} – ${acc.name}` : id;
  }

  const filtered = filterStatus ? imports.filter(i => i.status === filterStatus) : imports;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      ready: 'bg-blue-100 text-blue-700',
      finalised: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Imports</h1>
        <Link
          to="/imports/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg no-underline transition-colors"
        >
          + New Import
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="ready">Ready</option>
          <option value="finalised">Finalised</option>
          <option value="draft">Draft</option>
        </select>
        <button
          onClick={loadData}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-2">No imports found.</p>
          <Link to="/imports/new" className="text-blue-600 hover:underline text-sm">Upload your first statement</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank Account</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">File</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Rows</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(imp => (
                <tr key={imp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800">{getBankAccountName(imp.bank_account_id)}</td>
                  <td className="px-4 py-3 text-gray-600">{imp.statement_month}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{imp.source_filename}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{imp.row_count}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {imp.period_start && imp.period_end ? `${imp.period_start} → ${imp.period_end}` : '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(imp.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {imp.status !== 'finalised' ? (
                        <Link to={`/imports/${imp.id}/review`} className="text-blue-600 hover:text-blue-800 text-xs font-medium no-underline">Review</Link>
                      ) : (
                        <Link to={`/imports/${imp.id}/review`} className="text-gray-500 hover:text-gray-700 text-xs font-medium no-underline">View</Link>
                      )}
                      {imp.source_file_key && (
                        <a href={importsApi.downloadUrl(imp.id)} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-800 text-xs font-medium no-underline">↓ File</a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
