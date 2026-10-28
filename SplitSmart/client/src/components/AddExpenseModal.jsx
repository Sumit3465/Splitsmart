import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Receipt, AlertCircle, CheckSquare, Square } from 'lucide-react';

export const AddExpenseModal = ({ isOpen, onClose, group, onExpenseAdded }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [paidBy, setPaidBy] = useState('');
  
  // Controlled participant selection state (Array of user IDs)
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // When group changes or modal opens, default payer to first member and select all members
  useEffect(() => {
    if (group && group.members && group.members.length > 0) {
      setPaidBy(group.members[0]._id);
      // Select all members by default using React state
      setSelectedParticipants(group.members.map(m => m._id));
    }
  }, [group, isOpen]);

  if (!isOpen || !group) return null;

  // Toggle single participant in React state
  const handleToggleParticipant = (memberId) => {
    setSelectedParticipants(prev => {
      if (prev.includes(memberId)) {
        // Prevent deselecting everyone (at least one participant required)
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  // Toggle select all / clear
  const handleSelectAll = () => {
    if (selectedParticipants.length === group.members.length) {
      // If all selected, keep only the payer
      setSelectedParticipants([paidBy || group.members[0]._id]);
    } else {
      setSelectedParticipants(group.members.map(m => m._id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const newExpense = await api.expenses.create({
        group: group._id,
        description: description.trim(),
        amount: numAmount,
        category,
        paidBy,
        participants: selectedParticipants
      });

      onExpenseAdded(newExpense);
      setDescription('');
      setAmount('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const splitSharePerPerson = amount && selectedParticipants.length > 0 && !isNaN(parseFloat(amount))
    ? (parseFloat(amount) / selectedParticipants.length).toFixed(2)
    : '0.00';

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '8px', borderRadius: '10px' }}>
              <Receipt size={20} />
            </div>
            <h2>Add an Expense</h2>
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Close">&times;</button>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Dinner at Beach Shack, Uber to Airport"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Food">🍔 Food</option>
                <option value="Travel">🚗 Travel</option>
                <option value="Accommodation">🏠 Accommodation</option>
                <option value="Entertainment">🎉 Entertainment</option>
                <option value="Shopping">🛍️ Shopping</option>
                <option value="Utilities">💡 Utilities</option>
                <option value="Other">📄 Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Paid By</label>
            <select className="form-select" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {group.members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </div>

          {/* Controlled Split Selection Section */}
          <div className="form-group" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Split Among Participants ({selectedParticipants.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="btn btn-outline btn-sm"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                {selectedParticipants.length === group.members.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="participant-grid">
              {group.members.map((member) => {
                const isSelected = selectedParticipants.includes(member._id);
                return (
                  <div
                    key={member._id}
                    className={`participant-checkbox-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleParticipant(member._id)}
                  >
                    {isSelected ? (
                      <CheckSquare size={18} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <Square size={18} style={{ color: 'var(--text-faint)' }} />
                    )}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{member.name}</span>
                  </div>
                );
              })}
            </div>

            {parseFloat(amount) > 0 && selectedParticipants.length > 0 && (
              <div style={{ background: 'var(--card-soft)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Each selected participant owes <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>₹{splitSharePerPerson}</strong>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding Expense...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
