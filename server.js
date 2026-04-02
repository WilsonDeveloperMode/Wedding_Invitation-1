require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const app = express();
const port = process.env.PORT || 3000;
const workbookPath = path.join(__dirname, 'data', 'rsvp-data.xlsx');
const googleSheetsWebhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || '';
const rsvpAdminKey = process.env.RSVP_ADMIN_KEY || '';

app.use(express.json());
app.use(express.static(__dirname));

function requireAdminAccess(req, res, next) {
  const headerKey = req.headers['x-admin-key'];
  const queryKey = req.query.key;

  if (rsvpAdminKey === '') {
    return res.status(404).send('Not found');
  }

  if (headerKey === rsvpAdminKey || queryKey === rsvpAdminKey) {
    return next();
  }

  return res.status(404).send('Not found');
}

async function ensureWorkbook() {
  const workbook = new ExcelJS.Workbook();

  if (fs.existsSync(workbookPath)) {
    await workbook.xlsx.readFile(workbookPath);
  }

  let sheet = workbook.getWorksheet('RSVPs');

  if (!sheet) {
    sheet = workbook.addWorksheet('RSVPs');
    sheet.columns = [
      { header: 'Submitted At', key: 'submittedAt', width: 24 },
      { header: 'Guest Name', key: 'name', width: 28 },
      { header: 'Attendance', key: 'attendance', width: 16 },
      { header: 'Number of Guests', key: 'guests', width: 18 },
      { header: 'Dietary Requirements', key: 'dietary', width: 30 },
      { header: 'Message', key: 'message', width: 46 }
    ];
    sheet.getRow(1).font = { bold: true };
  }

  return { workbook, sheet };
}

async function saveToGoogleSheets(payload) {
  if (googleSheetsWebhookUrl === '') {
    return { enabled: false };
  }

  if (typeof fetch !== 'function') {
    throw new Error(
      'Global fetch is unavailable. Use Node.js 18+ to enable Google Sheets webhook posting.'
    );
  }

  const response = await fetch(googleSheetsWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      'Google Sheets webhook failed with status ' + response.status + ': ' + errorBody
    );
  }

  return { enabled: true };
}

app.post('/api/rsvp', async (req, res) => {
  try {
    const { name, attendance, guests, dietary, message } = req.body;

    if (!name || !attendance) {
      return res.status(400).json({ error: 'Name and attendance are required.' });
    }

    const guestsCount = Number(guests) || 1;

    const payload = {
      submittedAt: new Date().toISOString(),
      name: String(name).trim(),
      attendance: String(attendance).trim(),
      guests: guestsCount,
      dietary: (dietary || '').toString().trim(),
      message: (message || '').toString().trim()
    };

    // Cloud save (Google Sheets) if webhook is configured.
    await saveToGoogleSheets(payload);

    // Local Excel backup.
    const { workbook, sheet } = await ensureWorkbook();
    sheet.addRow(payload);

    await workbook.xlsx.writeFile(workbookPath);

    return res.json({
      ok: true,
      cloudEnabled: googleSheetsWebhookUrl !== ''
    });
  } catch (error) {
    console.error('Failed to save RSVP:', error);
    return res.status(500).json({ error: 'Failed to save RSVP.' });
  }
});

app.get('/api/rsvp/cloud-status', requireAdminAccess, (_req, res) => {
  return res.json({
    googleSheetsEnabled: googleSheetsWebhookUrl !== ''
  });
});

app.get('/api/rsvp', requireAdminAccess, async (_req, res) => {
  try {
    if (!fs.existsSync(workbookPath)) {
      return res.json([]);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(workbookPath);
    const sheet = workbook.getWorksheet('RSVPs');

    if (!sheet) return res.json([]);

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      rows.push({
        submittedAt: row.getCell(1).value,
        name: row.getCell(2).value,
        attendance: row.getCell(3).value,
        guests: row.getCell(4).value,
        dietary: row.getCell(5).value,
        message: row.getCell(6).value
      });
    });

    return res.json(rows);
  } catch (error) {
    console.error('Failed to load RSVPs:', error);
    return res.status(500).json({ error: 'Failed to load RSVPs.' });
  }
});

app.get('/api/rsvp/excel', requireAdminAccess, (_req, res) => {
  if (!fs.existsSync(workbookPath)) {
    return res.status(404).send('No RSVP file yet.');
  }

  return res.download(workbookPath, 'rsvp-data.xlsx');
});

app.listen(port, () => {
  console.log('RSVP app running on http://localhost:' + port);
});
