/* ===== Google Drive Sync Module ===== */

const G_CONFIG = {
  CLIENT_ID: 'YOUR_CLIENT_ID_HERE',
  API_KEY: 'AIzaSyAx1hCjlj9a3NBrIuwjL_9WsV6GJqSJuXs',
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/rest?version=v3',
  SCOPES: 'https://www.googleapis.com/auth/drive.file'
};

let gTokenClient;
let gApiInited = false;
let gGisInited = false;

window.syncState = {
  connected: false,
  lastSync: localStorage.getItem('last_sync_date') || 'Never',
  isSyncing: false
};

// Initialize Google APIs
async function initGoogle() {
  await new Promise(resolve => gapi.load('client', resolve));
  await gapi.client.init({
    apiKey: G_CONFIG.API_KEY,
    discoveryDocs: [G_CONFIG.DISCOVERY_DOC],
  });
  gApiInited = true;
  maybeEnableButtons();
}

function initGis() {
  gTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: G_CONFIG.CLIENT_ID,
    scope: G_CONFIG.SCOPES,
    callback: '', // defined later
  });
  gGisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gApiInited && gGisInited) {
    console.log('Google Drive Sync Ready');
  }
}

// Connect/Auth
window.connectGoogleDrive = function () {
  gTokenClient.callback = async (resp) => {
    if (resp.error !== undefined) { throw (resp); }
    window.syncState.connected = true;
    showToast('Connected to Google Drive');
    saveToDrive(); // Auto sync on connect
  };

  if (gapi.client.getToken() === null) {
    gTokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    gTokenClient.requestAccessToken({ prompt: '' });
  }
};

// Sync Logic: Save DB to Drive
window.saveToDrive = async function () {
  if (!window.syncState.connected) return showToast('Connect to Google Drive first', 'warning');

  window.syncState.isSyncing = true;
  showToast('Syncing to Cloud...', 'info');

  try {
    const blob = await db.export();
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result.split(',')[1];

      // Search for existing file
      const response = await gapi.client.drive.files.list({
        q: "name = 'aespl_erp_backup.json' and trashed = false",
        fields: 'files(id, name)'
      });

      const fileId = response.result.files[0]?.id;
      const metadata = { name: 'aespl_erp_backup.json', mimeType: 'application/json' };

      if (fileId) {
        // Update existing
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${gapi.client.getToken().access_token}` },
          body: blob
        });
      } else {
        // Create new
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${gapi.client.getToken().access_token}` },
          body: form
        });
      }

      window.syncState.lastSync = new Date().toLocaleString();
      localStorage.setItem('last_sync_date', window.syncState.lastSync);
      showToast('Data synced to Google Drive');
    };
    reader.readAsDataURL(blob);
  } catch (err) {
    console.error(err);
    showToast('Sync failed: ' + err.message, 'error');
  } finally {
    window.syncState.isSyncing = false;
  }
};

// Sync Logic: Load DB from Drive
window.loadFromDrive = async function () {
  if (!window.syncState.connected) return showToast('Connect to Google Drive first', 'warning');
  if (!confirm('This will overwrite your local data with the Cloud backup. Continue?')) return;

  try {
    const response = await gapi.client.drive.files.list({
      q: "name = 'aespl_erp_backup.json' and trashed = false",
      fields: 'files(id, name)'
    });

    const fileId = response.result.files[0]?.id;
    if (!fileId) return showToast('No backup found in Google Drive', 'warning');

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${gapi.client.getToken().access_token}` }
    });
    const blob = await res.blob();

    await db.delete();
    await db.open();
    await db.import(blob);

    showToast('Data restored from Cloud. Reloading...');
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    console.error(err);
    showToast('Restore failed', 'error');
  }
};

// Initialize
initGoogle();
initGis();
