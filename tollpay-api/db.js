// In-memory seed data for the TollPay lab. No persistence needed.
const crypto = require('crypto');

// FLAG = md5("iloveyou"). Lives in the ADMIN-only settlement report.
const FLAG_MD5 = 'f25a2fc72690b780b2a14e140ef6a9e0';

const customers = [
  {
    accountId: '3000010007',
    serialNumber: 'TP.0003828095',
    username: 'toll-admin',
    password: 'Adm1n_T0llP4y!',          // admin victim; never needed by the student
    scope: 'ADMIN',
    firstName: 'Dana', lastName: 'Fleet',
    email: 'dana.fleet@tollpay.lab',
    address: '1200 Interstate Pkwy, Austin, TX 78701',
    plate: 'TP-ADMIN', state: 'TX',
    plan: 'POSTPAID',
    cards: [{ brand: 'VISA', last4: '4417', exp: '11/29' }],
  },
  {
    accountId: '3000053203',
    serialNumber: 'TP.0003828042',
    username: 'mrodriguez',
    password: 'Summer2026!',
    scope: 'EXTERNAL',
    firstName: 'Martin', lastName: 'Peralta',
    email: 'martin.peralta@example.com',
    address: '3638 Goosetown Drive, Asheville, NC 28806',
    plate: 'WFZ0004', state: 'TX',
    plan: 'POSTPAID',
    cards: [{ brand: 'MASTERCARD', last4: '8821', exp: '03/28' }],
  },
  {
    accountId: '2010231951',
    serialNumber: 'TP.0003828099',
    username: 'jbradley',
    password: 'Toll!2026pass',
    scope: 'EXTERNAL',
    firstName: 'Josh', lastName: 'Bradley',
    email: 'josh.bradley@example.com',
    address: '91 Maple Ave, Asheville, NC 28801',
    plate: 'GHK2213', state: 'NC',
    plan: 'PREPAID',
    cards: [{ brand: 'VISA', last4: '1099', exp: '07/27' }],
  },
];

// Stored comments/tasks (the stored-XSS sink). Seeded with one benign note.
const tasks = [
  { id: 1, author: 'toll-admin', title: 'Welcome moderators',
    body: 'Please keep the dispute queue tidy. Admin reviews this page hourly.' },
];

const tollUsage = {
  '3000053203': [
    { date: '2026-10-01', plaza: 'SH-130 Plaza 4', amount: 2.35 },
    { date: '2026-10-03', plaza: 'MoPac Express',   amount: 1.80 },
  ],
};

function findByUsername(u) { return customers.find(c => c.username === u); }
function findByAccountId(id) { return customers.find(c => String(c.accountId) === String(id)); }

module.exports = { FLAG_MD5, customers, tasks, tollUsage, findByUsername, findByAccountId };
