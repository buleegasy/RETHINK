const code = `
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = new URL(request.url);
      targetUrl.hostname = 're-think-agent-worker.buleegasy-6c8.workers.dev';
      targetUrl.port = '';
      const newHeaders = new Headers(request.headers);
      newHeaders.delete('Host');
      
      let bodyData = undefined;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        bodyData = await request.text();
      }
      
      const res = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: bodyData,
        redirect: 'manual'
      });
      const finalRes = new Response(res.body, res);
      finalRes.headers.set('Access-Control-Allow-Origin', '*');
      return finalRes;
    }
    return env.ASSETS.fetch(request);
  }
}
`
