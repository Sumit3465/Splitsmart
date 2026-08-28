/* ============================================================
   ui.js — reusable UI helpers: toasts, modals, avatars, dropdowns
   Demonstrates: createElement, classList, template literals,
   default parameters, arrow functions, event delegation.
   ============================================================ */

const AVATAR_COLORS = [
  'linear-gradient(135deg,#5B8DEF,#7C6BFF)',
  'linear-gradient(135deg,#FF7A29,#FFB37A)',
  'linear-gradient(135deg,#1FB579,#5FE3B3)',
  'linear-gradient(135deg,#EF4D5E,#FF8A9B)',
  'linear-gradient(135deg,#9B6BFF,#C9A8FF)',
  'linear-gradient(135deg,#00B4D8,#7BE0F0)'
];

function colorForName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsFor(name = '?') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function avatarHTML(name, extraClass = '') {
  return `<div class="avatar ${extraClass}" style="background:${colorForName(name)}" title="${escapeHTML(name)}">${initialsFor(name)}</div>`;
}

function escapeHTML(str = '') {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function emptyStateHTML(icon, title, desc, actionHref, actionLabel) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
      ${actionHref ? `<a href="${actionHref}" class="btn btn-primary btn-sm">${actionLabel}</a>` : ''}
    </div>
  `;
}

/* ---------------------- Toasts ---------------------- */
function ensureToastStack() {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

const TOAST_ICONS = { success: '✅', error: '⚠️', info: 'ℹ️' };

function showToast(type = 'info', message = '') {
  const stack = ensureToastStack();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${escapeHTML(message)}</span>`;
  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ---------------------- Modals ---------------------- */
function openModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;

  overlay.dataset.lastFocusId = document.activeElement?.id || '';
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  const firstField = overlay.querySelector('input, select, textarea, button');
  firstField?.focus();
}

function closeModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;

  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal-overlay.open')) document.body.classList.remove('modal-open');

  const previousId = overlay.dataset.lastFocusId;
  if (previousId) document.getElementById(previousId)?.focus();
}

document.addEventListener('click', (event) => {
  if (event.target.classList?.contains('modal-overlay')) closeModal(event.target.id);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const openOverlay = document.querySelector('.modal-overlay.open');
  if (openOverlay) closeModal(openOverlay.id);
});

/**
 * Show a reusable confirmation modal, resolving via callback.
 * @param {{title:string, message:string, confirmLabel?:string, danger?:boolean, onConfirm:Function}} opts
 */
function confirmAction({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm }) {
  let overlay = document.getElementById('globalConfirmModal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'globalConfirmModal';
    document.body.appendChild(overlay);
  }
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMessage">
      <div class="modal-head">
        <h3 id="confirmTitle"></h3>
        <button type="button" class="modal-close" id="confirmCloseBtn" aria-label="Close confirmation">&times;</button>
      </div>
      <p id="confirmMessage" style="margin:0;"></p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="confirmCancelBtn">Cancel</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmActionBtn">${escapeHTML(confirmLabel)}</button>
      </div>
    </div>
  `;
  overlay.querySelector('#confirmTitle').textContent = title;
  overlay.querySelector('#confirmMessage').textContent = message;
  overlay.querySelector('#confirmCloseBtn').onclick = () => closeModal('globalConfirmModal');
  overlay.querySelector('#confirmCancelBtn').onclick = () => closeModal('globalConfirmModal');
  overlay.querySelector('#confirmActionBtn').onclick = () => {
    closeModal('globalConfirmModal');
    onConfirm();
  };
  openModal('globalConfirmModal');
}

/* ---------------------- Dropdown menus ---------------------- */
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-dropdown-trigger]');
  document.querySelectorAll('.dropdown-menu.open').forEach((menu) => {
    if (!trigger || menu !== trigger.nextElementSibling) menu.classList.remove('open');
  });
  if (trigger) {
    const menu = trigger.nextElementSibling;
    if (menu && menu.classList.contains('dropdown-menu')) menu.classList.toggle('open');
  }
});

/* ---------------------- Form field errors ---------------------- */
function setFieldError(fieldEl, message) {
  fieldEl.classList.add('has-error');
  const msg = fieldEl.querySelector('.error-msg');
  if (msg) msg.textContent = message;
}
function clearFieldError(fieldEl) {
  fieldEl.classList.remove('has-error');
}
function clearAllErrors(formEl) {
  formEl.querySelectorAll('.field.has-error').forEach((f) => clearFieldError(f));
}

/* ---------------------- Button loading state ---------------------- */
function setButtonLoading(btn, loading, labelWhenLoading = 'Please wait…') {
  if (loading) {
    btn.dataset.originalLabel = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${labelWhenLoading}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalLabel || btn.innerHTML;
    btn.disabled = false;
  }
}
