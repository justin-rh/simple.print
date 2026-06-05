# simple.print

A web UI for printing ZPL labels directly to Zebra printers over the network.

## Features

- **Full Label mode** — prints a header text, centered Code 128 barcode, and device IP at the bottom
- **Barcode Only mode** — prints a wide barcode scaled to ~75% of label width, vertically centered
- **Show/hide text under barcode** — toggles the human-readable interpretation line
- **Copies** — uses the ZPL `^PQ` command to print multiple copies in one job
- **Live preview** — label preview and ZPL output update as you type
- **Advanced settings** — configure print width, label length, font size, and barcode height in dots
- **CSV batch printing** — upload a CSV to print multiple labels in one go, with per-label status reporting
- **Download template** — generates a pre-filled CSV template to get started

## Requirements

- [Node.js](https://nodejs.org) v18+
- A Zebra printer accessible on the network via raw TCP (port 9100)

## Setup

```bash
git clone https://github.com/justin-rh/simple.print.git
cd simple.print
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## CSV Format

Upload a CSV file to print multiple labels at once. Required columns are `labelName` and `deviceIp`. All other columns are optional and fall back to whatever is set in the Printer Target fields.

```csv
labelName,deviceIp,printerIp,printerPort,quantity
PHLABELS330,10.180.2.113,10.164.0.100,9100,1
PHLABELS331,10.180.2.114,,,2
```

| Column | Required | Description |
|---|---|---|
| `labelName` | Yes | Text printed as the header and encoded in the barcode |
| `deviceIp` | Yes | Text printed at the bottom of the label |
| `printerIp` | No | Target printer IP (falls back to form value) |
| `printerPort` | No | Target printer port (falls back to form value, default 9100) |
| `quantity` | No | Number of copies (defaults to 1) |

> `deviceIp` is not used in Barcode Only mode.

## How It Works

The backend builds a ZPL string and sends it as raw TCP to the printer on port 9100 — the same as piping through `nc`. No printer drivers required.
