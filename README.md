# Wedding Invitation RSVP

This project now saves RSVP form submissions to an Excel file.

## Run

```bash
npm install
npm start
```

Open: `http://localhost:3000`

## Netlify deployment

For Netlify static hosting, RSVP submission is configured to post directly from the browser to Google Apps Script webhook via the `data-webhook-url` on the RSVP form in `index.html`.

- No Node server is required on Netlify for RSVP saving.
- If you rotate webhook URL, update `data-webhook-url` in `index.html`.

## Where RSVP data goes

- Excel file path: `data/rsvp-data.xlsx`
- Google Sheets webhook URL source: `.env` -> `GOOGLE_SHEETS_WEBHOOK_URL`

## Developer-only data access

Guest users cannot view RSVP data from the UI.

Set a secret key in `.env`:

```bash
RSVP_ADMIN_KEY="set-a-strong-secret-key"
```

Use that key to access developer endpoints:

- JSON submissions: `http://localhost:3000/api/rsvp?key=YOUR_RSVP_ADMIN_KEY`
- Download Excel: `http://localhost:3000/api/rsvp/excel?key=YOUR_RSVP_ADMIN_KEY`
- Cloud status: `http://localhost:3000/api/rsvp/cloud-status?key=YOUR_RSVP_ADMIN_KEY`

Alternative using request header:

```bash
curl -H "x-admin-key: YOUR_RSVP_ADMIN_KEY" http://localhost:3000/api/rsvp
```

## Important note about "always open" Excel

If the same `.xlsx` file is open in desktop Excel, your system may lock the file and block new writes.
For reliable live writing, keep the file closed while collecting RSVPs, then open it to review.

## Save RSVP directly to Google Sheets (cloud)

This app can save each RSVP to Google Sheets automatically using a Google Apps Script webhook.

### 1. Create a Google Sheet

Create a sheet with this header row in row 1:

`Submitted At | Guest Name | Attendence | Attending Count | Invitee Limit | Guest 1 | Guest 1 Dietry | Guest 2 | Guest 2 Dietry | Guest 3 | Guest 3 Dietry | Guest 4 | Guest 4 Dietry | Message`

### 2. Create Apps Script webhook

In Google Sheet: `Extensions` -> `Apps Script`, then paste:

```javascript
function doPost(e) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Sheet1') || spreadsheet.getActiveSheet();
  var data = {};

  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    data = {};
  }

  var rawHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var normalizedToIndex = {};
  for (var i = 0; i < rawHeaders.length; i++) {
    var normalized = normalizeHeader(rawHeaders[i]);
    if (normalized) normalizedToIndex[normalized] = i;
  }

  var out = new Array(rawHeaders.length).fill('');

  function setByHeader(headerName, value) {
    var idx = normalizedToIndex[normalizeHeader(headerName)];
    if (typeof idx === 'number') out[idx] = value || '';
  }

  setByHeader('Submitted At', data.submittedAt || '');
  setByHeader('Guest Name', data.name || '');
  setByHeader('Attendence', data.attendance || '');
  setByHeader('Attending Count', data.guests || '');
  setByHeader('Invitee Limit', data.inviteeLimit || '');
  setByHeader('Guest 1', data.guest1 || '');
  setByHeader('Guest 1 Dietry', data.guest1Dietry || data.guest1Dietary || '');
  setByHeader('Guest 2', data.guest2 || '');
  setByHeader('Guest 2 Dietry', data.guest2Dietry || data.guest2Dietary || '');
  setByHeader('Guest 3', data.guest3 || '');
  setByHeader('Guest 3 Dietry', data.guest3Dietry || data.guest3Dietary || '');
  setByHeader('Guest 4', data.guest4 || '');
  setByHeader('Guest 4 Dietry', data.guest4Dietry || data.guest4Dietary || '');
  setByHeader('Message', data.message || '');

  sheet.appendRow(out);

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  // Ensure header filter exists.
  var headerRange = sheet.getRange(1, 1, 1, lastCol);
  if (!sheet.getFilter()) {
    headerRange.createFilter();
  }

  // Sort rows: yes first, no last.
  if (lastRow > 2) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    var rows = dataRange.getValues();

    rows.sort(function(a, b) {
      return attendanceWeight(a[2]) - attendanceWeight(b[2]); // Attendance is col 3 (index 2)
    });

    dataRange.setValues(rows);
  }

  applyAttendanceColors(sheet);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[`"'’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function attendanceWeight(value) {
  var status = String(value || '').toLowerCase().trim();
  if (status === 'yes') return 0;
  if (status === 'no') return 2;
  return 1;
}

function applyAttendanceColors(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;

  var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  var values = range.getValues();
  var backgrounds = values.map(function(row) {
    var status = String(row[2] || '').toLowerCase().trim(); // Attendance col
    var color = '#FFFFFF';
    if (status === 'yes') color = '#E6F4EA';
    if (status === 'no') color = '#FCE8E6';
    return new Array(lastCol).fill(color);
  });

  range.setBackgrounds(backgrounds);
}
```

Deploy it:
1. `Deploy` -> `New deployment`
2. Type: `Web app`
3. Execute as: `Me`
4. Who has access: `Anyone`
5. Copy the Web app URL

### 3. Set webhook URL in your server

Option A: one-time command:

```bash
GOOGLE_SHEETS_WEBHOOK_URL="PASTE_YOUR_WEB_APP_URL_HERE" npm start
```

Option B: set it in `.env` (already supported by this project), then just run:

```bash
npm start
```

Now every RSVP writes to:
1. Google Sheets (cloud)
2. Local `data/rsvp-data.xlsx` backup
