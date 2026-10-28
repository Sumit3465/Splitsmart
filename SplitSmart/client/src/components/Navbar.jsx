import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, PlusCircle, Layers } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand-link">
          <div className="logo-badge">S</div>
          <div>
            <span className="brand-title">SplitSmart</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--accent)', display: 'block', fontWeight: 700, letterSpacing: '0.08em' }}>PHASE 2 · REACT</span>
          </div>
        </Link>

        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to="/" className="btn btn-outline btn-sm">
                <Layers size={15} />
                <span>My Groups</span>
              </Link>
              <div className="user-pill">
                <div className="user-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-outline btn-sm" title="Log out">
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Log In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
