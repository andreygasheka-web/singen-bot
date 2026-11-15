require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

function sendJson(res, status, data) {
  res.writeHead(status, { 
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

async function sendViaBrevo(subject, text) {
  const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const toEmail = process.env.EMAIL_TO || 'andreygasheka@gmail.com';

  const body = JSON.stringify({
    sender: { name: 'Hegau Büroservice', email: fromEmail },
    to: [{ email: toEmail }],
    subject,
    textContent: text
  });

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('Brevo API: ' + res.status + ' ' + err);
  }
  return res.json();
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/api/submit-quiz') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const clip = v => (v || '').toString().slice(0, 500);

        const text = [
          'Новая заявка с сайта Hegau Büroservice',
          '----------------------------------------',
          'Имя: ' + (clip(data.name) || '—'),
          'Город: ' + (clip(data.region) || '—'),
          'Услуга: ' + (clip(data.category) || '—'),
          'Срочность: ' + (clip(data.urgency) || '—'),
          'Способ связи: ' + (clip(data.contactMethod) || '—'),
          'Контакт: ' + (clip(data.contactValue) || '—'),
          '----------------------------------------',
          'Время: ' + new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Berlin' })
        ].join('\n');

        console.log('Отправка через Brevo API...');
        await sendViaBrevo('Новая заявка — Hegau Büroservice', text);
        console.log('✅ Отправлено');
        return sendJson(res, 200, { success: true });
      } catch (err) {
        console.error('❌', err.message);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер на порту ${PORT}`);
  console.log('API key:', (process.env.BREVO_API_KEY || process.env.SMTP_PASS) ? 'задан' : 'НЕТ');
});
