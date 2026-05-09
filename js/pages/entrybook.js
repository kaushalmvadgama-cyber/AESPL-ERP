/* ===== Entry Book Page ===== */
if (!window.pageRenderers) window.pageRenderers = {};

window.pageRenderers.entrybook = async function(container) {
  const userRole = state.currentUser.role;
  
  const categories = [
    {
      title: 'Master Entries',
      icon: '🏢',
      module: 'contacts', 
      items: [
        { label: 'Customer Master', action: 'openPartyForm', module: 'sales' },
        { label: 'Vendor/Supplier Master', action: 'openPartyForm', module: 'purchase' },
        { label: 'Employee Master', action: 'openEmployeeForm', module: 'hr' },
        { label: 'Item/Product Master', action: 'openProductForm', module: 'products' },
        { label: 'Machine Master', action: 'openMachineForm', module: 'products' },
        { label: 'GST/Tax Master', action: 'openGSTMaster', module: 'finance' }
      ]
    },
    {
      title: 'Purchase Entries',
      icon: '🛒',
      module: 'purchase',
      items: [
        { label: 'Purchase Inquiry', action: 'openPurchaseEntry', module: 'purchase' },
        { label: 'Purchase Order (PO)', action: 'openPurchaseEntry', module: 'purchase' },
        { label: 'Goods Receipt Note (GRN)', action: 'openPurchaseEntry', module: 'purchase' },
        { label: 'Purchase Invoice', action: 'openPurchaseForm', module: 'purchase' },
        { label: 'Purchase Return', action: 'openPurchaseEntry', module: 'purchase' }
      ]
    },
    {
      title: 'Sales Entries',
      icon: '💰',
      module: 'sales',
      items: [
        { label: 'Quotation', action: 'openSalesEntry', module: 'sales' },
        { label: 'Sales Order', action: 'openSalesEntry', module: 'sales' },
        { label: 'Delivery Challan', action: 'openSalesEntry', module: 'sales' },
        { label: 'Sales Invoice', action: 'openSaleForm', module: 'sales' },
        { label: 'Sales Return', action: 'openSalesEntry', module: 'sales' }
      ]
    },
    {
      title: 'Inventory / Stock',
      icon: '📦',
      module: 'products',
      items: [
        { label: 'Stock Inward', action: 'openInventoryForm', module: 'products' },
        { label: 'Stock Outward', action: 'openInventoryForm', module: 'products' },
        { label: 'Material Transfer', action: 'openInventoryForm', module: 'products' },
        { label: 'Stock Adjustment', action: 'openInventoryForm', module: 'products' },
        { label: 'Scrap Entry', action: 'openInventoryForm', module: 'products' },
        { label: 'Warehouse Transfer', action: 'openInventoryForm', module: 'products' }
      ]
    },
    {
      title: 'Production',
      icon: '🏗️',
      module: 'products',
      items: [
        { label: 'Bill of Materials (BOM)', action: 'navigate:products', module: 'products' },
        { label: 'Production Planning', action: 'openProductionForm', module: 'products' },
        { label: 'Work Order', action: 'openProductionForm', module: 'products' },
        { label: 'Job Card', action: 'openProductionForm', module: 'products' },
        { label: 'Production Entry', action: 'openProductionForm', module: 'products' },
        { label: 'Rejection Entry', action: 'openProductionForm', module: 'products' }
      ]
    },
    {
      title: 'Finance & Accounts',
      icon: '🏦',
      module: 'finance',
      items: [
        { label: 'Payment Voucher', action: 'openFinanceVoucher', module: 'finance' },
        { label: 'Receipt Voucher', action: 'openFinanceVoucher', module: 'finance' },
        { label: 'Journal Voucher', action: 'openFinanceVoucher', module: 'finance' },
        { label: 'Contra Entry', action: 'openFinanceVoucher', module: 'finance' },
        { label: 'Debit Note', action: 'openFinanceVoucher', module: 'finance' },
        { label: 'Credit Note', action: 'openFinanceVoucher', module: 'finance' }
      ]
    },
    {
      title: 'HR & Payroll',
      icon: '🧑‍💼',
      module: 'hr',
      items: [
        { label: 'Attendance', action: 'openHREntry', module: 'hr' },
        { label: 'Leave Entry', action: 'openHREntry', module: 'hr' },
        { label: 'Salary Processing', action: 'openHREntry', module: 'hr' },
        { label: 'Overtime Entry', action: 'openHREntry', module: 'hr' },
        { label: 'Employee Expense Claim', action: 'openHREntry', module: 'hr' }
      ]
    },
    {
      title: 'Service & Maintenance',
      icon: '🛠️',
      module: 'dispatch',
      items: [
        { label: 'Complaint Ticket', action: 'openServiceEntry', module: 'dispatch' },
        { label: 'AMC Entry', action: 'openServiceEntry', module: 'dispatch' },
        { label: 'Service Report', action: 'openServiceEntry', module: 'dispatch' },
        { label: 'Maintenance Log', action: 'openServiceEntry', module: 'dispatch' }
      ]
    },
    {
      title: 'Quality Control',
      icon: '🔬',
      module: 'products',
      items: [
        { label: 'Incoming Inspection', action: 'openQCEntry', module: 'products' },
        { label: 'In-process Inspection', action: 'openQCEntry', module: 'products' },
        { label: 'Final QC Report', action: 'openQCEntry', module: 'products' },
        { label: 'Calibration Records', action: 'openQCEntry', module: 'products' }
      ]
    },
    {
      title: 'Admin / System',
      icon: '⚙️',
      module: 'settings',
      items: [
        { label: 'User Creation', action: 'openAdminEntry', module: 'settings' },
        { label: 'Role Permissions', action: 'openAdminEntry', module: 'settings' },
        { label: 'Approval Settings', action: 'openAdminEntry', module: 'settings' },
        { label: 'Audit Logs', action: 'navigate:audit', module: 'audit' }
      ]
    }
  ];

  // Filter categories and items based on role access
  const filteredCategories = categories.map(cat => {
    const filteredItems = cat.items.filter(item => hasAccess(userRole, item.module));
    if (filteredItems.length > 0) {
      return { ...cat, items: filteredItems };
    }
    return null;
  }).filter(c => c !== null);

  container.innerHTML = `
    <div class="fade-in">
      <div class="section-title">
        <span style="font-size:1.5rem">📖</span>
        <h2>Entry Book</h2>
      </div>
      <p style="color:var(--text-secondary);margin-bottom:24px">Central hub for all system entries and record management.</p>
      
      <div class="grid-3">
        ${filteredCategories.map((cat, i) => `
          <div class="card" style="display:flex;flex-direction:column">
            <div class="card-header" style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:12px">
              <h3 style="display:flex;align-items:center;gap:10px">
                <span style="font-size:1.2rem">${cat.icon}</span>
                ${cat.title}
              </h3>
            </div>
            <div style="flex:1">
              <ul style="list-style:none">
                ${cat.items.map(item => `
                  <li style="margin-bottom:8px">
                    <button class="nav-item" style="padding:6px 10px;font-size:0.85rem;width:100%;justify-content:flex-start" 
                            onclick="handleEntryAction('${item.action}', '${item.label}')">
                      <span style="font-size:0.8rem;opacity:0.6;margin-right:8px">●</span>
                      ${item.label}
                    </button>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

window.handleEntryAction = (action, label) => {
  if (action === 'placeholder') {
    showToast(`${label} form is being developed`, 'info');
    return;
  }
  
  if (action.startsWith('navigate:')) {
    navigate(action.split(':')[1]);
    return;
  }
  
  if (typeof window[action] === 'function') {
    window[action](label);
  } else {
    showToast(`${label} module not loaded`, 'warning');
  }
};
