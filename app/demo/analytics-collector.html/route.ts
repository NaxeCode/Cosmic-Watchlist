export const dynamic = 'force-static';

// Export a standalone document, without the site's React layout or URL history.
export function GET() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id) return new Response(null, { status: 204 });
  if (!/^G-[A-Z0-9]+$/.test(id)) throw new Error('Invalid NEXT_PUBLIC_GA_MEASUREMENT_ID');
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'; script-src https://naxe.dev/analytics/collector.js https://www.googletagmanager.com/gtag/js; connect-src https://*.google-analytics.com/g/collect https://analytics.google.com/g/collect https://*.analytics.google.com/g/collect; img-src https://*.google-analytics.com/g/collect; style-src 'unsafe-inline'">
  <meta name="referrer" content="no-referrer">
  <!-- The empty frame has no scrollable UI or automatic scroll milestone. -->
  <style>html { min-height: 2000px; overflow: hidden }</style>
  <title>Portfolio analytics</title>
  <script defer referrerpolicy="no-referrer" src="https://naxe.dev/analytics/collector.js" data-measurement-id="${id}"></script>
</head>
<body></body>
</html>
`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
