/* ===== AESPL CEO Business Tracker — Core App ===== */

// App State
const state = {
  currentUser: null,
  currentPage: 'dashboard',
  unsavedChanges: false
};

// ===== AUTH =====
async function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <h1>⚡ AESPL</h1>
        <p class="subtitle">CEO Business Operation Tracker</p>
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="login-user" class="form-input" placeholder="Enter username" autocomplete="off"/>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="login-pass" class="form-input" placeholder="Enter password"/>
        </div>
        <button id="login-btn" class="btn btn-primary btn-full btn-lg" style="margin-top:8px">Sign In</button>
        <p id="login-error" style="color:var(--danger);text-align:center;margin-top:14px;font-size:0.85rem;display:none"></p>
      </div>
    </div>`;

  document.getElementById('login-btn').onclick = doLogin;
  document.getElementById('login-pass').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  document.getElementById('login-user').focus();
}

async function doLogin() {
  const u = document.getElementById('login-user').value.trim().toLowerCase();
  const p = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  if (!u || !p) { errEl.textContent = 'Please fill in both fields'; errEl.style.display = 'block'; return; }
  const allUsers = await db.users.toArray();
  const user = allUsers.find(dbUser => dbUser.username.toLowerCase() === u);
  
  if (!user || user.password !== p) { 
    errEl.textContent = 'Invalid credentials'; 
    errEl.style.display = 'block'; 
    return; 
  }
  state.currentUser = user;
  localStorage.setItem('aespl_user', JSON.stringify({ id: user.id, username: user.username, role: user.role, name: user.name }));
  logAudit(user.id, 'LOGIN', 'auth', 'User logged in');
  renderApp();
}

function doLogout() {
  logAudit(state.currentUser?.id, 'LOGOUT', 'auth', 'User logged out');
  state.currentUser = null;
  localStorage.removeItem('aespl_user');
  location.hash = '';
  renderLogin();
}

// ===== SIDEBAR NAV CONFIG =====
const NAV_ITEMS = [
  { section: 'Main', items: [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', page: 'dashboard' },
    { id: 'entrybook', icon: '📖', label: 'Entry Book', page: 'entrybook' }
  ]},
  { section: 'Operations', items: [
    { id: 'products', icon: '📦', label: 'Products & BOM', page: 'products' },
    { id: 'sales', icon: '💰', label: 'Sales', page: 'sales' },
    { id: 'purchase', icon: '🛒', label: 'Purchase', page: 'purchase' },
    { id: 'dispatch', icon: '🚚', label: 'Dispatch', page: 'dispatch' }
  ]},
  { section: 'Finance', items: [
    { id: 'finance', icon: '🏦', label: 'Finance', page: 'finance' },
    { id: 'gst', icon: '📋', label: 'GST', page: 'gst' },
    { id: 'bank', icon: '🏧', label: 'Bank', page: 'bank' },
    { id: 'ledger', icon: '📒', label: 'Ledger', page: 'ledger' }
  ]},
  { section: 'Management', items: [
    { id: 'commands', icon: '📢', label: 'CEO Commands', page: 'commands' },
    { id: 'contacts', icon: '👥', label: 'Party Name', page: 'contacts' },
    { id: 'hr', icon: '🧑‍💼', label: 'HR', page: 'hr' },
    { id: 'marketing', icon: '📣', label: 'Marketing', page: 'marketing' }
  ]},
  { section: 'Reports', items: [
    { id: 'reports', icon: '📈', label: 'Reports', page: 'reports' },
    { id: 'audit', icon: '🔍', label: 'Audit Trail', page: 'audit' },
    { id: 'bookofminds', icon: '📚', label: 'Book of Minds', page: 'bookofminds' },
    { id: 'settings', icon: '⚙️', label: 'Settings', page: 'settings' }
  ]}
];

// ===== RENDER LAYOUT =====
function renderApp() {
  const user = state.currentUser;
  const role = user.role;

  document.getElementById('app').innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">A</div>
          <div class="logo-text"><h2>AESPL</h2><span>Business Tracker</span></div>
        </div>
        <nav class="sidebar-nav" id="sidebar-nav"></nav>
        <div class="sidebar-footer">
          <div class="user-avatar">${user.name.charAt(0)}</div>
          <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-role">${user.role}</div>
          </div>
          <button class="btn btn-sm btn-secondary" id="logout-btn" title="Logout">🚪</button>
        </div>
      </aside>
      <main class="main-content">
        <header class="header">
          <h1 class="page-title" id="page-title">Dashboard</h1>
          <div class="header-actions">
            <button class="btn btn-icon btn-secondary" id="ceo-cmd-notif" title="CEO Commands" style="position:relative">
              📢 <span id="ceo-cmd-badge" class="nav-badge hidden" style="position:absolute;top:-5px;right:-5px;margin:0">0</span>
            </button>
            <span style="color:var(--text-muted);font-size:0.82rem" id="header-date"></span>
          </div>
        </header>
        <div class="page-container" id="page-container"></div>
      </main>
    </div>`;

  // Build sidebar nav
  const navEl = document.getElementById('sidebar-nav');
  let navHTML = '';
  NAV_ITEMS.forEach(section => {
    const visibleItems = section.items.filter(item => hasAccess(role, item.page));
    if (visibleItems.length === 0) return;
    navHTML += `<div class="nav-section"><div class="nav-section-title">${section.section}</div>`;
    visibleItems.forEach(item => {
      navHTML += `<button class="nav-item" data-page="${item.page}"><span class="nav-icon">${item.icon}</span>${item.label}</button>`;
    });
    navHTML += '</div>';
  });
  navEl.innerHTML = navHTML;

  // Nav click handlers
  navEl.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.page);
  });

  document.getElementById('logout-btn').onclick = doLogout;
  document.getElementById('header-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('ceo-cmd-notif').onclick = () => navigate('commands');
  updateCeoBadge();

  // Modal close
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-overlay').onclick = e => { if (e.target.id === 'modal-overlay') closeModal(); };

  // Global Uppercase Listener (Skip login fields)
  document.addEventListener('input', (e) => {
    if (e.target.id === 'login-user' || e.target.id === 'login-pass') return;
    if (e.target.classList.contains('form-input') || e.target.classList.contains('form-textarea')) {
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(start, end);
    }
  });

  // Route from hash
  const hash = location.hash.replace('#', '') || 'dashboard';
  navigate(hash);
}

// ===== ROUTER =====
function navigate(page) {
  if (!hasAccess(state.currentUser.role, page)) {
    showToast('Access Denied', 'error');
    if (page !== 'dashboard') navigate('dashboard');
    return;
  }
  if (state.unsavedChanges && !confirm('You have unsaved changes. Leave anyway?')) return;
  state.unsavedChanges = false;
  state.currentPage = page;
  location.hash = page;

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  // Update title
  const titles = {
    dashboard:'Dashboard', entrybook:'Entry Book', products:'Products & BOM', sales:'Sales', purchase:'Purchase',
    finance:'Finance', gst:'GST Management', bank:'Bank Accounts', ledger:'Ledger',
    dispatch:'Dispatch', commands:'CEO Commands', contacts:'Party Name', hr:'HR Management',
    marketing:'Marketing', reports:'Reports', audit:'Audit Trail', bookofminds:'Book of Minds',
    settings:'Settings'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Render page
  const container = document.getElementById('page-container');
  const renderer = window.pageRenderers?.[page];
  if (renderer) {
    renderer(container).then(() => {
      injectCeoAlert(container);
    });
  } else {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🚧</div><h3>Coming Soon</h3><p>This module is under development.</p></div>`;
  }
}

// ===== CEO ALERT INJECTOR =====
async function injectCeoAlert(container) {
  const user = state.currentUser;
  if (!user) return;
  const role = user.role;
  const isCEO = role === 'ceo';
  
  const commands = await db.ceo_commands.where('status').equals('pending').toArray();
  const visibleCmds = isCEO ? commands : commands.filter(c => c.toDepartments && c.toDepartments.includes(role));
  
  if (visibleCmds.length > 0) {
    const latest = visibleCmds[visibleCmds.length - 1];
    const alertDiv = document.createElement('div');
    alertDiv.className = 'ceo-alert-banner fade-in';
    alertDiv.innerHTML = `
      <div class="ceo-alert-content">
        <span class="ceo-alert-icon">📢</span>
        <div class="ceo-alert-text">
          <strong>CEO MESSAGE:</strong> ${latest.subject} - <span class="msg-body">${latest.message}</span>
        </div>
        <button class="btn btn-sm btn-primary" onclick="navigate('commands')">View All Commands</button>
      </div>
    `;
    container.prepend(alertDiv);
  }
}

// ===== CEO BADGE UPDATER =====
async function updateCeoBadge() {
  const user = state.currentUser;
  if (!user) return;
  const role = user.role;
  const isCEO = role === 'ceo';
  const commands = await db.ceo_commands.where('status').equals('pending').toArray();
  const visibleCmds = isCEO ? commands : commands.filter(c => c.toDepartments && c.toDepartments.includes(role));
  const badge = document.getElementById('ceo-cmd-badge');
  if (badge) {
    badge.textContent = visibleCmds.length;
    badge.classList.toggle('hidden', visibleCmds.length === 0);
  }
}

// ===== UNSAVED CHANGES GUARD =====
window.addEventListener('beforeunload', e => {
  if (state.unsavedChanges) { e.preventDefault(); e.returnValue = ''; }
});

window.addEventListener('hashchange', () => {
  const page = location.hash.replace('#', '') || 'dashboard';
  if (page !== state.currentPage) navigate(page);
});

// ===== COMMAND PALETTE CONFIG =====
const COMMAND_TREE = {
  root: [
    { id: 'dash', label: 'Dashboard', icon: '📊', type: 'page', target: 'dashboard' },
    { id: 'entries', label: 'Entry Book', icon: '📖', type: 'page', target: 'entrybook' },
    { id: 'ops', label: 'Operations Department', icon: '🏗️', type: 'folder' },
    { id: 'fin', label: 'Finance & Accounts', icon: '🏦', type: 'folder' },
    { id: 'mgt', label: 'Management Controls', icon: '📢', type: 'folder' },
    { id: 'sys', label: 'System & Reports', icon: '⚙️', type: 'folder' },
    { id: 'logout', label: 'Sign Out', icon: '🚪', type: 'action', action: 'doLogout' }
  ],
  ops: [
    { id: 'p_list', label: 'Products & BOM', icon: '📦', type: 'page', target: 'products' },
    { id: 's_list', label: 'Sales Register', icon: '💰', type: 'page', target: 'sales' },
    { id: 'pur_list', label: 'Purchase Register', icon: '🛒', type: 'page', target: 'purchase' },
    { id: 'dis_list', label: 'Dispatch Center', icon: '🚚', type: 'page', target: 'dispatch' },
    { id: 'con_list', label: 'Party Name', icon: '👥', type: 'page', target: 'contacts' }
  ],
  fin: [
    { id: 'fin_dash', label: 'Finance Overview', icon: '📈', type: 'page', target: 'finance' },
    { id: 'bank_list', label: 'Bank Management', icon: '🏧', type: 'page', target: 'bank' },
    { id: 'gst_list', label: 'GST Management', icon: '📋', type: 'page', target: 'gst' },
    { id: 'led_list', label: 'Party Ledgers', icon: '📒', type: 'page', target: 'ledger' }
  ],
  mgt: [
    { id: 'cmd_list', label: 'CEO Directives', icon: '📢', type: 'page', target: 'commands' },
    { id: 'hr_list', label: 'HR Management', icon: '🧑‍💼', type: 'page', target: 'hr' },
    { id: 'mkt_list', label: 'Marketing Ideas', icon: '📣', type: 'page', target: 'marketing' }
  ],
  sys: [
    { id: 'rep_list', label: 'Monthly Reports', icon: '📊', type: 'page', target: 'reports' },
    { id: 'aud_list', label: 'Audit Trail', icon: '🔍', type: 'page', target: 'audit' },
    { id: 'bom_list', label: 'Book of Minds', icon: '📚', type: 'page', target: 'bookofminds' },
    { id: 'set_list', label: 'App Settings', icon: '⚙️', type: 'page', target: 'settings' }
  ]
};

const cmdState = {
  isOpen: false,
  level: 'root',
  selectedIdx: 0,
  filtered: []
};

function toggleCmdPalette(forceClose = false) {
  const el = document.getElementById('cmd-palette-overlay');
  cmdState.isOpen = forceClose ? false : !cmdState.isOpen;
  
  if (cmdState.isOpen) {
    el.classList.remove('hidden');
    cmdState.level = 'root';
    cmdState.selectedIdx = 0;
    document.getElementById('cmd-input').value = '';
    renderCmdResults();
    setTimeout(() => document.getElementById('cmd-input').focus(), 50);
  } else {
    el.classList.add('hidden');
  }
}

function renderCmdResults() {
  const query = document.getElementById('cmd-input').value.toLowerCase();
  const pool = COMMAND_TREE[cmdState.level] || [];
  
  // Filter by query and access
  cmdState.filtered = pool.filter(c => {
    const matches = c.label.toLowerCase().includes(query);
    const hasPerm = c.type === 'page' ? hasAccess(state.currentUser.role, c.target) : true;
    return matches && hasPerm;
  });
  
  if (cmdState.selectedIdx >= cmdState.filtered.length) cmdState.selectedIdx = 0;

  const resEl = document.getElementById('cmd-results');
  resEl.innerHTML = cmdState.filtered.map((c, i) => `
    <div class="cmd-item ${i === cmdState.selectedIdx ? 'selected' : ''}" onclick="executeCmd(${i})">
      <span class="cmd-item-icon">${c.icon}</span>
      <span class="cmd-item-label">${c.label}</span>
      <span class="cmd-item-hint">${c.type === 'folder' ? 'Folder ➔' : 'Action ↵'}</span>
    </div>
  `).join('');
  
  const selected = resEl.children[cmdState.selectedIdx];
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

function executeCmd(idx) {
  const cmd = cmdState.filtered[idx ?? cmdState.selectedIdx];
  if (!cmd) return;

  if (cmd.type === 'folder') {
    cmdState.level = cmd.id;
    cmdState.selectedIdx = 0;
    document.getElementById('cmd-input').value = '';
    renderCmdResults();
  } else {
    toggleCmdPalette(true);
    if (cmd.type === 'page') navigate(cmd.target);
    if (cmd.type === 'action') {
      if (cmd.action === 'doLogout') doLogout();
      else if (window[cmd.action]) window[cmd.action]();
    }
  }
}

// ===== KEYBOARD LISTENERS =====
window.addEventListener('keydown', e => {
  // Command Palette: Alt+K
  if (e.altKey && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    toggleCmdPalette();
  }

  if (cmdState.isOpen) {
    if (e.key === 'Escape') {
      if (cmdState.level !== 'root') {
        cmdState.level = 'root';
        cmdState.selectedIdx = 0;
        renderCmdResults();
      } else {
        toggleCmdPalette(true);
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdState.selectedIdx = (cmdState.selectedIdx + 1) % cmdState.filtered.length;
      renderCmdResults();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdState.selectedIdx = (cmdState.selectedIdx - 1 + cmdState.filtered.length) % cmdState.filtered.length;
      renderCmdResults();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCmd();
    }
  }
});

document.getElementById('cmd-input').oninput = renderCmdResults;

// ===== INIT =====
async function init() {
  await seedDefaults();
  const saved = localStorage.getItem('aespl_user');
  if (saved) {
    const parsed = JSON.parse(saved);
    const user = await db.users.get(parsed.id);
    if (user) { state.currentUser = user; renderApp(); return; }
  }
  renderLogin();
}

window.state = state;
window.navigate = navigate;
window.doLogout = doLogout;

// Wait for other scripts then init
window.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
