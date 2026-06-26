import React, { useState } from 'react';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        // Let App.jsx handle the state update via session check or we can trigger a reload
        if (onAuth) onAuth();
        window.location.reload();
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');
        setSuccess('Account created! Check your email to verify, then log in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#050505',
    color: '#ededed',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    marginBottom: '8px',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '24px',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: '420px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '8px',
            background: '#ededed', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#0a0a0a', fontSize: '24px' }}>bolt</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#ededed', letterSpacing: '-0.02em' }}>Rush-Q</h1>
          <p style={{ color: '#888888', fontSize: '13px', marginTop: '6px' }}>Sign in to continue</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  placeholder="Rahul Kumar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#ededed'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  required
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#ededed'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#ededed'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '12px 16px',
                borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.1)', color: '#86efac',
                fontSize: '13px', fontWeight: 500,
              }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', marginTop: '8px',
                background: '#ededed', color: '#0a0a0a', border: 'none', borderRadius: '6px',
                fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {loading && <span style={{ width: '16px', height: '16px', border: '2px solid #0a0a0a', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              style={{
                background: 'none', border: 'none', color: '#888888',
                fontSize: '13px', cursor: 'pointer', textDecoration: 'none',
              }}
              onMouseEnter={e => e.target.style.color = '#ededed'}
              onMouseLeave={e => e.target.style.color = '#888888'}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={onAuth}
            style={{
              background: 'none', border: 'none', color: '#a3a3a3',
              fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              margin: '0 auto', fontWeight: 500, padding: '8px 16px', borderRadius: '6px'
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = '#ededed'; }}
            onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = '#a3a3a3'; }}
          >
            Continue to Local Sandbox <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </button>
        </div>

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
