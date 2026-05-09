/* ===== Miscellaneous Master Forms ===== */

window.openEmployeeForm = function() {
  showModal('Employee Master', `
    <div class="form-group"><label>Employee Name</label><input class="form-input" id="emp-name" placeholder="Full Name"/></div>
    <div class="form-row">
      <div class="form-group"><label>Department</label><input class="form-input" id="emp-dept" placeholder="e.g. Production"/></div>
      <div class="form-group"><label>Designation</label><input class="form-input" id="emp-desig" placeholder="e.g. Technician"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Phone</label><input class="form-input" id="emp-phone" placeholder="+91"/></div>
      <div class="form-group"><label>Salary</label><input type="number" class="form-input" id="emp-sal" placeholder="0.00"/></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEmployee()">💾 Save Employee</button>`);
};

window.saveEmployee = async function() {
  const name = document.getElementById('emp-name').value;
  if (!name) return showToast('Name is required', 'error');
  // Normally we'd save to a table 'employees', but for now we log it
  logAudit(state.currentUser.id, 'CREATE', 'hr', `Created employee record for ${name}`);
  showToast('Employee record saved (Simulated)');
  closeModal();
};

window.openMachineForm = function() {
  showModal('Machine Master', `
    <div class="form-group"><label>Machine Name</label><input class="form-input" id="mac-name" placeholder="e.g. CNC-01"/></div>
    <div class="form-group"><label>Machine Code</label><input class="form-input" id="mac-code" placeholder="MCH-XXXX"/></div>
    <div class="form-group"><label>Location/Floor</label><input class="form-input" id="mac-loc" placeholder="Section A"/></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('Machine saved')">💾 Save Machine</button>`);
};

// Generic Inventory Form
window.openInventoryForm = function(type) {
  showModal(type, `
    <div class="form-group"><label>Date</label><input type="date" class="form-input" id="inv-date" value="${new Date().toISOString().split('T')[0]}"/></div>
    <div class="form-group"><label>Item Name</label><input class="form-input" id="inv-item" placeholder="Select Item"/></div>
    <div class="form-row">
      <div class="form-group"><label>Quantity</label><input type="number" class="form-input" id="inv-qty" value="1"/></div>
      <div class="form-group"><label>Unit</label><input class="form-input" id="inv-unit" value="pcs"/></div>
    </div>
    <div class="form-group"><label>Remarks</label><input class="form-input" id="inv-rem"/></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('${type} saved')">💾 Save Entry</button>`);
};

// Generic Production Form
window.openProductionForm = function(type) {
  showModal(type, `
    <div class="form-group"><label>Work Order / Job ID</label><input class="form-input" id="prod-id" placeholder="ID-000"/></div>
    <div class="form-group"><label>Product Name</label><input class="form-input" id="prod-name"/></div>
    <div class="form-row">
      <div class="form-group"><label>Target Qty</label><input type="number" class="form-input" id="prod-qty"/></div>
      <div class="form-group"><label>Status</label><select class="form-select"><option>Planned</option><option>In Progress</option><option>Completed</option></select></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('${type} updated')">💾 Update</button>`);
};

// Generic Finance Form
window.openFinanceVoucher = async function(type) {
  const accounts = await db.bank_accounts.toArray();
  const accOpts = accounts.map(a => `<option value="${a.id}">${a.bankName} (${a.accountNumber})</option>`).join('');
  const isOut = type.toLowerCase().includes('payment') || type.toLowerCase().includes('debit') || type.toLowerCase().includes('contra');

  showModal(type, `
    <div class="form-group"><label>Voucher Date</label><input type="date" class="form-input" id="fin-date" value="${new Date().toISOString().split('T')[0]}"/></div>
    <div class="form-group"><label>Account / Ledger</label><input class="form-input" id="fin-ledger" placeholder="Search Account..."/></div>
    <div class="form-group"><label>Select Bank/Cash Account</label><select class="form-select" id="fin-bank">${accOpts}</select></div>
    <div class="form-row">
      <div class="form-group"><label>Amount (₹)</label><input type="number" class="form-input" id="fin-amt" step="0.01"/></div>
      <div class="form-group"><label>Voucher Type</label><input class="form-input" value="${type}" readonly/></div>
    </div>
    <div class="form-group"><label>Narration</label><textarea class="form-textarea" id="fin-nar" rows="2"></textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="fin-save">💾 Record Voucher</button>`);

  document.getElementById('fin-save').onclick = async () => {
    const bankId = Number(document.getElementById('fin-bank').value);
    const amt = Number(document.getElementById('fin-amt').value) || 0;
    const ledger = document.getElementById('fin-ledger').value;
    if (!amt || !bankId) return showToast('Amount and Account required', 'error');

    await recordTransaction({
      bankAccountId: bankId,
      type: isOut ? 'debit' : 'credit',
      amount: amt,
      description: `[${type}] ${ledger} - ${document.getElementById('fin-nar').value}`,
      date: document.getElementById('fin-date').value
    });

    showToast(`${type} recorded and balance updated`);
    closeModal();
    navigate('bank');
  };
};

// Generic HR Entry
window.openHREntry = function(type) {
  showModal(type, `
    <div class="form-group"><label>Employee</label><input class="form-input" placeholder="Search Employee..."/></div>
    <div class="form-group"><label>Date</label><input type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    <div class="form-group"><label>Details / Reason</label><textarea class="form-textarea" rows="2"></textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('${type} saved')">💾 Save</button>`);
};

// Generic Service/Maintenance
window.openServiceEntry = function(type) {
  showModal(type, `
    <div class="form-group"><label>Asset / Customer</label><input class="form-input"/></div>
    <div class="form-group"><label>Issue Description</label><textarea class="form-textarea" rows="2"></textarea></div>
    <div class="form-group"><label>Technician Assigned</label><input class="form-input"/></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('${type} logged')">💾 Log Entry</button>`);
};

// Generic QC Entry
window.openQCEntry = function(type) {
  showModal(type, `
    <div class="form-group"><label>Inspection Lot ID</label><input class="form-input"/></div>
    <div class="form-group"><label>Sample Size</label><input type="number" class="form-input"/></div>
    <div class="form-row">
      <div class="form-group"><label>Pass Qty</label><input type="number" class="form-input"/></div>
      <div class="form-group"><label>Fail Qty</label><input type="number" class="form-input"/></div>
    </div>
    <div class="form-group"><label>QC Status</label><select class="form-select"><option>Approved</option><option>Rejected</option><option>Hold</option></select></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('${type} recorded')">💾 Save QC</button>`);
};

// Generic Sales Entry
window.openSalesEntry = function(type) {
  showModal(type, `
    <div class="form-group"><label>Date</label><input type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    <div class="form-group"><label>Customer</label><input class="form-input" placeholder="Search Customer..."/></div>
    <div class="form-group"><label>Reference #</label><input class="form-input" placeholder="Ref-000"/></div>
    <div class="form-group"><label>Expected Delivery</label><input type="date" class="form-input"/></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('${type} saved')">💾 Save</button>`);
};

// Generic Purchase Entry
window.openPurchaseEntry = function(type) {
  showModal(type, `
    <div class="form-group"><label>Date</label><input type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"/></div>
    <div class="form-group"><label>Vendor</label><input class="form-input" placeholder="Search Vendor..."/></div>
    <div class="form-group"><label>Description</label><textarea class="form-textarea" rows="2"></textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('${type} recorded')">💾 Save</button>`);
};

// Generic Admin Entry
window.openAdminEntry = function(type) {
  showModal(type, `
    <div class="form-group"><label>Setting Name</label><input class="form-input"/></div>
    <div class="form-group"><label>Value / Configuration</label><textarea class="form-textarea" rows="3"></textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('${type} updated')">💾 Save Settings</button>`);
};

window.openGSTMaster = function() {
  showModal('GST / Tax Master', `
    <div class="form-group"><label>Tax Name</label><input class="form-input" value="GST"/></div>
    <div class="form-group"><label>Registration Number</label><input class="form-input" placeholder="Enter Company GSTIN"/></div>
    <div class="form-group"><label>Tax Rate (%)</label><input type="number" class="form-input" value="18"/></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('Tax Settings Saved')">💾 Save Tax Master</button>`);
};
