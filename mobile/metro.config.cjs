const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Android's dev bundle downloader can fail on Windows multipart progress streams.
// Serve the same JS bundle as a normal response. Assets, manifests and HMR retain
// Expo's normal middleware. This affects the development server, not game rules.
// https://github.com/expo/expo/issues/49111
if (process.platform === 'win32') {
  const enhance = config.server.enhanceMiddleware;
  config.server.enhanceMiddleware = (middleware, server) => {
    const handler = enhance ? enhance(middleware, server) : middleware;
    return (request, response, next) => {
      if (/\.bundle(?:\?|$)/.test(request.url ?? '')) {
        request.headers.accept = 'application/javascript';
      }
      return handler(request, response, next);
    };
  };
}
module.exports = config;
