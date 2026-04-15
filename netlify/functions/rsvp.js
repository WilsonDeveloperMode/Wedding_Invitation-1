exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed.' })
    };
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || '';
  if (webhookUrl === '') {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing GOOGLE_SHEETS_WEBHOOK_URL.' })
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body.' })
    };
  }

  const name = String(body.name || '').trim();
  const attendance = String(body.attendance || '').trim();

  if (!name || !attendance) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Name and attendance are required.' })
    };
  }

  const parsedGuests = Number(body.guests);
  const guestsCount = Number.isFinite(parsedGuests) ? Math.max(0, Math.round(parsedGuests)) : 1;

  const payload = {
    submittedAt: body.submittedAt || new Date().toISOString(),
    name,
    attendance,
    guests: guestsCount,
    inviteeLimit: Math.min(4, Math.max(1, Number(body.inviteeLimit) || 1)),
    guest1: String(body.guest1 || name || '').trim(),
    guest2: String(body.guest2 || '').trim(),
    guest3: String(body.guest3 || '').trim(),
    guest4: String(body.guest4 || '').trim(),
    guest1Dietry: String(body.guest1Dietry || body.guest1Dietary || '').trim(),
    guest2Dietry: String(body.guest2Dietry || body.guest2Dietary || '').trim(),
    guest3Dietry: String(body.guest3Dietry || body.guest3Dietary || '').trim(),
    guest4Dietry: String(body.guest4Dietry || body.guest4Dietary || '').trim(),
    guest1Dietary: String(body.guest1Dietary || body.guest1Dietry || '').trim(),
    guest2Dietary: String(body.guest2Dietary || body.guest2Dietry || '').trim(),
    guest3Dietary: String(body.guest3Dietary || body.guest3Dietry || '').trim(),
    guest4Dietary: String(body.guest4Dietary || body.guest4Dietry || '').trim(),
    dietary: String(body.dietary || '').trim(),
    message: String(body.message || '').trim()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const raw = await response.text();

    if (!response.ok) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Google Sheets webhook failed: ' + raw })
      };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      parsed = null;
    }

    if (parsed && parsed.ok === false) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: parsed.error || 'Google Sheets webhook reported failure.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, cloudEnabled: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Failed to save RSVP.' })
    };
  }
};
//test