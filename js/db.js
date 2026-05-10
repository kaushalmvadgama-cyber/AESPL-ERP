/* ===== AESPL Database — Dexie.js IndexedDB ===== */

const db = new Dexie('AESPLTracker');

db.version(1).stores({
  users: '++id, username, role',
  products: '++id, productCode, productName',
  bom_items: '++id, productId',
  parties: '++id, name, type',
  sales: '++id, date, month, year, productId, partyId',
  purchases: '++id, date, month, year, partyId',
  bank_accounts: '++id, bankName',
  bank_entries: '++id, bankAccountId, date, type',
  departments: '++id, name',
  ceo_commands: '++id, date, status',
  dispatch: '++id, saleId, date, status',
  gst_filings: '++id, month, year, type',
  audit_logs: '++id, date, userId, module',
  settings: '++id, key'
});

// Seed default data on first run
async function seedDefaults() {
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkAdd([
      { username: 'CEO', password: 'KAUSHALMVADGAMA', role: 'ceo', name: 'CEO Admin', createdAt: new Date().toISOString() },
      { username: 'sales', password: 'sales123', role: 'sales', name: 'Sales Manager', createdAt: new Date().toISOString() },
      { username: 'purchase', password: 'purchase123', role: 'purchase', name: 'Purchase Manager', createdAt: new Date().toISOString() },
      { username: 'finance', password: 'finance123', role: 'finance', name: 'Finance Manager', createdAt: new Date().toISOString() },
      { username: 'hr', password: 'hr123', role: 'hr', name: 'HR Manager', createdAt: new Date().toISOString() },
      { username: 'marketing', password: 'marketing123', role: 'marketing', name: 'Marketing Head', createdAt: new Date().toISOString() }
    ]);
  }

  const deptCount = await db.departments.count();
  if (deptCount === 0) {
    await db.departments.bulkAdd([
      { name: 'Sales', isDefault: true },
      { name: 'Purchase', isDefault: true },
      { name: 'Finance', isDefault: true },
      { name: 'HR', isDefault: true },
      { name: 'Marketing', isDefault: true },
      { name: 'Dispatch', isDefault: true }
    ]);
  }

  const bankCount = await db.bank_accounts.count();
  if (bankCount === 0) {
    await db.bank_accounts.add({ bankName: 'Cash-in-hand', accountNumber: 'CASH-001', ifsc: 'INTERNAL', balance: 0 });
  }
}

// Audit logger
async function logAudit(userId, action, module, details) {
  await db.audit_logs.add({
    date: new Date().toISOString(),
    userId,
    action,
    module,
    details: typeof details === 'string' ? details : JSON.stringify(details)
  });
}

// Make globally available
window.db = db;
window.seedDefaults = seedDefaults;
window.logAudit = logAudit;
