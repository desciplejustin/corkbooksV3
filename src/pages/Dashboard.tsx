// Dashboard Page
import { Link } from 'react-router-dom';
import { UserPublic } from '../api';

interface DashboardProps {
  user: UserPublic | null;
}

export default function Dashboard({ user }: DashboardProps) {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {user && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <p className="text-lg font-semibold text-gray-800">Welcome, {user.full_name}!</p>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          <span className={`inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
            user.role === 'admin' ? 'bg-green-100 text-green-700' : 'bg-cyan-100 text-cyan-700'
          }`}>{user.role}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Imports', path: '/imports', icon: '↑', desc: 'Upload & review bank statements' },
          { label: 'Categories', path: '/categories', icon: '⊞', desc: 'Manage income & expense categories' },
          { label: 'Bank Accounts', path: '/bank-accounts', icon: '🏦', desc: 'Configure your accounts' },
        ].map(card => (
          <Link key={card.path} to={card.path} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-blue-300 hover:shadow-md transition-all no-underline group">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="font-semibold text-gray-800 group-hover:text-blue-600">{card.label}</div>
            <div className="text-xs text-gray-500 mt-1">{card.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
