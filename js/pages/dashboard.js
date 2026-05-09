/* ===== Dashboard Page ===== */

if (!window.pageRenderers) window.pageRenderers = {};

window.pageRenderers.dashboard = async function(container) {
  const sales = await db.sales.toArray();
  const purchases = await db.purchases.toArray();
  const products = await db.products.toArray();
  const parties = await db.parties.toArray();
  const commands = await db.ceo_commands.where('status').equals('pending').toArray();
  const bankAccounts = await db.bank_accounts.toArray();

  const totalSales = sales.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
  const totalPurchases = purchases.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
  const totalBankBal = bankAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const profit = totalSales - totalPurchases;

  // Current month stats
  const now = new Date();
  const cm = now.getMonth(), cy = now.getFullYear();
  const cmSales = sales.filter(s => new Date(s.date).getMonth() === cm && new Date(s.date).getFullYear() === cy);
  const cmPurch = purchases.filter(p => new Date(p.date).getMonth() === cm && new Date(p.date).getFullYear() === cy);
  const cmSalesTotal = cmSales.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
  const cmPurchTotal = cmPurch.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);

  const role = state.currentUser.role;
  const isCEO = role === 'ceo';
  const isFinance = role === 'finance';
  const isSales = role === 'sales';
  const isPurch = role === 'purchase';

  container.innerHTML = `
    <div class="fade-in">
      <div class="stats-grid">
        ${isCEO || isFinance || isSales ? `
        <div class="stat-card purple">
          <div class="stat-icon">💰</div>
          <div class="stat-value">${formatCurrency(totalSales)}</div>
          <div class="stat-label">Total Sales</div>
          <div class="stat-change up">This Month: ${formatCurrency(cmSalesTotal)}</div>
        </div>` : ''}
        
        ${isCEO || isFinance || isPurch ? `
        <div class="stat-card orange">
          <div class="stat-icon">🛒</div>
          <div class="stat-value">${formatCurrency(totalPurchases)}</div>
          <div class="stat-label">Total Purchases</div>
          <div class="stat-change up">This Month: ${formatCurrency(cmPurchTotal)}</div>
        </div>` : ''}
        
        ${isCEO || isFinance ? `
        <div class="stat-card green">
          <div class="stat-icon">📈</div>
          <div class="stat-value">${formatCurrency(profit)}</div>
          <div class="stat-label">Net Profit</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon">🏧</div>
          <div class="stat-value">${formatCurrency(totalBankBal)}</div>
          <div class="stat-label">Bank Balance</div>
        </div>` : ''}
      </div>

      <div class="stats-grid">
        <div class="stat-card purple">
          <div class="stat-icon">📦</div>
          <div class="stat-value">${products.length}</div>
          <div class="stat-label">Products</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon">👥</div>
          <div class="stat-value">${parties.length}</div>
          <div class="stat-label">Party Name</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-icon">📢</div>
          <div class="stat-value">${commands.length}</div>
          <div class="stat-label">Pending Commands</div>
        </div>
        ${isCEO || isFinance || isSales ? `
        <div class="stat-card red">
          <div class="stat-icon">💳</div>
          <div class="stat-value">${sales.filter(s => s.paymentStatus === 'pending').length}</div>
          <div class="stat-label">Unpaid Invoices</div>
        </div>` : ''}
      </div>

      <div class="quick-actions">
        ${[
          { p: 'sales', i: '💰', l: 'New Sale' },
          { p: 'purchase', i: '🛒', l: 'New Purchase' },
          { p: 'products', i: '📦', l: 'Add Product' },
          { p: 'contacts', i: '👥', l: 'Add Party Name' },
          { p: 'commands', i: '📢', l: 'Send Command' },
          { p: 'reports', i: '📈', l: 'View Reports' }
        ].filter(a => hasAccess(role, a.p)).map(a => `
          <div class="quick-action" onclick="navigate('${a.p}')"><div class="qa-icon">${a.i}</div><div class="qa-label">${a.l}</div></div>
        `).join('')}
      </div>

      <div class="grid-2">
        ${isCEO || isFinance || isSales ? `
        <div class="card">
          <div class="card-header"><h3>📊 Recent Sales</h3></div>
          ${cmSales.length === 0 ? '<div class="empty-state"><p>No sales this month yet</p></div>' : `
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Product</th><th>Party</th><th>Amount</th></tr></thead>
              <tbody>${cmSales.slice(-5).reverse().map(s => `<tr><td>${formatDate(s.date)}</td><td>${s.productName||'-'}</td><td>${s.partyName||'-'}</td><td>${formatCurrency(s.totalAmount)}</td></tr>`).join('')}</tbody>
            </table>
          </div>`}
        </div>` : ''}
        
        ${isCEO || isFinance || isPurch ? `
        <div class="card">
          <div class="card-header"><h3>🛒 Recent Purchases</h3></div>
          ${cmPurch.length === 0 ? '<div class="empty-state"><p>No purchases this month yet</p></div>' : `
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Item</th><th>Party</th><th>Amount</th></tr></thead>
              <tbody>${cmPurch.slice(-5).reverse().map(p => `<tr><td>${formatDate(p.date)}</td><td>${p.itemName||'-'}</td><td>${p.partyName||'-'}</td><td>${formatCurrency(p.totalAmount)}</td></tr>`).join('')}</tbody>
            </table>
          </div>`}
        </div>` : ''}
      </div>
    </div>`;
};
