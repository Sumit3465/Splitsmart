/* ============================================================
   expenses.js — Add/Edit Expense + Expense History
   Phase 1 focus: switch, loops, functions, arrays, map/filter/
   reduce/sort, form validation, DOM events, LocalStorage and ES6.
   ============================================================ */

const CATEGORIES = ['Food', 'Travel', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities', 'Other'];
let selectedSplitMembers = [];
let currentExpenseGroupId = null;
let editingExpenseId = null;
let expenseFilterState = { search: '', groupId: 'all', category: 'all', sortBy: 'date-desc' };

function initExpensesPage() {
  const table = document.getElementById('expenseHistoryBody');
  if (!table) return;

  populateGroupSelects();
  renderExpenseHistory();

  document.getElementById('openAddExpenseBtn')?.addEventListener('click', () => openAddExpenseModal());
  document.getElementById('addExpenseForm')?.addEventListener('submit', handleExpenseSubmit);
  document.getElementById('expenseGroupSelect')?.addEventListener('change', onExpenseGroupChange);
  document.querySelectorAll('input[name="splitType"]').forEach((radio) => radio.addEventListener('change', onSplitTypeChange));
  document.getElementById('expenseAmountInput')?.addEventListener('input', recalcSplitAmounts);

  document.getElementById('expenseSearchInput')?.addEventListener('input', (event) => {
    expenseFilterState.search = event.target.value.trim().toLowerCase();
    renderExpenseHistory();
  });
  document.getElementById('categoryFilterSelect')?.addEventListener('change', (event) => {
    expenseFilterState.category = event.target.value;
    renderExpenseHistory();
  });
  document.getElementById('sortBySelect')?.addEventListener('change', (event) => {
    expenseFilterState.sortBy = event.target.value;
    renderExpenseHistory();
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('add') === '1') openAddExpenseModal(null, params.get('group'));
}

function populateGroupSelects() {
  const groups = getGroups();
  const groupSelect = document.getElementById('expenseGroupSelect');
  const filterGroupSelect = document.getElementById('groupFilterSelect');
  const options = groups.map((group) => `<option value="${group.id}">${escapeHTML(group.name)}</option>`).join('');

  if (groupSelect) groupSelect.innerHTML = `<option value="">Select a group…</option>${options}`;
  if (filterGroupSelect) filterGroupSelect.innerHTML = `<option value="all">All groups</option>${options}`;

  filterGroupSelect?.addEventListener('change', (event) => {
    expenseFilterState.groupId = event.target.value;
    renderExpenseHistory();
  });
}

/* ---------------------- Add / Edit Expense ---------------------- */
function openAddExpenseModal(expense = null, presetGroupId = null) {
  const form = document.getElementById('addExpenseForm');
  if (!form) return;

  form.reset();
  clearAllErrors(form);
  editingExpenseId = expense ? expense.id : null;
  document.getElementById('expenseModalTitle').textContent = expense ? 'Edit Expense' : 'Add Expense';

  const groups = getGroups();
  if (groups.length === 0) {
    showToast('error', 'Create a group before adding expenses');
    return;
  }

  if (expense && !getGroupById(expense.groupId)) {
    showToast('error', 'This expense belongs to a group that no longer exists.');
    return;
  }

  const groupId = expense ? expense.groupId : (presetGroupId && getGroupById(presetGroupId) ? presetGroupId : groups[0].id);
  document.getElementById('expenseGroupSelect').value = groupId;
  currentExpenseGroupId = groupId;

  loadMembersForSplitSelection(groupId, expense);

  if (expense) {
    document.getElementById('expenseDescInput').value = expense.description || '';
    document.getElementById('expenseAmountInput').value = expense.amount;
    document.getElementById('expenseDateInput').value = expense.date || '';
    document.getElementById('expenseCategorySelect').value = CATEGORIES.includes(expense.category) ? expense.category : 'Other';
    document.getElementById('expensePaidBySelect').value = expense.paidBy || '';
    const splitRadio = document.querySelector(`input[name="splitType"][value="${expense.splitType}"]`);
    if (splitRadio) splitRadio.checked = true;
  } else {
    document.getElementById('expenseDateInput').valueAsDate = new Date();
    document.querySelector('input[name="splitType"][value="equal"]').checked = true;
  }

  onSplitTypeChange(expense);
  openModal('addExpenseModal');
}

function onExpenseGroupChange(event) {
  currentExpenseGroupId = event.target.value;
  loadMembersForSplitSelection(currentExpenseGroupId);
}

function loadMembersForSplitSelection(groupId, expense = null) {
  const group = getGroupById(groupId);
  const paidBySelect = document.getElementById('expensePaidBySelect');
  const memberGrid = document.getElementById('splitMemberGrid');
  if (!group || !paidBySelect || !memberGrid) return;

  paidBySelect.innerHTML = `<option value="">Select payer…</option>${group.members.map((member) => `<option value="${member.id}">${escapeHTML(member.name)}</option>`).join('')}`;

  const existingMemberIds = expense
    ? expense.splits.map((split) => split.memberId).filter((id) => group.members.some((member) => member.id === id))
    : group.members.map((member) => member.id);

  selectedSplitMembers = existingMemberIds;

  memberGrid.innerHTML = group.members.map((member) => `
    <label class="member-chip ${selectedSplitMembers.includes(member.id) ? 'selected' : ''}" data-member-id="${member.id}">
      <input type="checkbox" ${selectedSplitMembers.includes(member.id) ? 'checked' : ''} onchange="toggleSplitMember('${member.id}')" aria-label="Include ${escapeHTML(member.name)} in split">
      ${escapeHTML(member.name)}
    </label>
  `).join('');

  onSplitTypeChange(expense);
}

function toggleSplitMember(memberId) {
  if (selectedSplitMembers.includes(memberId)) {
    selectedSplitMembers = selectedSplitMembers.filter((id) => id !== memberId);
  } else {
    selectedSplitMembers.push(memberId);
  }

  document.querySelectorAll('#splitMemberGrid .member-chip').forEach((chip) => {
    chip.classList.toggle('selected', selectedSplitMembers.includes(chip.dataset.memberId));
  });
  renderSplitInputs();
}

function onSplitTypeChange(expense = null) {
  const type = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';
  const section = document.getElementById('customSplitSection');
  const unitLabel = document.getElementById('splitUnitLabel');
  if (section) section.style.display = type === 'equal' ? 'none' : 'block';
  if (unitLabel) unitLabel.textContent = type === 'percentage' ? '%' : '₹';
  renderSplitInputs(expense);
}

function renderSplitInputs(expense = null) {
  const type = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';
  const group = getGroupById(currentExpenseGroupId);
  const container = document.getElementById('splitInputsList');
  if (!group || !container) return;

  if (type === 'equal') {
    container.innerHTML = '';
    updateSplitTotalBar();
    return;
  }

  const selected = group.members.filter((member) => selectedSplitMembers.includes(member.id));
  container.innerHTML = selected.map((member) => {
    const existing = expense?.splits.find((split) => split.memberId === member.id);
    let value = '';

    if (existing) {
      value = type === 'percentage'
        ? (existing.pct ?? calculateExistingPercentage(expense.amount, expense.splits, member.id))
        : existing.amount;
    }

    return `
      <div class="split-row">
        ${avatarHTML(member.name, 'avatar-sm')}
        <span class="split-name">${escapeHTML(member.name)}</span>
        <input type="number" class="split-amt" min="0" max="${type === 'percentage' ? '100' : ''}" step="0.01" placeholder="0"
               value="${value}" data-member-id="${member.id}" oninput="updateSplitTotalBar()" aria-label="${escapeHTML(member.name)} split">
      </div>
    `;
  }).join('');
  updateSplitTotalBar();
}

function calculateExistingPercentage(total, splits, memberId) {
  const matching = splits.find((split) => split.memberId === memberId);
  if (!matching || !Number(total)) return 0;
  return Math.round((Number(matching.amount) / Number(total)) * 10000) / 100;
}

function recalcSplitAmounts() {
  updateSplitTotalBar();
}

function updateSplitTotalBar() {
  const bar = document.getElementById('splitTotalBar');
  if (!bar) return;

  const type = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';
  const totalAmount = Number(document.getElementById('expenseAmountInput').value) || 0;

  if (type === 'equal') {
    const count = selectedSplitMembers.length;
    const share = count ? formatMoney(totalAmount / count) : formatMoney(0);
    bar.innerHTML = `<span>${count} ${count === 1 ? 'person' : 'people'} selected</span><span>${share} each</span>`;
    bar.classList.remove('split-valid', 'split-invalid');
    return;
  }

  const inputs = [...document.querySelectorAll('.split-amt')];
  const sum = inputs.reduce((total, input) => total + (Number(input.value) || 0), 0);
  const target = type === 'percentage' ? 100 : totalAmount;
  const difference = roundMoney(target - sum);
  const valid = Math.abs(difference) < 0.005;

  bar.classList.toggle('split-valid', valid);
  bar.classList.toggle('split-invalid', !valid);
  bar.innerHTML = `<span>${type === 'percentage' ? 'Percentage entered' : 'Amount entered'}</span><span>${type === 'percentage' ? `${sum.toFixed(2)}% / 100%` : `${formatMoney(sum)} / ${formatMoney(target)}`}</span>`;
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const form = event.target;
  clearAllErrors(form);
  let valid = true;

  const description = document.getElementById('expenseDescInput').value.trim();
  const amount = Number(document.getElementById('expenseAmountInput').value);
  const date = document.getElementById('expenseDateInput').value;
  const category = document.getElementById('expenseCategorySelect').value;
  const paidBy = document.getElementById('expensePaidBySelect').value;
  const groupId = document.getElementById('expenseGroupSelect').value;
  const splitType = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';
  const group = getGroupById(groupId);

  const descField = document.getElementById('expenseDescInput').closest('.field');
  const amountField = document.getElementById('expenseAmountInput').closest('.field');
  const dateField = document.getElementById('expenseDateInput').closest('.field');
  const groupField = document.getElementById('expenseGroupSelect').closest('.field');

  if (!group) { setFieldError(groupField, 'Please select a valid group'); valid = false; }
  if (!description) { setFieldError(descField, 'Description cannot be empty'); valid = false; }
  if (!Number.isFinite(amount) || amount <= 0) { setFieldError(amountField, 'Amount must be greater than zero'); valid = false; }
  if (!date) { setFieldError(dateField, 'Please choose a date'); valid = false; }
  if (!CATEGORIES.includes(category)) { showToast('error', 'Please select a valid category'); valid = false; }
  if (!paidBy || !group?.members.some((member) => member.id === paidBy)) { showToast('error', 'Please select a valid payer'); valid = false; }
  if (selectedSplitMembers.length === 0) { showToast('error', 'Select at least one member to split with'); valid = false; }

  if (group && selectedSplitMembers.some((id) => !group.members.some((member) => member.id === id))) {
    showToast('error', 'One or more selected members are no longer in this group.');
    valid = false;
  }

  let splits = [];
  if (valid) {
    switch (splitType) {
      case 'equal':
        splits = splitAmountExactly(amount, selectedSplitMembers);
        break;

      case 'custom': {
        splits = [...document.querySelectorAll('.split-amt')].map((input) => ({
          memberId: input.dataset.memberId,
          amount: Number(input.value) || 0
        }));
        if (splits.some((split) => split.amount < 0)) {
          showToast('error', 'Split amounts cannot be negative.');
          valid = false;
          break;
        }
        const sumCents = splits.reduce((sum, split) => sum + toCents(split.amount), 0);
        if (sumCents !== toCents(amount)) {
          showToast('error', `Custom amounts (${formatMoney(fromCents(sumCents))}) must equal ${formatMoney(amount)}.`);
          valid = false;
        }
        break;
      }

      case 'percentage': {
        const percentages = [...document.querySelectorAll('.split-amt')].map((input) => ({
          memberId: input.dataset.memberId,
          pct: Number(input.value) || 0
        }));
        if (percentages.some((split) => split.pct < 0 || split.pct > 100)) {
          showToast('error', 'Each percentage must be between 0% and 100%.');
          valid = false;
          break;
        }
        const sumPct = percentages.reduce((sum, split) => sum + split.pct, 0);
        if (Math.abs(sumPct - 100) > 0.005) {
          showToast('error', `Percentages must total 100% (currently ${sumPct.toFixed(2)}%).`);
          valid = false;
          break;
        }
        splits = splitByPercentage(amount, percentages).map((share, index) => ({
          ...share,
          pct: percentages[index].pct
        }));
        break;
      }

      default:
        showToast('error', 'Please select a valid split method.');
        valid = false;
    }
  }

  if (!valid) return;

  const now = new Date().toISOString();
  const expenses = getExpenses();

  if (editingExpenseId) {
    const index = expenses.findIndex((expense) => expense.id === editingExpenseId);
    if (index === -1) {
      showToast('error', 'This expense could not be found. Please try again.');
      return;
    }
    expenses[index] = {
      ...expenses[index],
      description,
      amount: roundMoney(amount),
      date,
      category,
      paidBy,
      groupId,
      splitType,
      splits,
      updatedAt: now
    };
    showToast('success', 'Expense updated');
  } else {
    expenses.push({
      id: generateId('exp'),
      groupId,
      description,
      amount: roundMoney(amount),
      date,
      category,
      paidBy,
      splitType,
      splits,
      createdAt: now,
      updatedAt: now
    });
    showToast('success', 'Expense added successfully');
  }

  if (!saveExpenses(expenses)) {
    showToast('error', 'Could not save the expense in this browser.');
    return;
  }

  closeModal('addExpenseModal');
  renderExpenseHistory();
}

/* ---------------------- Expense History ---------------------- */
function renderExpenseHistory() {
  const tbody = document.getElementById('expenseHistoryBody');
  const emptyState = document.getElementById('expensesEmptyState');
  const tableWrap = document.getElementById('expenseTableWrap');
  if (!tbody || !emptyState || !tableWrap) return;

  const groups = getGroups();
  const groupMap = {};
  groups.forEach((group) => { groupMap[group.id] = group; });
  let expenses = getExpenses();

  if (expenseFilterState.groupId !== 'all') {
    expenses = expenses.filter((expense) => expense.groupId === expenseFilterState.groupId);
  }
  if (expenseFilterState.category !== 'all') {
    expenses = expenses.filter((expense) => expense.category === expenseFilterState.category);
  }
  if (expenseFilterState.search) {
    const query = expenseFilterState.search;
    expenses = expenses.filter((expense) => {
      const groupName = groupMap[expense.groupId]?.name || '';
      return String(expense.description || '').toLowerCase().includes(query) || groupName.toLowerCase().includes(query);
    });
  }

  const [sortField, sortDirection] = expenseFilterState.sortBy.split('-');
  expenses = [...expenses].sort((a, b) => {
    let difference = 0;
    if (sortField === 'date') difference = new Date(a.date) - new Date(b.date);
    if (sortField === 'amount') difference = Number(a.amount) - Number(b.amount);
    return sortDirection === 'desc' ? -difference : difference;
  });

  if (expenses.length === 0) {
    tableWrap.style.display = getExpenses().length > 0 ? 'block' : 'none';
    emptyState.style.display = getExpenses().length > 0 ? 'none' : 'block';
    tbody.innerHTML = getExpenses().length > 0
      ? '<tr><td colspan="6" class="table-empty">No expenses match your current filters.</td></tr>'
      : '';
    return;
  }

  tableWrap.style.display = 'block';
  emptyState.style.display = 'none';

  tbody.innerHTML = expenses.map((expense) => {
    const group = groupMap[expense.groupId];
    const payer = group?.members.find((member) => member.id === expense.paidBy);
    return `
      <tr data-expense-id="${escapeHTML(expense.id)}" class="expense-clickable-row">
        <td>
          <div class="expense-title-cell">
            <span class="row-icon">${categoryEmoji(expense.category)}</span>
            <div>
              <div class="expense-name">${escapeHTML(expense.description)}</div>
              <div class="expense-date">${formatDate(expense.date)}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-neutral">${categoryEmoji(expense.category)} ${escapeHTML(expense.category)}</span></td>
        <td>${group ? escapeHTML(group.name) : '<span class="amt-neg">Missing group</span>'}</td>
        <td>${payer ? escapeHTML(payer.name) : '<span class="amt-neg">Missing payer</span>'}</td>
        <td class="mono expense-amount">${formatMoney(expense.amount)}</td>
        <td>
          <div class="table-actions">
            <button class="icon-btn" type="button" onclick="editExpenseFromHistory('${expense.id}')" title="Edit expense" aria-label="Edit expense">✏️</button>
            <button class="icon-btn" type="button" onclick="deleteExpenseFromHistory('${expense.id}')" title="Delete expense" aria-label="Delete expense">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function editExpenseFromHistory(id) {
  const expense = getExpenses().find((item) => item.id === id);
  if (expense) openAddExpenseModal(expense);
}

function deleteExpenseFromHistory(id) {
  const expense = getExpenses().find((item) => item.id === id);
  if (!expense) return;

  confirmAction({
    title: 'Delete expense?',
    message: `Remove “${expense.description}”? Balances and settlement suggestions will be recalculated.`,
    confirmLabel: 'Delete',
    onConfirm: () => {
      const nextExpenses = getExpenses().filter((item) => item.id !== id);
      if (!saveExpenses(nextExpenses)) {
        showToast('error', 'Could not delete the expense.');
        return;
      }
      renderExpenseHistory();
      showToast('success', 'Expense deleted');
    }
  });
}
