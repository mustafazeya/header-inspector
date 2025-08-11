// Header Inspector core logic
// Provides functions to normalize and extract common and custom headers

const COMMON_HEADER_MAP = {
  // Client/forwarded IPs
  'x-forwarded-for': 'x-forwarded-for',
  'x-real-ip': 'x-real-ip',
  'cf-connecting-ip': 'cf-connecting-ip',
  'true-client-ip': 'true-client-ip',
  'x-client-ip': 'x-client-ip',
  'x-cluster-client-ip': 'x-cluster-client-ip',
  'forwarded': 'forwarded',

  // Host/proto
  'x-forwarded-host': 'x-forwarded-host',
  'host': 'host',
  'x-forwarded-proto': 'x-forwarded-proto',
  'x-forwarded-port': 'x-forwarded-port',
  'x-original-host': 'x-original-host',
  'x-original-proto': 'x-original-proto',
  'x-forwarded-server': 'x-forwarded-server',
  'x-forwarded-prefix': 'x-forwarded-prefix',
  'x-forwarded-uri': 'x-forwarded-uri',
  'x-forwarded-path': 'x-forwarded-path',
  'x-forwarded-base': 'x-forwarded-base',
  'x-forwarded-ssl': 'x-forwarded-ssl',
  'x-url-scheme': 'x-url-scheme',
  'x-scheme': 'x-scheme',
  'x-rewrite-url': 'x-rewrite-url',
  ':authority': ':authority',

  // CDN/Proxies
  'via': 'via',
  'cf-ray': 'cf-ray',
  'cf-visitor': 'cf-visitor',
  'x-akamai-edgescape': 'x-akamai-edgescape',
  'x-akamai-request-id': 'x-akamai-request-id',
  'fastly-client-ip': 'fastly-client-ip',

  // Auth/user
  'authorization': 'authorization',
  'x-forwarded-user': 'x-forwarded-user',
  'x-authenticated-user': 'x-authenticated-user',

  // Misc common
  'user-agent': 'user-agent',
  'accept-language': 'accept-language',
  'referer': 'referer',
  'origin': 'origin',
  'cookie': 'cookie',
  'content-type': 'content-type',

  // Frequently seen browser and caching headers
  'accept': 'accept',
  'accept-encoding': 'accept-encoding',
  'cache-control': 'cache-control',
  'pragma': 'pragma',
  'upgrade-insecure-requests': 'upgrade-insecure-requests',
  'connection': 'connection',

  // Client hints and fetch metadata (Chrome and others)
  'sec-ch-ua': 'sec-ch-ua',
  'sec-ch-ua-mobile': 'sec-ch-ua-mobile',
  'sec-ch-ua-platform': 'sec-ch-ua-platform',
  'sec-fetch-site': 'sec-fetch-site',
  'sec-fetch-mode': 'sec-fetch-mode',
  'sec-fetch-user': 'sec-fetch-user',
  'sec-fetch-dest': 'sec-fetch-dest',
  'dnt': 'dnt',
  'sec-gpc': 'sec-gpc'
};

// Comprehensive lists for IP- and Host-related headers
const IP_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'x-client-ip',
  'x-cluster-client-ip',
  'true-client-ip',
  'cf-connecting-ip',
  'fastly-client-ip',
  'x-azure-clientip',
  'fly-client-ip',
  'do-connecting-ip',
  'x-envoy-external-address',
  'x-remote-ip',
  'x-remote-addr',
  // RFC 7239 Forwarded can embed for= (IP)
  'forwarded'
];

const HOST_HEADERS = [
  'host',
  ':authority',
  'x-forwarded-host',
  'x-forwarded-server',
  'x-forwarded-proto',
  'x-forwarded-port',
  'x-forwarded-prefix',
  'x-forwarded-uri',
  'x-forwarded-path',
  'x-forwarded-base',
  'x-forwarded-ssl',
  'x-original-host',
  'x-original-proto',
  'x-url-scheme',
  'x-scheme',
  'x-rewrite-url',
  // RFC 7239 Forwarded can embed host= and proto=
  'forwarded'
];

// Ensure COMMON_HEADER_MAP includes all of the above
for (const h of [...IP_HEADERS, ...HOST_HEADERS]) {
  if (!COMMON_HEADER_MAP[h]) COMMON_HEADER_MAP[h] = h;
}

function parseXForwardedFor(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseForwarded(value) {
  // RFC 7239 Forwarded: for=192.0.2.60;proto=http;by=203.0.113.43
  if (!value) return [];
  return String(value)
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(kvList => {
      const obj = {};
      kvList.split(';').forEach(kv => {
        const [k, v] = kv.split('=');
        if (k && v) obj[k.trim()] = v.trim().replace(/^\"|\"$/g, '');
      });
      return obj;
    });
}

function getEnvDefaultInclude() {
  const raw = process.env.DEFAULT_COMMON_HEADERS;
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function extractCommon(headers) {
  const lower = {};
  Object.entries(headers || {}).forEach(([k, v]) => {
    lower[k.toLowerCase()] = v;
  });

  const out = {};
  // Start with the built-in set
  for (const key of Object.keys(COMMON_HEADER_MAP)) {
    if (lower[key] !== undefined) out[key] = lower[key];
  }

  // Add any env-configured extras
  for (const key of getEnvDefaultInclude()) {
    if (lower[key] !== undefined) out[key] = lower[key];
  }

  // Helpful parsed fields
  out['$parsed'] = {
    xForwardedFor: parseXForwardedFor(lower['x-forwarded-for']),
  forwarded: parseForwarded(lower['forwarded'])
  };

  return out;
}

function extractCustom(headers, includeList = []) {
  if (!Array.isArray(includeList) || includeList.length === 0) return {};
  const lowerSet = new Set(includeList.map(h => String(h).toLowerCase()));
  const out = {};
  Object.entries(headers || {}).forEach(([k, v]) => {
    const lk = k.toLowerCase();
    if (lowerSet.has(lk)) out[lk] = v;
  });
  return out;
}

function buildResponse(req, customInclude) {
  const common = extractCommon(req.headers);
  const custom = extractCustom(req.headers, customInclude);

  return {
    method: req.method,
    path: req.path,
    httpVersion: req.httpVersion,
    timestamp: new Date().toISOString(),
    remoteAddress: req.socket?.remoteAddress,
    protocol: req.protocol,
    ips: req.ips || [],
    commonHeaders: common,
    customHeaders: custom,
    allHeaders: req.headers
  };
}

module.exports = {
  COMMON_HEADER_MAP,
  IP_HEADERS,
  HOST_HEADERS,
  parseXForwardedFor,
  parseForwarded,
  extractCommon,
  extractCustom,
  buildResponse
};
