require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

function sendJson(res, status, data) {
  res.writeHead(status, { 
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
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

        console.log('Попытка отправки письма...');
        await transporter.sendMail({
          from: `"Hegau Büroservice" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_TO,
          subject: 'Новая заявка — Hegau Büroservice',
          text
        });

        console.log('✅ Заявка отправлена:', data.contactValue);
        return sendJson(res, 200, { success: true });
      } catch (err) {
        console.error('❌ Ошибка отправки:', err.message);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // Static
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'задан' : 'НЕ ЗАДАН');
});
