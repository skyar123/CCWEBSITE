// Netlify Function: ghost-subscribe
// Uses Ghost Admin API (JWT auth) to create/subscribe a member.
// Requires env var: GHOST_ADMIN_API_KEY  (format: keyId:keySecret)
// Set it in Netlify → Site → Environment variables.

const https = require('https');
const crypto = require('crypto');

function makeJwt(apiKey) {
  const [id, secret] = apiKey.split(':');
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function adminPost(path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'connected-circles.ghost.io',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Accept': 'application/json',
        'Authorization': `Ghost ${token}`,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GHOST_ADMIN_API_KEY;
  if (!apiKey || !apiKey.includes(':')) {
    console.error('GHOST_ADMIN_API_KEY env var is not set or invalid');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Subscription service is not configured. Please contact us directly.' }),
    };
  }

  let email;
  try {
    const body = JSON.parse(event.body || '{}');
    email = (body.email || '').trim().toLowerCase();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Please enter a valid email address.' }),
    };
  }

  try {
    const token = makeJwt(apiKey);

    // Create the member — send_email and email_type must be query params, not body fields
    const { status, body } = await adminPost(
      '/ghost/api/admin/members/?send_email=true&email_type=signup',
      { members: [{ email, subscribed: true }] },
      token
    );

    if (status === 201) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    }

    // 422 = member already exists
    if (status === 422) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, already_subscribed: true }),
      };
    }

    let msg = 'Something went wrong. Please try again.';
    try {
      const d = JSON.parse(body);
      if (d?.errors?.[0]?.message) msg = d.errors[0].message;
    } catch { /* ignore */ }

    console.error('Ghost Admin API error', status, body);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: msg }),
    };
  } catch (err) {
    console.error('Ghost Admin API request failed', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Could not reach the subscription service. Please try again.' }),
    };
  }
};
