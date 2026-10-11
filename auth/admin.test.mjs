import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../public/admin/init.js', import.meta.url), 'utf8')
const config = JSON.parse(readFileSync(new URL('../public/admin/config.json', import.meta.url), 'utf8'))
async function initialize(authBaseUrl, cmsError) {
  const status = { textContent: '', removed: false, remove() { this.removed = true } }
  let received
  const requests = []
  const context = vm.createContext({ URL, console: { error() {} }, document: { getElementById: () => status },
    fetch: async (path, options) => { requests.push([path, options]); return { ok: true, json: async () => path.endsWith('settings.json') ? { authBaseUrl } : config } },
    window: { CMS: { init: async value => { received = value; if (cmsError) throw new Error(cmsError) } } },
  })
  await vm.runInContext(code, context)
  return { status, received, requests }
}
test('editor receives full GitHub configuration and explicit authentication origin', async () => {
  const { received, status, requests } = await initialize('https://maria-kitchen-auth.flamarc93.workers.dev')
  assert.equal(received.config.backend.repo, 'PROLIX93/MariaLaMarcaCooking.GitHub.io')
  assert.equal(received.config.backend.base_url, 'https://maria-kitchen-auth.flamarc93.workers.dev')
  assert.equal(received.config.backend.auth_endpoint, 'auth')
  assert.equal(received.config.load_config_file, false)
  assert.equal(received.config.collections[0].folder, 'content/posts')
  assert.equal(status.removed, true)
  assert.ok(requests.every(([, options]) => options.cache === 'no-store'))
})
test('missing scheme produces a useful settings error instead of Invalid URL', async () => {
  const { status, received } = await initialize('maria-kitchen-auth.flamarc93.workers.dev')
  assert.match(status.textContent, /Invalid authBaseUrl/)
  assert.equal(received, undefined)
})
test('example address and callback path cannot initialize login', async () => {
  for (const url of ['https://maria-kitchen-auth.your-account.workers.dev', 'https://maria-kitchen-auth.flamarc93.workers.dev/callback']) {
    const { status, received } = await initialize(url)
    assert.match(status.textContent, /example address|HTTPS origin only/)
    assert.equal(received, undefined)
  }
})
test('async CMS failures remain visible on the page', async () => {
  const { status } = await initialize('https://maria-kitchen-auth.flamarc93.workers.dev', 'CMS failed')
  assert.match(status.textContent, /CMS failed/)
  assert.equal(status.removed, false)
})
