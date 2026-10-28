import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { Plus, ArrowLeft, Trash2, CheckCircle2, ArrowRight, Zap, RefreshCw, AlertCircle, Calendar } from 'lucide-react';

export const GroupDetails = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlementPlan, setSettlementPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadGroupData = async () => {
    try {
      setLoading(true);
      setError('');
      const [groupData, expensesData, balancesData] = await Promise.all([
        api.groups.getById(id),
        api.expenses.getAll(id),
        api.groups.getBalances(id)
      ]);

      setGroup(groupData);
      setExpenses(expensesData || []);
      setBalances(balancesData?.balances || []);

      // Also fetch any existing settlement plan
      try {
        const settleData = await api.groups.getSettlements(id);
        if (settleData && settleData.settlements && settleData.settlements.length > 0) {
          setSettlementPlan({
            transactions: settleData.settlements.map(s => ({
              from: s.from?._id || s.from,
              fromName: s.from?.name || 'Member',
              to: s.to?._id || s.to,
              toName: s.to?.name || 'Member',
              amount: s.amount
            }))
          });
        }
      } catch (e) {
        console.warn('No saved settlements found yet');
      }
    } catch (err) {
      setError(err.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadGroupData();
    }
  }, [id]);

  // Settle up action: Calls backend settlement optimization & persistence API
  const handleSettleUp = async () => {
    try {
      setSettling(true);
      setError('');
      const result = await api.groups.settle(id);
      setSettlementPlan(result);
      setSuccessMsg('Settlement plan generated & saved to database!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to generate settlement plan');
    } finally {
      setSettling(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.expenses.delete(expenseId);
      // Refresh expenses and balances
      loadGroupData();
      setSuccessMsg('Expense deleted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete expense');
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading group details...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="main-content">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>Group Not Found</h3>
          <p style={{ color: 'var(--text-muted)', margin: '12px 0 20px' }}>
            This group does not exist or you do not have permission to access it.
          </p>
          <Link to="/" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="main-content">
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 600 }}>
        <ArrowLeft size={16} /> Back to Groups
      </Link>

      {/* Header Card */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: '1.4rem' }}>
                👥
              </div>
              <div>
                <h1 style={{ fontSize: '1.8rem' }}>{group.name}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {group.description || 'Shared expense group'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setIsExpenseModalOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Add Expense</span>
            </button>
            <button onClick={handleSettleUp} className="btn btn-outline" disabled={settling}>
              <Zap size={16} style={{ color: 'var(--accent)' }} />
              <span>{settling ? 'Calculating...' : 'Settle Up'}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>MEMBERS</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>{group.members.length}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>EXPENSES LOGGED</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>{expenses.length}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>TOTAL SPEND</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Settlement Plan Section (Rendered from Backend API) */}
      <div className="card" style={{ marginBottom: '28px', background: 'linear-gradient(135deg, var(--card), var(--bg-soft))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} style={{ color: 'var(--accent)' }} />
            <h2>Optimized Settlement Plan</h2>
          </div>
          <button onClick={handleSettleUp} className="btn btn-outline btn-sm" disabled={settling}>
            <RefreshCw size={14} className={settling ? 'animate-spin' : ''} />
            <span>Recalculate</span>
          </button>
        </div>

        {settlementPlan && settlementPlan.transactions && settlementPlan.transactions.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {settlementPlan.transactions.map((tx, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--card-soft)',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
                  <span style={{ fontWeight: 700, color: '#fca5a5' }}>{tx.fromName}</span>
                  <span style={{ color: 'var(--text-muted)' }}>pays</span>
                  <span style={{ fontWeight: 700, color: '#6ee7b7' }}>{tx.toName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowRight size={16} style={{ color: 'var(--text-faint)' }} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {expenses.length === 0
              ? 'Add expenses to generate a settlement plan.'
              : 'All members are currently settled up! No payments needed.'}
          </div>
        )}
      </div>

      {/* Two Column Layout: Member Balances & Expense History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Member Balances */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Member Balances</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {balances.map((b) => {
              const isPositive = b.balance > 0;
              const isNegative = b.balance < 0;

              return (
                <div
                  key={b.memberId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--card-soft)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="user-avatar" style={{ width: '32px', height: '32px' }}>
                      {b.name ? b.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>{b.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                        Paid ₹{b.paid} · Share ₹{b.owed}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isPositive && (
                      <span className="badge badge-green">Gets ₹{b.balance.toFixed(2)}</span>
                    )}
                    {isNegative && (
                      <span className="badge badge-red">Owes ₹{Math.abs(b.balance).toFixed(2)}</span>
                    )}
                    {!isPositive && !isNegative && (
                      <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                        Settled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Expense Ledger</h2>
            <button onClick={() => setIsExpenseModalOpen(true)} className="btn btn-outline btn-sm">
              <Plus size={14} /> Add
            </button>
          </div>

          {expenses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '32px 0' }}>
              No expenses recorded yet in this group.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {expenses.map((exp) => (
                <div
                  key={exp._id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--card-soft)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{exp.description}</strong>
                      <span className="badge badge-orange" style={{ fontSize: '0.65rem' }}>
                        {exp.category || 'General'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Paid by <strong>{exp.paidBy?.name || 'Someone'}</strong> · split among {exp.participants?.length || group.members.length} people
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      ₹{exp.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(exp._id)}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '6px', color: 'var(--red)', border: 'none' }}
                      title="Delete expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        group={group}
        onExpenseAdded={() => {
          loadGroupData();
          setSuccessMsg('Expense added successfully!');
          setTimeout(() => setSuccessMsg(''), 3000);
        }}
      />
    </div>
  );
};
