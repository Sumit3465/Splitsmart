/* ============================================================
   analytics.js — Spending by category, member contribution,
   monthly totals. Uses map/filter/reduce/sort and DOM updates.
   ============================================================ */

const ANALYTICS_CATEGORIES = ['Food', 'Travel', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities', 'Other'];

const CATEGORY_COLORS = {
  Food: '#FF7A29', Travel: '#5B8DEF', Accommodation: '#9B6BFF',
  Entertainment: '#1FB579', Shopping: '#EF4D5E', Utilities: '#00B4D8', Other: '#A6ADC1'
};

function initAnalyticsPage() {
  const root = document.getElementById('analyticsRoot');
  if (!root) return;

  const groupSelect = document.getElementById('analyticsGroupSelect');
  const groups = getGroups();
  groupSelect.innerHTML = `<option value="all">All groups</option>${groups.map((group) => `<option value="${group.id}">${escapeHTML(group.name)}</option>`).join('')}`;
  groupSelect.addEventListener('change', () => renderAnalytics(groupSelect.value));

  renderAnalytics('all');
}

function renderAnalytics(groupFilter) {
  let expenses = getExpenses();
  if (groupFilter !== 'all') expenses = expenses.filter((expense) => expense.groupId === groupFilter);

  const emptyState = document.getElementById('analyticsEmptyState');
  const content = document.getElementById('analyticsContent');

  if (expenses.length === 0) {
    emptyState.style.display = 'block';
    content.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  content.style.display = 'block';

  const totalSpend = roundMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0));
  document.getElementById('analyticsTotalSpend').textContent = formatMoney(totalSpend);
  document.getElementById('analyticsExpenseCount').textContent = expenses.length;
  document.getElementById('analyticsAvgExpense').textContent = formatMoney(totalSpend / expenses.length);

  renderCategoryBreakdown(expenses, totalSpend);
  renderMemberContribution(expenses, groupFilter);
  renderMonthlySpending(expenses);
}

function renderCategoryBreakdown(expenses, totalSpend) {
  const byCategory = expenses.reduce((totals, expense) => {
    const category = ANALYTICS_CATEGORIES.includes(expense.category) ? expense.category : 'Other';
    totals[category] = (totals[category] || 0) + Number(expense.amount || 0);
    return totals;
  }, {});

  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  let cursor = 0;

  const gradientStops = entries.map(([category, amount]) => {
    const percentage = totalSpend ? (amount / totalSpend) * 100 : 0;
    const start = cursor;
    cursor += percentage;
    return `${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other} ${start}% ${cursor}%`;
  }).join(', ');

  const donut = document.getElementById('categoryDonut');
  donut.style.background = gradientStops ? `conic-gradient(${gradientStops})` : 'var(--card-soft)';

  document.getElementById('categoryLegend').innerHTML = entries.map(([category, amount]) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}"></span>
      <span>${categoryEmoji(category)} ${escapeHTML(category)}</span>
      <span class="legend-val">${formatMoney(amount)}</span>
    </div>
  `).join('');

  document.getElementById('categoryBars').innerHTML = entries.map(([category, amount]) => {
    const percentage = totalSpend ? Math.round((amount / totalSpend) * 100) : 0;
    return `
      <div class="bar-row">
        <div class="bar-row-top"><span>${categoryEmoji(category)} ${escapeHTML(category)}</span><span class="bar-amt">${formatMoney(amount)} · ${percentage}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${percentage}%;background:${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}"></div></div>
      </div>
    `;
  }).join('');
}

function renderMemberContribution(expenses, groupFilter) {
  const groups = getGroups();
  const relevantGroups = groupFilter === 'all' ? groups : groups.filter((group) => group.id === groupFilter);
  const contribution = {};

  for (const group of relevantGroups) {
    for (const member of group.members) {
      contribution[member.id] = {
        id: member.id,
        name: member.name,
        amount: contribution[member.id]?.amount || 0
      };
    }
  }

  for (const expense of expenses) {
    const group = groups.find((item) => item.id === expense.groupId);
    const payer = group?.members.find((member) => member.id === expense.paidBy);
    if (payer) {
      contribution[payer.id] = contribution[payer.id] || { id: payer.id, name: payer.name, amount: 0 };
      contribution[payer.id].amount += Number(expense.amount || 0);
    }
  }

  const sorted = Object.values(contribution).sort((a, b) => b.amount - a.amount);
  const max = Math.max(1, ...sorted.map((item) => item.amount));

  document.getElementById('memberContribution').innerHTML = sorted.length === 0
    ? '<p class="muted-note">No member contribution data yet.</p>'
    : sorted.map((item) => `
      <div class="bar-row">
        <div class="bar-row-top">
          <span style="display:flex;align-items:center;gap:8px;">${avatarHTML(item.name, 'avatar-sm')}${escapeHTML(item.name)}</span>
          <span class="bar-amt">${formatMoney(item.amount)}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${(item.amount / max) * 100}%"></div></div>
      </div>
    `).join('');
}

function renderMonthlySpending(expenses) {
  const byMonth = expenses.reduce((totals, expense) => {
    const date = new Date(`${expense.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) return totals;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    totals[key] = (totals[key] || 0) + Number(expense.amount || 0);
    return totals;
  }, {});

  const entries = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...entries.map(([, amount]) => amount));

  document.getElementById('monthlySpending').innerHTML = entries.map(([key, amount]) => {
    const [year, month] = key.split('-').map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    return `
      <div class="bar-row">
        <div class="bar-row-top"><span>${label}</span><span class="bar-amt">${formatMoney(amount)}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${(amount / max) * 100}%"></div></div>
      </div>
    `;
  }).join('');
}
