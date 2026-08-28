/* ============================================================
   phase1-plus.js — additional Phase 1 polish
   Intentionally excludes auth changes, backend, APIs and async
   product features. Uses only DOM, events, arrays, objects,
   higher-order methods, JSON and LocalStorage.
   ============================================================ */

(function () {
  const PLUS_CSS = `
    .ss-plus-toolbar{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:0 0 14px}
    .ss-plus-toolbar .search-box{flex:1;min-width:220px;position:relative;display:flex;align-items:center}.ss-plus-toolbar .search-box svg{position:absolute;left:13px;top:50%;width:17px;height:17px;min-width:17px;min-height:17px;max-width:17px;max-height:17px;transform:translateY(-50%);color:var(--text-faint);pointer-events:none}.ss-plus-toolbar .search-box input{width:100%;min-width:0;padding-left:40px}
    .ss-plus-date{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .ss-plus-date label{font-size:.66rem;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.06em}
    .ss-plus-date input{min-width:145px}
    .ss-plus-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
    .ss-plus-stat{padding:15px 16px;border:1px solid var(--border);border-radius:15px;background:linear-gradient(135deg,var(--card),var(--card-soft));position:relative;overflow:hidden}
    .ss-plus-stat::after{content:"";position:absolute;width:70px;height:70px;border-radius:50%;right:-30px;bottom:-35px;background:var(--accent-soft)}
    .ss-plus-stat span{display:block;font-size:.62rem;color:var(--text-faint);text-transform:uppercase;letter-spacing:.08em;font-weight:800}
    .ss-plus-stat strong{display:block;font-family:var(--font-mono);font-size:1.08rem;margin-top:6px;position:relative;z-index:1}
    .ss-plus-insight{padding:18px;border:1px solid var(--border);border-radius:16px;background:linear-gradient(135deg,var(--accent-soft),var(--card));margin-bottom:18px;display:flex;gap:14px;align-items:flex-start}
    .ss-plus-insight-mark{width:38px;height:38px;border-radius:12px;background:var(--card);display:grid;place-items:center;flex:none;box-shadow:var(--shadow-sm)}
    .ss-plus-insight h3{margin:2px 0 4px;font-size:.95rem}.ss-plus-insight p{margin:0;color:var(--text-muted);font-size:.73rem;line-height:1.6}
    .ss-plus-actions{display:flex;gap:7px;flex-wrap:wrap;margin-left:auto}
    .ss-plus-btn{border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:9px;padding:7px 10px;font-size:.68rem;font-weight:800;cursor:pointer}.ss-plus-btn:hover{border-color:var(--accent);color:var(--accent)}
    .ss-plus-table-row:hover{background:var(--card-soft)}
    .ss-plus-category-list{display:grid;gap:8px}.ss-plus-category-row{display:grid;grid-template-columns:150px 1fr 80px;gap:10px;align-items:center}.ss-plus-category-row .label{font-size:.7rem}.ss-plus-category-row .track{height:8px;background:var(--card-soft);border-radius:99px;overflow:hidden}.ss-plus-category-row .fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),#ffb178);width:0;transition:width .8s var(--ease)}.ss-plus-category-row .value{text-align:right;font-family:var(--font-mono);font-size:.68rem}
    .ss-plus-settlement-head{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:20px;border:1px solid var(--border);border-radius:18px;background:linear-gradient(135deg,var(--card),var(--card-soft));margin-bottom:18px}.ss-plus-settlement-side{text-align:center}.ss-plus-settlement-side span{display:block;color:var(--text-faint);font-size:.63rem;text-transform:uppercase;letter-spacing:.08em;font-weight:800}.ss-plus-settlement-side strong{display:block;font-family:var(--font-mono);font-size:1.4rem;margin-top:5px}.ss-plus-settlement-arrow{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-size:1.2rem}
    .ss-plus-member-click{cursor:pointer}.ss-plus-member-click:hover{transform:translateY(-2px);border-color:var(--accent)}
    .ss-plus-note{padding:12px 14px;border-radius:12px;background:var(--card-soft);color:var(--text-muted);font-size:.7rem;line-height:1.55;margin-top:12px}
    @media(max-width:900px){.ss-plus-summary{grid-template-columns:repeat(2,1fr)}.ss-plus-settlement-head{grid-template-columns:1fr}.ss-plus-settlement-arrow{margin:auto;transform:rotate(90deg)}}
    @media(max-width:560px){.ss-plus-summary{grid-template-columns:1fr}.ss-plus-category-row{grid-template-columns:105px 1fr 70px}.ss-plus-date{width:100%}.ss-plus-date input{flex:1;min-width:120px}}
    @media(prefers-reduced-motion:reduce){.ss-plus-category-row .fill{transition:none}.ss-plus-member-click{transition:none}}
  `;

  function injectCSS() {
    if (document.getElementById('phase1PlusStyles')) return;
    const style = document.createElement('style');
    style.id = 'phase1PlusStyles';
    style.textContent = PLUS_CSS;
    document.head.appendChild(style);
  }

  function parseDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function dateKey(value) {
    const d = parseDate(value);
    return d ? d.toISOString().slice(0, 10) : '';
  }

  function csvEscape(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  function initExpensePlus() {
    const tbody = document.getElementById('expenseHistoryBody');
    if (!tbody || document.getElementById('expensePlusToolbar')) return;

    const tableWrap = document.getElementById('expenseTableWrap');
    const filterBar = document.querySelector('.filter-bar');
    if (!filterBar) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'expensePlusToolbar';
    toolbar.className = 'ss-plus-toolbar';
    toolbar.innerHTML = `
      <div class="ss-plus-date">
        <label>From <input type="date" id="expenseFromDate" aria-label="Filter expenses from date"></label>
        <label>To <input type="date" id="expenseToDate" aria-label="Filter expenses to date"></label>
      </div>
      <button type="button" class="ss-plus-btn" id="clearExpenseFilters">Clear filters</button>
      <button type="button" class="ss-plus-btn" id="exportExpenseCsv">Export CSV</button>
    `;
    filterBar.parentNode.insertBefore(toolbar, filterBar.nextSibling);

    const summary = document.createElement('div');
    summary.id = 'expensePlusSummary';
    summary.className = 'ss-plus-summary';
    summary.innerHTML = `
      <div class="ss-plus-stat"><span>Showing</span><strong id="plusExpenseCount">0</strong></div>
      <div class="ss-plus-stat"><span>Filtered spend</span><strong id="plusExpenseTotal">₹0</strong></div>
      <div class="ss-plus-stat"><span>Largest bill</span><strong id="plusExpenseLargest">₹0</strong></div>
      <div class="ss-plus-stat"><span>Average bill</span><strong id="plusExpenseAverage">₹0</strong></div>
    `;
    toolbar.parentNode.insertBefore(summary, toolbar.nextSibling);

    function applyPlusFilter() {
      const from = document.getElementById('expenseFromDate').value;
      const to = document.getElementById('expenseToDate').value;
      let rows = getExpenses();
      if (from) rows = rows.filter(e => dateKey(e.date || e.createdAt) >= from);
      if (to) rows = rows.filter(e => dateKey(e.date || e.createdAt) <= to);

      const base = getExpenses();
      const visibleIds = new Set(rows.map(e => e.id));
      tbody.querySelectorAll('tr[data-expense-id]').forEach(tr => {
        tr.style.display = visibleIds.has(tr.dataset.expenseId) ? '' : 'none';
      });
      const total = rows.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const largest = Math.max(0, ...rows.map(e => Number(e.amount || 0)));
      document.getElementById('plusExpenseCount').textContent = rows.length;
      document.getElementById('plusExpenseTotal').textContent = formatMoney(total);
      document.getElementById('plusExpenseLargest').textContent = formatMoney(largest);
      document.getElementById('plusExpenseAverage').textContent = formatMoney(rows.length ? total / rows.length : 0);
      let noMatch = document.getElementById('plusNoDateMatch');
      if (!rows.length && base.length) {
        if (!noMatch) { noMatch = document.createElement('div'); noMatch.id = 'plusNoDateMatch'; noMatch.className = 'ss-plus-note'; tableWrap.parentNode.insertBefore(noMatch, tableWrap); }
        noMatch.textContent = 'No expenses fall inside the selected date range. Clear the dates to see the full ledger.';
        noMatch.style.display = 'block';
        tableWrap.style.display = 'none';
      } else {
        if (noMatch) noMatch.style.display = 'none';
        tableWrap.style.display = '';
      }
    }

    ['expenseFromDate', 'expenseToDate'].forEach(id => document.getElementById(id).addEventListener('change', applyPlusFilter));
    document.getElementById('clearExpenseFilters').addEventListener('click', () => {
      document.getElementById('expenseFromDate').value = '';
      document.getElementById('expenseToDate').value = '';
      const search = document.getElementById('expenseSearchInput');
      const group = document.getElementById('groupFilterSelect');
      const category = document.getElementById('categoryFilterSelect');
      const sort = document.getElementById('sortBySelect');
      if (search) search.value = '';
      if (group) group.value = 'all';
      if (category) category.value = 'all';
      if (sort) sort.value = 'date-desc';
      expenseFilterState = { search: '', groupId: 'all', category: 'all', sortBy: 'date-desc' };
      renderExpenseHistory();
      applyPlusFilter();
      showToast('info', 'Expense filters cleared');
    });
    document.getElementById('exportExpenseCsv').addEventListener('click', () => {
      const groups = getGroups();
      const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));
      const rows = getExpenses().map(e => [e.date || '', e.description || '', e.category || 'Other', groupMap[e.groupId] || 'Unknown', e.amount]);
      const csv = [['Date','Description','Category','Group','Amount'], ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
      downloadText(`splitsmart-expenses-${new Date().toISOString().slice(0,10)}.csv`, csv, 'text/csv;charset=utf-8');
      showToast('success', 'Expense CSV exported');
    });

    const observer = new MutationObserver(() => applyPlusFilter());
    observer.observe(tbody, { childList: true });
    applyPlusFilter();
  }

  function initAnalyticsPlus() {
    const root = document.getElementById('analyticsRoot');
    if (!root || document.getElementById('analyticsPlusInsight')) return;
    const anchor = document.getElementById('analyticsContent');
    if (!anchor) return;

    const insight = document.createElement('section');
    insight.id = 'analyticsPlusInsight';
    insight.className = 'ss-plus-insight';
    insight.innerHTML = `<div class="ss-plus-insight-mark">✦</div><div><span class="mini-label">RULE-BASED INSIGHT</span><h3 id="analyticsPlusInsightTitle">Your spending story</h3><p id="analyticsPlusInsightText">Add expenses to generate an insight from your local ledger.</p></div>`;
    anchor.insertBefore(insight, anchor.firstChild);

    function render() {
      const expenses = getExpenses();
      const title = document.getElementById('analyticsPlusInsightTitle');
      const text = document.getElementById('analyticsPlusInsightText');
      if (!expenses.length) return;
      const total = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
      const categories = expenses.reduce((a,e)=>{const k=e.category||'Other';a[k]=(a[k]||0)+Number(e.amount||0);return a;},{});
      const top = Object.entries(categories).sort((a,b)=>b[1]-a[1])[0];
      const largest = [...expenses].sort((a,b)=>Number(b.amount)-Number(a.amount))[0];
      const avg = total / expenses.length;
      title.textContent = top ? `${top[0]} leads your shared spending.` : 'Your spending story is taking shape.';
      text.textContent = `${formatMoney(top?.[1] || 0)} is in ${String(top?.[0] || 'Other').toLowerCase()}. Your average bill is ${formatMoney(avg)}, and your largest expense is ${largest ? `${largest.description} at ${formatMoney(largest.amount)}` : 'not available yet'}.`;
    }
    render();
  }

  function initGroupDetailsPlus() {
    const root = document.getElementById('groupDetailsRoot');
    const title = document.getElementById('groupTitle');
    if (!root || !title || document.getElementById('groupPlusPanel')) return;
    const group = getGroupById(getCurrentGroupId());
    if (!group) return;
    const expenses = getExpensesByGroup(group.id);
    const panel = document.createElement('section');
    panel.id = 'groupPlusPanel';
    panel.className = 'card card-pad';
    panel.style.margin = '18px 0';
    panel.innerHTML = `<div class="panel-head"><div><span class="mini-label">SPENDING MIX</span><h2>Where this group spends</h2></div><span class="badge badge-neutral">${expenses.length} expense${expenses.length===1?'':'s'}</span></div><div id="groupPlusCategories" class="ss-plus-category-list"></div>`;
    const membersHeading = root.querySelector('.section-head');
    root.insertBefore(panel, membersHeading || root.children[3]);
    const totals = expenses.reduce((a,e)=>{const k=e.category||'Other';a[k]=(a[k]||0)+Number(e.amount||0);return a;},{});
    const entries = Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const max = Math.max(1,...entries.map(x=>x[1]));
    document.getElementById('groupPlusCategories').innerHTML = entries.length ? entries.map(([cat,amt]) => `<div class="ss-plus-category-row"><span class="label">${categoryEmoji(cat)} ${escapeHTML(cat)}</span><div class="track"><div class="fill" style="width:${(amt/max)*100}%"></div></div><span class="value">${formatMoney(amt)}</span></div>`).join('') : '<p class="muted-note">Add expenses to see category patterns for this group.</p>';
  }

  function initSettlementPlus() {
    const body = document.getElementById('settlementBody');
    const select = document.getElementById('settlementGroupSelect');
    if (!body || !select || document.getElementById('settlementPlusHead')) return;
    function render() {
      const group = getGroupById(select.value);
      if (!group) return;
      const balances = calculateGroupBalances(group.id);
      const txns = optimizeSettlements(balances);
      const before = totalDebtBeforeOptimisation(balances);
      const pending = getSettlements().filter(s=>s.groupId===group.id && s.status==='settled').length;
      let head = document.getElementById('settlementPlusHead');
      if (!head) {
        head = document.createElement('div'); head.id='settlementPlusHead'; head.className='ss-plus-settlement-head';
        body.parentNode.insertBefore(head, body);
      }
      const possibleDirect = balances.filter(b=>Math.abs(Number(b.balance||0))>0.005).length;
      head.innerHTML = `<div class="ss-plus-settlement-side"><span>Total outstanding</span><strong>${formatMoney(before)}</strong></div><div class="ss-plus-settlement-arrow">→</div><div class="ss-plus-settlement-side"><span>Simplified payments</span><strong>${txns.length}</strong></div><div class="ss-plus-note" style="grid-column:1/-1;margin-top:0">SplitSmart matches debtors with creditors so the group can settle with fewer payment directions. ${possibleDirect ? `${possibleDirect} members currently have a non-zero balance.` : 'Everyone is currently balanced.'}</div>`;
    }
    select.addEventListener('change', render);
    render();
  }

  function initActivityPlus() {
    const list = document.getElementById('activityList');
    if (!list || document.getElementById('activityPlusSearch')) return;
    const wrap = document.createElement('div');
    wrap.id='activityPlusSearch'; wrap.className='ss-plus-toolbar';
    wrap.innerHTML=`<div class="search-box" style="flex:1;position:relative"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input id="activitySearchInput" placeholder="Search activity…" aria-label="Search activity"></div><button type="button" class="ss-plus-btn" id="clearActivitySearch">Clear</button>`;
    list.parentNode.insertBefore(wrap,list);
    const apply=()=>{const q=document.getElementById('activitySearchInput').value.trim().toLowerCase();list.querySelectorAll('.activity-item').forEach(item=>item.style.display=!q||item.textContent.toLowerCase().includes(q)?'grid':'none');};
    document.getElementById('activitySearchInput').addEventListener('input',apply); document.getElementById('clearActivitySearch').addEventListener('click',()=>{document.getElementById('activitySearchInput').value='';apply();});
  }


  function duplicateExpense(id) {
    const expense = getExpenses().find(e => e.id === id);
    if (!expense) return;
    const group = getGroupById(expense.groupId);
    if (!group) { showToast('error', 'The original expense group no longer exists.'); return; }
    openAddExpenseModal(null, expense.groupId);
    const desc = document.getElementById('expenseDescInput');
    const amount = document.getElementById('expenseAmountInput');
    const date = document.getElementById('expenseDateInput');
    const cat = document.getElementById('expenseCategorySelect');
    const payer = document.getElementById('expensePaidBySelect');
    if (desc) desc.value = `${expense.description || 'Expense'} (copy)`;
    if (amount) amount.value = expense.amount;
    if (date) date.value = expense.date || new Date().toISOString().slice(0,10);
    if (cat) cat.value = CATEGORIES.includes(expense.category) ? expense.category : 'Other';
    if (payer) payer.value = expense.paidBy || '';
    const radio = document.querySelector(`input[name="splitType"][value="${expense.splitType || 'equal'}"]`);
    if (radio) radio.checked = true;
    loadMembersForSplitSelection(group.id, expense);
    onSplitTypeChange(expense);
    showToast('info', 'Duplicate opened — review it before saving.');
  }

  function addDuplicateButtonToDrawer() {
    const drawer = document.getElementById('ssExpenseDrawer');
    if (!drawer || drawer.dataset.plusDuplicate) return;
    const actions = drawer.querySelector('.modal-actions');
    const expenseId = drawer.querySelector('[data-duplicate-expense-id]')?.dataset.duplicateExpenseId;
    if (!actions || !expenseId) return;
    const btn = document.createElement('button');
    btn.className='btn btn-ghost'; btn.type='button'; btn.textContent='Duplicate';
    btn.addEventListener('click',()=>{ closeExpenseDrawer(); duplicateExpense(expenseId); });
    actions.insertBefore(btn, actions.firstChild);
    drawer.dataset.plusDuplicate='1';
  }

  function enhanceExpenseDrawerWithDuplicate() {
    const original = window.openExpenseDrawer;
    if (typeof original !== 'function' || original.__plusWrapped) return;
    function wrapped(id) {
      original(id);
      const drawer = document.getElementById('ssExpenseDrawer');
      if (drawer) {
        const head = drawer.querySelector('.ss-drawer-head');
        if (head) {
          head.dataset.duplicateExpenseId = id;
          head.setAttribute('data-duplicate-expense-id', id);
        }
        const actions = drawer.querySelector('.modal-actions');
        if (actions && !actions.querySelector('.ss-duplicate-btn')) {
          const btn = document.createElement('button');
          btn.className='btn btn-ghost ss-duplicate-btn'; btn.type='button'; btn.textContent='Duplicate';
          btn.addEventListener('click',()=>{ closeExpenseDrawer(); duplicateExpense(id); });
          actions.insertBefore(btn, actions.firstChild);
        }
      }
    }
    wrapped.__plusWrapped=true;
    window.openExpenseDrawer=wrapped;
  }

  window.duplicateExpense = duplicateExpense;

  function initGroupsPlus() {
    const grid=document.getElementById('groupsGrid');
    if(!grid || document.getElementById('groupsPlusToolbar')) return;
    const head=grid.parentNode.querySelector('.section-head');
    if(!head) return;
    const toolbar=document.createElement('div'); toolbar.id='groupsPlusToolbar'; toolbar.className='ss-plus-toolbar';
    toolbar.innerHTML=`<div class="search-box" style="flex:1;min-width:230px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input id="groupSearchInput" placeholder="Search groups…" aria-label="Search groups"></div><select id="groupSortSelect" aria-label="Sort groups"><option value="recent">Recently created</option><option value="name">Name A–Z</option><option value="spend">Highest spend</option><option value="members">Most members</option></select>`;
    head.parentNode.insertBefore(toolbar,grid);
    const apply=()=>{
      const q=document.getElementById('groupSearchInput').value.trim().toLowerCase();
      const sort=document.getElementById('groupSortSelect').value;
      let groups=getGroups().filter(g=>`${g.name} ${g.description||''}`.toLowerCase().includes(q));
      groups=groups.map(g=>{const ex=getExpensesByGroup(g.id);return {...g,_spend:ex.reduce((s,e)=>s+Number(e.amount||0),0),_created:new Date(g.createdAt||0).getTime()};});
      groups.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='spend'?b._spend-a._spend:sort==='members'?b.members.length-a.members.length:b._created-a._created);
      const all=getGroups();
      grid.innerHTML=groups.map((group)=>{
        const expenses=getExpensesByGroup(group.id); const balances=calculateGroupBalances(group.id); const outstanding=balances.filter(b=>b.balance<0).reduce((s,b)=>s+Math.abs(b.balance),0);
        return `<div class="card card-hover group-card"><div class="gc-top"><div class="gc-icon">${iconForGroup(group.name)}</div><div class="gc-menu"><button class="icon-btn" data-dropdown-trigger style="width:34px;height:34px;">⋮</button><div class="dropdown-menu"><a href="group-details.html?id=${group.id}">👁 View details</a><button onclick="openCreateGroupModal('${group.id}')">✏️ Edit group</button><button class="danger" onclick="deleteGroup('${group.id}')">🗑 Delete group</button></div></div></div><div><h3>${escapeHTML(group.name)}</h3><p class="gc-desc">${escapeHTML(group.description||'No description')}</p></div><div class="gc-members">${group.members.slice(0,5).map(m=>avatarHTML(m.name,'avatar-sm')).join('')}${group.members.length>5?`<div class="avatar avatar-sm" style="background:var(--card-soft);color:var(--text-muted);">+${group.members.length-5}</div>`:''}</div><div class="gc-stats"><div class="gc-stat"><b>${group.members.length}</b><span>Members</span></div><div class="gc-stat"><b>${formatMoney(group._spend)}</b><span>Total spent</span></div><div class="gc-stat"><b class="${outstanding>0?'amt-neg':'amt-pos'}">${formatMoney(outstanding)}</b><span>Outstanding</span></div></div><a href="group-details.html?id=${group.id}" class="btn btn-outline btn-block">View Group</a></div>`;
      }).join('');
      if(!groups.length && all.length) grid.innerHTML=`<div class="ss-plus-note" style="grid-column:1/-1">No groups match “${escapeHTML(q)}”. Clear the search to see all groups.</div>`;
    };
    document.getElementById('groupSearchInput').addEventListener('input',apply); document.getElementById('groupSortSelect').addEventListener('change',apply);
  }

  function initGlobal() {
    injectCSS();
    initExpensePlus();
    initAnalyticsPlus();
    initGroupDetailsPlus();
    initSettlementPlus();
    initActivityPlus();
    initGroupsPlus();
    enhanceExpenseDrawerWithDuplicate();
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(initGlobal, 80));
})();
