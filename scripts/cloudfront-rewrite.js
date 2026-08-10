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
function handler(event) {
  var request = event.request
  var uri = request.uri

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
