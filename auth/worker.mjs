// Deploy separately from GitHub Pages. Secrets belong in the Worker environment.
const cookieName = '__Host-kitchen-oauth'
const cookie = (value, age) => `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }
const fail = (message, status = 400) => new Response(message, { status, headers: { ...headers, 'Set-Cookie': cookie('', 0) } })
const random = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('')
const scriptJSON = value => JSON.stringify(value).replace(/</g, '\\u003c')

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method !== 'GET') return fail('Method not allowed.', 405)
    if (url.protocol !== 'https:') return fail('HTTPS required.')
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.ADMIN_GITHUB_IDS || !env.SITE_ORIGIN || !env.AUTH_ORIGIN || !env.GITHUB_REPO) {
      return fail('Sign-in service has not been configured.', 503)
    }
    if (url.origin !== env.AUTH_ORIGIN) return fail('Unexpected authentication host.')
    const site = new URL(env.SITE_ORIGIN)
    if (site.protocol !== 'https:' || site.origin !== env.SITE_ORIGIN) return fail('Invalid site origin.', 503)
    const callback = `${env.AUTH_ORIGIN}/callback`
    if (url.pathname === '/auth') {
      const state = random()
      const verifier = random()
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
      const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const target = new URL('https://github.com/login/oauth/authorize')
      target.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: callback, scope: 'public_repo', state, code_challenge: challenge, code_challenge_method: 'S256', allow_signup: 'false' }).toString()
      return new Response(null, { status: 302, headers: { ...headers, Location: target.href, 'Set-Cookie': cookie(`${state}.${verifier}`, 600) } })
    }
    if (url.pathname !== '/callback') return fail('Not found.', 404)
    const saved = request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
    const [state, verifier] = (saved || '').split('.')
    if (!state || !verifier || !/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(verifier) || url.searchParams.get('state') !== state) return fail('Sign-in expired or could not be verified. Close this window and try again.')
    if (url.searchParams.has('error') || !url.searchParams.get('code')) return fail('GitHub sign-in was cancelled. Close this window and try again.')
    try {
      const exchange = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, redirect_uri: callback, code: url.searchParams.get('code'), code_verifier: verifier }),
      })
      const token = await exchange.json()
      if (!exchange.ok || !token.access_token || token.error) return fail('GitHub could not complete sign-in. Please try again.', 401)
      const apiHeaders = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'Maria-Kitchen-Notebook', 'X-GitHub-Api-Version': '2022-11-28' }
      const userResponse = await fetch('https://api.github.com/user', { headers: apiHeaders })
      const user = await userResponse.json()
      const allowed = env.ADMIN_GITHUB_IDS.split(',').map(id => id.trim()).filter(Boolean)
      if (!userResponse.ok || !allowed.includes(String(user.id))) return fail('This GitHub account has not been invited to edit this website.', 403)
      const repoResponse = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}`, { headers: apiHeaders })
      const repo = await repoResponse.json()
      if (!repoResponse.ok || !repo.permissions?.push) return fail('This account needs write access to the website repository.', 403)
      const nonce = random()
      const payload = `authorization:github:success:${JSON.stringify({ token: token.access_token, provider: 'github' })}`
      // Decap's popup handshake. Never send the credential to an arbitrary opener origin.
      const html = `<!doctype html><meta charset="utf-8"><title>Kitchen sign-in</title><p>Completing sign-in… You can close this window once the editor opens.</p><script nonce="${nonce}">
        const origin = ${scriptJSON(env.SITE_ORIGIN)};
        const opener = window.opener;
        if (opener) {
          window.addEventListener('message', function finish(event) {
            if (event.origin !== origin || event.source !== opener || event.data !== 'authorizing:github') return;
            window.removeEventListener('message', finish);
            opener.postMessage(${scriptJSON(payload)}, origin);
            window.close();
          });
          opener.postMessage('authorizing:github', origin);
        }
      </script>`
      return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': cookie('', 0), 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'` } })
    } catch {
      return fail('The sign-in provider is unavailable. Please try again shortly.', 502)
    }
  },
}
