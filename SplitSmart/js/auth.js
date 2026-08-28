/* SplitSmart Phase 1 authentication simulation.
   The UI behaves like a normal login/sign-up flow, while credentials remain
   local to this browser because Phase 1 intentionally has no backend.
   This is a demo auth layer, not production security. */

function normalizeEmail(email = '') { return String(email).trim().toLowerCase(); }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email)); }

function localPasswordHash(value = '') {
  // Lightweight deterministic hash for the classroom/demo build.
  // Never use this in a production authentication system.
  let h = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function getAuthAccount() { return getData(STORAGE_KEYS.AUTH, null); }
function hasAuthAccount() {
  const account = getAuthAccount();
  return Boolean(account && account.email && account.passwordHash);
}

function setAuthSession(email, remember = true) {
  saveData(STORAGE_KEYS.SESSION, {
    active: true,
    email: normalizeEmail(email),
    remember: Boolean(remember),
    signedInAt: new Date().toISOString()
  });
}

function showAuthError(id, message) {
  const box = document.getElementById(id);
  if (!box) return;
  box.textContent = message;
  box.classList.add('show');
}
function clearAuthError(id) {
  const box = document.getElementById(id);
  if (!box) return;
  box.textContent = '';
  box.classList.remove('show');
}

function toggleAuthPassword(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;
  button.addEventListener('click', () => {
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
    button.textContent = visible ? '◉' : '◌';
  });
}

function initModernAuthPage(mode) {
  document.querySelectorAll('[data-social]').forEach((button) => {
    button.addEventListener('click', () => {
      const provider = button.dataset.social || 'Social';
      if (typeof showToast === 'function') showToast('info', `${provider} sign-in is a Phase 2 integration. Use email and password for now.`);
    });
  });

  if (mode === 'signin') {
    const form = document.getElementById('signinForm');
    if (!form) return;
    toggleAuthPassword('signinPassword', 'signinPasswordToggle');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearAuthError('signinError');
      const email = normalizeEmail(document.getElementById('signinEmail').value);
      const password = document.getElementById('signinPassword').value;
      const remember = document.getElementById('signinRemember').checked;

      if (!validEmail(email)) return showAuthError('signinError', 'Enter a valid email address.');
      if (!password) return showAuthError('signinError', 'Enter your password.');

      const account = getAuthAccount();
      if (!account) return showAuthError('signinError', 'No account found in this browser. Create an account first.');
      if (normalizeEmail(account.email) !== email || account.passwordHash !== localPasswordHash(password)) {
        return showAuthError('signinError', 'Email or password is incorrect. Please try again.');
      }

      const profile = getProfile();
      saveProfile({ ...profile, name: account.name, email: account.email, currency: account.currency || profile.currency || 'INR' });
      setAuthSession(email, remember);
      if (typeof showToast === 'function') showToast('success', 'Welcome back to SplitSmart.');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 300);
    });
    return;
  }

  const form = document.getElementById('signupForm');
  if (!form) return;
  toggleAuthPassword('signupPassword', 'signupPasswordToggle');
  const password = document.getElementById('signupPassword');
  const strengthBars = [...document.querySelectorAll('#signupStrength i')];
  const strengthLabel = document.getElementById('signupStrengthLabel');

  password?.addEventListener('input', () => {
    const value = password.value;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    strengthBars.forEach((bar, index) => { bar.style.background = index < score ? 'var(--accent)' : 'var(--border)'; });
    if (strengthLabel) strengthLabel.textContent = !value ? 'Use 8+ characters with a mix of letters and numbers.' : score <= 1 ? 'Weak password' : score === 2 ? 'Fair password' : score === 3 ? 'Good password' : 'Strong password';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearAuthError('signupError');
    const name = document.getElementById('signupName').value.trim();
    const email = normalizeEmail(document.getElementById('signupEmail').value);
    const pass = password.value;
    const confirm = document.getElementById('signupConfirm').value;
    const currency = document.getElementById('signupCurrency').value;
    const terms = document.getElementById('signupTerms').checked;

    if (name.length < 2) return showAuthError('signupError', 'Please enter your full name.');
    if (!validEmail(email)) return showAuthError('signupError', 'Please enter a valid email address.');
    if (pass.length < 8) return showAuthError('signupError', 'Password must be at least 8 characters.');
    if (pass !== confirm) return showAuthError('signupError', 'Passwords do not match.');
    if (!terms) return showAuthError('signupError', 'Please accept the terms to continue.');
    if (hasAuthAccount()) return showAuthError('signupError', 'An account already exists in this browser. Log in instead.');

    saveData(STORAGE_KEYS.AUTH, { name, email, currency, passwordHash: localPasswordHash(pass), createdAt: new Date().toISOString() });
    saveProfile({ ...getProfile(), name, email, currency });
    setAuthSession(email, true);
    if (typeof showToast === 'function') showToast('success', 'Account created successfully.');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 300);
  });
}

// Backward-compatible entry points used by older pages.
function initSignupPage() { initModernAuthPage('signup'); }
function initSigninPage() { initModernAuthPage('signin'); }
function initForgotPage() {
  const form = document.getElementById('resetPasswordForm');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = normalizeEmail(document.getElementById('resetEmail')?.value || '');
    const password = document.getElementById('resetPassword')?.value || '';
    const confirm = document.getElementById('resetConfirm')?.value || '';
    const account = getAuthAccount();
    if (!validEmail(email) || !account || normalizeEmail(account.email) !== email) return showAuthError('resetError', 'No matching account was found in this browser.');
    if (password.length < 8 || password !== confirm) return showAuthError('resetError', 'Use an 8+ character password and make sure both fields match.');
    saveData(STORAGE_KEYS.AUTH, { ...account, passwordHash: localPasswordHash(password) });
    if (typeof showToast === 'function') showToast('success', 'Password updated. You can log in now.');
    setTimeout(() => { window.location.href = 'login.html'; }, 350);
  });
}
