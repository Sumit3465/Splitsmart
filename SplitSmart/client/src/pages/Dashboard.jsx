import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { Plus, Users, ArrowUpRight, DollarSign, Receipt, Sparkles } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [groupsData, expensesData] = await Promise.all([
        api.groups.getAll(),
        api.expenses.getAll()
      ]);
      setGroups(groupsData || []);
      setExpenses(expensesData || []);
    } catch (err) {
      setError(err.message || 'Could not load groups. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalSpentAcrossGroups = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  return (
    <div className="main-content">
      <div className="hero-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            <Sparkles size={16} />
            <span>COMMAND CENTER</span>
          </div>
          <h1 style={{ fontSize: '2rem', marginTop: '6px' }}>Hello, {user?.name || 'Friend'} 👋</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            Track group expenses, calculate transparent splits, and settle balances in fewer steps.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} />
          <span>Create Group</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Snapshot Cards */}
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-faint)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ACTIVE GROUPS</span>
            <Users size={16} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '10px', fontFamily: 'var(--font-mono)' }}>
            {groups.length}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-faint)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>TOTAL EXPENSES LOGGED</span>
            <Receipt size={16} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '10px', fontFamily: 'var(--font-mono)' }}>
            {expenses.length}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-faint)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>TOTAL GROUP SPEND</span>
            <DollarSign size={16} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            ₹{totalSpentAcrossGroups.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Groups Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Your Groups</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-outline btn-sm">
          <Plus size={15} /> Add Group
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Loading your groups...
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏖️</div>
          <h3>No groups yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '8px auto 20px' }}>
            Create your first group for a shared trip, apartment rent, dinners, or room expenses.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={18} />
            <span>Create First Group</span>
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {groups.map((group) => (
            <Link
              key={group._id}
              to={`/groups/${group._id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card card-hover" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--card-soft)', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                        👥
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.15rem' }}>{group.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight size={18} style={{ color: 'var(--text-faint)' }} />
                  </div>

                  {group.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                      {group.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {group.members.slice(0, 4).map((m, idx) => (
                      <div
                        key={m._id || idx}
                        className="user-avatar"
                        style={{ width: '26px', height: '26px', fontSize: '0.7rem' }}
                        title={m.name}
                      >
                        {m.name ? m.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    ))}
                    {group.members.length > 4 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        +{group.members.length - 4}
                      </span>
                    )}
                  </div>
                  <span className="badge badge-orange">View Ledger →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={(newGroup) => setGroups([newGroup, ...groups])}
      />
    </div>
  );
};
