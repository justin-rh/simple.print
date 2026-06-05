const express = require('express');
const net = require('net');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function buildZpl({ labelName, deviceIp, printWidth, labelLength, fontSize, barcodeHeight, quantity, mode, showInterpLine }) {
  const pw = parseInt(printWidth) || 1200;
  const ll = parseInt(labelLength) || 600;
  const fs = parseInt(fontSize) || 60;
  const bh = parseInt(barcodeHeight) || 150;
  const qty = Math.max(1, parseInt(quantity) || 1);
  const barcodeX = Math.round((pw - 780) / 2);
  const interp = showInterpLine === false || showInterpLine === 'false' ? 'N' : 'Y';

  let zpl = `^XA^PW${pw}^LL${ll}^CI28`;
  if (mode !== 'barcode') {
    zpl += `^CF0,${fs}^FO0,80^FB${pw},1,0,C,0^FD${labelName}^FS`;
  }
  zpl += `^BY5,3,${bh}^FO${barcodeX},240^BCN,${bh},${interp},N,N^FD${labelName}^FS`;
  if (mode !== 'barcode') {
    zpl += `^CF0,55^FO0,${ll - 50}^FB${pw},1,0,C,0^FD${deviceIp}^FS`;
  }
  zpl += `^PQ${qty}^XZ`;
  return zpl;
}

function sendZpl(printerIp, printerPort, zpl) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let settled = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      client.destroy();
      if (err) reject(err); else resolve();
    };

    client.setTimeout(5000);
    client.on('timeout', () => finish(new Error('Connection timed out.')));
    client.on('error', finish);
    client.connect(parseInt(printerPort, 10), printerIp, () => {
      client.write(zpl, 'utf8', () => finish(null));
    });
  });
}

app.post('/print', async (req, res) => {
  const { labelName, deviceIp, printerIp, printerPort, printWidth, labelLength, fontSize, barcodeHeight, quantity } = req.body;

  if (!labelName || (mode !== 'barcode' && !deviceIp) || !printerIp || !printerPort) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const zpl = buildZpl({ labelName, deviceIp, printWidth, labelLength, fontSize, barcodeHeight, quantity });

  try {
    await sendZpl(printerIp, printerPort, zpl);
    res.json({ ok: true, zpl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/print-batch', async (req, res) => {
  const { labels, defaults } = req.body;

  if (!Array.isArray(labels) || labels.length === 0) {
    return res.status(400).json({ error: 'labels array is required.' });
  }

  const results = [];

  for (const label of labels) {
    const config = { ...defaults, ...label };

    if (!config.labelName || !config.deviceIp || !config.printerIp || !config.printerPort) {
      results.push({ ok: false, labelName: config.labelName || '(unknown)', error: 'Missing required fields.' });
      continue;
    }

    const zpl = buildZpl(config);

    try {
      await sendZpl(config.printerIp, config.printerPort, zpl);
      results.push({ ok: true, labelName: config.labelName });
    } catch (err) {
      results.push({ ok: false, labelName: config.labelName, error: err.message });
    }
  }

  res.json({ results });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`simple.print running at http://localhost:${PORT}`));
