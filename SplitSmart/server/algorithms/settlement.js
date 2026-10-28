/**
 * Settlement Optimization Algorithm for SplitSmart
 * Matches debtors and creditors using a two-pointer greedy approach.
 * Works entirely with integer cents internally to avoid IEEE-754 floating-point inaccuracies.
 */
function optimizeSettlements(balances) {
    if (!Array.isArray(balances) || balances.length === 0) {
        return [];
    }

    const debtors = [];
    const creditors = [];

    // Convert each member's net balance into integer cents
    for (const person of balances) {
        const cents = Math.round((Number(person.balance) + Number.EPSILON) * 100);

        if (cents < 0) {
            debtors.push({
                memberId: String(person.memberId),
                name: person.name || "Member",
                cents: Math.abs(cents)
            });
        } else if (cents > 0) {
            creditors.push({
                memberId: String(person.memberId),
                name: person.name || "Member",
                cents: cents
            });
        }
    }

    // Sort descending by amount to minimize the number of overall transactions
    debtors.sort((a, b) => b.cents - a.cents);
    creditors.sort((a, b) => b.cents - a.cents);

    const transactions = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const paymentCents = Math.min(debtors[i].cents, creditors[j].cents);

        if (paymentCents > 0) {
            transactions.push({
                from: debtors[i].memberId,
                fromName: debtors[i].name,
                to: creditors[j].memberId,
                toName: creditors[j].name,
                amount: Math.round(paymentCents) / 100
            });
        }

        debtors[i].cents -= paymentCents;
        creditors[j].cents -= paymentCents;

        if (debtors[i].cents === 0) {
            i++;
        }

        if (creditors[j].cents === 0) {
            j++;
        }
    }

    return transactions;
}

module.exports = optimizeSettlements;
