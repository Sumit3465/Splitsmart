/* ============================================================
   storage.js — LocalStorage persistence layer for SplitSmart
   Phase 1 focus: JSON, objects, arrays, validation and browser storage.
   No backend or database is required for this phase.
   ============================================================ */

const STORAGE_KEYS = {
  GROUPS: 'splitsmart_groups',
  EXPENSES: 'splitsmart_expenses',
  SETTLEMENTS: 'splitsmart_settlements',
  PROFILE: 'splitsmart_profile',
  THEME: 'splitsmart_theme',
  SEEDED: 'splitsmart_seeded',
  SESSION: 'splitsmart_session',
  AUTH: 'splitsmart_auth',
  DEMO_MODE: 'splitsmart_demo_mode',
  DEMO_BACKUP: 'splitsmart_demo_backup'
};

const STORAGE_VERSION = 3;

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (key !== STORAGE_KEYS.THEME && key !== STORAGE_KEYS.SESSION) {
      localStorage.setItem('splitsmart_last_saved', new Date().toISOString());
    }
    return true;
  } catch (err) {
    console.error('saveData failed for key:', key, err);
    return false;
  }
}

function getData(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error('getData failed for key:', key, err);
    return defaultValue;
  }
}

function removeData(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error('removeData failed for key:', key, err);
    return false;
  }
}

function clearData() {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('splitsmart_last_saved');
    localStorage.removeItem('splitsmart_dashboard_prefs');
    return true;
  } catch (err) {
    console.error('clearData failed:', err);
    return false;
  }
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getArrayData(key) {
  const value = getData(key, []);
  return Array.isArray(value) ? value : [];
}

/* ---------------------- Groups ---------------------- */
function getGroups() {
  return getArrayData(STORAGE_KEYS.GROUPS).map((group) => ({
    ...group,
    members: Array.isArray(group.members) ? group.members : []
  }));
}

function saveGroups(groups) {
  return saveData(STORAGE_KEYS.GROUPS, Array.isArray(groups) ? groups : []);
}

function getGroupById(id) {
  return getGroups().find((group) => group.id === id) || null;
}

/* ---------------------- Expenses ---------------------- */
function getExpenses() {
  return getArrayData(STORAGE_KEYS.EXPENSES).map((expense) => ({
    ...expense,
    amount: roundMoney(expense.amount),
    splits: Array.isArray(expense.splits) ? expense.splits : []
  }));
}

function saveExpenses(expenses) {
  return saveData(STORAGE_KEYS.EXPENSES, Array.isArray(expenses) ? expenses : []);
}

function getExpensesByGroup(groupId) {
  return getExpenses().filter((expense) => expense.groupId === groupId);
}

/* ---------------------- Settlements ---------------------- */
function getSettlements() {
  return getArrayData(STORAGE_KEYS.SETTLEMENTS).map((settlement) => ({
    ...settlement,
    amount: roundMoney(settlement.amount)
  }));
}

function saveSettlements(settlements) {
  return saveData(STORAGE_KEYS.SETTLEMENTS, Array.isArray(settlements) ? settlements : []);
}

/* ---------------------- Profile ---------------------- */
// Phase 1 has no authentication. The profile is a local browser identity
// created by the user on first use. Never ship a real/demo person as the
// default account. Demo people (including Sumit) exist only inside demo data.
const PROFILE_DEFAULTS = {
  name: '',
  email: '',
  currency: 'INR',
  theme: 'light'
};

function hasProfile() {
  const profile = getData(STORAGE_KEYS.PROFILE, null);
  return Boolean(
    profile &&
    typeof profile === 'object' &&
    !Array.isArray(profile) &&
    String(profile.name || '').trim()
  );
}

function getProfile() {
  const profile = getData(STORAGE_KEYS.PROFILE, null);
  return {
    ...PROFILE_DEFAULTS,
    ...(profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {})
  };
}

function saveProfile(profile) {
  const next = {
    ...PROFILE_DEFAULTS,
    ...(profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {})
  };
  return saveData(STORAGE_KEYS.PROFILE, next);
}

function getEffectiveProfile() {
  if (isDemoMode()) {
    return { ...PROFILE_DEFAULTS, name: 'Demo Workspace', email: '', currency: 'INR' };
  }
  return getProfile();
}

// Migration for the previous Phase 1 build: remove only the exact hardcoded
// Sumit profile that was incorrectly used as the default account. Do not
// remove Sumit from demo groups or touch any other user profile.
(function migrateHardcodedDefaultProfile() {
  const profile = getData(STORAGE_KEYS.PROFILE, null);
  if (
    profile &&
    String(profile.name || '').trim().toLowerCase() === 'sumit verma' &&
    String(profile.email || '').trim().toLowerCase() === 'sumit@example.com'
  ) {
    removeData(STORAGE_KEYS.PROFILE);
  }
})();

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

function toCents(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) : 0;
}

function fromCents(cents) {
  return Math.round(Number(cents) || 0) / 100;
}

function roundMoney(amount) {
  return fromCents(toCents(amount));
}

function formatMoney(amount, currency) {
  const cur = currency || getEffectiveProfile().currency || 'INR';
  const symbol = CURRENCY_SYMBOLS[cur] || `${cur} `;
  return `${symbol}${roundMoney(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Split a money amount exactly in cents. Any remainder is distributed
 * one cent at a time so the shares always add back to the full amount.
 */
function splitAmountExactly(amount, memberIds = []) {
  const ids = [...memberIds];
  if (ids.length === 0) return [];

  const totalCents = toCents(amount);
  const base = Math.floor(totalCents / ids.length);
  let remainder = totalCents - (base * ids.length);

  return ids.map((memberId) => {
    const shareCents = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { memberId, amount: fromCents(shareCents) };
  });
}

/**
 * Convert percentage shares into exact money shares. The remaining cents
 * are given to the entries with the largest fractional remainder.
 */
function splitByPercentage(amount, percentageSplits = []) {
  const totalCents = toCents(amount);
  const calculated = percentageSplits.map((item, index) => {
    const pct = Number(item.pct) || 0;
    const rawCents = totalCents * pct / 100;
    const floorCents = Math.floor(rawCents);
    return {
      index,
      memberId: item.memberId,
      cents: floorCents,
      remainder: rawCents - floorCents
    };
  });

  let remaining = totalCents - calculated.reduce((sum, item) => sum + item.cents, 0);
  const ranked = [...calculated].sort((a, b) => b.remainder - a.remainder);

  let rankIndex = 0;
  while (remaining > 0 && ranked.length > 0) {
    ranked[rankIndex % ranked.length].cents += 1;
    remaining -= 1;
    rankIndex += 1;
  }

  return calculated
    .sort((a, b) => a.index - b.index)
    .map((item) => ({ memberId: item.memberId, amount: fromCents(item.cents) }));
}

function amountsEqual(a, b) {
  return toCents(a) === toCents(b);
}

function formatDate(dateValue, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-IN', options);
}

function isDemoMode() {
  return getData(STORAGE_KEYS.DEMO_MODE, false) === true;
}

function memberMatchesProfile(member, profile = getProfile()) {
  if (isDemoMode() && member?.isDemoSelf === true) return true;

  const memberEmail = String(member?.email || '').trim().toLowerCase();
  const profileEmail = String(profile?.email || '').trim().toLowerCase();
  const memberName = String(member?.name || '').trim().toLowerCase();
  const profileName = String(profile?.name || '').trim().toLowerCase();

  if (memberEmail && profileEmail) return memberEmail === profileEmail;
  return Boolean(memberName && profileName && memberName === profileName);
}

function getStorageSummary() {
  const groups = getGroups();
  const expenses = getExpenses();
  const settlements = getSettlements();
  return {
    groups: groups.length,
    expenses: expenses.length,
    settlements: settlements.length,
    members: groups.reduce((sum, group) => sum + group.members.length, 0)
  };
}

/* ---------------------- Demo data ---------------------- */
function purgeLegacyDemoRecords() {
  const groups = getGroups();
  const legacyIds = new Set(
    groups
      .filter((group) => group.isDemo === true || (group.name === 'Goa Trip 2026' && (group.members || []).some((m) => m.email === 'sumit@example.com')))
      .map((group) => group.id)
  );
  if (!legacyIds.size) return false;

  saveGroups(groups.filter((group) => !legacyIds.has(group.id)));
  saveExpenses(getExpenses().filter((expense) => !legacyIds.has(expense.groupId)));
  saveSettlements(getSettlements().filter((settlement) => !legacyIds.has(settlement.groupId)));
  return true;
}

function createAnonymousDemoDataset() {
  const groupId = generateId('demo_grp');
  const members = [
    { id: generateId('demo_mem'), name: 'You', isDemoSelf: true },
    { id: generateId('demo_mem'), name: 'Member 2' },
    { id: generateId('demo_mem'), name: 'Member 3' },
    { id: generateId('demo_mem'), name: 'Member 4' }
  ];
  const [member1, member2, member3, member4] = members;
  const now = new Date().toISOString();
  const demoGroup = {
    id: groupId,
    name: 'Shared Weekend',
    description: 'Sample shared expenses for exploring SplitSmart',
    members,
    isDemo: true,
    createdAt: now
  };
  const demoExpenses = [
    { id: generateId('demo_exp'), groupId, description: 'Hotel', amount: 12000, category: 'Accommodation', date: '2026-05-14', paidBy: member1.id, splitType: 'equal', splits: splitAmountExactly(12000, members.map((m) => m.id)), createdAt: now, updatedAt: now },
    { id: generateId('demo_exp'), groupId, description: 'Group Dinner', amount: 3200, category: 'Food', date: '2026-05-14', paidBy: member2.id, splitType: 'equal', splits: splitAmountExactly(3200, members.map((m) => m.id)), createdAt: now, updatedAt: now },
    { id: generateId('demo_exp'), groupId, description: 'Local Travel', amount: 1600, category: 'Travel', date: '2026-05-15', paidBy: member3.id, splitType: 'custom', splits: [
      { memberId: member1.id, amount: 500 }, { memberId: member2.id, amount: 400 }, { memberId: member3.id, amount: 400 }, { memberId: member4.id, amount: 300 }
    ], createdAt: now, updatedAt: now },
    { id: generateId('demo_exp'), groupId, description: 'Shopping', amount: 2000, category: 'Shopping', date: '2026-05-15', paidBy: member4.id, splitType: 'percentage', splits: splitByPercentage(2000, members.map((m) => ({ memberId: m.id, pct: 25 }))), createdAt: now, updatedAt: now }
  ];
  return { groups: [demoGroup], expenses: demoExpenses, settlements: [] };
}

function loadDemoData() {
  // Demo is a completely isolated workspace. The user's real ledger/profile
  // stays untouched in a temporary backup while the demo occupies the normal
  // Phase-1 storage keys. This works even when a real user is already signed in.
  if (!isDemoMode()) {
    saveData(STORAGE_KEYS.DEMO_BACKUP, {
      groups: getGroups(),
      expenses: getExpenses(),
      settlements: getSettlements()
    });
  }

  const dataset = createAnonymousDemoDataset();
  saveGroups(dataset.groups);
  saveExpenses(dataset.expenses);
  saveSettlements(dataset.settlements);
  saveData(STORAGE_KEYS.DEMO_MODE, true);
  saveData(STORAGE_KEYS.SEEDED, true);
  return dataset.groups[0];
}

function exitDemoMode() {
  if (!isDemoMode()) return false;

  const backup = getData(STORAGE_KEYS.DEMO_BACKUP, null);
  if (backup && Array.isArray(backup.groups) && Array.isArray(backup.expenses) && Array.isArray(backup.settlements)) {
    saveGroups(backup.groups);
    saveExpenses(backup.expenses);
    saveSettlements(backup.settlements);
  } else {
    saveGroups([]);
    saveExpenses([]);
    saveSettlements([]);
  }

  removeData(STORAGE_KEYS.DEMO_BACKUP);
  removeData(STORAGE_KEYS.DEMO_MODE);
  removeData(STORAGE_KEYS.SEEDED);
  return true;
}

// Remove demo records left behind by older builds before the user enters the
// real application. They are sample records, not user-created ledger data.
if (!isDemoMode()) purgeLegacyDemoRecords();

function hasAnyData() {
  return getGroups().length > 0 || getExpenses().length > 0;
}

/* ---------------------- Backup / restore ---------------------- */
function createBackup() {
  return JSON.stringify({
    app: 'SplitSmart',
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    profile: getProfile(),
    groups: getGroups(),
    expenses: getExpenses(),
    settlements: getSettlements(),
    theme: getData(STORAGE_KEYS.THEME, getProfile().theme || 'light')
  }, null, 2);
}

function restoreBackup(backup) {
  if (!backup || backup.app !== 'SplitSmart') {
    throw new Error('This file is not a valid SplitSmart backup.');
  }
  if (!Array.isArray(backup.groups) || !Array.isArray(backup.expenses) || !Array.isArray(backup.settlements)) {
    throw new Error('The backup is missing required data.');
  }

  saveGroups(backup.groups);
  saveExpenses(backup.expenses);
  saveSettlements(backup.settlements);
  saveProfile(backup.profile || PROFILE_DEFAULTS);
  saveData(STORAGE_KEYS.THEME, backup.theme || backup.profile?.theme || 'light');
  return true;
}
