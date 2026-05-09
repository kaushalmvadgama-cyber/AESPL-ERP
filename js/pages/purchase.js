/* ===== Purchase Page ===== */
if (!window.pageRenderers) window.pageRenderers = {};

window.pageRenderers.purchase = async function(container) {
  const now = new Date();
  let selectedMonth = now.getMonth();
  let selectedYear = now.getFullYear();

  async function render() {
    const allPurchases = await db.purchases.toArray();
    const monthPurch = allPurchases.filter(p => { const d = new Date(p.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear; });
    const monthTotal = monthPurch.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const parties = await db.parties.toArray();

    const fyStart = selectedMonth >= 3 ? selectedYear : selectedYear - 1;
    const cumData = [];
    for (let m = 3; m < 15; m++) {
      const mo = m % 12; const yr = m < 12 ? fyStart : fyStart + 1;
      const mPurch = allPurchases.filter(p => { const d = new Date(p.date); return d.getMonth() === mo && d.getFullYear() === yr; });
      cumData.push({ month: MONTHS[mo], total: mPurch.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0) });
    }

    const monthOpts = MONTHS.map((m, i) => `<option value="${i}" ${i === selectedMonth ? 'selected' : ''}>${m}</option>`).join('');
    const yearOpts = [selectedYear - 1, selectedYear, selectedYear + 1].map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');

    container.innerHTML = `
      <div class="fade-in">
        <div class="stats-grid">
          <div class="stat-card orange"><div class="stat-icon">🛒</div><div class="stat-value">${formatCurrency(monthTotal)}</div><div class="stat-label">${MONTHS[selectedMonth]} ${selectedYear} Purchases</div></div>
          <div class="stat-card blue"><div class="stat-icon">📊</div><div class="stat-value">${monthPurch.length}</div><div class="stat-label">Entries This Month</div></div>
          <div class="stat-card red"><div class="stat-icon">💳</div><div class="stat-value">${monthPurch.filter(p=>p.paymentStatus==='pending').length}</div><div class="stat-label">Unpaid</div></div>
        </div>
        <div class="card" style="margin-bottom:20px">
          <div class="card-header"><h3>📊 Monthly Purchase Cumulative (FY ${fyStart}-${fyStart+1})</h3></div>
          <div class="data-table-wrapper">
            <table class="data-table"><thead><tr>${cumData.map(d => `<th style="text-align:center">${d.month.substring(0,3)}</th>`).join('')}</tr></thead>
            <tbody><tr>${cumData.map(d => `<td style="text-align:center;font-weight:600;color:${d.total > 0 ? 'var(--warning)' : 'var(--text-muted)'}">${d.total > 0 ? formatCurrency(d.total) : '-'}</td>`).join('')}</tr>
            <tr class="cumulative-row">${cumData.reduce((acc, d, i) => { const cum = (i > 0 ? acc.prev : 0) + d.total; acc.html += `<td style="text-align:center">${cum > 0 ? formatCurrency(cum) : '-'}</td>`; acc.prev = cum; return acc; }, {html:'',prev:0}).html}</tr>
            </tbody></table>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3>🛒 Purchase Entries</h3>
            <div style="display:flex;gap:10px;align-items:center">
              <select class="form-select" id="purch-month" style="width:auto">${monthOpts}</select>
              <select class="form-select" id="purch-year" style="width:auto">${yearOpts}</select>
              <button class="btn btn-primary btn-sm" id="add-purch-btn">➕ Add Purchase</button>
              <button class="btn btn-info btn-sm" id="export-purch-btn">📥 Export</button>
            </div>
          </div>
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Total</th><th>GST%</th><th>GST₹</th><th>Grand Total</th><th>Party</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${monthPurch.length === 0 ? '<tr><td colspan="12" style="text-align:center;color:var(--text-muted);padding:40px">No purchase entries for this month</td></tr>' :
                monthPurch.map(p => `<tr>
                  <td>${formatDate(p.date)}</td><td style="font-weight:600">${p.itemName||'-'}</td>
                  <td>${p.qty||0}</td><td>${p.unit||'-'}</td><td>${formatCurrency(p.rate||0)}</td>
                  <td>${formatCurrency(p.total||0)}</td><td>${p.gstSlab||0}%</td>
                  <td>${formatCurrency(p.gstAmount||0)}</td>
                  <td style="font-weight:700;color:var(--warning)">${formatCurrency(p.totalAmount||0)}</td>
                  <td>${p.partyName||'-'}</td>
                  <td><span class="badge ${p.paymentStatus==='paid'?'badge-success':'badge-warning'}">${p.paymentStatus||'pending'}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-sm btn-secondary" onclick="editPurchase(${p.id})">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deletePurchase(${p.id})">🗑️</button>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${monthPurch.length > 0 ? `<div style="text-align:right;padding:14px;font-weight:700;color:var(--accent-hover);border-top:2px solid var(--accent)">Month Total: ${formatCurrency(monthTotal)}</div>` : ''}
        </div>
      </div>`;

    document.getElementById('purch-month').onchange = e => { selectedMonth = Number(e.target.value); render(); };
    document.getElementById('purch-year').onchange = e => { selectedYear = Number(e.target.value); render(); };
    document.getElementById('add-purch-btn').onclick = () => openPurchaseForm(null, parties, render);
    document.getElementById('export-purch-btn').onclick = () => {
      if (monthPurch.length === 0) { showToast('No data', 'warning'); return; }
      exportToExcel(monthPurch.map(p => ({ Date: formatDate(p.date), Item: p.itemName, Qty: p.qty, Unit: p.unit, Rate: p.rate, Total: p.total, 'GST%': p.gstSlab, 'GST₹': p.gstAmount, 'Grand Total': p.totalAmount, Party: p.partyName, Status: p.paymentStatus })), 'Purchases', `AESPL_Purchases_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`);
      showToast('Purchases exported');
    };
  }
  render();
};

async function openPurchaseForm(editId, parties, refreshFn) {
  let purch = { date: new Date().toISOString().split('T')[0], itemName: '', qty: 1, unit: 'pcs', rate: 0, gstSlab: 18, paymentStatus: 'pending' };
  if (editId) { const p = await db.purchases.get(editId); if (p) purch = p; }
  if (!parties) parties = await db.parties.toArray();

  const unitOpts = UNITS.map(u => `<option ${purch.unit === u ? 'selected' : ''}>${u}</option>`).join('');
  const gstOpts = GST_SLABS.map(s => `<option value="${s}" ${purch.gstSlab == s ? 'selected' : ''}>${s}%</option>`).join('');
  const partyOpts = `<option value="">-- Select Supplier --</option>` + parties.filter(p => p.type !== 'customer').map(p => `<option value="${p.id}" ${purch.partyId == p.id ? 'selected' : ''}>${p.name}</option>`).join('');

  showModal(editId ? 'Edit Purchase' : 'Add Purchase', `
    <div class="form-row">
      <div class="form-group"><label>Date</label><input type="date" class="form-input" id="pf-date" value="${dateToInput(purch.date)}"/></div>
      <div class="form-group"><label>Item Name</label><input class="form-input" id="pf-item" value="${purch.itemName}" placeholder="Raw material / item"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Qty</label><input type="number" class="form-input" id="pf-qty" value="${purch.qty}" min="0"/></div>
      <div class="form-group"><label>Unit</label><select class="form-select" id="pf-unit">${unitOpts}</select></div>
      <div class="form-group"><label>Rate (₹)</label><input type="number" class="form-input" id="pf-rate" value="${purch.rate}" step="0.01"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>GST Slab</label><select class="form-select" id="pf-gst">${gstOpts}</select></div>
      <div class="form-group"><label>Party (Supplier)</label><select class="form-select" id="pf-party">${partyOpts}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Payment Status</label><select class="form-select" id="pf-status">
        <option value="pending" ${purch.paymentStatus==='pending'?'selected':''}>Pending</option>
        <option value="paid" ${purch.paymentStatus==='paid'?'selected':''}>Paid</option>
      </select></div>
      <div class="form-group" id="pf-bank-group" style="display:${purch.paymentStatus==='paid'?'block':'none'}">
        <label>Payment Account</label>
        <select class="form-select" id="pf-bank"></select>
      </div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-success" id="pf-save">💾 Save</button>`);

  const bankSelect = document.getElementById('pf-bank');
  const accounts = await db.bank_accounts.toArray();
  bankSelect.innerHTML = accounts.map(a => `<option value="${a.id}">${a.bankName} (${formatCurrency(a.balance)})</option>`).join('');

  document.getElementById('pf-status').onchange = (e) => {
    document.getElementById('pf-bank-group').style.display = e.target.value === 'paid' ? 'block' : 'none';
  };

  document.getElementById('pf-save').onclick = async () => {
    const date = document.getElementById('pf-date').value;
    const itemName = document.getElementById('pf-item').value.trim();
    if (!date || !itemName) { showToast('Date and Item required', 'error'); return; }
    const qty = Number(document.getElementById('pf-qty').value) || 0;
    const unit = document.getElementById('pf-unit').value;
    const rate = Number(document.getElementById('pf-rate').value) || 0;
    const gstSlab = Number(document.getElementById('pf-gst').value) || 0;
    const partyId = Number(document.getElementById('pf-party').value) || null;
    const party = parties.find(p => p.id === partyId);
    const status = document.getElementById('pf-status').value;
    const total = qty * rate;
    const gstAmount = calcGST(total, gstSlab);
    const totalAmount = total + gstAmount;
    const d = new Date(date);

    const data = { date, month: d.getMonth(), year: d.getFullYear(), itemName, qty, unit, rate, total, gstSlab, gstAmount, totalAmount, partyId, partyName: party?.name || '', paymentStatus: status };

    if (editId) {
      await db.purchases.update(editId, data);
      logAudit(state.currentUser.id, 'UPDATE', 'purchases', `Updated purchase #${editId}`);
    } else {
      const pId = await db.purchases.add(data);
      if (status === 'paid') {
        const bankId = document.getElementById('pf-bank').value;
        await recordTransaction({
          bankAccountId: bankId,
          type: 'debit',
          amount: totalAmount,
          description: `Purchase: ${itemName} (Ref: ${pId})`,
          partyId,
          partyName: party?.name,
          date
        });
      }
      logAudit(state.currentUser.id, 'CREATE', 'purchases', `Added purchase: ${itemName}`);
    }
    showToast(`Purchase saved. ${status === 'paid' ? 'Balance updated.' : ''}`);
    closeModal();
    if (refreshFn) refreshFn(); else navigate('purchase');
  };
}

window.editPurchase = async function(id) { openPurchaseForm(id, null, () => navigate('purchase')); };
window.deletePurchase = async function(id) {
  if (!confirm('Delete this purchase entry?')) return;
  await db.purchases.delete(id);
  logAudit(state.currentUser.id, 'DELETE', 'purchases', `Deleted purchase #${id}`);
  showToast('Purchase deleted');
  navigate('purchase');
};
