import React, { useState } from 'react';
import { api } from '../services/api';
import { Plus, X, Users, AlertCircle } from 'lucide-react';

export const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberEmails, setMemberEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddMember = (e) => {
    e.preventDefault();
    const email = memberEmail.trim().toLowerCase();
    if (!email) return;
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (memberEmails.includes(email)) {
      setError('Email already added to member list');
      return;
    }
    setMemberEmails([...memberEmails, email]);
    setMemberEmail('');
    setError('');
  };

  const handleRemoveMember = (emailToRemove) => {
    setMemberEmails(memberEmails.filter(e => e !== emailToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const newGroup = await api.groups.create({
        name: name.trim(),
        description: description.trim(),
        members: memberEmails
      });
      onGroupCreated(newGroup);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '8px', borderRadius: '10px' }}>
              <Users size={20} />
            </div>
            <h2>Create New Group</h2>
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
            <label className="form-label">Group Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Goa Trip 2026, Apartment 4B"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="What is this shared space for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Add Members By Email</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                className="form-input"
                placeholder="friend@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
              <button type="button" onClick={handleAddMember} className="btn btn-outline">
                <Plus size={16} /> Add
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '6px' }}>
              You are automatically included as the group creator.
            </p>

            {memberEmails.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {memberEmails.map((email) => (
                  <span
                    key={email}
                    style={{
                      background: 'var(--card-soft)',
                      border: '1px solid var(--border)',
                      padding: '4px 10px',
                      borderRadius: '99px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {email}
                    <X
                      size={14}
                      style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                      onClick={() => handleRemoveMember(email)}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
