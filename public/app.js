// Live preview fields
const labelNameEl = document.getElementById('labelName');
const deviceIpEl = document.getElementById('deviceIp');
const previewLabelName = document.getElementById('preview-label-name');
const previewBarcodeText = document.getElementById('preview-barcode-text');
const previewDeviceIp = document.getElementById('preview-device-ip');
const zplOutput = document.getElementById('zpl-output');
const barcodeCanvas = document.getElementById('barcode-canvas');

// Collapsible advanced section
const toggle = document.querySelector('.collapse-toggle');
const body = document.querySelector('.collapse-body');
toggle.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  body.hidden = expanded;
});

// Minimal Code 128 barcode renderer (subset B only)
function drawBarcode(canvas, text) {
  const CODE128B_START = 104;
  const CODE128_STOP = 106;
  const BAR_MODULE = 3;
  const HEIGHT = 80;

  // Code 128B encoding table (values for chars 32–126)
  const encode128B = (str) => {
    const bars = [];
    let checksum = CODE128B_START;
    bars.push(CODE128B_START);
    for (let i = 0; i < str.length; i++) {
      const v = str.charCodeAt(i) - 32;
      checksum += v * (i + 1);
      bars.push(v);
    }
    bars.push(checksum % 103);
    bars.push(CODE128_STOP);
    return bars;
  };

  // Widths for each symbol (11 modules each, stop = 13)
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
    '11010011100','1100011101011'  // stop pattern (index 106)
  ];

  const symbols = encode128B(text);
  let totalModules = 0;
  for (const s of symbols) {
    const p = PATTERNS[s];
    totalModules += p ? p.length : 11;
  }

  const w = totalModules * BAR_MODULE + 20;
  canvas.width = w;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, HEIGHT);

  let x = 10;
  for (const s of symbols) {
    const pattern = PATTERNS[s] || '11011001100';
    for (const bit of pattern) {
      if (bit === '1') {
        ctx.fillStyle = '#000';
        ctx.fillRect(x, 0, BAR_MODULE, HEIGHT);
      }
      x += BAR_MODULE;
    }
  }
}

function buildZplPreview() {
  const pw = document.getElementById('printWidth').value || 1200;
  const ll = document.getElementById('labelLength').value || 600;
  const fs = document.getElementById('fontSize').value || 60;
  const bh = document.getElementById('barcodeHeight').value || 150;
  const labelName = labelNameEl.value || '';
  const deviceIp = deviceIpEl.value || '';
  const barcodeX = Math.round((pw - 780) / 2);

  return (
    `^XA` +
    `^PW${pw}` +
    `^LL${ll}` +
    `^CI28` +
    `^CF0,${fs}` +
    `^FO0,80^FB${pw},1,0,C,0^FD${labelName}^FS` +
    `^BY5,3,${bh}` +
    `^FO${barcodeX},240^BCN,${bh},Y,N,N^FD${labelName}^FS` +
    `^CF0,55` +
    `^FO0,${parseInt(ll) - 50}^FB${pw},1,0,C,0^FD${deviceIp}^FS` +
    `^XZ`
  );
}

function updatePreview() {
  const labelName = labelNameEl.value;
  const deviceIp = deviceIpEl.value;

  previewLabelName.textContent = labelName || ' ';
  previewBarcodeText.textContent = labelName || ' ';
  previewDeviceIp.textContent = deviceIp || ' ';

  if (labelName) {
    try { drawBarcode(barcodeCanvas, labelName); } catch (_) {}
  }

  zplOutput.textContent = buildZplPreview();
}

// Wire up all inputs for live preview
document.querySelectorAll('input').forEach(el => el.addEventListener('input', updatePreview));

// Toast helper
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// Form submit
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
  };

  try {
    const res = await fetch('/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Label sent to printer.', 'success');
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

// Init
updatePreview();
