/* ============================================================
   app.js — shared shell (sidebar/topbar), theme, mobile nav
   Demonstrates: DOM creation, event listeners, template literals,
   default params, spread/rest, switch statements.
   ============================================================ */

const NAV_ITEMS = [
  { id: 'dashboard', href: 'dashboard.html', label: 'Dashboard', icon: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z' },
  { id: 'groups', href: 'groups.html', label: 'Groups', icon: 'M17 21v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M7 21v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
  { id: 'expenses', href: 'expenses.html', label: 'Expenses', icon: 'M3 10h18M7 15h2m4 0h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' },
  { id: 'settlement', href: 'settlement.html', label: 'Settlement', icon: 'M7 10l5 5 5-5M7 4h10M12 15V4' },
  { id: 'analytics', href: 'analytics.html', label: 'Analytics', icon: 'M4 19V9m6 10V5m6 14v-7m4-7v18H2' },
  { id: 'activity', href: 'activity.html', label: 'Activity', icon: 'M4 4v16h16M7 15l3-3 3 2 4-5' },
  { id: 'profile', href: 'profile.html', label: 'Profile', icon: 'M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' }
];

function iconSVG(pathData) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${pathData}"/></svg>`;
}

/** Renders the sidebar + topbar shell and wires up interactivity. Called once per inner page. */
function initShell(activePage, pageTitle) {
  // Phase 1 is local-only. A profile must exist before entering the app.
  if (!hasProfile() && !getData(STORAGE_KEYS.SEEDED, false) && activePage !== 'profile') {
    const target = new URL('profile.html?setup=1', window.location.href);
    window.location.replace(target.href);
    return;
  }

  const savedTheme = getData(STORAGE_KEYS.THEME, null) || getProfile().theme || 'light';
  applyTheme(savedTheme);

  const profile = getProfile();
  const demoMode = !hasProfile() && getData(STORAGE_KEYS.SEEDED, false);
  const displayName = hasProfile() ? profile.name : 'Demo Mode';
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  const shell = document.querySelector('.app-shell');

  if (sidebar) {
    sidebar.classList.remove('open');
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="logo-mark">S</div>
        <span class="brand-name">SplitSmart</span>
      </div>
      <nav class="sidebar-nav" aria-label="Main navigation">
        ${NAV_ITEMS.map((item) => `
          <a href="${item.href}" class="nav-link ${item.id === activePage ? 'active' : ''}" title="${escapeHTML(item.label)}">
            ${iconSVG(item.icon)}<span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-foot">
        <a href="profile.html" class="sidebar-user">
          ${avatarHTML(displayName, 'avatar-sm')}
          <div>
            <div class="u-name">${escapeHTML(displayName)}</div>
            <div class="u-role">${demoMode ? 'Demo data · Set up profile' : `${escapeHTML(profile.currency)} · View profile`}</div>
          </div>
        </a>
      </div>
    `;
  }

  if (topbar) {
    topbar.innerHTML = `
      <div class="topbar-leading">
        <button class="icon-btn hamburger" id="hamburgerBtn" aria-label="Open navigation menu" aria-expanded="false">${iconSVG('M4 6h16M4 12h16M4 18h16')}</button>
        <div class="topbar-heading-wrap">
          <span class="topbar-kicker">SPLITSMART</span>
          <h1 class="topbar-title">${escapeHTML(pageTitle)}</h1>
        </div>
      </div>
      <div class="topbar-actions">
        <span class="local-badge">Local mode</span>
        <button class="icon-btn" id="themeToggleBtn" aria-label="Toggle theme">
          <span id="themeIcon">${iconSVG('M12 3v1m0 16v1m9-9h-1M4 12H3m15.4 6.4-.7-.7M6.3 6.3l-.7-.7m12.8 0-.7.7M6.3 17.7l-.7.7M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z')}</span>
        </button>
        <a href="expenses.html?add=1" class="btn btn-primary btn-sm topbar-new-expense">+ Expense</a>
      </div>
    `;
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
  }

  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const overlay = document.getElementById('sidebarOverlay');
  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
    hamburgerBtn?.setAttribute('aria-expanded', 'false');
  };
  const openSidebar = () => {
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
    hamburgerBtn?.setAttribute('aria-expanded', 'true');
  };

  hamburgerBtn?.addEventListener('click', () => {
    if (sidebar?.classList.contains('open')) closeSidebar();
    else openSidebar();
  });
  overlay?.addEventListener('click', closeSidebar);
  sidebar?.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeSidebar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  }, { once: false });
}

/* ---------------------- Theme ---------------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  saveData(STORAGE_KEYS.THEME, theme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML = theme === 'dark'
      ? iconSVG('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z')
      : iconSVG('M12 3v1m0 16v1m9-9h-1M4 12H3m15.4 6.4-.7-.7M6.3 6.3l-.7-.7m12.8 0-.7.7M6.3 17.7l-.7.7M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z');
  }
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  const profile = getProfile();
  profile.theme = next;
  saveProfile(profile);
}

/* Apply saved theme immediately on any page (before shell init) to avoid flash */
(function bootTheme() {
  const saved = getData(STORAGE_KEYS.THEME, null) || (getData(STORAGE_KEYS.PROFILE, {}) || {}).theme || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

/* ---------------------- Landing page interactions ---------------------- */
function initLandingPage() {
  const appEntryHref = hasProfile() || getData(STORAGE_KEYS.SEEDED, false) ? 'dashboard.html' : 'profile.html?setup=1';
  document.querySelectorAll('a[href="dashboard.html"]').forEach((link) => {
    link.href = appEntryHref;
  });

  const hamburger = document.getElementById('landingHamburger');
  const links = document.querySelector('.landing-links');
  if (hamburger && links) {
    hamburger.addEventListener('click', () => links.classList.toggle('open'));
  }

  animateCounters();

  const demoBtns = document.querySelectorAll('[data-try-demo]');
  demoBtns.forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    loadDemoData();
    showToast('success', 'Demo data loaded — exploring the dashboard!');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
  }));
}

function animateCounters() {
  document.querySelectorAll('[data-count-to]').forEach((el) => {
    const target = Number(el.dataset.countTo);
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN');
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/* ============================================================
   Dashboard page
   ============================================================ */
function dashboardMonthSeries(expenses, count = 6) {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      amount: 0
    });
  }
  const byKey = new Map(months.map((item) => [item.key, item]));
  expenses.forEach((expense) => {
    const raw = expense.date || expense.createdAt;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.amount += Number(expense.amount || 0);
  });
  return months;
}

function renderDashboardTrend(expenses) {
  const host = document.getElementById('dashboardTrendChart');
  if (!host) return;
  const points = dashboardMonthSeries(expenses, 6);
  const width = 760;
  const height = 225;
  const pad = { top: 22, right: 22, bottom: 34, left: 22 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((p) => p.amount));
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const coords = points.map((p, index) => ({
    ...p,
    x: pad.left + step * index,
    y: pad.top + innerH - ((p.amount / max) * innerH)
  }));
  const path = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - pad.bottom).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - pad.bottom).toFixed(1)} Z`;
  const grid = [0, .5, 1].map((ratio) => {
    const y = pad.top + innerH - ratio * innerH;
    const value = max * ratio;
    return `<line class="chart-grid-line" x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}"/>` +
      `<text class="chart-value-label" x="${width - pad.right}" y="${y - 5}" text-anchor="end">${formatMoney(value)}</text>`;
  }).join('');
  const labels = coords.map((p) => `<text class="chart-axis-label" x="${p.x}" y="${height - 10}" text-anchor="middle">${p.label}</text>`).join('');
  const dots = coords.map((p, i) => `<circle class="${i === coords.length - 1 ? 'chart-dot-active' : 'chart-dot'}" cx="${p.x}" cy="${p.y}" r="${i === coords.length - 1 ? 5 : 4}"/>`).join('');
  host.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Six month spending trend">
      <defs><linearGradient id="dashboardAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6E7CFF" stop-opacity=".24"/><stop offset="100%" stop-color="#6E7CFF" stop-opacity="0"/></linearGradient></defs>
      ${grid}
      <path class="chart-area" d="${area}"/>
      <path class="chart-line" d="${path}"/>
      ${dots}
      ${labels}
    </svg>`;
}

function renderDashboardCategoryMix(expenses) {
  const donut = document.getElementById('dashboardCategoryDonut');
  const legend = document.getElementById('dashboardCategoryLegend');
  const totalEl = document.getElementById('dashboardCategoryTotal');
  if (!donut || !legend || !totalEl) return;

  const totals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Other';
    acc[category] = (acc[category] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total = rows.reduce((sum, [, amount]) => sum + amount, 0);
  const fallback = [
    ['Food', '#FF7A29'], ['Travel', '#6E7CFF'], ['Accommodation', '#1FB579'],
    ['Entertainment', '#F2B84B'], ['Other', '#A6ADC1']
  ];
  const colorFor = (category, index) => {
    if (typeof CATEGORY_COLORS !== 'undefined' && CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
    return fallback[index % fallback.length][1];
  };
  const colors = rows.map(([category], index) => colorFor(category, index));
  let cursor = 0;
  const segments = rows.length ? rows.map(([category, amount], index) => {
    const start = cursor;
    cursor += total ? (amount / total) * 100 : 0;
    return `${colors[index]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }) : ['#CBD0DD 0 100%'];
  donut.style.background = `conic-gradient(${segments.join(',')})`;
  totalEl.textContent = formatMoney(total);
  legend.innerHTML = rows.length ? rows.map(([category, amount], index) => {
    const pct = total ? Math.round((amount / total) * 100) : 0;
    return `<div class="dashboard-category-row"><i style="background:${colors[index]}"></i><span>${escapeHTML(category)}</span><strong>${pct}%</strong></div>`;
  }).join('') : `<div class="dashboard-category-empty">Add expenses to see your mix.</div>`;
}

function renderDashboardVisualInsight(expenses, groups, summary) {
  const title = document.getElementById('dashboardVisualInsightTitle');
  const text = document.getElementById('dashboardVisualInsightText');
  if (!title || !text) return;
  if (!expenses.length) {
    title.textContent = 'Your shared spending, at a glance.';
    text.textContent = 'Once you add expenses, this space turns your ledger into useful patterns without leaving this device.';
    return;
  }
  const categoryTotals = expenses.reduce((acc, expense) => {
    const key = expense.category || 'Other';
    acc[key] = (acc[key] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    title.textContent = `${topCategory[0]} is your biggest shared spend.`;
    text.textContent = `${formatMoney(topCategory[1])} of the current ledger sits in ${topCategory[0].toLowerCase()}. You have ${groups.length} active group${groups.length === 1 ? '' : 's'} and ${summary.youOwe > 0 ? `${formatMoney(summary.youOwe)} still to settle` : 'no personal amount waiting to settle'}.`;
  }
}

function initDashboardPage() {
  const root = document.getElementById('dashboardRoot');
  if (!root) return;

  const groups = getGroups();
  const expenses = getExpenses();
  const settlements = getSettlements();
  const summary = getPersonalSummary();
  const profile = getProfile();
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const net = Number(summary.youAreOwed || 0) - Number(summary.youOwe || 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const name = (profile.name || 'there').trim().split(/\s+/)[0];
  const dateText = new Intl.DateTimeFormat('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date());

  document.getElementById('dashboardGreetingTime').textContent = greeting;
  document.getElementById('dashboardUserName').textContent = name || 'there';
  document.getElementById('dashboardDateLine').textContent = `${dateText} · Here is what is happening across your groups.`;
  document.getElementById('statTotalGroups').textContent = groups.length;
  document.getElementById('statTotalExpenses').textContent = formatMoney(totalExpenses);
  document.getElementById('statYouOwe').textContent = formatMoney(summary.youOwe);
  document.getElementById('statYouAreOwed').textContent = formatMoney(summary.youAreOwed);
  document.getElementById('dashboardNetBalance').textContent = formatMoney(Math.abs(net));

  renderDashboardTrend(expenses);
  renderDashboardCategoryMix(expenses);
  renderDashboardVisualInsight(expenses, groups, summary);

  const netLabel = document.getElementById('dashboardNetLabel');
  const balanceOrb = document.getElementById('dashboardBalanceOrb');
  if (net > 0) {
    netLabel.textContent = 'You are net positive across your groups.';
    netLabel.className = 'balance-positive-text';
    balanceOrb.textContent = '↗';
    balanceOrb.className = 'balance-orb positive';
  } else if (net < 0) {
    netLabel.textContent = 'You are net negative across your groups.';
    netLabel.className = 'balance-negative-text';
    balanceOrb.textContent = '↘';
    balanceOrb.className = 'balance-orb negative';
  } else {
    netLabel.textContent = 'You are all settled up across your groups.';
    netLabel.className = '';
    balanceOrb.textContent = '✓';
    balanceOrb.className = 'balance-orb neutral';
  }

  const insightTitle = document.getElementById('dashboardInsightTitle');
  const insightText = document.getElementById('dashboardInsightText');
  if (expenses.length === 0) {
    insightTitle.textContent = 'Your ledger is ready.';
    insightText.textContent = 'Add your first shared expense and SplitSmart will calculate the balances for you.';
  } else if (summary.youOwe > 0) {
    insightTitle.textContent = `${formatMoney(summary.youOwe)} is waiting to be settled.`;
    insightText.textContent = 'Open Settlement to see the simplest payment path across your groups.';
  } else if (summary.youAreOwed > 0) {
    insightTitle.textContent = `You are owed ${formatMoney(summary.youAreOwed)}.`;
    insightText.textContent = 'Keep adding expenses as they happen and let the settlement engine keep the ledger current.';
  } else {
    insightTitle.textContent = 'Everything is balanced.';
    insightText.textContent = 'Nice work. Your current expenses do not leave you with an outstanding balance.';
  }

  const topGroupsHost = document.getElementById('dashboardTopGroups');
  if (topGroupsHost) {
    const rankedGroups = groups.map((group) => {
      const groupExpenses = expenses.filter((expense) => expense.groupId === group.id);
      const paid = groupExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      const memberBalances = calculateGroupBalances(group.id);
      const mine = memberBalances.find((entry) => {
        const profileName = (profile.name || '').trim().toLowerCase();
        const profileEmail = (profile.email || '').trim().toLowerCase();
        const member = (group.members || []).find((m) => m.id === entry.memberId);
        return (member?.email || '').trim().toLowerCase() === profileEmail || (member?.name || '').trim().toLowerCase() === profileName;
      });
      return { group, count: groupExpenses.length, paid, mine: Number(mine?.balance || 0) };
    }).sort((a,b) => (b.count - a.count) || (b.paid - a.paid)).slice(0, 4);

    topGroupsHost.innerHTML = rankedGroups.length ? rankedGroups.map(({group,count,mine}) => {
      const visibleMembers = (group.members || []).slice(0,3);
      const status = mine > 0.005 ? 'You’re owed' : mine < -0.005 ? 'You owe' : 'Balanced';
      const amount = Math.abs(mine);
      const tone = mine > 0.005 ? 'amt-pos' : mine < -0.005 ? 'amt-neg' : '';
      return `
        <a class="group-mini-item" href="group-details.html?id=${encodeURIComponent(group.id)}">
          <div class="group-mini-avatars">${visibleMembers.map(member => avatarHTML(member.name, 'avatar')).join('')}</div>
          <div class="group-mini-main"><strong>${escapeHTML(group.name)}</strong><span>${group.members.length} member${group.members.length===1?'':'s'} · ${count} expense${count===1?'':'s'}</span></div>
          <div class="group-mini-amount"><strong class="${tone}">${amount ? formatMoney(amount) : '—'}</strong><span>${status}</span></div>
        </a>`;
    }).join('') : `<div class="dashboard-list-empty"><span>◎</span><div><strong>No groups yet</strong><p>Create your first shared space.</p></div></div>`;
  }

  const recentExpenses = [...expenses].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 5);
  const recentList = document.getElementById('recentExpensesList');
  if (!recentExpenses.length) {
    recentList.innerHTML = `<div class="dashboard-list-empty"><span>◫</span><div><strong>No expenses yet</strong><p>Your newest shared bills will appear here.</p></div></div>`;
  } else {
    recentList.innerHTML = recentExpenses.map((exp) => {
      const group = groups.find((g) => g.id === exp.groupId);
      const payer = group?.members.find((m) => m.id === exp.paidBy);
      const date = exp.date ? new Date(exp.date) : new Date(exp.createdAt);
      return `
        <a class="modern-list-item" href="expenses.html">
          <div class="modern-list-icon">${categoryEmoji(exp.category)}</div>
          <div class="modern-list-main">
            <strong>${escapeHTML(exp.description || 'Expense')}</strong>
            <span>${group ? escapeHTML(group.name) : 'Unknown group'} · ${payer ? escapeHTML(payer.name) : 'Unknown payer'}</span>
          </div>
          <div class="modern-list-side"><strong>${formatMoney(exp.amount)}</strong><span>${isNaN(date) ? '' : date.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></div>
        </a>
      `;
    }).join('');
  }

  const recentSettlements = [...settlements].sort((a, b) => new Date(b.settledAt) - new Date(a.settledAt)).slice(0, 5);
  const settleList = document.getElementById('recentSettlementsList');
  if (!recentSettlements.length) {
    settleList.innerHTML = `<div class="dashboard-list-empty"><span>↗</span><div><strong>No settlements yet</strong><p>Completed payments will appear here.</p></div></div>`;
  } else {
    settleList.innerHTML = recentSettlements.map((s) => {
      const group = groups.find((g) => g.id === s.groupId);
      const from = group?.members.find((m) => m.id === s.from);
      const to = group?.members.find((m) => m.id === s.to);
      const date = s.settledAt ? new Date(s.settledAt) : null;
      return `
        <a class="modern-list-item" href="settlement.html">
          <div class="modern-list-icon settlement-icon">↗</div>
          <div class="modern-list-main">
            <strong>${from ? escapeHTML(from.name) : 'Member'} → ${to ? escapeHTML(to.name) : 'Member'}</strong>
            <span>${group ? escapeHTML(group.name) : 'Unknown group'}</span>
          </div>
          <div class="modern-list-side"><strong class="amt-pos">${formatMoney(s.amount)}</strong><span>${date && !isNaN(date) ? date.toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : ''}</span></div>
        </a>
      `;
    }).join('');
  }

  document.getElementById('dashboardEmptyState').style.display = groups.length === 0 ? 'block' : 'none';
  document.getElementById('dashboardMainGrid').style.display = groups.length === 0 ? 'none' : 'block';

  document.getElementById('loadDemoBtn')?.addEventListener('click', () => {
    loadDemoData();
    showToast('success', 'Demo data loaded!');
    setTimeout(() => window.location.reload(), 500);
  });
}

/* ============================================================
   Activity page
   ============================================================ */
function initActivityPage() {
  const list = document.getElementById('activityList');
  if (!list) return;
  const groups = getGroups();
  const expenses = getExpenses();
  const settlements = getSettlements();
  const events = [];

  groups.forEach((group) => events.push({
    type: 'group', date: group.createdAt || '', icon: '👥', title: `Group created: ${group.name}`, sub: `${group.members.length} member${group.members.length === 1 ? '' : 's'}`
  }));
  expenses.forEach((expense) => {
    const group = groups.find((g) => g.id === expense.groupId);
    events.push({
      type: 'expense', date: expense.createdAt || expense.date || '', icon: categoryEmoji(expense.category),
      title: `Expense added: ${expense.description}`, sub: `${group ? group.name : 'Unknown group'} · ${formatMoney(expense.amount)}`
    });
  });
  settlements.forEach((settlement) => {
    const group = groups.find((g) => g.id === settlement.groupId);
    const from = group?.members.find((m) => m.id === settlement.from);
    const to = group?.members.find((m) => m.id === settlement.to);
    events.push({
      type: 'settlement', date: settlement.settledAt || '', icon: '🤝',
      title: `Settlement recorded`, sub: `${from?.name || 'Member'} → ${to?.name || 'Member'} · ${formatMoney(settlement.amount)}`
    });
  });

  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!events.length) {
    list.innerHTML = emptyStateHTML('🕘', 'No activity yet', 'Create a group or add an expense to start your activity timeline.', 'groups.html?new=1', 'Create Group');
    return;
  }
  list.innerHTML = events.map((event) => `
    <div class="activity-item">
      <div class="activity-icon">${event.icon}</div>
      <div class="activity-main"><strong>${escapeHTML(event.title)}</strong><span>${escapeHTML(event.sub)}</span></div>
      <time>${formatDate(event.date.slice(0,10))}</time>
    </div>
  `).join('');
}

/* ============================================================
   Profile page
   ============================================================ */
function initProfilePage() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  const profile = getProfile();
  const setupMode = new URLSearchParams(window.location.search).get('setup') === '1' || !hasProfile();
  const formHeading = document.querySelector('#profileForm')?.closest('.card')?.querySelector('.section-head h2');
  if (formHeading && setupMode) formHeading.textContent = 'Set up your local profile';

  const profileHeaderName = document.getElementById('profileDisplayName');
  const profileHeaderEmail = document.getElementById('profileDisplayEmail');
  if (setupMode) {
    profileHeaderName.textContent = 'Welcome to SplitSmart';
    profileHeaderEmail.textContent = 'Create your local profile to get started';
  }

  document.getElementById('profileNameInput').value = profile.name;
  document.getElementById('profileEmailInput').value = profile.email;
  document.getElementById('profileCurrencySelect').value = profile.currency;
  document.getElementById('profileAvatarBig').outerHTML = avatarHTML(profile.name, 'avatar-lg').replace('<div', '<div id="profileAvatarBig"');
  document.getElementById('profileDisplayName').textContent = profile.name;
  document.getElementById('profileDisplayEmail').textContent = profile.email;

  const darkSwitch = document.getElementById('darkModeSwitch');
  darkSwitch.checked = (document.documentElement.getAttribute('data-theme') === 'dark');
  darkSwitch.addEventListener('change', () => {
    applyTheme(darkSwitch.checked ? 'dark' : 'light');
    const p = getProfile();
    p.theme = darkSwitch.checked ? 'dark' : 'light';
    saveProfile(p);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const name = document.getElementById('profileNameInput').value.trim();
    const email = document.getElementById('profileEmailInput').value.trim();
    const currency = document.getElementById('profileCurrencySelect').value;
    const nameField = document.getElementById('profileNameInput').closest('.field');
    const emailField = document.getElementById('profileEmailInput').closest('.field');
    const currencyField = document.getElementById('profileCurrencySelect').closest('.field');

    if (!name) { setFieldError(nameField, 'Name cannot be empty'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError(emailField, 'Enter a valid email address');
      return;
    }

    if (currency !== profile.currency && hasAnyData()) {
      setFieldError(currencyField, 'Currency cannot be changed while ledger data exists. Clear the ledger first.');
      return;
    }

    const updated = { ...profile, name, email, currency };
    const groups = getGroups();
    const oldName = profile.name.trim().toLowerCase();
    const oldEmail = profile.email.trim().toLowerCase();
    const hadPreviousProfile = hasProfile();
    const nextGroups = hadPreviousProfile ? groups.map((group) => ({
      ...group,
      members: group.members.map((member) => {
        const memberName = String(member.name || '').trim().toLowerCase();
        const memberEmail = String(member.email || '').trim().toLowerCase();
        const isCurrentUser = (oldEmail && memberEmail === oldEmail) || (oldName && memberName === oldName);
        return isCurrentUser ? { ...member, name, email } : member;
      })
    })) : groups;

    saveGroups(nextGroups);
    saveProfile(updated);
    showToast('success', hadPreviousProfile ? 'Profile updated' : 'Profile created on this device');
    setTimeout(() => window.location.reload(), 500);
  });

  const storageSummary = getStorageSummary();
  document.getElementById('storageGroupCount')?.replaceChildren(document.createTextNode(storageSummary.groups));
  document.getElementById('storageExpenseCount')?.replaceChildren(document.createTextNode(storageSummary.expenses));
  document.getElementById('storageMemberCount')?.replaceChildren(document.createTextNode(storageSummary.members));
  document.getElementById('storageSettlementCount')?.replaceChildren(document.createTextNode(storageSummary.settlements));

  document.getElementById('exportBackupBtn')?.addEventListener('click', () => {
    const blob = new Blob([createBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `splitsmart-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('success', 'Backup exported successfully');
  });

  document.getElementById('importBackupInput')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);
        confirmAction({
          title: 'Import this backup?',
          message: 'The current local groups, expenses and settlements will be replaced by the backup file.',
          confirmLabel: 'Import Backup',
          danger: true,
          onConfirm: () => {
            try {
              restoreBackup(backup);
              showToast('success', 'Backup restored');
              setTimeout(() => window.location.reload(), 500);
            } catch (err) {
              showToast('error', err.message || 'Could not restore backup');
            }
          }
        });
      } catch (err) {
        showToast('error', 'The selected file is not valid JSON');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  });

  document.getElementById('resetDemoBtn')?.addEventListener('click', () => {
    confirmAction({
      title: 'Reset demo data?',
      message: 'This will reload the sample "Goa Trip 2026" group and expenses. Your other data stays untouched.',
      confirmLabel: 'Reset Demo Data',
      danger: false,
      onConfirm: () => {
        loadDemoData();
        showToast('success', 'Demo data reset');
        setTimeout(() => window.location.href = 'dashboard.html', 500);
      }
    });
  });

  document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
    confirmAction({
      title: 'Clear all data?',
      message: 'This permanently deletes every group, expense, and settlement stored in this browser. This cannot be undone.',
      confirmLabel: 'Clear Everything',
      onConfirm: () => {
        clearData();
        showToast('success', 'All data cleared');
        setTimeout(() => window.location.href = 'index.html', 600);
      }
    });
  });
}
