/* ===== Dispatch, CEO Commands, Contacts ===== */
if (!window.pageRenderers) window.pageRenderers = {};

// ===== DISPATCH =====
window.pageRenderers.dispatch = async function(container) {
  const dispatches = await db.dispatch.toArray();
  const sales = await db.sales.toArray();

  container.innerHTML = `
    <div class="fade-in">
      <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-icon">🚚</div><div class="stat-value">${dispatches.length}</div><div class="stat-label">Total Dispatches</div></div>
        <div class="stat-card orange"><div class="stat-icon">⏳</div><div class="stat-value">${dispatches.filter(d=>d.status==='pending').length}</div><div class="stat-label">Pending</div></div>
        <div class="stat-card green"><div class="stat-icon">✅</div><div class="stat-value">${dispatches.filter(d=>d.status==='delivered').length}</div><div class="stat-label">Delivered</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>🚚 Dispatch Management</h3><button class="btn btn-primary btn-sm" id="add-dispatch-btn">➕ Add Dispatch</button></div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Sale Ref</th><th>Transport</th><th>Vehicle No</th><th>Destination</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${dispatches.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px">No dispatches</td></tr>' :
            dispatches.map(d => {
              const sale = sales.find(s => s.id === d.saleId);
              return `<tr>
                <td>${formatDate(d.date)}</td>
                <td>${sale ? sale.productName + ' (' + sale.partyName + ')' : 'Sale #' + d.saleId}</td>
                <td>${d.transportName||'-'}</td>
                <td><span class="badge badge-info">${d.vehicleNumber||'-'}</span></td>
                <td>${d.destination||'-'}</td>
                <td><span class="badge ${d.status==='delivered'?'badge-success':d.status==='transit'?'badge-warning':'badge-info'}">${d.status}</span></td>
                <td class="actions-cell">
                  <select class="inline-input sm" onchange="updateDispatchStatus(${d.id},this.value)">
                    <option value="pending" ${d.status==='pending'?'selected':''}>Pending</option>
                    <option value="transit" ${d.status==='transit'?'selected':''}>In Transit</option>
                    <option value="delivered" ${d.status==='delivered'?'selected':''}>Delivered</option>
                  </select>
                  <button class="btn btn-sm btn-danger" onclick="deleteDispatch(${d.id})">🗑️</button>
                </td>
              </tr>`;}).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  document.getElementById('add-dispatch-btn').onclick = async () => {
    const saleOpts = sales.map(s => `<option value="${s.id}">${formatDate(s.date)} — ${s.productName} (${s.partyName})</option>`).join('');
    showModal('Add Dispatch', `
      <div class="form-group"><label>Date</label><input type="date" class="form-input" id="df-date" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label>Linked Sale</label><select class="form-select" id="df-sale"><option value="">-- Select Sale --</option>${saleOpts}</select></div>
      <div class="form-row">
        <div class="form-group"><label>Transport Name</label><input class="form-input" id="df-transport"/></div>
        <div class="form-group"><label>Vehicle Number</label><input class="form-input" id="df-vehicle" placeholder="e.g. GJ-01-AB-1234"/></div>
      </div>
      <div class="form-group"><label>Destination</label><input class="form-input" id="df-dest"/></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="df-save">💾 Save</button>`);

    document.getElementById('df-save').onclick = async () => {
      await db.dispatch.add({
        date: document.getElementById('df-date').value,
        saleId: Number(document.getElementById('df-sale').value) || null,
        transportName: document.getElementById('df-transport').value.trim(),
        vehicleNumber: document.getElementById('df-vehicle').value.trim(),
        destination: document.getElementById('df-dest').value.trim(),
        status: 'pending'
      });
      logAudit(state.currentUser.id, 'CREATE', 'dispatch', 'Added dispatch');
      showToast('Dispatch added'); closeModal(); navigate('dispatch');
    };
  };
};

window.updateDispatchStatus = async (id, status) => { await db.dispatch.update(id, { status }); showToast(`Status: ${status}`); };
window.deleteDispatch = async id => { if (!confirm('Delete?')) return; await db.dispatch.delete(id); showToast('Deleted'); navigate('dispatch'); };

// ===== CEO COMMANDS =====
window.pageRenderers.commands = async function(container) {
  const commands = await db.ceo_commands.toArray();
  const departments = await db.departments.toArray();
  const isCEO = state.currentUser.role === 'ceo';

  // For non-CEO, filter commands to their department
  const visibleCmds = isCEO ? commands : commands.filter(c => c.toDepartments && c.toDepartments.includes(state.currentUser.role));

  container.innerHTML = `
    <div class="fade-in">
      <div class="stats-grid">
        <div class="stat-card purple"><div class="stat-icon">📢</div><div class="stat-value">${visibleCmds.length}</div><div class="stat-label">Total Commands</div></div>
        <div class="stat-card orange"><div class="stat-icon">⏳</div><div class="stat-value">${visibleCmds.filter(c=>c.status==='pending').length}</div><div class="stat-label">Pending</div></div>
        <div class="stat-card green"><div class="stat-icon">✅</div><div class="stat-value">${visibleCmds.filter(c=>c.status==='completed').length}</div><div class="stat-label">Completed</div></div>
      </div>
      ${isCEO ? '<div style="margin-bottom:18px"><button class="btn btn-primary" id="send-cmd-btn">📢 Send New Command</button></div>' : ''}
      <div class="card">
        <div class="card-header"><h3>📋 ${isCEO ? 'All Commands' : 'Your Commands'}</h3></div>
        ${visibleCmds.length === 0 ? '<div class="empty-state"><p>No commands</p></div>' :
        visibleCmds.slice().reverse().map(c => `<div class="command-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="flex:1">
              <h4 style="font-weight:700">${c.subject||'Command'}</h4>
              <p style="margin-top:6px;color:var(--text-secondary)">${c.message||''}</p>
              <div class="command-meta">
                <span class="badge badge-purple">📅 ${formatDate(c.date)}</span>
                <span class="badge badge-info">🎯 ${(c.toDepartments||[]).join(', ')}</span>
                <span class="badge ${c.priority==='high'?'badge-danger':c.priority==='medium'?'badge-warning':'badge-info'}">⚡ ${c.priority||'normal'}</span>
              </div>
              ${c.response ? `<div style="margin-top:10px;padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);border-left:3px solid var(--success)"><strong>Response:</strong> ${c.response}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              <span class="badge ${c.status==='completed'?'badge-success':c.status==='acknowledged'?'badge-warning':'badge-info'}">${c.status}</span>
              ${!isCEO && c.status !== 'completed' ? `<button class="btn btn-sm btn-success" onclick="respondToCommand(${c.id})">✍️ Respond</button>` : ''}
              ${isCEO ? `<button class="btn btn-sm btn-danger" onclick="deleteCommand(${c.id})">🗑️</button>` : ''}
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;

  if (isCEO) {
    document.getElementById('send-cmd-btn').onclick = () => {
      const deptChecks = departments.map(d => `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><input type="checkbox" value="${d.name.toLowerCase()}" class="cmd-dept"/>${d.name}</label>`).join('');
      showModal('Send Command', `
        <div class="form-group"><label>Subject</label><input class="form-input" id="cmd-subject"/></div>
        <div class="form-group"><label>Message</label><textarea class="form-textarea" id="cmd-message" rows="4"></textarea></div>
        <div class="form-group"><label>Priority</label><select class="form-select" id="cmd-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>
        <div class="form-group"><label>Target Departments</label>${deptChecks}</div>
      `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="cmd-send">📢 Send</button>`);

      document.getElementById('cmd-send').onclick = async () => {
        const subject = document.getElementById('cmd-subject').value.trim();
        const message = document.getElementById('cmd-message').value.trim();
        const priority = document.getElementById('cmd-priority').value;
        const toDepts = Array.from(document.querySelectorAll('.cmd-dept:checked')).map(cb => cb.value);
        if (!subject) { showToast('Subject required', 'error'); return; }
        if (toDepts.length === 0) { showToast('Select at least one department', 'error'); return; }
        await db.ceo_commands.add({ date: new Date().toISOString(), fromUser: state.currentUser.id, subject, message, priority, toDepartments: toDepts, status: 'pending', response: '' });
        logAudit(state.currentUser.id, 'CREATE', 'commands', `Sent command: ${subject}`);
        showToast('Command sent!'); closeModal(); navigate('commands');
      };
    };
  }
};

window.respondToCommand = async id => {
  showModal('Respond to Command', `<div class="form-group"><label>Your Response</label><textarea class="form-textarea" id="cmd-resp" rows="4"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="cmd-resp-save">✅ Submit</button>`);
  document.getElementById('cmd-resp-save').onclick = async () => {
    const resp = document.getElementById('cmd-resp').value.trim();
    await db.ceo_commands.update(id, { response: resp, status: 'completed' });
    showToast('Response submitted'); closeModal(); navigate('commands');
  };
};
window.deleteCommand = async id => { if (!confirm('Delete?')) return; await db.ceo_commands.delete(id); showToast('Deleted'); navigate('commands'); };

// ===== PARTY NAME (Contacts) =====
window.pageRenderers.contacts = async function(container) {
  const parties = await db.parties.toArray();

  container.innerHTML = `
    <div class="fade-in">
      <div class="toolbar">
        <input type="text" class="search-input" id="party-search" placeholder="🔍 Search Party Name..." />
        <button class="btn btn-primary" id="add-party-btn">➕ Add Party</button>
        <button class="btn btn-info btn-sm" id="export-parties-btn">📥 Export</button>
      </div>
      <div class="card">
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Type</th><th>GSTIN</th><th>Phone</th><th>Email</th><th>Address</th><th>Actions</th></tr></thead>
            <tbody id="parties-tbody">
              ${parties.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px">No parties added yet</td></tr>' :
              parties.map(p => `<tr>
                <td style="font-weight:600">${p.name}</td>
                <td><span class="badge ${p.type==='customer'?'badge-success':'badge-warning'}">${p.type}</span></td>
                <td>${p.gstin||'-'}</td>
                <td>
                  <div>${p.mobile1 || p.phone || '-'}</div>
                  ${p.mobile2 ? `<div style="font-size:0.75rem;color:var(--text-muted)">M2: ${p.mobile2}</div>` : ''}
                  ${p.telephone ? `<div style="font-size:0.75rem;color:var(--text-muted)">Tel: ${p.telephone}</div>` : ''}
                </td>
                <td>${p.email ? `<a href="mailto:${p.email}" style="color:var(--accent-hover)">${p.email}</a>` : '-'}</td>
                <td>${p.address||'-'}</td>
                <td class="actions-cell">
                  <button class="btn btn-sm btn-secondary" onclick="editParty(${p.id})">✏️</button>
                  ${p.email ? `<button class="btn btn-sm btn-info" onclick="window.open('mailto:${p.email}')">📧</button>` : ''}
                  <button class="btn btn-sm btn-danger" onclick="deleteParty(${p.id})">🗑️</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  document.getElementById('add-party-btn').onclick = () => openPartyForm();
  document.getElementById('party-search').oninput = e => {
    const q = e.target.value.toLowerCase();
    const filtered = parties.filter(p => p.name.toLowerCase().includes(q) || (p.mobile1||'').includes(q) || (p.phone||'').includes(q));
    document.getElementById('parties-tbody').innerHTML = filtered.map(p => `<tr>
      <td style="font-weight:600">${p.name}</td><td><span class="badge ${p.type==='customer'?'badge-success':'badge-warning'}">${p.type}</span></td>
      <td>${p.gstin||'-'}</td>
      <td>
        <div>${p.mobile1 || p.phone || '-'}</div>
        ${p.mobile2 ? `<div style="font-size:0.75rem;color:var(--text-muted)">M2: ${p.mobile2}</div>` : ''}
        ${p.telephone ? `<div style="font-size:0.75rem;color:var(--text-muted)">Tel: ${p.telephone}</div>` : ''}
      </td>
      <td>${p.email||'-'}</td><td>${p.address||'-'}</td>
      <td class="actions-cell"><button class="btn btn-sm btn-secondary" onclick="editParty(${p.id})">✏️</button><button class="btn btn-sm btn-danger" onclick="deleteParty(${p.id})">🗑️</button></td>
    </tr>`).join('');
  };
  document.getElementById('export-parties-btn').onclick = () => {
    exportToExcel(parties.map(p => ({ Name: p.name, Type: p.type, GSTIN: p.gstin, Phone: p.phone, Email: p.email, Address: p.address })), 'Party Name', 'AESPL_Parties.xlsx');
    showToast('Exported');
  };
};

async function openPartyForm(editId) {
  let party = { name: '', type: 'customer', gstin: '', mobile1: '', mobile2: '', telephone: '', email: '', address: '' };
  if (editId) { const p = await db.parties.get(editId); if (p) party = p; }
  
  showModal(editId ? 'Edit Party' : 'Add Party', `
    <div class="form-group"><label>Party Name</label><input class="form-input" id="prt-name" value="${party.name}"/></div>
    <div class="form-row">
      <div class="form-group"><label>Type</label><select class="form-select" id="prt-type"><option value="customer" ${party.type==='customer'?'selected':''}>Customer</option><option value="supplier" ${party.type==='supplier'?'selected':''}>Supplier</option><option value="both" ${party.type==='both'?'selected':''}>Both</option></select></div>
      <div class="form-group"><label>GSTIN</label><input class="form-input" id="prt-gstin" value="${party.gstin||''}" maxlength="15" style="text-transform:uppercase"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Mobile 1</label><input class="form-input" id="prt-mob1" value="${party.mobile1 || party.phone || ''}" placeholder="+91 0000000000"/></div>
      <div class="form-group"><label>Mobile 2</label><input class="form-input" id="prt-mob2" value="${party.mobile2||''}" placeholder="+91 0000000000"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Telephone</label><input class="form-input" id="prt-tel" value="${party.telephone||''}" placeholder="STD-XXXXXXX"/></div>
      <div class="form-group"><label>Email</label><input class="form-input" id="prt-email" value="${party.email||''}" type="email"/></div>
    </div>
    <div class="form-group"><label>Address</label><textarea class="form-textarea" id="prt-addr" rows="2">${party.address||''}</textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-success" id="prt-save">💾 Save</button>`);

  document.getElementById('prt-save').onclick = async () => {
    const name = document.getElementById('prt-name').value.trim();
    const gstin = document.getElementById('prt-gstin').value.trim().toUpperCase();
    
    if (!name) { showToast('Name required', 'error'); return; }

    // Phone Validation logic
    const validatePhone = (p) => {
      if (!p) return true;
      if (p.startsWith('+91')) {
        const digits = p.replace(/[^0-9]/g, '');
        return digits.length === 12; // 91 + 10 digits
      }
      return true; // Other countries allowed for now
    };

    const m1 = document.getElementById('prt-mob1').value.trim();
    if (m1 && !validatePhone(m1)) { showToast('Invalid Mobile 1 (India: 10 digits)', 'error'); return; }

    const data = { 
      name, 
      type: document.getElementById('prt-type').value, 
      gstin, 
      mobile1: m1,
      mobile2: document.getElementById('prt-mob2').value.trim(),
      telephone: document.getElementById('prt-tel').value.trim(),
      email: document.getElementById('prt-email').value.trim(), 
      address: document.getElementById('prt-addr').value.trim() 
    };

    if (editId) { await db.parties.update(editId, data); showToast('Updated'); }
    else { await db.parties.add(data); showToast('Party added'); }
    logAudit(state.currentUser.id, editId?'UPDATE':'CREATE', 'party_name', `${editId?'Updated':'Added'} party: ${name}`);
    closeModal(); navigate('contacts');
  };
}

window.editParty = id => openPartyForm(id);
window.deleteParty = async id => { if (!confirm('Delete party?')) return; await db.parties.delete(id); showToast('Deleted'); navigate('contacts'); };
