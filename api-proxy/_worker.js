export default {
  async fetch(request, env) {
    // Extremely permissive CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const targetUrl = new URL(request.url);
    targetUrl.hostname = 're-think-agent-worker.buleegasy-6c8.workers.dev';
    targetUrl.port = '';
    
    const newHeaders = new Headers(request.headers);
    newHeaders.delete('Host');
    
    // Forward original client IP and CF region data
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || '';
    if (clientIP) newHeaders.set('X-Client-IP', clientIP);
    if (request.cf) {
      if (request.cf.country) newHeaders.set('X-Client-Country', request.cf.country);
      if (request.cf.region) newHeaders.set('X-Client-Region', request.cf.region);
      if (request.cf.city) newHeaders.set('X-Client-City', request.cf.city);
    }
    
    let bodyData = undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      bodyData = await request.text();
    }
    
    try {
      const res = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: bodyData,
        redirect: 'manual'
      });
      const finalRes = new Response(res.body, res);
      // Inject CORS headers into the real response
      Object.entries(corsHeaders).forEach(([k, v]) => finalRes.headers.set(k, v));
      return finalRes;
    } catch (e) {
      return new Response(e.message, { status: 500, headers: corsHeaders });
    }
  }
}
