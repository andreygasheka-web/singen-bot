require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendJson(res, status, data) {
  res.writeHead(status, { 
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

async function sendToTelegram(text) {
  if (!TOKEN || !CHAT_ID) throw new Error('Нет TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'Telegram error');
  return data;
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
          '<b>Новая заявка — Hegau Büroservice</b>',
          '',
          'Имя: ' + (clip(data.name) || '—'),
          'Город: ' + (clip(data.region) || '—'),
          'Услуга: ' + (clip(data.category) || '—'),
          'Срочность: ' + (clip(data.urgency) || '—'),
          'Способ связи: ' + (clip(data.contactMethod) || '—'),
          'Контакт: ' + (clip(data.contactValue) || '—'),
          '',
          'Время: ' + new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Berlin' })
        ].join('\n');

        console.log('Отправка в Telegram...');
        await sendToTelegram(text);
        console.log('✅ Отправлено в Telegram');
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
  console.log('Telegram:', TOKEN ? 'токен задан' : 'НЕТ ТОКЕНА');
});
