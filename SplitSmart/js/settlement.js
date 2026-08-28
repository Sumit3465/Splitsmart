/* ============================================================
   settlement.js
   - Balance calculation (paid vs owed vs net)
   - Greedy creditor/debtor settlement optimiser
   - Settlement page UI logic
   Phase 1 topics: loops, functions, arrays, reduce/sort, objects, DOM.
   ============================================================ */

function calculateGroupBalances(groupId) {
  const group = getGroupById(groupId);
  if (!group) return [];
  const expenses = getExpensesByGroup(groupId);

  const balances = group.members.map((member) => ({
    memberId: member.id,
    name: member.name,
    paid: 0,
    owed: 0,
    balance: 0
  }));

  const findBalance = (memberId) => balances.find((balance) => balance.memberId === memberId);

  for (const expense of expenses) {
    const payer = findBalance(expense.paidBy);
    if (payer) payer.paid += Number(expense.amount) || 0;

    for (const split of expense.splits) {
      const member = findBalance(split.memberId);
      if (member) member.owed += Number(split.amount) || 0;
    }
  }

  balances.forEach((balance) => {
    balance.paid = roundMoney(balance.paid);
    balance.owed = roundMoney(balance.owed);
    balance.balance = roundMoney(balance.paid - balance.owed);
  });

  return balances;
}

function getBalanceSignature(balances) {
  return balances
    .map((balance) => ({ memberId: balance.memberId, balance: roundMoney(balance.balance) }))
    .sort((a, b) => a.memberId.localeCompare(b.memberId))
    .map((item) => `${item.memberId}:${toCents(item.balance)}`)
    .join('|');
}

function optimizeSettlements(balances) {
  const EPS_CENTS = 1;

  const debtors = balances
    .filter((balance) => toCents(balance.balance) < -EPS_CENTS)
    .map((balance) => ({ id: balance.memberId, name: balance.name, cents: Math.abs(toCents(balance.balance)) }))
    .sort((a, b) => b.cents - a.cents);

  const creditors = balances
    .filter((balance) => toCents(balance.balance) > EPS_CENTS)
    .map((balance) => ({ id: balance.memberId, name: balance.name, cents: toCents(balance.balance) }))
    .sort((a, b) => b.cents - a.cents);

  const transactions = [];

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    const settledCents = Math.min(debtor.cents, creditor.cents);

    if (settledCents > 0) {
      transactions.push({
        from: debtor.id,
        fromName: debtor.name,
        to: creditor.id,
        toName: creditor.name,
        amount: fromCents(settledCents)
      });
    }

    debtor.cents -= settledCents;
    creditor.cents -= settledCents;

    if (debtor.cents <= EPS_CENTS - 1) debtors.shift();
    if (creditor.cents <= EPS_CENTS - 1) creditors.shift();
  }

  return transactions;
}

function totalDebtBeforeOptimisation(balances) {
  return fromCents(
    balances
      .filter((balance) => toCents(balance.balance) < 0)
      .reduce((sum, balance) => sum + Math.abs(toCents(balance.balance)), 0)
  );
}

function getPersonalSummary() {
  const profile = getProfile();
  const groups = getGroups();
  let youOwe = 0;
  let youAreOwed = 0;

  for (const group of groups) {
    const me = group.members.find((member) => memberMatchesProfile(member, profile));
    if (!me) continue;

    const balances = calculateGroupBalances(group.id);
    const myBalance = balances.find((balance) => balance.memberId === me.id);
    if (!myBalance) continue;

    if (myBalance.balance < 0) youOwe += Math.abs(myBalance.balance);
    else youAreOwed += myBalance.balance;
  }

  return {
    youOwe: roundMoney(youOwe),
    youAreOwed: roundMoney(youAreOwed)
  };
}

/* ============================================================
   Settlement page UI
   ============================================================ */
function initSettlementPage() {
  const select = document.getElementById('settlementGroupSelect');
  const body = document.getElementById('settlementBody');
  if (!select || !body) return;

  const groups = getGroups();
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('group');

  if (groups.length === 0) {
    select.closest('.card-pad').style.display = 'none';
    body.innerHTML = emptyStateHTML('🧮', 'No groups yet', 'Create a group and add expenses to generate a settlement plan.', 'groups.html', 'Create a Group');
    return;
  }

  select.innerHTML = groups.map((group) => `<option value="${group.id}">${escapeHTML(group.name)}</option>`).join('');
  if (preselect && groups.some((group) => group.id === preselect)) select.value = preselect;

  renderSettlement(select.value);
  select.addEventListener('change', () => renderSettlement(select.value));
}

function renderSettlement(groupId) {
  const body = document.getElementById('settlementBody');
  const group = getGroupById(groupId);
  if (!body || !group) return;

  const balances = calculateGroupBalances(groupId);
  const transactions = optimizeSettlements(balances);
  const balanceSignature = getBalanceSignature(balances);
  const settlements = getSettlements().filter((settlement) => settlement.groupId === groupId);
  const totalDebt = totalDebtBeforeOptimisation(balances);
  const totalExpenses = getExpensesByGroup(groupId).reduce((sum, expense) => sum + Number(expense.amount), 0);

  document.getElementById('settleTotalDebt').textContent = formatMoney(totalDebt);
  document.getElementById('settleTxnCount').textContent = transactions.length;
  document.getElementById('settleTotalExpense').textContent = formatMoney(totalExpenses);

  if (transactions.length === 0) {
    body.innerHTML = emptyStateHTML('🎉', 'All settled up!', `Everyone in ${escapeHTML(group.name)} is even — no payments needed.`);
    return;
  }

  body.innerHTML = transactions.map((transaction, index) => {
    const matchingSettlement = settlements.find((settlement) => (
      settlement.status === 'settled' &&
      settlement.balanceSignature === balanceSignature &&
      settlement.from === transaction.from &&
      settlement.to === transaction.to &&
      amountsEqual(settlement.amount, transaction.amount)
    ));
    const isSettled = Boolean(matchingSettlement);

    return `
      <div class="settle-flow-item ${isSettled ? 'settled' : ''}" data-idx="${index}">
        <div class="flow-person">
          ${avatarHTML(transaction.fromName, 'avatar-lg')}
          <span>${escapeHTML(transaction.fromName)}</span>
        </div>
        <div class="flow-arrow">
          <div class="line"></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          <div class="line"></div>
          <div class="amount-pill mono">${formatMoney(transaction.amount)}</div>
        </div>
        <div class="flow-person">
          ${avatarHTML(transaction.toName, 'avatar-lg')}
          <span>${escapeHTML(transaction.toName)}</span>
        </div>
        <div class="settle-action">
          ${isSettled
            ? '<span class="badge badge-green">✓ Settled</span>'
            : `<button class="btn btn-primary btn-sm" onclick="markAsSettled('${groupId}','${transaction.from}','${transaction.to}',${transaction.amount})">Mark as Settled</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function markAsSettled(groupId, from, to, amount) {
  const balances = calculateGroupBalances(groupId);
  const balanceSignature = getBalanceSignature(balances);
  const transactions = optimizeSettlements(balances);
  const stillValid = transactions.some((transaction) => (
    transaction.from === from &&
    transaction.to === to &&
    amountsEqual(transaction.amount, amount)
  ));

  if (!stillValid) {
    showToast('error', 'This settlement is no longer current. Recalculate the plan.');
    renderSettlement(groupId);
    return;
  }

  const settlements = getSettlements();
  const alreadySettled = settlements.some((settlement) => (
    settlement.groupId === groupId &&
    settlement.status === 'settled' &&
    settlement.balanceSignature === balanceSignature &&
    settlement.from === from &&
    settlement.to === to &&
    amountsEqual(settlement.amount, amount)
  ));

  if (alreadySettled) return;

  settlements.push({
    id: generateId('stl'),
    groupId,
    from,
    to,
    amount: roundMoney(amount),
    status: 'settled',
    balanceSignature,
    settledAt: new Date().toISOString()
  });
  saveSettlements(settlements);
  renderSettlement(groupId);
  showToast('success', `Marked ${formatMoney(amount)} payment as settled`);
}
