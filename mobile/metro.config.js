const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wav')) {
  config.resolver.assetExts.push('wav');
}
if (!config.resolver.assetExts.includes('mp3')) {
  config.resolver.assetExts.push('mp3');
}

const BACKEND_PORT = process.env.BACKEND_PORT || 8000;
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';

function proxyApi(req, res, next) {
  if (!req.url || !req.url.startsWith('/api/')) {
    return next();
  }
  const headers = { ...req.headers };
  delete headers['host'];
  delete headers['content-length'];

  const proxyReq = http.request(
    {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'Backend unavailable: ' + err.message }));
  });

  req.pipe(proxyReq);
}

const previousEnhance = config.server && config.server.enhanceMiddleware;
config.server = {
  ...(config.server || {}),
  enhanceMiddleware: (metroMiddleware, server) => {
    const wrapped = previousEnhance
      ? previousEnhance(metroMiddleware, server)
      : metroMiddleware;
    return (req, res, next) => proxyApi(req, res, () => wrapped(req, res, next));
  },
};

module.exports = config;
