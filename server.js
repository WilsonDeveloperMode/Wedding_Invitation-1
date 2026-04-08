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
  }

  sheet.columns = [
    { header: 'Submitted At', key: 'submittedAt', width: 24 },
    { header: 'Guest Name', key: 'name', width: 28 },
    { header: 'Attendance', key: 'attendance', width: 16 },
    { header: 'Attending Count', key: 'guests', width: 18 },
    { header: 'Invitee Limit', key: 'inviteeLimit', width: 16 },
    { header: 'Guest 1', key: 'guest1', width: 24 },
    { header: 'Guest 2', key: 'guest2', width: 24 },
    { header: 'Guest 3', key: 'guest3', width: 24 },
    { header: 'Guest 4', key: 'guest4', width: 24 },
    { header: 'Dietary Requirements', key: 'dietary', width: 30 },
    { header: 'Message', key: 'message', width: 46 }
  ];
  sheet.getRow(1).font = { bold: true };

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

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(
      'Google Sheets webhook failed with status ' + response.status + ': ' + rawBody
    );
  }

  // Some Apps Script handlers return HTTP 200 with { ok: false, error: "..." }.
  // Surface that as a real error so the frontend doesn't show false success.
  let parsedBody = null;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch (_error) {
    parsedBody = null;
  }

  if (parsedBody && parsedBody.ok === false) {
    throw new Error(parsedBody.error || 'Google Sheets webhook reported failure.');
  }

  return { enabled: true };
}

app.post('/api/rsvp', async (req, res) => {
  try {
    const {
      name,
      attendance,
      guests,
      inviteeLimit,
      guest1,
      guest2,
      guest3,
      guest4,
      guest1Dietry,
      guest2Dietry,
      guest3Dietry,
      guest4Dietry,
      guest1Dietary,
      guest2Dietary,
      guest3Dietary,
      guest4Dietary,
      dietary,
      message
    } = req.body;

    if (!name || !attendance) {
      return res.status(400).json({ error: 'Name and attendance are required.' });
    }

    const parsedGuests = Number(guests);
    const guestsCount = Number.isFinite(parsedGuests) ? Math.max(0, Math.round(parsedGuests)) : 1;

    const payload = {
      submittedAt: new Date().toISOString(),
      name: String(name).trim(),
      attendance: String(attendance).trim(),
      guests: guestsCount,
      inviteeLimit: Math.min(4, Math.max(1, Number(inviteeLimit) || 1)),
      guest1: String(guest1 || name || '').trim(),
      guest2: String(guest2 || '').trim(),
      guest3: String(guest3 || '').trim(),
      guest4: String(guest4 || '').trim(),
      guest1Dietry: String(guest1Dietry || guest1Dietary || '').trim(),
      guest2Dietry: String(guest2Dietry || guest2Dietary || '').trim(),
      guest3Dietry: String(guest3Dietry || guest3Dietary || '').trim(),
      guest4Dietry: String(guest4Dietry || guest4Dietary || '').trim(),
      // Compatibility aliases for handlers using Dietary spelling
      guest1Dietary: String(guest1Dietary || guest1Dietry || '').trim(),
      guest2Dietary: String(guest2Dietary || guest2Dietry || '').trim(),
      guest3Dietary: String(guest3Dietary || guest3Dietry || '').trim(),
      guest4Dietary: String(guest4Dietary || guest4Dietry || '').trim(),
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
        inviteeLimit: row.getCell(5).value,
        guest1: row.getCell(6).value,
        guest2: row.getCell(7).value,
        guest3: row.getCell(8).value,
        guest4: row.getCell(9).value,
        dietary: row.getCell(10).value,
        message: row.getCell(11).value
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
