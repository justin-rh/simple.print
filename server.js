const express = require('express');
const net = require('net');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function buildZpl({ labelName, deviceIp, printWidth, labelLength, fontSize, barcodeHeight }) {
  const pw = printWidth || 1200;
  const ll = labelLength || 600;
  const fs = fontSize || 60;
  const bh = barcodeHeight || 150;
  const barcodeX = Math.round((pw - 780) / 2); // center the barcode (~780 dots wide at module 5)

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
    `^FO0,${ll - 50}^FB${pw},1,0,C,0^FD${deviceIp}^FS` +
    `^XZ`
  );
}

app.post('/print', (req, res) => {
  const { labelName, deviceIp, printerIp, printerPort, printWidth, labelLength, fontSize, barcodeHeight } = req.body;

  if (!labelName || !deviceIp || !printerIp || !printerPort) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const zpl = buildZpl({ labelName, deviceIp, printWidth, labelLength, fontSize, barcodeHeight });
  const port = parseInt(printerPort, 10);

  const client = new net.Socket();
  let responded = false;

  const done = (err) => {
    if (responded) return;
    responded = true;
    client.destroy();
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ ok: true, zpl });
    }
  };

  client.setTimeout(5000);
  client.on('timeout', () => done(new Error('Connection timed out.')));
  client.on('error', (err) => done(err));

  client.connect(port, printerIp, () => {
    client.write(zpl, 'utf8', () => done(null));
  });
});

app.get('/preview', (req, res) => {
  const { labelName, deviceIp, printWidth, labelLength, fontSize, barcodeHeight } = req.query;
  if (!labelName || !deviceIp) {
    return res.status(400).json({ error: 'labelName and deviceIp are required.' });
  }
  const zpl = buildZpl({ labelName, deviceIp, printWidth, labelLength, fontSize, barcodeHeight });
  res.json({ zpl });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`simple.print running at http://localhost:${PORT}`));
