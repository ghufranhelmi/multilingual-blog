export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const clientId = env.GITHUB_CLIENT_ID;
    const clientSecret = env.GITHUB_CLIENT_SECRET;

    if (url.pathname === '/auth') {
      const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user`;
      return Response.redirect(redirectUrl, 302);
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'json',
          'user-agent': 'Cloudflare-Worker-OAuth-Proxy'
        },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
      });
      const data = await response.json();
      const token = data.access_token;

      const script = `
        <script>
          const receiveMessage = (message) => {
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({ token, provider: 'github' })}',
              window.origin
            );
            window.removeEventListener('message', receiveMessage, false);
          }
          window.addEventListener('message', receiveMessage, false);
          window.opener.postMessage('authorizing:github', ${JSON.stringify(url.origin)});
        </script>
      `;
      return new Response(script, { headers: { 'content-type': 'text/html;charset=UTF-8' } });
    }

    return new Response('Not Found', { status: 404 });
  }
};