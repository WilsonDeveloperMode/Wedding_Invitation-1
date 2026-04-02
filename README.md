# Wedding Invitation RSVP

This project now saves RSVP form submissions to an Excel file.

## Run

```bash
npm install
npm start
```

Open: `http://localhost:3000`

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

`Submitted At | Guest Name | Attendance | Number of Guests | Dietary Requirements | Message`

### 2. Create Apps Script webhook

In Google Sheet: `Extensions` -> `Apps Script`, then paste:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.submittedAt || '',
    data.name || '',
    data.attendance || '',
    data.guests || '',
    data.dietary || '',
    data.message || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
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
