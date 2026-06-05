export async function onRequest(context) {
  const targetUrl = new URL(context.request.url);
  targetUrl.hostname = 're-think-agent-worker.buleegasy-6c8.workers.dev';
  targetUrl.port = '';
  
  const newHeaders = new Headers(context.request.headers);
  newHeaders.delete('Host');
  
  let bodyData = undefined;
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    bodyData = await context.request.text();
  }
  
  try {
    const response = await fetch(targetUrl.toString(), {
      method: context.request.method,
      headers: newHeaders,
      body: bodyData,
      redirect: 'manual'
    });
    
    // Pass the response back exactly as received
    const finalResponse = new Response(response.body, response);
    // Explicitly add CORS headers just in case
    finalResponse.headers.set('Access-Control-Allow-Origin', '*');
    return finalResponse;
  } catch (err) {
    return new Response('Proxy Function Error: ' + err.message, { status: 500 });
  }
}
