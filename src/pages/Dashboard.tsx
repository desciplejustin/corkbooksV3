// Dashboard Page
import { UserPublic } from '../api';

interface DashboardProps {
  user: UserPublic | null;
}

export default function Dashboard({ user }: DashboardProps) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      
      {user && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p><strong>Welcome, {user.full_name}!</strong></p>
          <p>Email: {user.email}</p>
          <p>Role: <span style={{ 
            padding: '2px 8px', 
            backgroundColor: user.role === 'admin' ? '#28a745' : '#17a2b8',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px'
          }}>{user.role}</span></p>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>Next Steps</h2>
        <ul>
          <li>Phase 1 (Auth) is complete! ✅</li>
          <li>Next: Phase 2 - Categories & Bank Accounts</li>
          <li>Then: Phase 3 - Import Engine</li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '1px solid #ffc107'
      }}>
        <h3>Phase 1 Status</h3>
        <p>✅ Authentication working</p>
        <p>✅ Protected routes functional</p>
        <p>✅ JWT authentication with cookies</p>
        <p>✅ Role-based access control ready</p>
      </div>
    </div>
  );
}
