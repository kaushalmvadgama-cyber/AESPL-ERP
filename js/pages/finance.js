/* ===== Finance, GST, Ledger Pages ===== */
if (!window.pageRenderers) window.pageRenderers = {};

// ===== FINANCE =====
window.pageRenderers.finance = async function(container) {
  const sales = await db.sales.toArray();
  const purchases = await db.purchases.toArray();
  const totalSales = sales.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
  const totalPurchases = purchases.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
  const pendingSalesAmt = sales.filter(s => s.paymentStatus === 'pending').reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
  const pendingPurchAmt = purchases.filter(p => p.paymentStatus === 'pending').reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
  const departments = await db.departments.toArray();

  container.innerHTML = `
    <div class="fade-in">
      <div class="stats-grid">
        <div class="stat-card green"><div class="stat-icon">📈</div><div class="stat-value">${formatCurrency(totalSales)}</div><div class="stat-label">Total Revenue</div></div>
        <div class="stat-card orange"><div class="stat-icon">📉</div><div class="stat-value">${formatCurrency(totalPurchases)}</div><div class="stat-label">Total Expenses</div></div>
        <div class="stat-card purple"><div class="stat-icon">💰</div><div class="stat-value">${formatCurrency(totalSales - totalPurchases)}</div><div class="stat-label">Net Profit/Loss</div></div>
        <div class="stat-card red"><div class="stat-icon">⏳</div><div class="stat-value">${formatCurrency(pendingSalesAmt)}</div><div class="stat-label">Receivable (Unpaid Sales)</div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>⚠️ Pending Payments</h3></div>
          <h4 style="margin-bottom:10px;color:var(--warning)">Unpaid Sales (Receivable)</h4>
          <div class="data-table-wrapper">
            <table class="data-table"><thead><tr><th>Date</th><th>Party</th><th>Product</th><th>Amount</th></tr></thead>
            <tbody>${sales.filter(s=>s.paymentStatus==='pending').slice(-10).map(s => `<tr><td>${formatDate(s.date)}</td><td>${s.partyName||'-'}</td><td>${s.productName||'-'}</td><td style="color:var(--warning);font-weight:600">${formatCurrency(s.totalAmount)}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">All paid! 🎉</td></tr>'}</tbody></table>
          </div>
          <h4 style="margin:16px 0 10px;color:var(--danger)">Unpaid Purchases (Payable): ${formatCurrency(pendingPurchAmt)}</h4>
          <div class="data-table-wrapper">
            <table class="data-table"><thead><tr><th>Date</th><th>Party</th><th>Item</th><th>Amount</th></tr></thead>
            <tbody>${purchases.filter(p=>p.paymentStatus==='pending').slice(-10).map(p => `<tr><td>${formatDate(p.date)}</td><td>${p.partyName||'-'}</td><td>${p.itemName||'-'}</td><td style="color:var(--danger);font-weight:600">${formatCurrency(p.totalAmount)}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">All paid!</td></tr>'}</tbody></table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>🏢 Departments</h3><button class="btn btn-primary btn-sm" id="add-dept-btn">➕ Add</button></div>
          ${departments.map(d => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
            <span style="font-weight:600">${d.name}</span>
            ${d.isDefault ? '<span class="badge badge-info">Default</span>' : `<button class="btn btn-sm btn-danger" onclick="deleteDept(${d.id})">✕</button>`}
          </div>`).join('')}
        </div>
      </div>
    </div>`;

  document.getElementById('add-dept-btn').onclick = () => {
    showModal('Add Department', `<div class="form-group"><label>Department Name</label><input class="form-input" id="dept-name"/></div>`,
      `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="dept-save">Save</button>`);
    document.getElementById('dept-save').onclick = async () => {
      const name = document.getElementById('dept-name').value.trim();
      if (!name) { showToast('Enter name', 'error'); return; }
      await db.departments.add({ name, isDefault: false });
      showToast('Department added'); closeModal(); navigate('finance');
    };
  };
};

window.deleteDept = async id => { if (!confirm('Delete?')) return; await db.departments.delete(id); showToast('Deleted'); navigate('finance'); };

// ===== GST =====
window.pageRenderers.gst = async function(container) {
  const sales = await db.sales.toArray();
  const purchases = await db.purchases.toArray();
  const now = new Date();
  const cm = now.getMonth(), cy = now.getFullYear();

  // GST summary by slab
  const gstSummary = GST_SLABS.map(slab => {
    const sSales = sales.filter(s => s.gstSlab == slab);
    const sPurch = purchases.filter(p => p.gstSlab == slab);
    return {
      slab, salesCount: sSales.length, purchCount: sPurch.length,
      outputGST: sSales.reduce((s, r) => s + (Number(r.gstAmount) || 0), 0),
      inputGST: sPurch.reduce((s, r) => s + (Number(r.gstAmount) || 0), 0)
    };
  });

  const totalOutput = gstSummary.reduce((s, r) => s + r.outputGST, 0);
  const totalInput = gstSummary.reduce((s, r) => s + r.inputGST, 0);
  const netGST = totalOutput - totalInput;

  // Filing reminders
  const gstr1Due = new Date(cy, cm, 11);
  const gstr3bDue = new Date(cy, cm, 20);
  const gstr1Status = now > gstr1Due ? 'overdue' : 'upcoming';
  const gstr3bStatus = now > gstr3bDue ? 'overdue' : 'upcoming';

  container.innerHTML = `
    <div class="fade-in">
      <div class="stats-grid">
        <div class="stat-card green"><div class="stat-icon">📤</div><div class="stat-value">${formatCurrency(totalOutput)}</div><div class="stat-label">Output GST (Sales)</div></div>
        <div class="stat-card orange"><div class="stat-icon">📥</div><div class="stat-value">${formatCurrency(totalInput)}</div><div class="stat-label">Input GST (Purchase)</div></div>
        <div class="stat-card ${netGST >= 0 ? 'red' : 'blue'}"><div class="stat-icon">💰</div><div class="stat-value">${formatCurrency(Math.abs(netGST))}</div><div class="stat-label">${netGST >= 0 ? 'GST Payable' : 'GST Refundable'}</div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>📋 GST Slab Breakdown</h3></div>
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead><tr><th>GST Slab</th><th>Sales Txns</th><th>Output GST</th><th>Purchase Txns</th><th>Input GST</th><th>Net</th></tr></thead>
              <tbody>${gstSummary.map(g => `<tr>
                <td><span class="badge badge-purple">${g.slab}%</span></td>
                <td>${g.salesCount}</td><td style="color:var(--success)">${formatCurrency(g.outputGST)}</td>
                <td>${g.purchCount}</td><td style="color:var(--warning)">${formatCurrency(g.inputGST)}</td>
                <td style="font-weight:700;color:${(g.outputGST-g.inputGST)>=0?'var(--danger)':'var(--success)'}">${formatCurrency(g.outputGST - g.inputGST)}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>⏰ Filing Reminders</h3></div>
          <div class="command-card ${gstr1Status==='overdue'?'glow-border':''}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><h4>GSTR-1 (Outward Supplies)</h4><p style="color:var(--text-muted);font-size:0.82rem">Due: 11th ${MONTHS[cm]} ${cy}</p></div>
              <span class="badge ${gstr1Status==='overdue'?'badge-danger':'badge-warning'}">${gstr1Status}</span>
            </div>
          </div>
          <div class="command-card ${gstr3bStatus==='overdue'?'glow-border':''}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><h4>GSTR-3B (Summary Return)</h4><p style="color:var(--text-muted);font-size:0.82rem">Due: 20th ${MONTHS[cm]} ${cy}</p></div>
              <span class="badge ${gstr3bStatus==='overdue'?'badge-danger':'badge-warning'}">${gstr3bStatus}</span>
            </div>
          </div>
          <button class="btn btn-info btn-sm" style="margin-top:12px" onclick="exportToExcel([{Type:'GSTR-1',Due:'11th',Status:'${gstr1Status}'},{Type:'GSTR-3B',Due:'20th',Status:'${gstr3bStatus}'}],'GST_Filings','AESPL_GST_Filings.xlsx');showToast('Exported')">📥 Export GST Summary</button>
        </div>
      </div>
    </div>`;
};

// ===== LEDGER =====
window.pageRenderers.ledger = async function(container) {
  const parties = await db.parties.toArray();
  const products = await db.products.toArray();

  container.innerHTML = `
    <div class="fade-in">
      <div class="tabs">
        <button class="tab-btn active" id="tab-party">📒 Party-wise Ledger</button>
        <button class="tab-btn" id="tab-item">📦 Item-wise Ledger</button>
      </div>
      <div id="ledger-content"></div>
    </div>`;

  async function showPartyLedger() {
    document.getElementById('tab-party').classList.add('active');
    document.getElementById('tab-item').classList.remove('active');
    const content = document.getElementById('ledger-content');
    content.innerHTML = `
      <div class="card">
        <div class="form-group"><label>Select Party</label><select class="form-select" id="ledger-party"><option value="">-- Select --</option>${parties.map(p => `<option value="${p.id}">${p.name} (${p.type})</option>`).join('')}</select></div>
        <div id="ledger-party-data"></div>
      </div>`;

    document.getElementById('ledger-party').onchange = async e => {
      const pid = Number(e.target.value);
      if (!pid) { document.getElementById('ledger-party-data').innerHTML = ''; return; }
      const pSales = await db.sales.where('partyId').equals(pid).toArray();
      const pPurch = await db.purchases.where('partyId').equals(pid).toArray();
      const pBank = (await db.bank_entries.toArray()).filter(e => e.partyId === pid);
      const totalSales = pSales.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
      const totalPurch = pPurch.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
      const totalPaid = pBank.filter(e => e.type === 'credit').reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const totalReceived = pBank.filter(e => e.type === 'debit').reduce((s, r) => s + (Number(r.amount) || 0), 0);

      document.getElementById('ledger-party-data').innerHTML = `
        <div class="stats-grid" style="margin-top:16px">
          <div class="stat-card green"><div class="stat-value">${formatCurrency(totalSales)}</div><div class="stat-label">Total Sales</div></div>
          <div class="stat-card orange"><div class="stat-value">${formatCurrency(totalPurch)}</div><div class="stat-label">Total Purchases</div></div>
          <div class="stat-card blue"><div class="stat-value">${formatCurrency(totalPaid)}</div><div class="stat-label">Payments Received</div></div>
        </div>
        <h4 style="margin:16px 0 8px">Sales Transactions</h4>
        <div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${pSales.map(s => `<tr><td>${formatDate(s.date)}</td><td>${s.productName}</td><td>${s.qty}</td><td>${formatCurrency(s.totalAmount)}</td><td><span class="badge ${s.paymentStatus==='paid'?'badge-success':'badge-warning'}">${s.paymentStatus}</span></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No sales</td></tr>'}</tbody></table></div>
        <h4 style="margin:16px 0 8px">Purchase Transactions</h4>
        <div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${pPurch.map(p => `<tr><td>${formatDate(p.date)}</td><td>${p.itemName}</td><td>${p.qty}</td><td>${formatCurrency(p.totalAmount)}</td><td><span class="badge ${p.paymentStatus==='paid'?'badge-success':'badge-warning'}">${p.paymentStatus}</span></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No purchases</td></tr>'}</tbody></table></div>
        <button class="btn btn-info btn-sm" style="margin-top:12px" onclick="exportPartyLedger(${pid})">📥 Export Ledger</button>`;
    };
  }

  async function showItemLedger() {
    document.getElementById('tab-item').classList.add('active');
    document.getElementById('tab-party').classList.remove('active');
    const content = document.getElementById('ledger-content');
    content.innerHTML = `
      <div class="card">
        <div class="form-group"><label>Select Product</label><select class="form-select" id="ledger-product"><option value="">-- Select --</option>${products.map(p => `<option value="${p.id}">${p.productCode} — ${p.productName}</option>`).join('')}</select></div>
        <div id="ledger-product-data"></div>
      </div>`;

    document.getElementById('ledger-product').onchange = async e => {
      const pid = Number(e.target.value);
      if (!pid) return;
      const pSales = await db.sales.where('productId').equals(pid).toArray();
      const totalQty = pSales.reduce((s, r) => s + (Number(r.qty) || 0), 0);
      const totalAmt = pSales.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);

      document.getElementById('ledger-product-data').innerHTML = `
        <div class="stats-grid" style="margin-top:16px">
          <div class="stat-card blue"><div class="stat-value">${totalQty}</div><div class="stat-label">Total Qty Sold</div></div>
          <div class="stat-card green"><div class="stat-value">${formatCurrency(totalAmt)}</div><div class="stat-label">Total Revenue</div></div>
          <div class="stat-card purple"><div class="stat-value">${pSales.length}</div><div class="stat-label">Transactions</div></div>
        </div>
        <div class="data-table-wrapper" style="margin-top:16px"><table class="data-table"><thead><tr><th>Date</th><th>Party</th><th>Qty</th><th>SP</th><th>Total</th></tr></thead>
        <tbody>${pSales.map(s => `<tr><td>${formatDate(s.date)}</td><td>${s.partyName||'-'}</td><td>${s.qty}</td><td>${formatCurrency(s.sellingPrice)}</td><td>${formatCurrency(s.totalAmount)}</td></tr>`).join('')}</tbody></table></div>`;
    };
  }

  document.getElementById('tab-party').onclick = showPartyLedger;
  document.getElementById('tab-item').onclick = showItemLedger;
  showPartyLedger();
};

window.exportPartyLedger = async function(partyId) {
  const party = await db.parties.get(partyId);
  const sales = (await db.sales.where('partyId').equals(partyId).toArray()).map(s => ({ Type: 'Sale', Date: formatDate(s.date), Item: s.productName, Qty: s.qty, Amount: s.totalAmount, Status: s.paymentStatus }));
  const purch = (await db.purchases.where('partyId').equals(partyId).toArray()).map(p => ({ Type: 'Purchase', Date: formatDate(p.date), Item: p.itemName, Qty: p.qty, Amount: p.totalAmount, Status: p.paymentStatus }));
  exportToExcel([...sales, ...purch], 'Ledger', `AESPL_Ledger_${party?.name || 'party'}.xlsx`);
  showToast('Ledger exported');
};
