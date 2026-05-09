/* ===== Bank Management ===== */
if (!window.pageRenderers) window.pageRenderers = {};

window.pageRenderers.bank = async function(container) {
  const accounts = await db.bank_accounts.toArray();
  const entries = await db.bank_entries.toArray();
  const totalBal = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

  container.innerHTML = `
    <div class="fade-in">
      <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-icon">🏧</div><div class="stat-value">${formatCurrency(totalBal)}</div><div class="stat-label">Total Bank Balance</div></div>
        <div class="stat-card purple"><div class="stat-icon">🏦</div><div class="stat-value">${accounts.length}</div><div class="stat-label">Bank Accounts</div></div>
        <div class="stat-card green"><div class="stat-icon">📝</div><div class="stat-value">${entries.length}</div><div class="stat-label">Total Entries</div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>🏦 Bank Accounts</h3><button class="btn btn-primary btn-sm" id="add-bank-btn">➕ Add Account</button></div>
          ${accounts.length === 0 ? '<div class="empty-state"><p>No bank accounts added</p></div>' :
          accounts.map(a => `<div class="command-card">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><h4 style="font-weight:700">${a.bankName}</h4><p style="color:var(--text-muted);font-size:0.82rem">A/C: ${a.accountNumber} | IFSC: ${a.ifsc||'-'}</p></div>
              <div style="text-align:right"><div style="font-size:1.3rem;font-weight:800;color:var(--success)">${formatCurrency(a.balance)}</div>
                <div class="actions-cell" style="margin-top:6px"><button class="btn btn-sm btn-secondary" onclick="editBank(${a.id})">✏️</button><button class="btn btn-sm btn-danger" onclick="deleteBank(${a.id})">🗑️</button></div>
              </div>
            </div>
          </div>`).join('')}
        </div>
        <div class="card">
          <div class="card-header"><h3>📝 Bank Entries</h3><button class="btn btn-primary btn-sm" id="add-entry-btn">➕ Add Entry</button></div>
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Bank</th><th>Type</th><th>Amount</th><th>Description</th><th>Party</th><th></th></tr></thead>
              <tbody>${entries.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px">No entries</td></tr>' :
              entries.slice().reverse().slice(0, 20).map(e => {
                const acc = accounts.find(a => a.id === e.bankAccountId);
                return `<tr>
                  <td>${formatDate(e.date)}</td><td>${acc?.bankName||'-'}</td>
                  <td><span class="badge ${e.type==='credit'?'badge-success':'badge-danger'}">${e.type}</span></td>
                  <td style="font-weight:600;color:${e.type==='credit'?'var(--success)':'var(--danger)'}">${formatCurrency(e.amount)}</td>
                  <td>${e.description||'-'}</td><td>${e.partyName||'-'}</td>
                  <td><button class="btn btn-sm btn-danger" onclick="deleteBankEntry(${e.id})">🗑️</button></td>
                </tr>`;}).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('add-bank-btn').onclick = () => openBankForm();
  document.getElementById('add-entry-btn').onclick = () => openBankEntryForm(accounts);
};

async function openBankForm(editId) {
  let bank = { bankName: '', accountNumber: '', ifsc: '', balance: 0 };
  if (editId) { const b = await db.bank_accounts.get(editId); if (b) bank = b; }

  showModal(editId ? 'Edit Bank Account' : 'Add Bank Account', `
    <div class="form-group"><label>Bank Name</label><input class="form-input" id="bf-name" value="${bank.bankName}"/></div>
    <div class="form-row">
      <div class="form-group"><label>Account Number</label><input class="form-input" id="bf-acc" value="${bank.accountNumber}"/></div>
      <div class="form-group"><label>IFSC Code</label><input class="form-input" id="bf-ifsc" value="${bank.ifsc}"/></div>
    </div>
    <div class="form-group"><label>Opening Balance (₹)</label><input type="number" class="form-input" id="bf-bal" value="${bank.balance}" step="0.01"/></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="bf-save">💾 Save</button>`);

  document.getElementById('bf-save').onclick = async () => {
    const data = { bankName: document.getElementById('bf-name').value.trim(), accountNumber: document.getElementById('bf-acc').value.trim(), ifsc: document.getElementById('bf-ifsc').value.trim(), balance: Number(document.getElementById('bf-bal').value) || 0 };
    if (!data.bankName) { showToast('Bank name required', 'error'); return; }
    if (editId) { await db.bank_accounts.update(editId, data); showToast('Updated'); }
    else { await db.bank_accounts.add(data); showToast('Bank account added'); }
    logAudit(state.currentUser.id, editId?'UPDATE':'CREATE', 'bank', `${editId?'Updated':'Added'} bank: ${data.bankName}`);
    closeModal(); navigate('bank');
  };
}

async function openBankEntryForm(accounts) {
  if (!accounts) accounts = await db.bank_accounts.toArray();
  const parties = await db.parties.toArray();
  const accOpts = accounts.map(a => `<option value="${a.id}">${a.bankName} (${a.accountNumber})</option>`).join('');
  const partyOpts = `<option value="">-- None --</option>` + parties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  showModal('Add Bank Entry', `
    <div class="form-row">
      <div class="form-group"><label>Date</label><input type="date" class="form-input" id="be-date" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label>Type</label><select class="form-select" id="be-type"><option value="credit">Credit (Money In)</option><option value="debit">Debit (Money Out)</option></select></div>
    </div>
    <div class="form-group"><label>Bank Account</label><select class="form-select" id="be-bank">${accOpts}</select></div>
    <div class="form-row">
      <div class="form-group"><label>Amount (₹)</label><input type="number" class="form-input" id="be-amt" step="0.01"/></div>
      <div class="form-group"><label>Party</label><select class="form-select" id="be-party">${partyOpts}</select></div>
    </div>
    <div class="form-group"><label>Description</label><input class="form-input" id="be-desc" placeholder="Payment details"/></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="be-save">💾 Save</button>`);

  document.getElementById('be-save').onclick = async () => {
    const bankId = Number(document.getElementById('be-bank').value);
    const type = document.getElementById('be-type').value;
    const amount = Number(document.getElementById('be-amt').value) || 0;
    const partyId = Number(document.getElementById('be-party').value) || null;
    const party = parties.find(p => p.id === partyId);
    if (!amount) { showToast('Enter amount', 'error'); return; }

    await db.bank_entries.add({ bankAccountId: bankId, date: document.getElementById('be-date').value, type, amount, description: document.getElementById('be-desc').value, partyId, partyName: party?.name || '' });

    // Update balance
    const acc = await db.bank_accounts.get(bankId);
    const newBal = type === 'credit' ? (acc.balance || 0) + amount : (acc.balance || 0) - amount;
    await db.bank_accounts.update(bankId, { balance: newBal });
    logAudit(state.currentUser.id, 'CREATE', 'bank', `Bank ${type}: ${formatCurrency(amount)}`);
    showToast(`Entry added. New balance: ${formatCurrency(newBal)}`);
    closeModal(); navigate('bank');
  };
}

window.editBank = id => openBankForm(id);
window.deleteBank = async id => { if (!confirm('Delete bank account?')) return; await db.bank_accounts.delete(id); await db.bank_entries.where('bankAccountId').equals(id).delete(); showToast('Deleted'); navigate('bank'); };
window.deleteBankEntry = async id => {
  if (!confirm('Delete entry?')) return;
  const entry = await db.bank_entries.get(id);
  if (entry) {
    const acc = await db.bank_accounts.get(entry.bankAccountId);
    if (acc) { const newBal = entry.type === 'credit' ? acc.balance - entry.amount : acc.balance + entry.amount; await db.bank_accounts.update(acc.id, { balance: newBal }); }
  }
  await db.bank_entries.delete(id); showToast('Entry deleted'); navigate('bank');
};
