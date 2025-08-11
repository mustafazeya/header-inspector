const express = require('express');
const app = express();
const { buildResponse } = require('./app');

const PORT = process.env.PORT || 3000;

app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// GET / -> basic health
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'header-inspector', time: new Date().toISOString() });
});

// GET /headers?include=x-custom-1,x-custom-2
app.get('/headers', (req, res) => {
  const include = (req.query.include ? String(req.query.include).split(',') : [])
    .map(s => s.trim())
    .filter(Boolean);
  const resp = buildResponse(req, include);
  res.json(resp);
});

// POST /echo to echo body and headers
app.post('/echo', (req, res) => {
  const include = (req.query.include ? String(req.query.include).split(',') : [])
    .map(s => s.trim())
    .filter(Boolean);
  const resp = buildResponse(req, include);
  res.json({ ...resp, body: req.body });
});

// fallback route to inspect any path
app.all('*', (req, res) => {
  const include = (req.query.include ? String(req.query.include).split(',') : [])
    .map(s => s.trim())
    .filter(Boolean);
  const resp = buildResponse(req, include);
  res.json(resp);
});

app.listen(PORT, () => {
  console.log(`header-inspector listening on :${PORT}`);
});
