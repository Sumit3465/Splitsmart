/* ============================================================
   groups.js — Groups list page & Group details page
   Demonstrates: form validation, preventDefault, array methods
   (map/filter/find/splice), destructuring, spread operator.
   ============================================================ */

const GROUP_ICONS = ['🏖️', '🏠', '🎉', '✈️', '🍕', '🎬', '⚽', '🎓'];
function iconForGroup(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return GROUP_ICONS[hash % GROUP_ICONS.length];
}

/* =========================================================
   GROUPS LIST PAGE
   ========================================================= */
let tempNewMembers = []; // members staged while creating a group in the modal

function initGroupsPage() {
  const grid = document.getElementById('groupsGrid');
  if (!grid) return;

  renderGroupsGrid();

  document.getElementById('openCreateGroupBtn')?.addEventListener('click', () => openCreateGroupModal());
  document.getElementById('createGroupForm')?.addEventListener('submit', handleCreateOrEditGroup);
  document.getElementById('addTempMemberBtn')?.addEventListener('click', addTempMember);
  document.getElementById('tempMemberInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTempMember(); }
  });

  // auto-open modal if navigated with ?new=1
  const params = new URLSearchParams(window.location.search);
  if (params.get('new') === '1') openCreateGroupModal();
}

function renderGroupsGrid() {
  const grid = document.getElementById('groupsGrid');
  const groups = getGroups();

  if (groups.length === 0) {
    grid.innerHTML = '';
    document.getElementById('groupsEmptyState').style.display = 'block';
    return;
  }
  document.getElementById('groupsEmptyState').style.display = 'none';

  grid.innerHTML = groups.map((group) => {
    const expenses = getExpensesByGroup(group.id);
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const balances = calculateGroupBalances(group.id);
    const totalOutstanding = balances.filter((b) => b.balance < 0).reduce((s, b) => s + Math.abs(b.balance), 0);

    return `
      <div class="card card-hover group-card">
        <div class="gc-top">
          <div class="gc-icon">${iconForGroup(group.name)}</div>
          <div class="gc-menu">
            <button class="icon-btn" data-dropdown-trigger style="width:34px;height:34px;">⋮</button>
            <div class="dropdown-menu">
              <a href="group-details.html?id=${group.id}">👁 View details</a>
              <button onclick="openCreateGroupModal('${group.id}')">✏️ Edit group</button>
              <button class="danger" onclick="deleteGroup('${group.id}')">🗑 Delete group</button>
            </div>
          </div>
        </div>
        <div>
          <h3>${escapeHTML(group.name)}</h3>
          <p class="gc-desc">${escapeHTML(group.description || 'No description')}</p>
        </div>
        <div class="gc-members">
          ${group.members.slice(0, 5).map((m) => avatarHTML(m.name, 'avatar-sm')).join('')}
          ${group.members.length > 5 ? `<div class="avatar avatar-sm" style="background:var(--card-soft);color:var(--text-muted);">+${group.members.length - 5}</div>` : ''}
        </div>
        <div class="gc-stats">
          <div class="gc-stat"><b>${group.members.length}</b><span>Members</span></div>
          <div class="gc-stat"><b>${formatMoney(totalExpense)}</b><span>Total spent</span></div>
          <div class="gc-stat"><b class="${totalOutstanding > 0 ? 'amt-neg' : 'amt-pos'}">${formatMoney(totalOutstanding)}</b><span>Outstanding</span></div>
        </div>
        <a href="group-details.html?id=${group.id}" class="btn btn-outline btn-block">View Group</a>
      </div>
    `;
  }).join('');
}

function openCreateGroupModal(editId = null) {
  const form = document.getElementById('createGroupForm');
  clearAllErrors(form);
  tempNewMembers = [];

  const modalTitle = document.getElementById('groupModalTitle');
  form.dataset.editId = editId || '';

  if (editId) {
    const group = getGroupById(editId);
    modalTitle.textContent = 'Edit Group';
    document.getElementById('groupNameInput').value = group.name;
    document.getElementById('groupDescInput').value = group.description || '';
    tempNewMembers = [...group.members];
  } else {
    modalTitle.textContent = 'Create New Group';
    form.reset();
  }
  renderTempMembers();
  openModal('createGroupModal');
}

function addTempMember() {
  const input = document.getElementById('tempMemberInput');
  const name = input.value.trim();
  const field = input.closest('.field');
  clearFieldError(field);

  if (!name) { setFieldError(field, 'Member name cannot be empty'); return; }
  const isDuplicate = tempNewMembers.some((m) => m.name.toLowerCase() === name.toLowerCase());
  if (isDuplicate) { setFieldError(field, 'This member is already added'); return; }

  tempNewMembers.push({ id: generateId('mem'), name, email: '' });
  input.value = '';
  renderTempMembers();
}

function removeTempMember(id) {
  const editId = document.getElementById('createGroupForm')?.dataset.editId;
  if (editId) {
    const hasHistory = getExpensesByGroup(editId).some((expense) => (
      expense.paidBy === id || expense.splits.some((split) => split.memberId === id)
    ));
    if (hasHistory) {
      showToast('error', 'This member has expense history and cannot be removed.');
      return;
    }
  }

  tempNewMembers = tempNewMembers.filter((member) => member.id !== id);
  renderTempMembers();
}

function renderTempMembers() {
  const wrap = document.getElementById('tempMembersList');
  if (!wrap) return;
  if (tempNewMembers.length === 0) {
    wrap.innerHTML = `<p class="hint" style="margin:0;">No members added yet. Add at least one member.</p>`;
    return;
  }
  wrap.innerHTML = tempNewMembers.map((m) => `
    <span class="member-chip selected">
      ${escapeHTML(m.name)}
      <button type="button" class="chip-remove" onclick="removeTempMember('${m.id}')" title="Remove ${escapeHTML(m.name)}" aria-label="Remove ${escapeHTML(m.name)}">&times;</button>
    </span>
  `).join('');
}

function handleCreateOrEditGroup(e) {
  e.preventDefault();
  const form = e.target;
  clearAllErrors(form);

  const nameInput = document.getElementById('groupNameInput');
  const name = nameInput.value.trim();
  const description = document.getElementById('groupDescInput').value.trim();
  let valid = true;

  if (!name) {
    setFieldError(nameInput.closest('.field'), 'Group name is required');
    valid = false;
  }

  const editId = form.dataset.editId;
  const duplicateName = getGroups().some((group) => (
    group.id !== editId && group.name.trim().toLowerCase() === name.toLowerCase()
  ));
  if (name && duplicateName) {
    setFieldError(nameInput.closest('.field'), 'A group with this name already exists');
    valid = false;
  }

  if (tempNewMembers.length === 0) {
    showToast('error', 'Add at least one member to the group');
    valid = false;
  }
  if (!valid) return;

  const groups = getGroups();

  if (editId) {
    const idx = groups.findIndex((g) => g.id === editId);
    if (idx !== -1) {
      groups[idx] = { ...groups[idx], name, description, members: tempNewMembers };
    }
    showToast('success', 'Group updated successfully');
  } else {
    groups.push({
      id: generateId('grp'),
      name, description,
      members: tempNewMembers,
      createdAt: new Date().toISOString()
    });
    showToast('success', 'Group created successfully');
  }

  saveGroups(groups);
  closeModal('createGroupModal');
  renderGroupsGrid();
}

function deleteGroup(id) {
  const group = getGroupById(id);
  if (!group) return;
  confirmAction({
    title: 'Delete group?',
    message: `This will permanently delete "${group.name}" and all of its expenses. This cannot be undone.`,
    confirmLabel: 'Delete',
    onConfirm: () => {
      saveGroups(getGroups().filter((g) => g.id !== id));
      saveExpenses(getExpenses().filter((e) => e.groupId !== id));
      saveSettlements(getSettlements().filter((s) => s.groupId !== id));
      renderGroupsGrid();
      showToast('success', 'Group deleted');
    }
  });
}

/* =========================================================
   GROUP DETAILS PAGE
   ========================================================= */
function getCurrentGroupId() {
  return new URLSearchParams(window.location.search).get('id');
}

function initGroupDetailsPage() {
  const container = document.getElementById('groupDetailsRoot');
  if (!container) return;

  const groupId = getCurrentGroupId();
  const group = getGroupById(groupId);

  if (!group) {
    container.innerHTML = emptyStateHTML('🔍', 'Group not found', 'This group may have been deleted.', 'groups.html', 'Back to Groups');
    return;
  }

  renderGroupDetails(group);

  document.getElementById('addMemberForm')?.addEventListener('submit', (e) => handleAddMember(e, group.id));
  document.getElementById('openAddMemberBtn')?.addEventListener('click', () => {
    document.getElementById('addMemberForm').reset();
    clearAllErrors(document.getElementById('addMemberForm'));
    openModal('addMemberModal');
  });
}

function renderGroupDetails(group) {
  const expenses = getExpensesByGroup(group.id);
  const balances = calculateGroupBalances(group.id);
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  document.getElementById('groupTitle').textContent = group.name;
  document.getElementById('groupDescText').textContent = group.description || 'No description provided';
  document.getElementById('groupCreatedText').textContent = `Created ${formatDate(group.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10))}`;
  document.getElementById('groupMemberCount').textContent = group.members.length;
  document.getElementById('groupExpenseTotal').textContent = formatMoney(totalExpense);
  document.getElementById('groupExpenseCount').textContent = expenses.length;

  // Members grid
  const memberGrid = document.getElementById('groupMembersGrid');
  memberGrid.innerHTML = group.members.map((m) => {
    const bal = balances.find((b) => b.memberId === m.id);
    const balClass = bal.balance > 0 ? 'amt-pos' : bal.balance < 0 ? 'amt-neg' : '';
    const balLabel = bal.balance === 0 ? 'Settled up' : (bal.balance > 0 ? `Gets ${formatMoney(bal.balance)}` : `Owes ${formatMoney(Math.abs(bal.balance))}`);
    return `
      <div class="card member-card">
        <button class="m-remove" type="button" onclick="removeMember('${group.id}','${m.id}')" title="Remove member" aria-label="Remove ${escapeHTML(m.name)}">&times;</button>
        ${avatarHTML(m.name, 'avatar-lg')}
        <div class="m-name">${escapeHTML(m.name)}</div>
        <div class="m-balance ${balClass}">${balLabel}</div>
      </div>
    `;
  }).join('');

  // Balances list
  const balanceList = document.getElementById('groupBalanceList');
  balanceList.innerHTML = balances.map((b) => `
    <div class="row-item">
      ${avatarHTML(b.name)}
      <div class="row-main">
        <div class="row-title">${escapeHTML(b.name)}</div>
        <div class="row-sub">Paid ${formatMoney(b.paid)} · Owes share ${formatMoney(b.owed)}</div>
      </div>
      <div class="row-amt ${b.balance >= 0 ? 'amt-pos' : 'amt-neg'}">${b.balance >= 0 ? '+' : '-'}${formatMoney(Math.abs(b.balance))}</div>
    </div>
  `).join('');

  // Expense history (recent)
  const expenseList = document.getElementById('groupExpenseList');
  if (expenses.length === 0) {
    expenseList.innerHTML = emptyStateHTML('🧾', 'No expenses yet', 'Add your first expense to start tracking this group\'s spending.', `expenses.html?add=1&group=${group.id}`, 'Add Expense');
  } else {
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    expenseList.innerHTML = sorted.map((exp) => {
      const payer = group.members.find((m) => m.id === exp.paidBy);
      return `
        <div class="row-item">
          <div class="row-icon">${categoryEmoji(exp.category)}</div>
          <div class="row-main">
            <div class="row-title">${escapeHTML(exp.description)}</div>
            <div class="row-sub">${payer ? escapeHTML(payer.name) : 'Unknown'} paid · ${formatDate(exp.date, { day: 'numeric', month: 'short' })}</div>
          </div>
          <div class="row-amt">${formatMoney(exp.amount)}</div>
          <button class="icon-btn" style="width:34px;height:34px;" onclick="deleteExpenseInline('${exp.id}','${group.id}')" title="Delete expense">🗑</button>
        </div>
      `;
    }).join('');
  }
}

function deleteExpenseInline(expenseId, groupId) {
  confirmAction({
    title: 'Delete expense?',
    message: 'This expense will be permanently removed and balances will be recalculated.',
    confirmLabel: 'Delete',
    onConfirm: () => {
      saveExpenses(getExpenses().filter((e) => e.id !== expenseId));
      renderGroupDetails(getGroupById(groupId));
      showToast('success', 'Expense deleted');
    }
  });
}

function handleAddMember(e, groupId) {
  e.preventDefault();
  const input = document.getElementById('newMemberNameInput');
  const emailInput = document.getElementById('newMemberEmailInput');
  const field = input.closest('.field');
  clearFieldError(field);

  const name = input.value.trim();
  const group = getGroupById(groupId);

  if (!name) { setFieldError(field, 'Member name cannot be empty'); return; }
  if (group.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
    setFieldError(field, 'A member with this name already exists');
    return;
  }

  group.members.push({ id: generateId('mem'), name, email: emailInput.value.trim() });
  const groups = getGroups().map((g) => (g.id === groupId ? group : g));
  saveGroups(groups);

  closeModal('addMemberModal');
  renderGroupDetails(group);
  showToast('success', `${name} added to the group`);
}

function removeMember(groupId, memberId) {
  const group = getGroupById(groupId);
  if (!group) return;

  const member = group.members.find((item) => item.id === memberId);
  if (!member) return;

  const hasExpenses = getExpensesByGroup(groupId).some((expense) => (
    expense.paidBy === memberId || expense.splits.some((split) => split.memberId === memberId)
  ));

  if (hasExpenses) {
    showToast('error', `${member.name} has expense history and cannot be removed. Keep the member to preserve past balances.`);
    return;
  }

  confirmAction({
    title: 'Remove member?',
    message: `Remove ${member.name} from ${group.name}?`,
    confirmLabel: 'Remove',
    onConfirm: () => {
      group.members = group.members.filter((item) => item.id !== memberId);
      saveGroups(getGroups().map((item) => (item.id === groupId ? group : item)));
      renderGroupDetails(group);
      showToast('success', `${member.name} removed`);
    }
  });
}

function categoryEmoji(category) {
  const map = {
    Food: '🍔', Travel: '🚕', Accommodation: '🏨', Entertainment: '🎬',
    Shopping: '🛍️', Utilities: '💡', Other: '📦'
  };
  return map[category] || '💳';
}
