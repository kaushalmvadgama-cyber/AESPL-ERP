/* ===== Reports, Audit, HR, Marketing, BookOfMinds, Settings ===== */
if (!window.pageRenderers) window.pageRenderers = {};

// ===== REPORTS =====
window.pageRenderers.reports = async function(container) {
  const sales = await db.sales.toArray();
  const purchases = await db.purchases.toArray();
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  // Monthly data for chart
  const monthlyData = [];
  for (let m = 3; m < 15; m++) {
    const mo = m % 12; const yr = m < 12 ? fyStart : fyStart + 1;
    const mSales = sales.filter(s => { const d = new Date(s.date); return d.getMonth() === mo && d.getFullYear() === yr; });
    const mPurch = purchases.filter(p => { const d = new Date(p.date); return d.getMonth() === mo && d.getFullYear() === yr; });
    monthlyData.push({
      month: MONTHS[mo].substring(0, 3), year: yr,
      sales: mSales.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0),
      purchases: mPurch.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0)
    });
  }

  const maxVal = Math.max(...monthlyData.map(d => Math.max(d.sales, d.purchases)), 1);

  container.innerHTML = `
    <div class="fade-in">
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h3>📈 Monthly Sales vs Purchase (FY ${fyStart}-${fyStart+1})</h3></div>
        <div style="display:flex;align-items:flex-end;gap:8px;height:220px;padding:10px 0">
          ${monthlyData.map(d => {
            const sH = Math.max((d.sales / maxVal) * 180, 2);
            const pH = Math.max((d.purchases / maxVal) * 180, 2);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
              <div style="display:flex;gap:3px;align-items:flex-end;height:180px">
                <div style="width:14px;height:${sH}px;background:var(--gradient-3);border-radius:3px 3px 0 0" title="Sales: ${formatCurrency(d.sales)}"></div>
                <div style="width:14px;height:${pH}px;background:var(--gradient-4);border-radius:3px 3px 0 0" title="Purchase: ${formatCurrency(d.purchases)}"></div>
              </div>
              <span style="font-size:0.7rem;color:var(--text-muted)">${d.month}</span>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:20px;justify-content:center;margin-top:8px">
          <span style="display:flex;align-items:center;gap:6px;font-size:0.8rem"><span style="width:12px;height:12px;background:var(--success);border-radius:2px;display:inline-block"></span>Sales</span>
          <span style="display:flex;align-items:center;gap:6px;font-size:0.8rem"><span style="width:12px;height:12px;background:var(--warning);border-radius:2px;display:inline-block"></span>Purchase</span>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h3>📊 Monthly Growth Analysis</h3></div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead><tr><th>Month</th><th>Sales</th><th>Purchase</th><th>Profit</th><th>Sales Growth</th></tr></thead>
            <tbody>${monthlyData.map((d, i) => {
              const profit = d.sales - d.purchases;
              const prev = i > 0 ? monthlyData[i-1].sales : 0;
              const growth = prev > 0 ? ((d.sales - prev) / prev * 100).toFixed(1) : '-';
              return `<tr>
                <td>${d.month} ${d.year}</td>
                <td style="color:var(--success)">${formatCurrency(d.sales)}</td>
                <td style="color:var(--warning)">${formatCurrency(d.purchases)}</td>
                <td style="color:${profit>=0?'var(--success)':'var(--danger)'}; font-weight:700">${formatCurrency(profit)}</td>
                <td>${growth !== '-' ? `<span class="badge ${Number(growth)>=0?'badge-success':'badge-danger'}">${growth}%</span>` : '-'}</td>
              </tr>`;}).join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>📥 Export Reports</h3></div>
        <div class="quick-actions">
          <div class="quick-action" onclick="exportReport('sales')"><div class="qa-icon">💰</div><div class="qa-label">Sales Report</div></div>
          <div class="quick-action" onclick="exportReport('purchase')"><div class="qa-icon">🛒</div><div class="qa-label">Purchase Report</div></div>
          <div class="quick-action" onclick="exportReport('bank')"><div class="qa-icon">🏧</div><div class="qa-label">Bank Statement</div></div>
          <div class="quick-action" onclick="exportReport('gst')"><div class="qa-icon">📋</div><div class="qa-label">GST Summary</div></div>
          <div class="quick-action" onclick="exportReport('all')"><div class="qa-icon">📁</div><div class="qa-label">Complete Report</div></div>
        </div>
      </div>
    </div>`;
};

window.exportReport = async function(type) {
  if (type === 'sales' || type === 'all') {
    const data = (await db.sales.toArray()).map(s => ({ Date: formatDate(s.date), ProductCode: s.productCode, Product: s.productName, Qty: s.qty, CP: s.costPrice, SP: s.sellingPrice, GST: s.gstAmount, Total: s.totalAmount, Party: s.partyName, Status: s.paymentStatus }));
    exportToExcel(data, 'Sales', 'AESPL_Sales_Report.xlsx');
  }
  if (type === 'purchase' || type === 'all') {
    const data = (await db.purchases.toArray()).map(p => ({ Date: formatDate(p.date), Item: p.itemName, Qty: p.qty, Unit: p.unit, Rate: p.rate, Total: p.total, GST: p.gstAmount, GrandTotal: p.totalAmount, Party: p.partyName, Status: p.paymentStatus }));
    exportToExcel(data, 'Purchases', 'AESPL_Purchase_Report.xlsx');
  }
  if (type === 'bank' || type === 'all') {
    const data = (await db.bank_entries.toArray()).map(e => ({ Date: formatDate(e.date), Type: e.type, Amount: e.amount, Description: e.description, Party: e.partyName }));
    exportToExcel(data, 'Bank', 'AESPL_Bank_Statement.xlsx');
  }
  if (type === 'gst' || type === 'all') {
    const sales = await db.sales.toArray();
    const purch = await db.purchases.toArray();
    const data = GST_SLABS.map(slab => ({ Slab: slab+'%', OutputGST: sales.filter(s=>s.gstSlab==slab).reduce((s,r)=>s+(Number(r.gstAmount)||0),0), InputGST: purch.filter(p=>p.gstSlab==slab).reduce((s,r)=>s+(Number(r.gstAmount)||0),0) }));
    exportToExcel(data, 'GST', 'AESPL_GST_Summary.xlsx');
  }
  showToast('Report exported! 📥');
};

// ===== AUDIT =====
window.pageRenderers.audit = async function(container) {
  const logs = await db.audit_logs.toArray();
  const users = await db.users.toArray();

  container.innerHTML = `
    <div class="fade-in">
      <div class="toolbar">
        <input type="text" class="search-input" id="audit-search" placeholder="🔍 Search audit logs..." />
        <button class="btn btn-info btn-sm" onclick="exportAuditLogs()">📥 Export for CA</button>
      </div>
      <div class="card">
        <div class="card-header"><h3>🔍 Audit Trail (${logs.length} entries)</h3></div>
        <div class="data-table-wrapper" style="max-height:500px;overflow-y:auto">
          <table class="data-table">
            <thead><tr><th>Date & Time</th><th>User</th><th>Action</th><th>Module</th><th>Details</th></tr></thead>
            <tbody id="audit-tbody">${logs.slice().reverse().slice(0, 100).map(l => {
              const user = users.find(u => u.id === l.userId);
              return `<tr>
                <td style="white-space:nowrap">${new Date(l.date).toLocaleString('en-IN')}</td>
                <td><span class="badge badge-purple">${user?.name || 'System'}</span></td>
                <td><span class="badge ${l.action==='CREATE'?'badge-success':l.action==='DELETE'?'badge-danger':'badge-info'}">${l.action}</span></td>
                <td>${l.module}</td>
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis">${l.details||'-'}</td>
              </tr>`;}).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No audit logs yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  document.getElementById('audit-search').oninput = e => {
    const q = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#audit-tbody tr');
    rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  };
};

window.exportAuditLogs = async function() {
  const logs = await db.audit_logs.toArray();
  const users = await db.users.toArray();
  exportToExcel(logs.map(l => ({ DateTime: new Date(l.date).toLocaleString('en-IN'), User: users.find(u=>u.id===l.userId)?.name||'System', Action: l.action, Module: l.module, Details: l.details })), 'Audit', 'AESPL_Audit_Trail.xlsx');
  showToast('Audit trail exported');
};

// ===== HR =====
window.pageRenderers.hr = async function(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="stats-grid">
        <div class="stat-card purple"><div class="stat-icon">🧑‍💼</div><div class="stat-value">HR</div><div class="stat-label">Human Resources</div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>📄 Resume Screening</h3></div>
          <div class="empty-state"><div class="empty-icon">📋</div><p>Upload and screen resumes. Track candidate status through the hiring pipeline.</p>
          <p style="color:var(--text-muted);font-size:0.82rem">Feature ready — add resumes by using the notes section in Book of Minds</p></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>📅 Interview Scheduling</h3></div>
          <div class="empty-state"><div class="empty-icon">🗓️</div><p>Schedule and track interviews. Coordinate with departments via CEO Commands.</p>
          <p style="color:var(--text-muted);font-size:0.82rem">Use CEO Commands to assign interview tasks to departments</p></div>
        </div>
      </div>
    </div>`;
};

// ===== MARKETING =====
window.pageRenderers.marketing = async function(container) {
  container.innerHTML = `
    <div class="fade-in">
      <div class="stats-grid">
        <div class="stat-card orange"><div class="stat-icon">📣</div><div class="stat-value">Marketing</div><div class="stat-label">Content & Campaigns</div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>📝 Content Review</h3></div>
          <div class="empty-state"><div class="empty-icon">✍️</div><p>Review marketing content, social media posts, and campaign materials.</p>
          <p style="color:var(--text-muted);font-size:0.82rem">Track content tasks via CEO Commands module</p></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>🎯 Campaign Hooks</h3></div>
          <div class="empty-state"><div class="empty-icon">💡</div><p>Suggest and track marketing hooks, taglines, and campaign strategies.</p>
          <p style="color:var(--text-muted);font-size:0.82rem">Use Book of Minds to store campaign ideas</p></div>
        </div>
      </div>
    </div>`;
};

// ===== BOOK OF MINDS =====
window.pageRenderers.bookofminds = async function(container) {
  const products = await db.products.toArray();
  // Use settings table for notes
  let notes = [];
  try {
    const saved = await db.settings.where('key').equals('bookofminds_notes').first();
    if (saved) notes = JSON.parse(saved.value);
  } catch(e) {}

  container.innerHTML = `
    <div class="fade-in">
      <div class="toolbar">
        <input type="text" class="search-input" id="bom-search" placeholder="🔍 Search notes..." />
        <button class="btn btn-primary" id="add-note-btn">➕ Add Note</button>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>📦 Product Quick Reference</h3></div>
          <div class="data-table-wrapper" style="max-height:400px;overflow-y:auto">
            <table class="data-table"><thead><tr><th>Code</th><th>Name</th><th>CP</th><th>SP</th><th>Margin</th></tr></thead>
            <tbody>${products.map(p => `<tr><td><span class="badge badge-purple">${p.productCode}</span></td><td>${p.productName}</td><td>${formatCurrency(p.costPrice)}</td><td>${formatCurrency(p.sellingPrice)}</td><td style="color:${(p.margin||0)>=0?'var(--success)':'var(--danger)'}">${formatCurrency(p.margin)}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No products</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>📝 Notes & Ideas</h3></div>
          <div id="notes-list">
            ${notes.length === 0 ? '<div class="empty-state"><p>No notes yet. Add your first note!</p></div>' :
            notes.map((n, i) => `<div class="command-card">
              <div style="display:flex;justify-content:space-between"><div><h4>${n.title}</h4><p style="color:var(--text-secondary);margin-top:4px;white-space:pre-wrap">${n.content}</p>
              <span style="font-size:0.75rem;color:var(--text-muted)">${formatDate(n.date)}</span></div>
              <button class="btn btn-sm btn-danger" onclick="deleteNote(${i})">🗑️</button></div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('add-note-btn').onclick = () => {
    showModal('Add Note', `
      <div class="form-group"><label>Title</label><input class="form-input" id="note-title"/></div>
      <div class="form-group"><label>Content</label><textarea class="form-textarea" id="note-content" rows="5"></textarea></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="note-save">💾 Save</button>`);

    document.getElementById('note-save').onclick = async () => {
      const title = document.getElementById('note-title').value.trim();
      const content = document.getElementById('note-content').value.trim();
      if (!title) { showToast('Title required', 'error'); return; }
      notes.push({ title, content, date: new Date().toISOString() });
      const existing = await db.settings.where('key').equals('bookofminds_notes').first();
      if (existing) await db.settings.update(existing.id, { value: JSON.stringify(notes) });
      else await db.settings.add({ key: 'bookofminds_notes', value: JSON.stringify(notes) });
      showToast('Note saved'); closeModal(); navigate('bookofminds');
    };
  };

  window.deleteNote = async function(idx) {
    if (!confirm('Delete note?')) return;
    notes.splice(idx, 1);
    const existing = await db.settings.where('key').equals('bookofminds_notes').first();
    if (existing) await db.settings.update(existing.id, { value: JSON.stringify(notes) });
    showToast('Deleted'); navigate('bookofminds');
  };
};

// ===== SETTINGS =====
window.pageRenderers.settings = async function(container) {
  const users = await db.users.toArray();
  const sync = window.syncState || { lastSync: 'Never' };
  
  container.innerHTML = `
    <div class="fade-in">
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>👤 User Management</h3><button class="btn btn-primary btn-sm" id="add-user-btn">➕ Add User</button></div>
          <div class="data-table-wrapper">
            <table class="data-table"><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>${users.map(u => `<tr>
              <td style="font-weight:600">${u.username}</td><td>${u.name}</td>
              <td><span class="badge badge-purple">${u.role}</span></td>
              <td class="actions-cell">
                <button class="btn btn-sm btn-secondary" onclick="editUser(${u.id})">✏️</button>
                ${u.role !== 'ceo' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">🗑️</button>` : ''}
              </td>
            </tr>`).join('')}</tbody></table>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>🛡️ Cloud Sync & Backup (Google Drive)</h3></div>
          <div style="padding:15px; background:var(--bg-secondary); border-radius:var(--radius-sm); margin-bottom:20px">
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px">Securely save your ERP data to your personal Google Drive account.</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
              <span style="font-size:0.9rem">Last Sync: <strong>${sync.lastSync}</strong></span>
              <span class="badge ${sync.connected ? 'badge-success' : 'badge-warning'}">${sync.connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div style="display:flex; gap:10px; margin-bottom:15px">
              <button class="btn btn-primary btn-sm" onclick="connectGoogleDrive()">🔗 Connect Google</button>
              <button class="btn btn-success btn-sm" onclick="saveToDrive()">📤 Sync Now</button>
            </div>
            <hr style="border:0; border-top:1px solid var(--border); margin:15px 0"/>
            <div style="display:flex; flex-direction:column; gap:10px">
               <button class="btn btn-info btn-sm" onclick="loadFromDrive()">📥 Restore from Cloud</button>
               <button class="btn btn-secondary btn-sm" id="backup-btn">📄 Local JSON Backup</button>
               <button class="btn btn-danger btn-sm" id="clear-btn">🗑️ Clear Local Data</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('add-user-btn').onclick = () => openUserForm();
  document.getElementById('backup-btn').onclick = backupData;
  document.getElementById('clear-btn').onclick = clearAllData;
};

async function openUserForm(editId) {
  let user = { username: '', password: '', name: '', role: 'sales' };
  if (editId) { const u = await db.users.get(editId); if (u) user = u; }
  const roles = ['ceo','sales','purchase','finance','hr','marketing'];
  showModal(editId ? 'Edit User' : 'Add User', `
    <div class="form-group"><label>Username</label><input class="form-input" id="uf-user" value="${user.username}" ${editId?'readonly':''}/></div>
    <div class="form-group"><label>Password</label><input class="form-input" id="uf-pass" value="${user.password}" type="text"/></div>
    <div class="form-row">
      <div class="form-group"><label>Display Name</label><input class="form-input" id="uf-name" value="${user.name}"/></div>
      <div class="form-group"><label>Role</label><select class="form-select" id="uf-role">${roles.map(r => `<option value="${r}" ${user.role===r?'selected':''}>${r.toUpperCase()}</option>`).join('')}</select></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="uf-save">💾 Save</button>`);

  document.getElementById('uf-save').onclick = async () => {
    const data = { username: document.getElementById('uf-user').value.trim().toLowerCase(), password: document.getElementById('uf-pass').value, name: document.getElementById('uf-name').value.trim(), role: document.getElementById('uf-role').value };
    if (!data.username || !data.password || !data.name) { showToast('All fields required', 'error'); return; }
    if (editId) { await db.users.update(editId, data); showToast('Updated'); }
    else { data.createdAt = new Date().toISOString(); await db.users.add(data); showToast('User created'); }
    closeModal(); navigate('settings');
  };
}

window.editUser = id => openUserForm(id);
window.deleteUser = async id => { if (!confirm('Delete user?')) return; await db.users.delete(id); showToast('Deleted'); navigate('settings'); };

async function backupData() {
  const backup = {};
  const tables = ['users','products','bom_items','parties','sales','purchases','bank_accounts','bank_entries','departments','ceo_commands','dispatch','gst_filings','audit_logs','settings'];
  for (const t of tables) { backup[t] = await db[t].toArray(); }
  
  const jsonString = JSON.stringify(backup, null, 2);
  const defaultName = `AESPL_Backup_${new Date().toISOString().split('T')[0]}.json`;

  try {
    if (window.showSaveFilePicker) {
      // Prompt user to select exactly where to save on their hard drive
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{ description: 'JSON Database Backup', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      showToast('Backup securely saved to your selected folder! 💾');
    } else {
      // Fallback for older browsers
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = defaultName; a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded! 💾');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast('Error saving backup: ' + err.message, 'error');
    }
  }
}

async function restoreData(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!confirm('This will REPLACE all current data. Continue?')) { e.target.value = ''; return; }
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    const tables = ['users','products','bom_items','parties','sales','purchases','bank_accounts','bank_entries','departments','ceo_commands','dispatch','gst_filings','audit_logs','settings'];
    for (const t of tables) {
      if (data[t]) { await db[t].clear(); await db[t].bulkAdd(data[t]); }
    }
    showToast('Data restored successfully! 🎉');
    navigate('settings');
  } catch(err) { showToast('Invalid backup file: ' + err.message, 'error'); }
  e.target.value = '';
}

async function clearAllData() {
  if (!confirm('⚠️ This will DELETE ALL DATA permanently. Are you sure?')) return;
  if (!confirm('LAST CHANCE! This cannot be undone. Continue?')) return;
  const tables = ['products','bom_items','parties','sales','purchases','bank_accounts','bank_entries','ceo_commands','dispatch','gst_filings','audit_logs','settings'];
  for (const t of tables) { await db[t].clear(); }
  showToast('All data cleared');
  navigate('dashboard');
}
