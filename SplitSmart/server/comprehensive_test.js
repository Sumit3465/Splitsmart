const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');

const User = require('./models/User');
const Group = require('./models/Group');
const Expense = require('./models/Expense');
const Settlement = require('./models/Settlement');
const optimizeSettlements = require('./algorithms/settlement');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'SplitSmart API is running', version: '2.0.0' });
});

app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({ message: err.message || 'Server error' });
});

let server;
const PORT = 5055;
const BASE = `http://127.0.0.1:${PORT}`;

function apiRequest(method, endpoint, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, BASE);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(url, { method, headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runComprehensiveSuite() {
    console.log('====================================================');
    console.log('   SPLITSMART PHASE 2 COMPREHENSIVE TEST SUITE      ');
    console.log('====================================================\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    function recordTest(desc, passed, details = '') {
        totalTests++;
        if (passed) {
            passedTests++;
            console.log(`[PASS] ${desc}`);
        } else {
            failedTests++;
            console.error(`[FAIL] ${desc} -> ${details}`);
        }
    }

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas.\n');

        // Start server
        await new Promise((resolve) => {
            server = app.listen(PORT, '127.0.0.1', () => {
                console.log(`Test server running on ${BASE}\n`);
                resolve();
            });
        });

        // ==================== PHASE 2: HEALTHCHECK ====================
        console.log('--- Testing Server Health & Startup ---');
        const rootRes = await apiRequest('GET', '/');
        recordTest('Server starts and GET / returns 200 with version', rootRes.status === 200 && rootRes.data.version === '2.0.0');

        // ==================== PHASE 4: AUTHENTICATION ====================
        console.log('\n--- Testing Authentication ---');
        const timestamp = Date.now();
        const vinayEmail = `vinay_${timestamp}@example.com`;
        const rahulEmail = `rahul_${timestamp}@example.com`;
        const amanEmail = `aman_${timestamp}@example.com`;

        // 1. Validation checks
        const emptyReg = await apiRequest('POST', '/api/auth/register', {});
        recordTest('Register rejects empty fields with 400', emptyReg.status === 400);

        const shortPass = await apiRequest('POST', '/api/auth/register', { name: 'Vinay', email: vinayEmail, password: '123' });
        recordTest('Register rejects passwords < 6 chars with 400', shortPass.status === 400);

        // 2. Register User 1 (Vinay)
        const reg1 = await apiRequest('POST', '/api/auth/register', { name: 'Vinay', email: vinayEmail, password: 'password123' });
        recordTest('User 1 (Vinay) registration succeeds with 201 and token', reg1.status === 201 && reg1.data.token && !reg1.data.password);
        const vinayToken = reg1.data.token;
        const vinayId = reg1.data._id;

        // Verify user exists in MongoDB
        const vinayInDb = await User.findById(vinayId);
        recordTest('User 1 (Vinay) verified saved in MongoDB with hashed password', vinayInDb && vinayInDb.password !== 'password123');

        // 3. Duplicate registration
        const dupReg = await apiRequest('POST', '/api/auth/register', { name: 'Vinay Dup', email: vinayEmail, password: 'password123' });
        recordTest('Duplicate email registration rejected with 409 Conflict', dupReg.status === 409);

        // 4. Bad login
        const badLogin = await apiRequest('POST', '/api/auth/login', { email: vinayEmail, password: 'wrong_password' });
        recordTest('Login with incorrect password rejected with 401', badLogin.status === 401);

        // 5. Valid login
        const goodLogin = await apiRequest('POST', '/api/auth/login', { email: vinayEmail, password: 'password123' });
        recordTest('Login with correct password returns 200 and token', goodLogin.status === 200 && goodLogin.data.token);

        // 6. Protected routes with & without token
        const noToken = await apiRequest('GET', '/api/auth/me');
        recordTest('Unauthenticated access to /api/auth/me rejected with 401', noToken.status === 401);

        const withToken = await apiRequest('GET', '/api/auth/me', null, vinayToken);
        recordTest('Authenticated access to /api/auth/me returns user profile', withToken.status === 200 && withToken.data.email === vinayEmail);

        // Register Rahul & Aman
        const reg2 = await apiRequest('POST', '/api/auth/register', { name: 'Rahul', email: rahulEmail, password: 'password123' });
        const rahulToken = reg2.data.token;
        const rahulId = reg2.data._id;

        const reg3 = await apiRequest('POST', '/api/auth/register', { name: 'Aman', email: amanEmail, password: 'password123' });
        const amanToken = reg3.data.token;
        const amanId = reg3.data._id;

        // ==================== PHASE 5: GROUP APIS ====================
        console.log('\n--- Testing Group APIs ---');
        // 1. Create Group with Vinay, Rahul
        const createGroupRes = await apiRequest('POST', '/api/groups', {
            name: 'College Goa Trip',
            description: 'Graduation vacation split ledger',
            members: [rahulId]
        }, vinayToken);
        recordTest('Create group returns 201 with populated members', createGroupRes.status === 201 && createGroupRes.data.members.length === 2);
        const groupId = createGroupRes.data._id;

        // Verify group stored in DB
        const groupInDb = await Group.findById(groupId);
        recordTest('Group verified saved in MongoDB with members', groupInDb && groupInDb.name === 'College Goa Trip');

        // 2. Retrieve Group by ID
        const getGroupRes = await apiRequest('GET', `/api/groups/${groupId}`, null, vinayToken);
        recordTest('Get group by ID returns 200', getGroupRes.status === 200 && getGroupRes.data.name === 'College Goa Trip');

        // 3. Update Group to add Aman
        const updateGroupRes = await apiRequest('PUT', `/api/groups/${groupId}`, {
            members: [vinayId, rahulId, amanId]
        }, vinayToken);
        recordTest('Update group to add Aman returns 200 with 3 members', updateGroupRes.status === 200 && updateGroupRes.data.members.length === 3);

        // 4. Invalid group ID handling
        const badGroupIdRes = await apiRequest('GET', '/api/groups/not_a_valid_mongo_id', null, vinayToken);
        recordTest('Malformed group ID returns 400 Bad Request', badGroupIdRes.status === 400);

        // 5. Unauthorized access test: create a 4th unrelated user and verify 403
        const reg4 = await apiRequest('POST', '/api/auth/register', { name: 'Stranger', email: `stranger_${timestamp}@example.com`, password: 'password123' });
        const strangerToken = reg4.data.token;
        const strangerId = reg4.data._id;

        const unauthGroupRes = await apiRequest('GET', `/api/groups/${groupId}`, null, strangerToken);
        recordTest('Non-member access to group rejected with 403 Forbidden', unauthGroupRes.status === 403);

        // ==================== PHASE 6: EXPENSE APIS ====================
        console.log('\n--- Testing Expense APIs ---');
        // Expense 1: 900 paid by Vinay, split among Vinay, Rahul, Aman
        const exp1Res = await apiRequest('POST', '/api/expenses', {
            group: groupId,
            description: 'Beach Shack Seafood Dinner',
            amount: 900,
            category: 'Food',
            paidBy: vinayId,
            participants: [vinayId, rahulId, amanId]
        }, vinayToken);
        recordTest('Create Expense 1 (₹900 by Vinay) returns 201', exp1Res.status === 201 && exp1Res.data.amount === 900);
        const exp1Id = exp1Res.data._id;

        // Verify Expense 1 in DB
        const exp1InDb = await Expense.findById(exp1Id);
        recordTest('Expense 1 verified saved in MongoDB with payer and participants', exp1InDb && exp1InDb.description === 'Beach Shack Seafood Dinner');

        // Expense 2: 600 paid by Rahul, split between Vinay and Rahul
        const exp2Res = await apiRequest('POST', '/api/expenses', {
            group: groupId,
            description: 'Scuba Diving Gear Rental',
            amount: 600,
            category: 'Entertainment',
            paidBy: rahulId,
            participants: [vinayId, rahulId]
        }, rahulToken);
        recordTest('Create Expense 2 (₹600 by Rahul) returns 201', exp2Res.status === 201 && exp2Res.data.amount === 600);
        const exp2Id = exp2Res.data._id;

        // Validation: negative amount
        const negExp = await apiRequest('POST', '/api/expenses', {
            group: groupId,
            description: 'Bad Expense',
            amount: -100
        }, vinayToken);
        recordTest('Expense with negative amount rejected with 400', negExp.status === 400);

        // Validation: malformed ID
        const badExpId = await apiRequest('GET', '/api/expenses/bad_id_123', null, vinayToken);
        recordTest('Malformed expense ID returns 400', badExpId.status === 400);

        // Retrieve group expenses
        const listExpRes = await apiRequest('GET', `/api/expenses?groupId=${groupId}`, null, vinayToken);
        recordTest('List group expenses returns 200 with 2 expenses', listExpRes.status === 200 && listExpRes.data.length === 2);

        // ==================== PHASE 7: BALANCE CALCULATION ====================
        console.log('\n--- Testing Balance Calculations ---');
        // Manual Math:
        // Expense 1: 900 / 3 = 300 each.
        // Vinay: +900 - 300 = +600. Rahul: -300. Aman: -300.
        // Expense 2: 600 / 2 = 300 each (Vinay & Rahul).
        // Vinay: -300. Rahul: +600 - 300 = +300. Aman: 0.
        // Net Balances:
        // Vinay: +600 - 300 = +300.
        // Rahul: -300 + 300 = 0.
        // Aman: -300 + 0 = -300.
        const balRes = await apiRequest('GET', `/api/groups/${groupId}/balances`, null, vinayToken);
        recordTest('GET /api/groups/:id/balances returns 200', balRes.status === 200);

        const vBal = balRes.data.balances.find(b => b.memberId === vinayId);
        const rBal = balRes.data.balances.find(b => b.memberId === rahulId);
        const aBal = balRes.data.balances.find(b => b.memberId === amanId);

        recordTest('Vinay balance exactly equals +₹300.00', vBal && vBal.balance === 300);
        recordTest('Rahul balance exactly equals ₹0.00', rBal && rBal.balance === 0);
        recordTest('Aman balance exactly equals -₹300.00', aBal && aBal.balance === -300);

        // Decimal amount test: Add a decimal expense 99.99 split 3 ways
        const decExp = await apiRequest('POST', '/api/expenses', {
            group: groupId,
            description: 'Snacks & Soda',
            amount: 99.99,
            category: 'Food',
            paidBy: vinayId,
            participants: [vinayId, rahulId, amanId]
        }, vinayToken);

        const decBalRes = await apiRequest('GET', `/api/groups/${groupId}/balances`, null, vinayToken);
        const sumBalances = decBalRes.data.balances.reduce((s, b) => s + b.balance, 0);
        recordTest('Decimal split sums to exactly 0 without floating-point error', Math.abs(sumBalances) < 0.0001);

        // Clean up decimal expense
        await apiRequest('DELETE', `/api/expenses/${decExp.data._id}`, null, vinayToken);

        // ==================== PHASE 8: SETTLEMENT ALGORITHM ====================
        console.log('\n--- Testing Settlement Algorithm ---');
        // Independent algorithm verification
        const algoTest1 = optimizeSettlements([
            { memberId: 'm1', name: 'A', balance: 600 },
            { memberId: 'm2', name: 'B', balance: -300 },
            { memberId: 'm3', name: 'C', balance: -300 }
        ]);
        recordTest('Algorithm matches 2 debtors to 1 creditor cleanly in 2 transactions', algoTest1.length === 2 && algoTest1[0].amount === 300);

        const algoTestSettled = optimizeSettlements([
            { memberId: 'm1', name: 'A', balance: 0 },
            { memberId: 'm2', name: 'B', balance: 0 }
        ]);
        recordTest('Algorithm returns empty array for already settled group', algoTestSettled.length === 0);

        // API settlement execution
        const settleRes = await apiRequest('POST', `/api/groups/${groupId}/settle`, {}, vinayToken);
        recordTest('POST /api/groups/:id/settle returns 200', settleRes.status === 200);
        recordTest('Minimized to exactly 1 transaction (Aman pays Vinay ₹300)', settleRes.data.transactions.length === 1);

        const tx = settleRes.data.transactions[0];
        recordTest('Transaction source is Aman', tx && tx.from === amanId);
        recordTest('Transaction destination is Vinay', tx && tx.to === vinayId);
        recordTest('Transaction amount is ₹300.00', tx && tx.amount === 300);

        // ==================== PHASE 9: SETTLEMENT PERSISTENCE ====================
        console.log('\n--- Testing Settlement Persistence ---');
        // 1. Verify in DB
        const savedSettlements = await Settlement.find({ group: groupId });
        recordTest('Settlement verified stored in MongoDB', savedSettlements.length === 1 && savedSettlements[0].amount === 300);

        // 2. Fetch via API
        const getSettlementsRes = await apiRequest('GET', `/api/groups/${groupId}/settlements`, null, vinayToken);
        recordTest('GET /api/groups/:id/settlements returns saved records with populated user names', 
            getSettlementsRes.status === 200 && getSettlementsRes.data.settlements.length === 1 && getSettlementsRes.data.settlements[0].from.name === 'Aman'
        );

        // 3. Restart server and query again
        if (server.closeAllConnections) server.closeAllConnections();
        await new Promise(r => server.close(r));
        await new Promise(r => setTimeout(r, 200));
        await new Promise(r => {
            server = app.listen(PORT, '127.0.0.1', r);
        });
        await new Promise(r => setTimeout(r, 200));

        const afterRestartRes = await apiRequest('GET', `/api/groups/${groupId}/settlements`, null, vinayToken);
        recordTest('Settlement persists and is retrievable after backend restart', 
            afterRestartRes.status === 200 && afterRestartRes.data.settlements.length === 1
        );

        // ==================== PHASE 10: ERROR HANDLING ====================
        console.log('\n--- Testing Comprehensive Error Handling ---');
        const badJwt = await apiRequest('GET', '/api/auth/me', null, 'malformed.token.value');
        recordTest('Invalid JWT returns 401', badJwt.status === 401);

        const nonExistentGroup = await apiRequest('GET', `/api/groups/${new mongoose.Types.ObjectId()}`, null, vinayToken);
        recordTest('Non-existent group ID returns 404', nonExistentGroup.status === 404);

        const nonExistentExp = await apiRequest('GET', `/api/expenses/${new mongoose.Types.ObjectId()}`, null, vinayToken);
        recordTest('Non-existent expense ID returns 404', nonExistentExp.status === 404);

        const badRoute = await apiRequest('GET', '/api/unknown_route_path');
        recordTest('Unknown route path returns 404 without crashing', badRoute.status === 404);

        // Clean up test data
        await Settlement.deleteMany({ group: groupId });
        await Expense.deleteMany({ group: groupId });
        await Group.findByIdAndDelete(groupId);
        await User.deleteMany({ _id: { $in: [vinayId, rahulId, amanId, strangerId] } });
        console.log('\nCleaned up all comprehensive test records.');

        console.log('\n====================================================');
        console.log(`TOTAL COMPREHENSIVE TESTS: ${totalTests}`);
        console.log(`PASSED: ${passedTests}`);
        console.log(`FAILED: ${failedTests}`);
        console.log('====================================================\n');

        if (failedTests > 0) process.exit(1);
        process.exit(0);

    } catch (err) {
        console.error('Fatal Test Suite Error:', err);
        process.exit(1);
    } finally {
        if (server) server.close();
        await mongoose.disconnect();
    }
}

runComprehensiveSuite();
