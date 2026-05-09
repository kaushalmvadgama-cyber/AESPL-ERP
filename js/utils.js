/* ===== AESPL Utilities ===== */

// GST Slabs
const GST_SLABS = [0, 5, 12, 18, 28];
const UNITS = ['pcs', 'kg', 'gm', 'mtr', 'ltr', 'set', 'box', 'roll', 'pair', 'nos'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const FY_MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March'];

// Format currency
function formatCurrency(n) {
  if (n == null || isNaN(n)) return '₹0.00';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format date
function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Format date for input
function dateToInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toISOString().split('T')[0];
}

// Get current month/year
function getCurrentMonth() { return new Date().getMonth(); }
function getCurrentYear() { return new Date().getFullYear(); }

// Calculate BOM total
function calcBOMTotal(bomItems) {
  return bomItems.reduce((sum, item) => sum + (Number(item.rate) * Number(item.qty) || 0), 0);
}

// Calculate cost price from BOM + labour
function calcCostPrice(bomTotal, labourPercent) {
  return bomTotal + (bomTotal * (Number(labourPercent) || 0) / 100);
}

// Calculate margin
function calcMargin(sp, cp) {
  return (Number(sp) || 0) - (Number(cp) || 0);
}

// Calculate GST amount
function calcGST(amount, slab) {
  return (Number(amount) || 0) * (Number(slab) || 0) / 100;
}

// Show toast
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Show modal
function showModal(title, bodyHTML, footerHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML || '';
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Export to Excel
function exportToExcel(data, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

// Export table element to Excel
function exportTableToExcel(tableEl, fileName) {
  const wb = XLSX.utils.table_to_book(tableEl, { sheet: 'Sheet1' });
  XLSX.writeFile(wb, fileName);
}

// Role access map
const ROLE_ACCESS = {
  ceo: ['dashboard','entrybook','products','sales','purchase','finance','gst','bank','ledger','dispatch','commands','contacts','reports','audit','hr','marketing','bookofminds','settings'],
  sales: ['dashboard','entrybook','products','sales','dispatch','contacts','commands'],
  purchase: ['dashboard','entrybook','purchase','contacts','commands'],
  finance: ['dashboard','entrybook','finance','gst','bank','ledger','reports','commands'],
  hr: ['dashboard','entrybook','hr','commands'],
  marketing: ['dashboard','entrybook','marketing','commands']
};

function hasAccess(role, page) {
  return ROLE_ACCESS[role]?.includes(page) || false;
}

// Transaction Helper
async function recordTransaction({ bankAccountId, type, amount, description, partyId, partyName, date }) {
  if (!bankAccountId || !amount) return;
  const entryId = await db.bank_entries.add({ 
    bankAccountId: Number(bankAccountId), 
    date: date || new Date().toISOString().split('T')[0], 
    type, 
    amount: Number(amount), 
    description, 
    partyId: partyId ? Number(partyId) : null, 
    partyName: partyName || '' 
  });

  const acc = await db.bank_accounts.get(Number(bankAccountId));
  if (acc) {
    const newBal = type === 'credit' ? (acc.balance || 0) + Number(amount) : (acc.balance || 0) - Number(amount);
    await db.bank_accounts.update(acc.id, { balance: newBal });
  }
  return entryId;
}

// Make globally available
window.GST_SLABS = GST_SLABS;
window.UNITS = UNITS;
window.MONTHS = MONTHS;
window.FY_MONTHS = FY_MONTHS;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.dateToInput = dateToInput;
window.getCurrentMonth = getCurrentMonth;
window.getCurrentYear = getCurrentYear;
window.calcBOMTotal = calcBOMTotal;
window.calcCostPrice = calcCostPrice;
window.calcMargin = calcMargin;
window.calcGST = calcGST;
window.showToast = showToast;
window.showModal = showModal;
window.closeModal = closeModal;
window.exportToExcel = exportToExcel;
window.exportTableToExcel = exportTableToExcel;
window.ROLE_ACCESS = ROLE_ACCESS;
window.hasAccess = hasAccess;
window.recordTransaction = recordTransaction;
