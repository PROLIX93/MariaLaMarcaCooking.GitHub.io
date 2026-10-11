import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import worker from './worker.mjs'

const env = {
  GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-secret',
  ADMIN_GITHUB_IDS: '123', SITE_ORIGIN: 'https://marialamarcacooking.com',
  AUTH_ORIGIN: 'https://auth.example.com', GITHUB_REPO: 'owner/blog',
}
const request = (path, cookie) => new Request(`${env.AUTH_ORIGIN}${path}`, { headers: cookie ? { Cookie: cookie } : {} })
async function start() {
  const result = await worker.fetch(request('/auth'), env)
  const target = new URL(result.headers.get('Location'))
  const cookie = result.headers.get('Set-Cookie').split(';')[0]
  return { target, cookie, path: `/callback?code=test-code&state=${target.searchParams.get('state')}` }
}
async function withGitHub(user, push, run) {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push([url, options])
    const data = url.includes('access_token') ? { access_token: 'test-token' } : url.endsWith('/user') ? { id: user } : { permissions: { push } }
    return Response.json(data)
  }
  try { await run(calls) } finally { globalThis.fetch = original }
}

test('unconfigured service refuses login', async () => {
  assert.equal((await worker.fetch(request('/auth'), {})).status, 503)
})
test('auth redirects to GitHub with state, PKCE and a secure session cookie', async () => {
  const { target, cookie } = await start()
  assert.equal(target.origin, 'https://github.com')
  assert.equal(target.searchParams.get('redirect_uri'), `${env.AUTH_ORIGIN}/callback`)
  assert.equal(target.searchParams.get('scope'), 'public_repo')
  assert.equal(target.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(target.searchParams.get('code_challenge').length, 43)
  assert.match(cookie, /^__Host-kitchen-oauth=[a-f0-9]{64}\.[a-f0-9]{64}$/)
  const response = await worker.fetch(request('/auth'), env)
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax; Max-Age=600/)
})
test('missing or mismatched state cannot exchange credentials', async () => {
  const { cookie } = await start()
  await withGitHub(123, true, async calls => {
    assert.equal((await worker.fetch(request('/callback?code=x&state=wrong', cookie), env)).status, 400)
    assert.equal((await worker.fetch(request('/callback?code=x&state=wrong'), env)).status, 400)
    assert.equal(calls.length, 0)
  })
})
test('an uninvited account never receives a token in the response', async () => {
  const { path, cookie } = await start()
  await withGitHub(456, true, async () => {
    const response = await worker.fetch(request(path, cookie), env)
    assert.equal(response.status, 403)
    assert.ok(!(await response.text()).includes('test-token'))
  })
})
test('invited account still needs repository write permission', async () => {
  const { path, cookie } = await start()
  await withGitHub(123, false, async () => {
    assert.equal((await worker.fetch(request(path, cookie), env)).status, 403)
  })
})
test('approved login restricts token delivery to the actual website opener', async () => {
  const { path, cookie } = await start()
  await withGitHub(123, true, async calls => {
    const response = await worker.fetch(request(path, cookie), env)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/)
    assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/)
    const body = JSON.parse(calls[0][1].body)
    assert.equal(body.code_verifier, cookie.split('=')[1].split('.')[1])
    const html = await response.text()
    const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1]
    const messages = []
    let listener
    const opener = { postMessage: (...args) => messages.push(args) }
    const window = { opener, addEventListener: (_, fn) => { listener = fn }, removeEventListener: () => {}, close: () => {} }
    vm.runInNewContext(script, { window })
    assert.deepEqual(messages[0], ['authorizing:github', env.SITE_ORIGIN])
    listener({ origin: 'https://attacker.example', source: opener, data: 'authorizing:github' })
    listener({ origin: env.SITE_ORIGIN, source: {}, data: 'authorizing:github' })
    assert.equal(messages.length, 1)
    listener({ origin: env.SITE_ORIGIN, source: opener, data: 'authorizing:github' })
    assert.equal(messages.length, 2)
    assert.equal(messages[1][1], env.SITE_ORIGIN)
    assert.match(messages[1][0], /^authorization:github:success:/)
  })
})
test('upstream errors fail closed without leaking secrets', async () => {
  const { path, cookie } = await start()
  const original = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('test-secret') }
  try {
    const response = await worker.fetch(request(path, cookie), env)
    assert.equal(response.status, 502)
    assert.ok(!(await response.text()).includes('test-secret'))
  } finally { globalThis.fetch = original }
})
