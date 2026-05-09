window.pageRenderers.products = async function(container) {
  const products = await db.products.toArray();
  const role = state.currentUser.role;
  const isPrivileged = role === 'ceo' || role === 'finance';

  container.innerHTML = `
    <div class="fade-in">
      <div class="toolbar">
        <input type="text" class="search-input" id="prod-search" placeholder="🔍 Search products by name or code..." />
        ${isPrivileged ? '<button class="btn btn-primary" id="add-product-btn">➕ Add Product</button>' : ''}
        <button class="btn btn-info btn-sm" id="export-products-btn">📥 Export Excel</button>
      </div>
      <div class="card">
        <div class="data-table-wrapper">
          <table class="data-table" id="products-table">
            <thead><tr>
              <th>Code</th><th>Product Name</th>
              ${isPrivileged ? '<th>BOM Cost</th><th>Labour %</th><th>Cost Price</th>' : ''}
              <th>Selling Price</th>
              ${isPrivileged ? '<th>Margin</th>' : ''}
              <th>GST</th><th>Actions</th>
            </tr></thead>
            <tbody id="products-tbody"></tbody>
          </table>
        </div>
        ${products.length === 0 ? '<div class="empty-state" style="padding:40px"><div class="empty-icon">📦</div><h3>No Products Yet</h3><p>Add your first product to get started</p></div>' : ''}
      </div>
    </div>`;

  renderProductRows(products);

  document.getElementById('add-product-btn').onclick = () => openProductForm();
  document.getElementById('prod-search').oninput = async (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.productName.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q));
    renderProductRows(filtered);
  };
  document.getElementById('export-products-btn').onclick = () => {
    if (products.length === 0) { showToast('No products to export', 'warning'); return; }
    exportToExcel(products.map(p => ({
      'Product Code': p.productCode, 'Product Name': p.productName, 'BOM Cost': p.bomTotal || 0,
      'Labour %': p.labourPercent || 0, 'Cost Price': p.costPrice || 0,
      'Selling Price': p.sellingPrice || 0, 'Margin': p.margin || 0, 'GST Slab': (p.gstSlab || 0) + '%'
    })), 'Products', 'AESPL_Products.xlsx');
    showToast('Products exported successfully');
  };
};

function renderProductRows(products) {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  const role = state.currentUser.role;
  const isPrivileged = role === 'ceo' || role === 'finance';

  tbody.innerHTML = products.map(p => `<tr>
    <td><span class="badge badge-purple">${p.productCode}</span></td>
    <td style="font-weight:600">${p.productName}</td>
    ${isPrivileged ? `
      <td>${formatCurrency(p.bomTotal || 0)}</td>
      <td>${p.labourPercent || 0}%</td>
      <td>${formatCurrency(p.costPrice || 0)}</td>
    ` : ''}
    <td style="color:var(--success);font-weight:600">${formatCurrency(p.sellingPrice || 0)}</td>
    ${isPrivileged ? `
      <td style="color:${(p.margin||0) >= 0 ? 'var(--success)' : 'var(--danger)'};font-weight:600">${formatCurrency(p.margin || 0)}</td>
    ` : ''}
    <td>${p.gstSlab || 0}%</td>
    <td class="actions-cell">
      ${isPrivileged ? `
        <button class="btn btn-sm btn-secondary" onclick="openProductForm(${p.id})">✏️</button>
        <button class="btn btn-sm btn-secondary" onclick="openBOMEditor(${p.id})">🧱 BOM</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">🗑️</button>
      ` : '<span class="text-muted">View Only</span>'}
    </td>
  </tr>`).join('');
}

async function openProductForm(editId) {
  let product = { productCode: '', productName: '', sellingPrice: 0, labourPercent: 0, gstSlab: 18 };
  if (editId) product = await db.products.get(editId) || product;

  const gstOptions = GST_SLABS.map(s => `<option value="${s}" ${product.gstSlab == s ? 'selected' : ''}>${s}%</option>`).join('');

  showModal(editId ? 'Edit Product' : 'Add New Product', `
    <div class="form-group"><label>Product Code</label><input class="form-input" id="pf-code" value="${product.productCode}" placeholder="e.g. AESPL-001"/></div>
    <div class="form-group"><label>Product Name</label><input class="form-input" id="pf-name" value="${product.productName}" placeholder="Product name"/></div>
    <div class="form-row">
      <div class="form-group"><label>Selling Price (₹)</label><input type="number" class="form-input" id="pf-sp" value="${product.sellingPrice || ''}" placeholder="0.00"/></div>
      <div class="form-group"><label>Labour %</label><input type="number" class="form-input" id="pf-labour" value="${product.labourPercent || ''}" placeholder="0"/></div>
    </div>
    <div class="form-group"><label>GST Slab</label><select class="form-select" id="pf-gst">${gstOptions}</select></div>
    <p style="color:var(--text-muted);font-size:0.82rem;margin-top:8px">💡 Cost Price is auto-calculated from BOM. Add BOM items after saving the product.</p>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" id="pf-save-btn">${editId ? 'Update' : 'Add'} Product</button>`);

  document.getElementById('pf-save-btn').onclick = async () => {
    const code = document.getElementById('pf-code').value.trim();
    const name = document.getElementById('pf-name').value.trim();
    const sp = Number(document.getElementById('pf-sp').value) || 0;
    const labour = Number(document.getElementById('pf-labour').value) || 0;
    const gst = Number(document.getElementById('pf-gst').value) || 0;

    if (!code || !name) { showToast('Product Code and Name are required', 'error'); return; }

    const bomItems = editId ? await db.bom_items.where('productId').equals(editId).toArray() : [];
    const bomTotal = calcBOMTotal(bomItems);
    const cp = calcCostPrice(bomTotal, labour);
    const margin = calcMargin(sp, cp);

    const data = { productCode: code, productName: name, sellingPrice: sp, labourPercent: labour, gstSlab: gst, bomTotal, costPrice: cp, margin };

    if (editId) {
      await db.products.update(editId, data);
      logAudit(state.currentUser.id, 'UPDATE', 'products', `Updated product ${code}`);
      showToast('Product updated');
    } else {
      await db.products.add(data);
      logAudit(state.currentUser.id, 'CREATE', 'products', `Created product ${code}`);
      showToast('Product added');
    }
    closeModal();
    navigate('products');
  };
}

async function openBOMEditor(productId) {
  const product = await db.products.get(productId);
  if (!product) return;
  let bomItems = await db.bom_items.where('productId').equals(productId).toArray();

  function renderBOM() {
    const total = calcBOMTotal(bomItems);
    const cp = calcCostPrice(total, product.labourPercent || 0);
    const margin = calcMargin(product.sellingPrice || 0, cp);

    document.getElementById('modal-body').innerHTML = `
      <p style="margin-bottom:14px;color:var(--text-secondary)">Product: <strong style="color:var(--text-primary)">${product.productCode} — ${product.productName}</strong></p>
      <div class="data-table-wrapper">
        <table class="data-table" id="bom-table">
          <thead><tr><th>Raw Material</th><th>Qty</th><th>Unit</th><th>Rate (₹)</th><th>Total</th><th></th></tr></thead>
          <tbody>
            ${bomItems.map((item, i) => `<tr>
              <td><input class="inline-input" value="${item.rawMaterial}" data-idx="${i}" data-field="rawMaterial"/></td>
              <td><input class="inline-input sm" type="number" value="${item.qty}" data-idx="${i}" data-field="qty"/></td>
              <td><select class="inline-input sm" data-idx="${i}" data-field="unit">${UNITS.map(u => `<option ${item.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></td>
              <td><input class="inline-input sm" type="number" value="${item.rate}" data-idx="${i}" data-field="rate"/></td>
              <td style="font-weight:600">${formatCurrency((Number(item.qty)||0)*(Number(item.rate)||0))}</td>
              <td><button class="btn btn-sm btn-danger" onclick="removeBOMItem(${i})">✕</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-secondary btn-sm" id="add-bom-row" style="margin-top:10px">➕ Add Row</button>
      <div style="margin-top:16px;padding:14px;background:var(--bg-secondary);border-radius:var(--radius-md);">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>BOM Total:</span><strong>${formatCurrency(total)}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Labour (${product.labourPercent||0}%):</span><strong>${formatCurrency(total * (product.labourPercent||0)/100)}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:var(--accent-hover)"><span>Cost Price:</span><strong>${formatCurrency(cp)}</strong></div>
        <div style="display:flex;justify-content:space-between;color:${margin >= 0 ? 'var(--success)' : 'var(--danger)'}"><span>Margin (SP - CP):</span><strong>${formatCurrency(margin)}</strong></div>
      </div>`;

    // Attach handlers
    document.querySelectorAll('#bom-table .inline-input').forEach(input => {
      input.oninput = (e) => {
        const idx = Number(e.target.dataset.idx);
        const field = e.target.dataset.field;
        bomItems[idx][field] = e.target.value;
        // Re-render totals only
        renderBOM();
        // Re-focus the input
        setTimeout(() => {
          const el = document.querySelector(`[data-idx="${idx}"][data-field="${field}"]`);
          if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }, 0);
      };
    });

    document.getElementById('add-bom-row').onclick = () => {
      bomItems.push({ productId, rawMaterial: '', qty: 0, unit: 'pcs', rate: 0 });
      renderBOM();
    };
  }

  window.removeBOMItem = (idx) => { bomItems.splice(idx, 1); renderBOM(); };

  showModal('BOM Editor', '', `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-success" id="bom-save-btn">💾 Save BOM</button>`);

  renderBOM();

  document.getElementById('bom-save-btn').onclick = async () => {
    // Delete old, insert new
    await db.bom_items.where('productId').equals(productId).delete();
    for (const item of bomItems) {
      if (item.rawMaterial.trim()) {
        await db.bom_items.add({ productId, rawMaterial: item.rawMaterial, qty: Number(item.qty)||0, unit: item.unit, rate: Number(item.rate)||0 });
      }
    }
    // Update product costs
    const newBomItems = await db.bom_items.where('productId').equals(productId).toArray();
    const bomTotal = calcBOMTotal(newBomItems);
    const cp = calcCostPrice(bomTotal, product.labourPercent || 0);
    const margin = calcMargin(product.sellingPrice || 0, cp);
    await db.products.update(productId, { bomTotal, costPrice: cp, margin });
    logAudit(state.currentUser.id, 'UPDATE', 'products', `Updated BOM for ${product.productCode}`);
    showToast('BOM saved successfully');
    closeModal();
    navigate('products');
  };
}

window.deleteProduct = async function(id) {
  if (!confirm('Delete this product and its BOM?')) return;
  const p = await db.products.get(id);
  await db.bom_items.where('productId').equals(id).delete();
  await db.products.delete(id);
  logAudit(state.currentUser.id, 'DELETE', 'products', `Deleted product ${p?.productCode}`);
  showToast('Product deleted');
  navigate('products');
};

window.openProductForm = openProductForm;
window.openBOMEditor = openBOMEditor;
