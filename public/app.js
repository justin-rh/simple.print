// ── Live preview ──────────────────────────────────────────────
const labelNameEl = document.getElementById('labelName');
const deviceIpEl = document.getElementById('deviceIp');
const previewLabelName = document.getElementById('preview-label-name');
const previewBarcodeText = document.getElementById('preview-barcode-text');
const previewDeviceIp = document.getElementById('preview-device-ip');
const zplOutput = document.getElementById('zpl-output');
const barcodeCanvas = document.getElementById('barcode-canvas');

// ── Mode toggle ────────────────────────────────────────────────
let labelMode = 'full';

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    labelMode = btn.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.getElementById('labelName-hint').textContent =
      labelMode === 'barcode' ? '(barcode data)' : '(header text + barcode)';
    const deviceIpGroup = document.getElementById('deviceIp-group');
    const deviceIpInput = document.getElementById('deviceIp');
    const isBarcodeMode = labelMode === 'barcode';
    deviceIpGroup.style.display = isBarcodeMode ? 'none' : '';
    deviceIpInput.required = !isBarcodeMode;
    updatePreview();
  });
});

// Collapsible advanced section
const toggle = document.querySelector('.collapse-toggle');
const collapseBody = document.querySelector('.collapse-body');
toggle.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  collapseBody.hidden = expanded;
});

// ── Minimal Code 128B barcode renderer ────────────────────────
const PATTERNS = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11101101110','11101001100',
  '11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000',
  '10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110',
  '10111011000','10111000110','10001110110','11101110110','11010001110',
  '11000101110','11011101000','11011100010','11011101110','11101011000',
  '11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100',
  '10010110000','10010000110','10000101100','10000100110','10110010000',
  '10110000100','10011010000','10011000010','10000110100','10000110010',
  '11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100',
  '10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110',
  '10111101000','10111100010','11110101000','11110100010','10111011110',
  '10111101110','11101011110','11110101110','11010000100','11010010000',
  '11010011100','1100011101011',
];

function drawBarcode(canvas, text) {
  const BAR_MODULE = 3;
  const HEIGHT = 80;
  const START = 104;
  const STOP = 106;

  const symbols = [START];
  let checksum = START;
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    checksum += v * (i + 1);
    symbols.push(v);
  }
  symbols.push(checksum % 103, STOP);

  let totalModules = 0;
  for (const s of symbols) totalModules += (PATTERNS[s] || '11011001100').length;

  canvas.width = totalModules * BAR_MODULE + 20;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, HEIGHT);

  let x = 10;
  for (const s of symbols) {
    for (const bit of (PATTERNS[s] || '11011001100')) {
      if (bit === '1') ctx.fillRect(x, 0, BAR_MODULE, HEIGHT);
      x += BAR_MODULE;
    }
  }
}

function buildZplLocal() {
  const pw = parseInt(document.getElementById('printWidth').value) || 1200;
  const ll = parseInt(document.getElementById('labelLength').value) || 600;
  const fs = parseInt(document.getElementById('fontSize').value) || 60;
  const bh = parseInt(document.getElementById('barcodeHeight').value) || 150;
  const qty = Math.max(1, parseInt(document.getElementById('quantity').value) || 1);
  const labelName = labelNameEl.value || '';
  const deviceIp = deviceIpEl.value || '';
  const barcodeWidth = (35 + 11 * labelName.length) * 5;
  const barcodeX = Math.max(0, Math.round((pw - barcodeWidth) / 2));
  const barcodeY = labelMode === 'barcode' ? Math.round((ll - bh) / 2) : 240;
  const interp = document.getElementById('showInterpLine').checked ? 'Y' : 'N';

  let zpl = `^XA^PW${pw}^LL${ll}^CI28`;
  if (labelMode === 'full') {
    zpl += `^CF0,${fs}^FO0,80^FB${pw},1,0,C,0^FD${labelName}^FS`;
  }
  zpl += `^BY5,3,${bh}^FO${barcodeX},${barcodeY}^BCN,${bh},${interp},N,N^FD${labelName}^FS`;
  if (labelMode !== 'barcode') {
    zpl += `^CF0,55^FO0,${ll - 50}^FB${pw},1,0,C,0^FD${deviceIp}^FS`;
  }
  zpl += `^PQ${qty}^XZ`;
  return zpl;
}

function updatePreview() {
  const labelName = labelNameEl.value;
  const deviceIp = deviceIpEl.value;
  const showInterp = document.getElementById('showInterpLine').checked;

  previewLabelName.style.display = labelMode === 'full' ? '' : 'none';
  previewLabelName.textContent = labelName || ' ';
  previewBarcodeText.style.display = showInterp ? '' : 'none';
  previewBarcodeText.textContent = labelName || ' ';
  previewDeviceIp.style.display = labelMode === 'full' ? '' : 'none';
  previewDeviceIp.textContent = deviceIp || ' ';
  if (labelName) { try { drawBarcode(barcodeCanvas, labelName); } catch (_) {} }
  zplOutput.textContent = buildZplLocal();
}

document.querySelectorAll('input').forEach(el => el.addEventListener('input', updatePreview));

// ── Toast ──────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ── Single print ───────────────────────────────────────────────
document.getElementById('print-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('print-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const body = {
    labelName: document.getElementById('labelName').value,
    deviceIp: document.getElementById('deviceIp').value,
    printerIp: document.getElementById('printerIp').value,
    printerPort: document.getElementById('printerPort').value,
    printWidth: document.getElementById('printWidth').value,
    labelLength: document.getElementById('labelLength').value,
    fontSize: document.getElementById('fontSize').value,
    barcodeHeight: document.getElementById('barcodeHeight').value,
    quantity: document.getElementById('quantity').value,
    mode: labelMode,
    showInterpLine: document.getElementById('showInterpLine').checked,
  };

  try {
    const res = await fetch('/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      const qty = parseInt(body.quantity) || 1;
      showToast(`${qty} label${qty !== 1 ? 's' : ''} sent to printer.`, 'success');
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Network error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Print Label';
  }
});

// ── CSV parsing ────────────────────────────────────────────────
const REQUIRED_COLS = ['labelName', 'deviceIp'];
const ALL_COLS = ['labelName', 'deviceIp', 'printerIp', 'printerPort', 'quantity'];

let csvRows = [];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = lines[0].split(',').map(h => h.trim());
  for (const col of REQUIRED_COLS) {
    if (!headers.includes(col)) throw new Error(`CSV is missing required column: "${col}"`);
  }

  return lines.slice(1).filter(l => l.trim()).map((line, i) => {
    const vals = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
    return row;
  });
}

function renderTable(rows) {
  const thead = document.getElementById('csv-thead');
  const tbody = document.getElementById('csv-tbody');
  const meta = document.getElementById('csv-meta');

  meta.innerHTML = `<strong>${rows.length}</strong> label${rows.length !== 1 ? 's' : ''} ready to print`;

  const cols = ALL_COLS.filter(c => rows.some(r => r[c]));
  thead.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}<th>status</th></tr>`;
  tbody.innerHTML = rows.map(row =>
    `<tr>${cols.map(c => `<td>${row[c] || '<span style="color:var(--muted)">—</span>'}</td>`).join('')}<td>—</td></tr>`
  ).join('');
}

document.getElementById('csv-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      csvRows = parseCSV(ev.target.result);
      renderTable(csvRows);
      document.getElementById('csv-preview').hidden = false;
      document.getElementById('batch-progress').hidden = true;
      document.getElementById('batch-results').innerHTML = '';
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  reader.readAsText(file);
});

document.getElementById('csv-clear').addEventListener('click', () => {
  csvRows = [];
  document.getElementById('csv-input').value = '';
  document.getElementById('csv-preview').hidden = true;
  document.getElementById('batch-progress').hidden = true;
});

// ── Batch print ────────────────────────────────────────────────
document.getElementById('batch-print-btn').addEventListener('click', async () => {
  if (!csvRows.length) return;

  const batchBtn = document.getElementById('batch-print-btn');
  batchBtn.disabled = true;
  batchBtn.textContent = 'Printing…';

  const defaults = {
    printerIp: document.getElementById('printerIp').value,
    printerPort: document.getElementById('printerPort').value,
    printWidth: document.getElementById('printWidth').value,
    labelLength: document.getElementById('labelLength').value,
    fontSize: document.getElementById('fontSize').value,
    barcodeHeight: document.getElementById('barcodeHeight').value,
  };

  const progressWrap = document.getElementById('batch-progress');
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const resultsEl = document.getElementById('batch-results');

  progressWrap.hidden = false;
  resultsEl.innerHTML = '';
  progressBar.style.width = '0%';

  try {
    const res = await fetch('/print-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels: csvRows, defaults }),
    });
    const data = await res.json();
    const results = data.results || [];
    const total = results.length;
    const ok = results.filter(r => r.ok).length;

    results.forEach((r, i) => {
      const pct = Math.round(((i + 1) / total) * 100);
      progressBar.style.width = `${pct}%`;

      const div = document.createElement('div');
      div.className = `result-row ${r.ok ? 'result-ok' : 'result-err'}`;
      div.innerHTML = r.ok
        ? `<span class="result-icon">✓</span><span>${r.labelName}</span>`
        : `<span class="result-icon">✗</span><span>${r.labelName}</span><span class="result-msg">${r.error}</span>`;
      resultsEl.appendChild(div);
    });

    progressLabel.textContent = `Done — ${ok} of ${total} printed successfully.`;
    showToast(`Batch complete: ${ok}/${total} sent.`, ok === total ? 'success' : 'error');
  } catch (err) {
    progressLabel.textContent = `Error: ${err.message}`;
    showToast(`Batch failed: ${err.message}`, 'error');
  } finally {
    batchBtn.disabled = false;
    batchBtn.textContent = 'Print Batch';
  }
});

// ── Download template ──────────────────────────────────────────
document.getElementById('download-template').addEventListener('click', () => {
  const csv = 'labelName,deviceIp,printerIp,printerPort,quantity\nPHLABELS330,10.180.2.113,10.164.0.100,9100,1\nPHLABELS331,10.180.2.114,,, \n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'labels-template.csv';
  a.click();
});

// ── Init ───────────────────────────────────────────────────────
updatePreview();
