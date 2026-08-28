/* ============================================================
   enhancements.js — Phase 1 product polish
   Uses DOM, events, arrays, objects, map/filter/reduce/sort,
   template literals and LocalStorage. No backend/API required.
   ============================================================ */

const DASHBOARD_PREFS_KEY = 'splitsmart_dashboard_prefs';

function getDashboardPrefs() {
  const defaults = {
    hero: true, snapshot: true, charts: true, lists: true,
    stories: true, actions: true, insights: true, compact: false
  };
  const saved = getData(DASHBOARD_PREFS_KEY, {});
  return { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
}

function saveDashboardPrefs(prefs) {
  return saveData(DASHBOARD_PREFS_KEY, prefs);
}

function injectEnhancementStyles() {
  if (document.getElementById('phase1EnhancementStyles')) return;
  const style = document.createElement('style');
  style.id = 'phase1EnhancementStyles';
  style.textContent = `
    .phase1-fade-in{animation:ssFadeIn .55s var(--ease) both}
    .phase1-rise{animation:ssRise .6s var(--ease) both}
    .phase1-stagger>*{animation:ssRise .55s var(--ease) both}
    .phase1-stagger>*:nth-child(2){animation-delay:.05s}.phase1-stagger>*:nth-child(3){animation-delay:.1s}.phase1-stagger>*:nth-child(4){animation-delay:.15s}.phase1-stagger>*:nth-child(5){animation-delay:.2s}.phase1-stagger>*:nth-child(6){animation-delay:.25s}
    @keyframes ssFadeIn{from{opacity:0}to{opacity:1}}
    @keyframes ssRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    @keyframes ssPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
    .ss-search-trigger{min-width:260px;justify-content:flex-start;background:var(--card);border:1px solid var(--border);color:var(--text-muted);box-shadow:var(--shadow-sm)}
    .ss-search-trigger kbd{margin-left:auto;border:1px solid var(--border);background:var(--card-soft);border-radius:6px;padding:3px 6px;font-size:.65rem;color:var(--text-faint)}
    .ss-command-overlay{position:fixed;inset:0;background:rgba(8,10,18,.54);backdrop-filter:blur(8px);z-index:300;display:none;align-items:flex-start;justify-content:center;padding:10vh 18px}
    .ss-command-overlay.open{display:flex;animation:ssFadeIn .18s ease both}
    .ss-command{width:min(680px,100%);background:var(--card);border:1px solid var(--border);border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,.28);overflow:hidden}
    .ss-command-input{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--border)}
    .ss-command-input svg{width:20px;height:20px;color:var(--text-faint)}
    .ss-command-input input{border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;padding:0!important;font-size:1rem!important}
    .ss-command-results{max-height:55vh;overflow:auto;padding:8px}
    .ss-command-group{padding:8px 10px 5px;font-size:.64rem;font-weight:800;letter-spacing:.08em;color:var(--text-faint)}
    .ss-command-item{width:100%;display:flex;align-items:center;gap:12px;padding:12px 12px;border:0;background:transparent;color:var(--text);border-radius:12px;text-align:left;cursor:pointer}
    .ss-command-item:hover,.ss-command-item.selected{background:var(--accent-soft)}
    .ss-command-item .ss-command-icon{width:34px;height:34px;border-radius:10px;background:var(--card-soft);display:grid;place-items:center;flex:none}
    .ss-command-item strong{font-size:.8rem}.ss-command-item span{display:block;font-size:.68rem;color:var(--text-muted);margin-top:2px}
    .ss-command-empty{padding:28px;text-align:center;color:var(--text-muted);font-size:.82rem}
    .ss-quick-add{position:fixed;right:24px;bottom:24px;z-index:70;width:54px;height:54px;border-radius:18px;border:0;background:linear-gradient(135deg,var(--accent),#ff9b5a);color:#fff;font-size:1.45rem;box-shadow:0 16px 34px rgba(255,122,41,.32);cursor:pointer;transition:transform .2s var(--ease),box-shadow .2s var(--ease)}
    .ss-quick-add:hover{transform:translateY(-4px) rotate(2deg);box-shadow:0 20px 40px rgba(255,122,41,.4)}
    .ss-quick-menu{position:fixed;right:24px;bottom:88px;z-index:71;display:none;width:210px;padding:8px;background:var(--card);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-lg)}
    .ss-quick-menu.open{display:grid;gap:4px;animation:ssRise .2s var(--ease) both}
    .ss-quick-menu a{padding:11px 12px;border-radius:11px;font-size:.76rem;font-weight:700}.ss-quick-menu a:hover{background:var(--card-soft)}
    .ss-drawer-overlay{position:fixed;inset:0;background:rgba(8,10,18,.36);z-index:210;display:none}.ss-drawer-overlay.open{display:block}
    .ss-drawer{position:fixed;right:0;top:0;bottom:0;width:min(460px,100%);background:var(--card);z-index:211;box-shadow:-24px 0 60px rgba(0,0,0,.18);transform:translateX(100%);transition:transform .35s var(--ease);overflow:auto;padding:24px}.ss-drawer.open{transform:none}
    .ss-drawer-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:22px}.ss-drawer h2{font-size:1.2rem}.ss-detail-hero{padding:18px;border-radius:16px;background:linear-gradient(135deg,var(--accent-soft),var(--card-soft));margin-bottom:18px}.ss-detail-amount{font-family:var(--font-mono);font-size:1.9rem;display:block;margin-top:7px}.ss-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.ss-detail-box{padding:13px;border:1px solid var(--border);border-radius:13px}.ss-detail-box span{display:block;color:var(--text-faint);font-size:.65rem;margin-bottom:4px}.ss-detail-box strong{font-size:.78rem}
    .ss-split-list{display:grid;gap:7px;margin-top:10px}.ss-split-person{display:flex;align-items:center;gap:9px;padding:10px;border-radius:11px;background:var(--card-soft)}.ss-split-person>span{margin-left:auto;font-family:var(--font-mono);font-size:.72rem}
    .ss-customize{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border:1px solid var(--border);border-radius:999px;background:var(--card);font-size:.72rem;font-weight:700;color:var(--text);cursor:pointer}.ss-customize:hover{border-color:var(--accent);color:var(--accent)}
    .ss-widget-hidden{display:none!important}.ss-settings-list{display:grid;gap:8px;margin:12px 0 20px}.ss-setting-row{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px;border:1px solid var(--border);border-radius:13px}.ss-setting-row span{font-size:.76rem}.ss-setting-row small{display:block;color:var(--text-faint);font-size:.62rem;margin-top:2px}
    .ss-switch{position:relative;width:42px;height:24px;flex:none}.ss-switch input{opacity:0;width:0;height:0}.ss-slider{position:absolute;inset:0;border-radius:999px;background:var(--border);cursor:pointer;transition:.2s}.ss-slider:before{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 2px 6px rgba(0,0,0,.12)}.ss-switch input:checked+.ss-slider{background:var(--accent)}.ss-switch input:checked+.ss-slider:before{transform:translateX(18px)}
    .dashboard-page.ss-compact .card{border-radius:14px}.dashboard-page.ss-compact .editorial-hero{min-height:245px}.dashboard-page.ss-compact .snapshot-card,.dashboard-page.ss-compact .snapshot-stat{min-height:145px}
    .ss-review-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:16px;margin-bottom:18px}.ss-review-card{padding:24px}.ss-review-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}.ss-review-metric{padding:13px;border:1px solid var(--border);border-radius:13px}.ss-review-metric span{display:block;color:var(--text-faint);font-size:.63rem}.ss-review-metric strong{display:block;font-family:var(--font-mono);font-size:1rem;margin-top:5px}.ss-review-bars{display:grid;gap:10px;margin-top:15px}.ss-review-bar-top{display:flex;justify-content:space-between;font-size:.7rem;margin-bottom:5px}.ss-review-bar{height:8px;background:var(--card-soft);border-radius:99px;overflow:hidden}.ss-review-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),#ffb178);width:0;transition:width 1s var(--ease)}
    .ss-month-card{display:flex;justify-content:space-between;gap:18px;align-items:center;overflow:hidden;position:relative;background:linear-gradient(135deg,var(--card),color-mix(in srgb,var(--accent-soft) 35%,var(--card)))}.ss-month-card::after{content:"";position:absolute;width:180px;height:180px;border-radius:50%;right:-70px;top:-80px;background:var(--accent-soft)}.ss-month-illustration{width:150px;position:relative;z-index:1;transform:rotate(4deg);filter:drop-shadow(0 15px 20px rgba(0,0,0,.12))}
    .ss-timeline-filters{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.ss-filter-chip{border:1px solid var(--border);background:var(--card);color:var(--text-muted);padding:8px 12px;border-radius:999px;font-size:.7rem;cursor:pointer}.ss-filter-chip.active{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 35%,var(--border));color:var(--accent);font-weight:700}
    .ss-storage-meter{height:10px;border-radius:999px;background:var(--card-soft);overflow:hidden;margin:12px 0}.ss-storage-meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--green),var(--blue));border-radius:inherit;transition:width 1s var(--ease)}
    @media(max-width:760px){.ss-search-trigger{min-width:44px;width:44px;padding:10px;justify-content:center}.ss-search-trigger span{display:none}.ss-quick-add{right:16px;bottom:16px}.ss-quick-menu{right:16px;bottom:80px}.ss-drawer{padding:20px}.ss-review-grid{grid-template-columns:1fr}.ss-review-metrics{grid-template-columns:1fr}.ss-month-illustration{width:110px}.ss-customize{display:none}}
    @media(prefers-reduced-motion:reduce){.phase1-fade-in,.phase1-rise,.phase1-stagger>*{animation:none!important}.ss-quick-add,.ss-drawer{transition:none!important}.ss-review-bar i{transition:none!important}}
  `;
  document.head.appendChild(style);
}

function createCommandPalette() {
  if (document.getElementById('ssCommandOverlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'ss-command-overlay';
  overlay.id = 'ssCommandOverlay';
  overlay.innerHTML = `
    <div class="ss-command" role="dialog" aria-modal="true" aria-labelledby="ssCommandTitle">
      <div class="ss-command-input">
        <span aria-hidden="true">⌕</span>
        <input id="ssCommandInput" autocomplete="off" placeholder="Search expenses, groups, people…" aria-label="Search SplitSmart">
        <kbd>Esc</kbd>
      </div>
      <div class="ss-command-results" id="ssCommandResults"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCommandPalette(); });
  document.getElementById('ssCommandInput').addEventListener('input', (e) => renderCommandResults(e.target.value));
  document.getElementById('ssCommandInput').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCommandPalette();
    if (e.key === 'Enter') document.querySelector('.ss-command-item.selected')?.click();
  });
}

function openCommandPalette(initial = '') {
  createCommandPalette();
  const overlay = document.getElementById('ssCommandOverlay');
  const input = document.getElementById('ssCommandInput');
  overlay.classList.add('open');
  input.value = initial;
  renderCommandResults(initial);
  requestAnimationFrame(() => input.focus());
}
function closeCommandPalette() { document.getElementById('ssCommandOverlay')?.classList.remove('open'); }

function renderCommandResults(query = '') {
  const host = document.getElementById('ssCommandResults');
  if (!host) return;
  const q = query.trim().toLowerCase();
  const groups = getGroups();
  const expenses = getExpenses();
  const profile = getProfile();
  const people = groups.flatMap(g => g.members.map(m => ({ ...m, groupName: g.name })));
  const actions = [
    ['+','Add expense','Record a shared bill','expenses.html?add=1'],
    ['◎','Create group','Start a shared space','groups.html?new=1'],
    ['↗','Settle up','See your simplest payment path','settlement.html'],
    ['▥','Analytics','Explore spending patterns','analytics.html'],
    ['◷','Monthly review','Review your spending story','monthly-review.html'],
    ['⚙','Data center','Backup and manage local data','data.html']
  ];
  const filteredActions = actions.filter(a => !q || a.slice(1,3).join(' ').toLowerCase().includes(q));
  const expenseMatches = expenses.filter(e => {
    const group = groups.find(g => g.id === e.groupId);
    return !q || `${e.description} ${e.category} ${group?.name || ''}`.toLowerCase().includes(q);
  }).slice(0, 6);
  const groupMatches = groups.filter(g => !q || g.name.toLowerCase().includes(q)).slice(0, 5);
  const peopleMatches = people.filter(p => !q || `${p.name} ${p.email || ''} ${p.groupName}`.toLowerCase().includes(q)).slice(0, 5);
  const section = (title, rows) => rows.length ? `<div class="ss-command-group">${title}</div>${rows.join('')}` : '';
  const item = (icon, title, sub, href) => `<button class="ss-command-item" type="button" onclick="window.location.href='${href}'"><span class="ss-command-icon">${icon}</span><div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(sub)}</span></div></button>`;
  const html = [
    section('QUICK ACTIONS', filteredActions.map(a => item(a[0], a[1], a[2], a[3]))),
    section('EXPENSES', expenseMatches.map(e => item(categoryEmoji(e.category), e.description || 'Expense', `${formatMoney(e.amount)} · ${groups.find(g=>g.id===e.groupId)?.name || 'Unknown group'}`, `expenses.html?focus=${encodeURIComponent(e.id)}`))),
    section('GROUPS', groupMatches.map(g => item('◎', g.name, `${g.members.length} members · ${expenses.filter(e=>e.groupId===g.id).length} expenses`, `group-details.html?id=${encodeURIComponent(g.id)}`))),
    section('PEOPLE', peopleMatches.map(p => item('○', p.name, `${p.groupName}${p.email ? ` · ${p.email}` : ''}`, `groups.html`)))
  ].join('');
  host.innerHTML = html || `<div class="ss-command-empty">No results for “${escapeHTML(query)}”. Try a group, expense or person.</div>`;
  host.querySelector('.ss-command-item')?.classList.add('selected');
}

function createQuickAdd() {
  if (document.querySelector('.ss-quick-add')) return;
  const button = document.createElement('button');
  button.className = 'ss-quick-add';
  button.type = 'button';
  button.title = 'Quick add';
  button.setAttribute('aria-label', 'Quick add');
  button.textContent = '+';
  const menu = document.createElement('div');
  menu.className = 'ss-quick-menu';
  menu.innerHTML = `<a href="expenses.html?add=1">🧾 Add expense</a><a href="groups.html?new=1">👥 Create group</a><a href="settlement.html">↗ Settle up</a><a href="analytics.html">▥ View analytics</a>`;
  document.body.append(button, menu);
  button.addEventListener('click', () => menu.classList.toggle('open'));
  document.addEventListener('click', (e) => { if (!button.contains(e.target) && !menu.contains(e.target)) menu.classList.remove('open'); });
}

function wireTopbarEnhancements() {
  const topbar = document.getElementById('topbar');
  if (!topbar || topbar.dataset.enhanced) return;
  topbar.dataset.enhanced = '1';
  const actions = topbar.querySelector('.topbar-actions');
  if (!actions) return;
  const search = document.createElement('button');
  search.type = 'button';
  search.className = 'btn btn-sm ss-search-trigger';
  search.innerHTML = `<span>⌕ &nbsp; Search groups, expenses, people…</span><kbd>Ctrl K</kbd>`;
  search.addEventListener('click', () => openCommandPalette());
  actions.insertBefore(search, actions.firstChild);
}

function createCustomizeModal() {
  if (document.getElementById('ssCustomizeOverlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'ssCustomizeOverlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="ssCustomizeTitle">
    <div class="modal-head"><h3 id="ssCustomizeTitle">Customize dashboard</h3><button class="modal-close" type="button" aria-label="Close" data-close-customize>&times;</button></div>
    <p>Choose which sections you want to see. Your layout is saved only on this browser.</p>
    <div class="ss-settings-list" id="ssDashboardSettings"></div>
    <div class="modal-actions"><button class="btn btn-ghost" data-close-customize>Done</button></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-close-customize]')) closeModal('ssCustomizeOverlay'); });
}

function applyDashboardPrefs() {
  const root = document.querySelector('.dashboard-page');
  if (!root) return;
  const prefs = getDashboardPrefs();
  root.classList.toggle('ss-compact', !!prefs.compact);
  const selectors = {
    hero: '.editorial-hero', snapshot: '.editorial-snapshot-grid', charts: '.editorial-charts',
    lists: '.editorial-three-grid', stories: '.editorial-story-grid', actions: '.quick-actions-section', insights: '.dashboard-bottom-grid', 'monthly-review': '.ss-review-grid'
  };
  Object.entries(selectors).forEach(([key, selector]) => root.querySelector(selector)?.classList.toggle('ss-widget-hidden', !prefs[key]));
}

function openCustomizeDashboard() {
  createCustomizeModal();
  const host = document.getElementById('ssDashboardSettings');
  const prefs = getDashboardPrefs();
  const settings = [
    ['hero','Welcome banner','Show the dashboard introduction'],['snapshot','Balance snapshot','Show your current money position'],['charts','Charts','Show spending and category charts'],['lists','Recent activity','Show expenses, settlements and groups'],['stories','Insight cards','Show smart money and trip cards'],['actions','Quick actions','Show shortcuts for common tasks'],['insights','Insights','Show the smart insight footer'],['compact','Compact layout','Tighten card spacing']
  ];
  host.innerHTML = settings.map(([key,label,desc]) => `<label class="ss-setting-row"><span><b>${label}</b><small>${desc}</small></span><span class="ss-switch"><input type="checkbox" data-dashboard-pref="${key}" ${prefs[key] ? 'checked' : ''}><i class="ss-slider"></i></span></label>`).join('');
  host.querySelectorAll('[data-dashboard-pref]').forEach(input => input.addEventListener('change', () => {
    const next = getDashboardPrefs(); next[input.dataset.dashboardPref] = input.checked; saveDashboardPrefs(next); applyDashboardPrefs();
  }));
  openModal('ssCustomizeOverlay');
}

function addDashboardCustomizeButton() {
  const head = document.querySelector('.dashboard-page .editorial-hero-actions');
  if (!head || document.getElementById('dashboardCustomizeBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'dashboardCustomizeBtn'; btn.type = 'button'; btn.className = 'ss-customize'; btn.innerHTML = '⚙ Customize';
  btn.addEventListener('click', openCustomizeDashboard);
  head.appendChild(btn);
  applyDashboardPrefs();
}

function createExpenseDrawer() {
  if (document.getElementById('ssExpenseDrawerOverlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'ss-drawer-overlay'; overlay.id = 'ssExpenseDrawerOverlay';
  overlay.innerHTML = `<aside class="ss-drawer" id="ssExpenseDrawer" aria-label="Expense details"></aside>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeExpenseDrawer(); });
}
function closeExpenseDrawer(){ document.getElementById('ssExpenseDrawer')?.classList.remove('open'); document.getElementById('ssExpenseDrawerOverlay')?.classList.remove('open'); document.body.classList.remove('drawer-open'); }
function openExpenseDrawer(id){
  const expense = getExpenses().find(e => e.id === id); if (!expense) return;
  const group = getGroupById(expense.groupId); if (!group) return;
  const payer = group.members.find(m => m.id === expense.paidBy);
  createExpenseDrawer();
  const drawer = document.getElementById('ssExpenseDrawer');
  drawer.innerHTML = `<div class="ss-drawer-head"><div><span class="mini-label">EXPENSE DETAILS</span><h2>${escapeHTML(expense.description || 'Expense')}</h2><p>${escapeHTML(group.name)}</p></div><button class="modal-close" type="button" aria-label="Close" onclick="closeExpenseDrawer()">&times;</button></div>
    <div class="ss-detail-hero"><span class="mini-label">TOTAL</span><strong class="ss-detail-amount">${formatMoney(expense.amount)}</strong></div>
    <div class="ss-detail-grid"><div class="ss-detail-box"><span>Paid by</span><strong>${escapeHTML(payer?.name || 'Unknown')}</strong></div><div class="ss-detail-box"><span>Date</span><strong>${formatDate(expense.date)}</strong></div><div class="ss-detail-box"><span>Category</span><strong>${categoryEmoji(expense.category)} ${escapeHTML(expense.category)}</strong></div><div class="ss-detail-box"><span>Split method</span><strong>${escapeHTML(expense.splitType || 'equal')}</strong></div></div>
    <h3 style="font-size:.9rem;margin-top:22px">Who owes what</h3><div class="ss-split-list">${expense.splits.map(s => { const m=group.members.find(x=>x.id===s.memberId); return `<div class="ss-split-person">${avatarHTML(m?.name || 'Member','avatar-sm')}<strong>${escapeHTML(m?.name || 'Member')}</strong><span>${formatMoney(s.amount)}</span></div>`; }).join('')}</div>
    <div class="modal-actions" style="margin-top:22px"><button class="btn btn-ghost" onclick="duplicateExpense('${expense.id}');closeExpenseDrawer()">Duplicate</button><button class="btn btn-outline" onclick="editExpenseFromHistory('${expense.id}');closeExpenseDrawer()">Edit</button><button class="btn btn-danger" onclick="deleteExpenseFromHistory('${expense.id}');closeExpenseDrawer()">Delete</button></div>`;
  overlayOpen(drawer, overlay);
}
function overlayOpen(drawer, overlay){ overlay.classList.add('open'); requestAnimationFrame(()=>drawer.classList.add('open')); document.body.classList.add('drawer-open'); }

function enhanceExpenseRows(){
  const body = document.getElementById('expenseHistoryBody'); if (!body || body.dataset.enhanced) return;
  body.dataset.enhanced = '1';
  body.addEventListener('click', e => {
    const row = e.target.closest('tr[data-expense-id]');
    if (!row || e.target.closest('button,a')) return;
    openExpenseDrawer(row.dataset.expenseId);
  });
}

function createActivityFilters(){
  const list = document.getElementById('activityList'); if (!list || document.getElementById('activityFilters')) return;
  const wrap = document.createElement('div'); wrap.id='activityFilters'; wrap.className='ss-timeline-filters';
  wrap.innerHTML='<button class="ss-filter-chip active" data-activity-filter="all">All</button><button class="ss-filter-chip" data-activity-filter="expense">Expenses</button><button class="ss-filter-chip" data-activity-filter="group">Groups</button><button class="ss-filter-chip" data-activity-filter="settlement">Settlements</button>';
  list.parentNode.insertBefore(wrap, list);
  wrap.addEventListener('click', e=>{ const btn=e.target.closest('[data-activity-filter]'); if(!btn)return; wrap.querySelectorAll('.ss-filter-chip').forEach(x=>x.classList.remove('active'));btn.classList.add('active');filterActivity(btn.dataset.activityFilter); });
}
function filterActivity(type){
  document.querySelectorAll('#activityList .activity-item').forEach(item=>{
    let itemType=item.dataset.activityType;
    if(!itemType){
      const text=item.textContent.toLowerCase();
      itemType=text.includes('expense added')?'expense':text.includes('group created')?'group':text.includes('settlement')?'settlement':'other';
      item.dataset.activityType=itemType;
    }
    item.style.display=(type==='all'||itemType===type)?'grid':'none';
  });
}

function initDataCenter(){
  const root=document.getElementById('dataCenterRoot'); if(!root || root.dataset.enhanced)return; root.dataset.enhanced='1';
  const summary=getStorageSummary(); const data=JSON.stringify({groups:getGroups(),expenses:getExpenses(),settlements:getSettlements(),profile:getProfile()});
  const kb=(new Blob([data]).size/1024).toFixed(1); const max=5120; const pct=Math.min(100,(Number(kb)/max)*100);
  document.getElementById('dataStorageSize').textContent=`${kb} KB`; document.getElementById('dataStorageMeter').style.width=`${Math.max(2,pct)}%`;
  document.getElementById('dataLastSaved').textContent=getData('splitsmart_last_saved',null)?new Date(getData('splitsmart_last_saved')).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'No timestamp yet';
  ['dataGroupCount','dataExpenseCount','dataMemberCount','dataSettlementCount'].forEach((id,i)=>document.getElementById(id).textContent=[summary.groups,summary.expenses,summary.members,summary.settlements][i]);
  document.getElementById('dataExportBtn')?.addEventListener('click',()=>{ const blob=new Blob([createBackup()],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`splitsmart-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);showToast('success','Backup exported'); });
  document.getElementById('dataClearBtn')?.addEventListener('click',()=>{ confirmAction({title:'Clear all local data?',message:'This removes your profile, groups, expenses and settlements from this browser. Export a backup first if you need it later.',confirmLabel:'Clear Everything',onConfirm:()=>{clearData();window.location.href='index.html';}}); });
}

function initMonthlyReview(){
  const root=document.getElementById('monthlyReviewRoot'); if(!root)return;
  const expenses=getExpenses(); const groups=getGroups(); const now=new Date();
  const currentKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const current=expenses.filter(e=>{const d=new Date(e.date||e.createdAt);return !Number.isNaN(d.getTime())&&`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===currentKey;});
  const prevDate=new Date(now.getFullYear(),now.getMonth()-1,1); const prevKey=`${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
  const previous=expenses.filter(e=>{const d=new Date(e.date||e.createdAt);return !Number.isNaN(d.getTime())&&`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===prevKey;});
  const currentTotal=current.reduce((s,e)=>s+Number(e.amount||0),0); const previousTotal=previous.reduce((s,e)=>s+Number(e.amount||0),0); const delta=previousTotal?((currentTotal-previousTotal)/previousTotal)*100:0;
  document.getElementById('reviewMonthName').textContent=now.toLocaleDateString('en-IN',{month:'long',year:'numeric'});document.getElementById('reviewTotal').textContent=formatMoney(currentTotal);document.getElementById('reviewCount').textContent=current.length;document.getElementById('reviewAverage').textContent=formatMoney(current.length?currentTotal/current.length:0);
  const deltaEl=document.getElementById('reviewDelta');deltaEl.textContent=previousTotal?`${delta>=0?'↑':'↓'} ${Math.abs(delta).toFixed(0)}% vs last month`:'No previous-month baseline';deltaEl.className=delta>0?'review-up':delta<0?'review-down':'review-flat';
  const cats=current.reduce((a,e)=>(a[e.category||'Other']=(a[e.category||'Other']||0)+Number(e.amount||0),a),{});const catRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);const max=Math.max(1,...catRows.map(x=>x[1]));
  document.getElementById('reviewCategoryBars').innerHTML=catRows.length?catRows.map(([cat,amt])=>`<div><div class="ss-review-bar-top"><span>${categoryEmoji(cat)} ${escapeHTML(cat)}</span><strong>${formatMoney(amt)}</strong></div><div class="ss-review-bar"><i style="width:${(amt/max)*100}%"></i></div></div>`).join(''):'<p class="muted-note">Add expenses this month to build your review.</p>';
  const largest=[...current].sort((a,b)=>Number(b.amount)-Number(a.amount))[0];const largestGroup=largest?groups.find(g=>g.id===largest.groupId):null;document.getElementById('reviewLargest').textContent=largest?`${largest.description} · ${formatMoney(largest.amount)}`:'—';document.getElementById('reviewLargestSub').textContent=largestGroup?.name||'No expense yet';
  const settle=getSettlements().filter(s=>{const d=new Date(s.settledAt||s.createdAt);return !Number.isNaN(d.getTime())&&`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===currentKey;});document.getElementById('reviewSettlements').textContent=settle.length;
}

function initDashboardMonthlyReview(){
  if(!document.querySelector('.dashboard-page')) return;
  const expenses=getExpenses(); const now=new Date();
  const key=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const currentKey=key(now); const prev=new Date(now.getFullYear(),now.getMonth()-1,1); const prevKey=key(prev);
  const current=expenses.filter(e=>{const d=new Date(e.date||e.createdAt);return !Number.isNaN(d.getTime())&&key(d)===currentKey;});
  const previous=expenses.filter(e=>{const d=new Date(e.date||e.createdAt);return !Number.isNaN(d.getTime())&&key(d)===prevKey;});
  const total=current.reduce((s,e)=>s+Number(e.amount||0),0); const prevTotal=previous.reduce((s,e)=>s+Number(e.amount||0),0);
  const delta=prevTotal?((total-prevTotal)/prevTotal)*100:0;
  const totalEl=document.getElementById('dashReviewTotal'); const countEl=document.getElementById('dashReviewCount'); const deltaEl=document.getElementById('dashReviewDelta');
  if(totalEl)totalEl.textContent=formatMoney(total); if(countEl)countEl.textContent=current.length;
  if(deltaEl){deltaEl.textContent=prevTotal?`${delta>=0?'↑':'↓'} ${Math.abs(delta).toFixed(0)}%`:'—';deltaEl.className=delta>0?'review-up':delta<0?'review-down':'review-flat';}
  const cats=current.reduce((a,e)=>(a[e.category||'Other']=(a[e.category||'Other']||0)+Number(e.amount||0),a),{});
  const rows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,3); const max=Math.max(1,...rows.map(x=>x[1])); const host=document.getElementById('dashReviewBars');
  if(host)host.innerHTML=rows.length?rows.map(([cat,amt])=>`<div><div class="ss-review-bar-top"><span>${categoryEmoji(cat)} ${escapeHTML(cat)}</span><strong>${formatMoney(amt)}</strong></div><div class="ss-review-bar"><i style="width:${(amt/max)*100}%"></i></div></div>`).join(''):'<p class="muted-note">Add expenses this month to see your top categories.</p>';
}

function initGlobalEnhancements(){
  if(!document.querySelector('.app-shell')) return;
  injectEnhancementStyles(); wireTopbarEnhancements(); createQuickAdd();
  document.querySelector('.page-content')?.classList.add('phase1-fade-in');
  document.querySelectorAll('.card').forEach((el,i)=>{el.style.animationDelay=`${Math.min(i*35,300)}ms`;el.classList.add('phase1-rise');});
  if(document.querySelector('.dashboard-page')){addDashboardCustomizeButton();initDashboardMonthlyReview();}
  if(document.getElementById('expenseHistoryBody')){createExpenseDrawer();enhanceExpenseRows(); const params=new URLSearchParams(location.search); if(params.get('focus'))setTimeout(()=>openExpenseDrawer(params.get('focus')),250);}
  if(document.getElementById('activityList')){createActivityFilters();document.querySelectorAll('#activityList .activity-item').forEach(item=>{if(!item.dataset.activityType){const text=item.textContent.toLowerCase();item.dataset.activityType=text.includes('expense added')?'expense':text.includes('group created')?'group':text.includes('settlement')?'settlement':'other';}});}
  initDataCenter(); initMonthlyReview();
}

document.addEventListener('keydown',(e)=>{
  const tag=(e.target?.tagName||'').toLowerCase();
  const typing=['input','textarea','select'].includes(tag) || e.target?.isContentEditable;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommandPalette();return;}
  if(!typing && !e.ctrlKey && !e.metaKey && !e.altKey){
    if(e.key.toLowerCase()==='n'){window.location.href='expenses.html?add=1';return;}
    if(e.key.toLowerCase()==='g'){window.location.href='groups.html?new=1';return;}
    if(e.key.toLowerCase()==='s'){window.location.href='settlement.html';return;}
    if(e.key==='/'){e.preventDefault();openCommandPalette();return;}
  }
  if(e.key==='Escape'){closeCommandPalette();closeExpenseDrawer();document.querySelector('.ss-quick-menu')?.classList.remove('open');}
});
document.addEventListener('DOMContentLoaded',initGlobalEnhancements);
