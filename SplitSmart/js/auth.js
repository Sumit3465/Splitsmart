/* Local-only account flow for Phase 1.
   This is onboarding/identity management, NOT real authentication.
   No passwords, backend, database, or network calls are used. */

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function localAccountExists(email) {
  const normalized = normalizeEmail(email);
  const profile = getData(STORAGE_KEYS.PROFILE, null);
  return Boolean(profile && normalizeEmail(profile.email) === normalized && String(profile.name || '').trim());
}

function initSignupPage() {
  const form = document.getElementById('signupForm');
  if (!form) return;

  const existing = hasProfile();
  if (existing) {
    const note = document.getElementById('signupExistingNote');
    if (note) note.hidden = false;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearAllErrors(form);

    const name = document.getElementById('signupName').value.trim();
    const email = normalizeEmail(document.getElementById('signupEmail').value);
    const currency = document.getElementById('signupCurrency').value;
    const nameField = document.getElementById('signupName').closest('.field');
    const emailField = document.getElementById('signupEmail').closest('.field');

    if (name.length < 2) { setFieldError(nameField, 'Enter at least 2 characters.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError(emailField, 'Enter a valid email address.'); return; }

    if (hasProfile() && normalizeEmail(getProfile().email) !== email) {
      setFieldError(emailField, 'A local profile already exists on this browser. Use Sign In instead.');
      return;
    }

    const profile = { ...getProfile(), name, email, currency };
    saveProfile(profile);
    saveData(STORAGE_KEYS.SESSION, { active: true, email, signedInAt: new Date().toISOString() });
    showToast('success', 'Local profile created successfully.');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 450);
  });
}

function initSigninPage() {
  const form = document.getElementById('signinForm');
  if (!form) return;

  const profile = getProfile();
  if (hasProfile()) {
    document.getElementById('knownEmail').textContent = profile.email || 'local profile';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearAllErrors(form);
    const email = normalizeEmail(document.getElementById('signinEmail').value);
    const field = document.getElementById('signinEmail').closest('.field');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError(field, 'Enter a valid email address.');
      return;
    }

    if (!hasProfile()) {
      setFieldError(field, 'No local profile exists yet. Create one with Sign Up.');
      return;
    }

    if (normalizeEmail(getProfile().email) !== email) {
      setFieldError(field, 'That email does not match the local profile on this browser.');
      return;
    }

    saveData(STORAGE_KEYS.SESSION, { active: true, email, signedInAt: new Date().toISOString() });
    showToast('success', 'Welcome back to SplitSmart.');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 450);
  });
}

function initForgotPage() {
  const resetBtn = document.getElementById('resetLocalProfileBtn');
  if (!resetBtn) return;
  resetBtn.addEventListener('click', () => {
    confirmAction({
      title: 'Reset local profile?',
      message: 'This removes only your local profile. Your groups and expenses remain in this browser so you can create a new local profile afterward.',
      confirmLabel: 'Reset Profile',
      danger: true,
      onConfirm: () => {
        removeData(STORAGE_KEYS.PROFILE);
        removeData(STORAGE_KEYS.SESSION);
        window.location.href = 'signup.html';
      }
    });
  });
}
