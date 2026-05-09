/* ===== Sales Page ===== */
if (!window.pageRenderers) window.pageRenderers = {};

window.pageRenderers.sales = async function(container) {
  const now = new Date();
  let selectedMonth = now.getMonth();
  let selectedYear = now.getFullYear();

  async function render() {
    const allSales = await db.sales.toArray();
    const monthSales = allSales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    const monthTotal = monthSales.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const products = await db.products.toArray();
    const parties = await db.parties.toArray();

    // Cumulative monthly data for FY
    const fyStart = selectedMonth >= 3 ? selectedYear : selectedYear - 1;
    const cumData = [];
    for (let m = 3; m < 15; m++) {
      const mo = m % 12;
      const yr = m < 12 ? fyStart : fyStart + 1;
      const mSales = allSales.filter(s => { const d = new Date(s.date); return d.getMonth() === mo && d.getFullYear() === yr; });
      const mTotal = mSales.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
      cumData.push({ month: MONTHS[mo], year: yr, total: mTotal, count: mSales.length });
    }

    const monthOpts = MONTHS.map((m, i) => `<option value="${i}" ${i === selectedMonth ? 'selected' : ''}>${m}</option>`).join('');
    const yearOpts = [selectedYear - 1, selectedYear, selectedYear + 1].map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');

    container.innerHTML = `
      <div class="fade-in">
        <div class="stats-grid">
          <div class="stat-card green"><div class="stat-icon">💰</div><div class="stat-value">${formatCurrency(monthTotal)}</div><div class="stat-label">${MONTHS[selectedMonth]} ${selectedYear} Sales</div></div>
          <div class="stat-card blue"><div class="stat-icon">📊</div><div class="stat-value">${monthSales.length}</div><div class="stat-label">Entries This Month</div></div>
          <div class="stat-card purple"><div class="stat-icon">💳</div><div class="stat-value">${monthSales.filter(s=>s.paymentStatus==='pending').length}</div><div class="stat-label">Unpaid</div></div>
        </div>

        <div class="card" style="margin-bottom:20px">
          <div class="card-header">
            <h3>📊 Monthly Sales Cumulative (FY ${fyStart}-${fyStart+1})</h3>
          </div>
          <div class="data-table-wrapper">
            <table class="data-table"><thead><tr>${cumData.map(d => `<th style="text-align:center">${d.month.substring(0,3)}</th>`).join('')}</tr></thead>
            <tbody><tr>${cumData.map(d => `<td style="text-align:center;font-weight:600;color:${d.total > 0 ? 'var(--success)' : 'var(--text-muted)'}">${d.total > 0 ? formatCurrency(d.total) : '-'}</td>`).join('')}</tr>
            <tr class="cumulative-row">${cumData.reduce((acc, d, i) => { const cum = (i > 0 ? acc.prev : 0) + d.total; acc.html += `<td style="text-align:center">${cum > 0 ? formatCurrency(cum) : '-'}</td>`; acc.prev = cum; return acc; }, {html:'',prev:0}).html}</tr>
            </tbody></table>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>💰 Sales Entries</h3>
            <div style="display:flex;gap:10px;align-items:center">
              <select class="form-select" id="sales-month" style="width:auto">${monthOpts}</select>
              <select class="form-select" id="sales-year" style="width:auto">${yearOpts}</select>
              <button class="btn btn-primary btn-sm" id="add-sale-btn">➕ Add Sale</button>
              <button class="btn btn-info btn-sm" id="export-sales-btn">📥 Export</button>
            </div>
          </div>
          <div class="data-table-wrapper">
            <table class="data-table" id="sales-table">
              <thead><tr><th>Date</th><th>Product Code</th><th>Product</th><th>Qty</th><th>CP</th><th>SP</th><th>Labour%</th><th>Labour₹</th><th>GST%</th><th>GST₹</th><th>Total</th><th>Party</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody id="sales-tbody">
                ${monthSales.length === 0 ? '<tr><td colspan="14" style="text-align:center;color:var(--text-muted);padding:40px">No sales entries for this month</td></tr>' : 
                monthSales.map(s => `<tr>
                  <td>${formatDate(s.date)}</td>
                  <td><span class="badge badge-purple">${s.productCode||'-'}</span></td>
                  <td>${s.productName||'-'}</td>
                  <td>${s.qty||0}</td>
                  <td>${formatCurrency(s.costPrice||0)}</td>
                  <td>${formatCurrency(s.sellingPrice||0)}</td>
                  <td>${s.labourPercent||0}%</td>
                  <td>${formatCurrency(s.labourAmount||0)}</td>
                  <td>${s.gstSlab||0}%</td>
                  <td>${formatCurrency(s.gstAmount||0)}</td>
                  <td style="font-weight:700;color:var(--success)">${formatCurrency(s.totalAmount||0)}</td>
                  <td>${s.partyName||'-'}</td>
                  <td><span class="badge ${s.paymentStatus==='paid'?'badge-success':'badge-warning'}">${s.paymentStatus||'pending'}</span></td>
                  <td class="actions-cell">
                    <button class="btn btn-sm btn-secondary" onclick="editSale(${s.id})">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSale(${s.id})">🗑️</button>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${monthSales.length > 0 ? `<div style="text-align:right;padding:14px;font-size:1.05rem;font-weight:700;color:var(--accent-hover);border-top:2px solid var(--accent)">Month Total: ${formatCurrency(monthTotal)}</div>` : ''}
        </div>
      </div>`;

    document.getElementById('sales-month').onchange = e => { selectedMonth = Number(e.target.value); render(); };
    document.getElementById('sales-year').onchange = e => { selectedYear = Number(e.target.value); render(); };
    document.getElementById('add-sale-btn').onclick = () => openSaleForm(null, products, parties, selectedMonth, selectedYear, render);
    document.getElementById('export-sales-btn').onclick = () => {
      if (monthSales.length === 0) { showToast('No data to export', 'warning'); return; }
      exportToExcel(monthSales.map(s => ({
        Date: formatDate(s.date), 'Product Code': s.productCode, Product: s.productName,
        Qty: s.qty, 'Cost Price': s.costPrice, 'Selling Price': s.sellingPrice,
        'Labour %': s.labourPercent, 'Labour ₹': s.labourAmount,
        'GST %': s.gstSlab, 'GST ₹': s.gstAmount, Total: s.totalAmount,
        Party: s.partyName, Status: s.paymentStatus
      })), 'Sales', `AESPL_Sales_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`);
      showToast('Sales exported');
    };
  }

  render();
};

async function openSaleForm(editId, products, parties, month, year, refreshFn) {
  let sale = { date: new Date().toISOString().split('T')[0], productId: '', qty: 1, paymentStatus: 'pending' };
  if (editId) { const s = await db.sales.get(editId); if (s) sale = s; }
  if (!products) products = await db.products.toArray();
  if (!parties) parties = await db.parties.toArray();

  const productOpts = `<option value="">-- Select Product --</option>` + products.map(p => `<option value="${p.id}" ${sale.productId == p.id ? 'selected' : ''}>${p.productCode} — ${p.productName}</option>`).join('');
  const partyOpts = `<option value="">-- Select Party --</option>` + parties.filter(p => p.type !== 'supplier').map(p => `<option value="${p.id}" ${sale.partyId == p.id ? 'selected' : ''}>${p.name}</option>`).join('');

  showModal(editId ? 'Edit Sale' : 'Add Sale Entry', `
    <div class="form-row">
      <div class="form-group"><label>Date</label><input type="date" class="form-input" id="sf-date" value="${dateToInput(sale.date)}"/></div>
      <div class="form-group"><label>Qty</label><input type="number" class="form-input" id="sf-qty" value="${sale.qty || 1}" min="1"/></div>
    </div>
    <div class="form-group"><label>Product</label><select class="form-select" id="sf-product">${productOpts}</select></div>
    <div id="sf-product-info" style="padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);margin-bottom:14px;font-size:0.85rem;color:var(--text-muted)">Select a product to see details</div>
    <div class="form-group"><label>Party (Customer)</label><select class="form-select" id="sf-party">${partyOpts}</select></div>
    <div class="form-row">
      <div class="form-group"><label>Payment Status</label><select class="form-select" id="sf-status">
        <option value="pending" ${sale.paymentStatus==='pending'?'selected':''}>Pending</option>
        <option value="paid" ${sale.paymentStatus==='paid'?'selected':''}>Paid</option>
      </select></div>
      <div class="form-group" id="sf-bank-group" style="display:${sale.paymentStatus==='paid'?'block':'none'}">
        <label>Payment Account</label>
        <select class="form-select" id="sf-bank"></select>
      </div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-success" id="sf-save">💾 Save</button>`);

  const bankSelect = document.getElementById('sf-bank');
  const accounts = await db.bank_accounts.toArray();
  bankSelect.innerHTML = accounts.map(a => `<option value="${a.id}">${a.bankName} (${formatCurrency(a.balance)})</option>`).join('');

  document.getElementById('sf-status').onchange = (e) => {
    document.getElementById('sf-bank-group').style.display = e.target.value === 'paid' ? 'block' : 'none';
  };

  function updateProductInfo() {
    const pId = Number(document.getElementById('sf-product').value);
    const p = products.find(x => x.id === pId);
    const infoEl = document.getElementById('sf-product-info');
    if (p) {
      const qty = Number(document.getElementById('sf-qty').value) || 1;
      const labourAmt = (p.costPrice || 0) * (p.labourPercent || 0) / 100 * qty;
      const subtotal = (p.sellingPrice || 0) * qty;
      const gstAmt = calcGST(subtotal, p.gstSlab);
      const total = subtotal + gstAmt;
      infoEl.innerHTML = `<div style="color:var(--text-primary)">
        CP: <strong>${formatCurrency(p.costPrice)}</strong> | SP: <strong>${formatCurrency(p.sellingPrice)}</strong> |
        Labour: <strong>${p.labourPercent||0}%</strong> = <strong>${formatCurrency(labourAmt)}</strong> |
        GST ${p.gstSlab||0}%: <strong>${formatCurrency(gstAmt)}</strong> |
        <span style="color:var(--success);font-weight:700">Total: ${formatCurrency(total)}</span>
      </div>`;
    } else {
      infoEl.textContent = 'Select a product to see details';
    }
  }

  document.getElementById('sf-product').onchange = updateProductInfo;
  document.getElementById('sf-qty').oninput = updateProductInfo;
  updateProductInfo();

  document.getElementById('sf-save').onclick = async () => {
    const pId = Number(document.getElementById('sf-product').value);
    const product = products.find(x => x.id === pId);
    if (!product) { showToast('Select a product', 'error'); return; }
    const date = document.getElementById('sf-date').value;
    if (!date) { showToast('Select a date', 'error'); return; }
    const qty = Number(document.getElementById('sf-qty').value) || 1;
    const partyId = Number(document.getElementById('sf-party').value) || null;
    const party = parties.find(x => x.id === partyId);
    const status = document.getElementById('sf-status').value;

    const labourAmt = (product.costPrice || 0) * (product.labourPercent || 0) / 100 * qty;
    const subtotal = (product.sellingPrice || 0) * qty;
    const gstAmt = calcGST(subtotal, product.gstSlab);
    const total = subtotal + gstAmt;
    const d = new Date(date);

    const data = {
      date, month: d.getMonth(), year: d.getFullYear(),
      productId: pId, productCode: product.productCode, productName: product.productName,
      qty, costPrice: product.costPrice || 0, sellingPrice: product.sellingPrice || 0,
      labourPercent: product.labourPercent || 0, labourAmount: labourAmt,
      gstSlab: product.gstSlab || 0, gstAmount: gstAmt, totalAmount: total,
      partyId, partyName: party?.name || '', paymentStatus: status
    };

    if (editId) {
      await db.sales.update(editId, data);
      logAudit(state.currentUser.id, 'UPDATE', 'sales', `Updated sale #${editId}`);
    } else {
      const sId = await db.sales.add(data);
      if (status === 'paid') {
        const bankId = document.getElementById('sf-bank').value;
        await recordTransaction({
          bankAccountId: bankId,
          type: 'credit',
          amount: total,
          description: `Sale: ${product.productCode} (Ref: ${sId})`,
          partyId,
          partyName: party?.name,
          date
        });
      }
      logAudit(state.currentUser.id, 'CREATE', 'sales', `Added sale for ${product.productCode}`);
    }
    showToast(`Sale saved. ${status === 'paid' ? 'Balance updated.' : ''}`);
    closeModal();
    if (refreshFn) refreshFn(); else navigate('sales');
  };
}

window.editSale = async function(id) {
  const products = await db.products.toArray();
  const parties = await db.parties.toArray();
  openSaleForm(id, products, parties, null, null, () => navigate('sales'));
};

window.deleteSale = async function(id) {
  if (!confirm('Delete this sale entry?')) return;
  await db.sales.delete(id);
  logAudit(state.currentUser.id, 'DELETE', 'sales', `Deleted sale #${id}`);
  showToast('Sale deleted');
  navigate('sales');
};
