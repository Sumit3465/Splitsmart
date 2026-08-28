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
  AUTH: 'splitsmart_auth'
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
  const cur = currency || getProfile().currency || 'INR';
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

function memberMatchesProfile(member, profile = getProfile()) {
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
function loadDemoData() {
  const oldDemoGroups = getGroups().filter((group) => {
    const looksLikeCurrentDemo = group.isDemo === true;
    const looksLikeLegacyDemo = group.name === 'Goa Trip 2026' && group.members.some((m) => m.email === 'sumit@example.com');
    return looksLikeCurrentDemo || looksLikeLegacyDemo;
  });
  const oldDemoIds = new Set(oldDemoGroups.map((group) => group.id));

  const remainingGroups = getGroups().filter((group) => !oldDemoIds.has(group.id));
  const remainingExpenses = getExpenses().filter((expense) => !oldDemoIds.has(expense.groupId));
  const remainingSettlements = getSettlements().filter((settlement) => !oldDemoIds.has(settlement.groupId));

  const groupId = generateId('grp');
  const members = [
    { id: generateId('mem'), name: 'Sumit', email: 'sumit@example.com' },
    { id: generateId('mem'), name: 'Rahul', email: 'rahul@example.com' },
    { id: generateId('mem'), name: 'Aman', email: 'aman@example.com' },
    { id: generateId('mem'), name: 'Karan', email: 'karan@example.com' }
  ];
  const [sumit, rahul, aman, karan] = members;

  const now = new Date().toISOString();
  const demoGroup = {
    id: groupId,
    name: 'Goa Trip 2026',
    description: 'Weekend getaway with the college gang',
    members,
    isDemo: true,
    createdAt: now
  };

  const demoExpenses = [
    {
      id: generateId('exp'), groupId, description: 'Hotel Booking', amount: 12000, category: 'Accommodation',
      date: '2026-05-14', paidBy: sumit.id, splitType: 'equal', splits: splitAmountExactly(12000, members.map((m) => m.id)), createdAt: now, updatedAt: now
    },
    {
      id: generateId('exp'), groupId, description: 'Dinner at Beach Shack', amount: 3200, category: 'Food',
      date: '2026-05-14', paidBy: rahul.id, splitType: 'equal', splits: splitAmountExactly(3200, members.map((m) => m.id)), createdAt: now, updatedAt: now
    },
    {
      id: generateId('exp'), groupId, description: 'Taxi to Airport', amount: 1600, category: 'Travel',
      date: '2026-05-15', paidBy: aman.id, splitType: 'custom',
      splits: [
        { memberId: sumit.id, amount: 500 }, { memberId: rahul.id, amount: 400 },
        { memberId: aman.id, amount: 400 }, { memberId: karan.id, amount: 300 }
      ], createdAt: now, updatedAt: now
    },
    {
      id: generateId('exp'), groupId, description: 'Souvenir Shopping', amount: 2000, category: 'Shopping',
      date: '2026-05-15', paidBy: karan.id, splitType: 'percentage',
      splits: splitByPercentage(2000, members.map((m) => ({ memberId: m.id, pct: 25 }))), createdAt: now, updatedAt: now
    }
  ];

  saveGroups([...remainingGroups, demoGroup]);
  saveExpenses([...remainingExpenses, ...demoExpenses]);
  saveSettlements(remainingSettlements);
  saveData(STORAGE_KEYS.SEEDED, true);
  return demoGroup;
}

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
