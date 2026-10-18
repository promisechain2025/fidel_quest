/* ============================================================================
   CloudFront Function (viewer-request) - directory indexes for a static SPA
   ----------------------------------------------------------------------------
   S3's REST endpoint (the one you use with Origin Access Control) has no
   concept of an index document for a sub-path: a request for /pricing returns
   NoSuchKey, even though dist/pricing/index.html exists. This function maps
   extensionless paths onto that file, which is what makes the prerendered
   per-route <head> actually reachable.

     /              -> /index.html
     /pricing       -> /pricing/index.html
     /pricing/      -> /pricing/index.html
     /app           -> /app/index.html
     /assets/x.js   -> untouched (has an extension)

   Anything with no matching object still 404s at S3; the distribution's
   custom error response turns that into the SPA shell with a 404 status,
   so unknown URLs render the in-app "Page not found" without being served
   as a soft 200.

   Deploy: create a CloudFront Function named `egeez-rewrite`, paste this,
   publish, and associate it with the default behaviour on viewer request.
   ========================================================================== */
/* Pages that are not the app, its price, or the store legal pages.
   Keep this list identical to website/src/siteAccess.js CLOSED_PREFIXES.
   A request for one of them goes home (302) instead of serving the old HTML. */
var CLOSED = [
  '/amharic', '/tigrinya', '/teachers', '/homeschool', '/alphabet',
  '/about', '/guides', '/family', '/teach', '/verify', '/family-pack',
]

function isClosed(uri) {
  var path = uri.split('?')[0]
  if (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1)
  for (var i = 0; i < CLOSED.length; i++) {
    var p = CLOSED[i]
    if (path === p || path.indexOf(p + '/') === 0) return true
  }
  return false
}

function handler(event) {
  var request = event.request
  var uri = request.uri

  if (isClosed(uri)) {
    return {
      statusCode: 302,
      statusDescription: 'Found',
      headers: { location: { value: '/' } },
    }
  }

  // Already a file (has a dot in the last segment) - leave it alone.
  var last = uri.substring(uri.lastIndexOf('/') + 1)
  if (last.indexOf('.') !== -1) return request

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html'
  } else {
    request.uri = uri + '/index.html'
  }
  return request
}
