/* Load the complete CMS configuration explicitly; avoid implicit YAML loading. */
async function openNotebook() {
  const status = document.getElementById('status')
  async function readJSON(path) {
    const response = await fetch(path, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status}). Reload after the website deployment finishes.`)
    try { return await response.json() } catch {
      throw new Error(`${path} did not contain valid JSON. Check the deployed file.`)
    }
  }
  try {
    const [settings, config] = await Promise.all([
      readJSON('/admin/settings.json'),
      readJSON('/admin/config.json'),
    ])
    const authBaseUrl = typeof settings.authBaseUrl === 'string' ? settings.authBaseUrl.trim() : ''
    if (!authBaseUrl) throw new Error('GitHub sign-in is not configured. Set authBaseUrl in public/admin/settings.json to the production Worker URL.')
    let url
    try { url = new URL(authBaseUrl) } catch {
      throw new Error('Invalid authBaseUrl in /admin/settings.json. Use https://maria-kitchen-auth.flamarc93.workers.dev without quotes inside the value.')
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('authBaseUrl must be an HTTPS origin only, with no /auth, /callback, credentials, query, or fragment.')
    }
    if (url.hostname.includes('your-account') || url.hostname.includes('your-subdomain')) {
      throw new Error('authBaseUrl still contains an example address. Replace it with the production Worker URL from Cloudflare.')
    }
    if (config.backend?.name !== 'github' || !config.backend.repo || !Array.isArray(config.collections)) {
      throw new Error('The editor configuration is incomplete. Check /admin/config.json.')
    }
    if (!window.CMS) throw new Error('The editor could not load. Check your internet connection and reload.')
    await window.CMS.init({ config: {
      ...config,
      load_config_file: false,
      backend: { ...config.backend, base_url: url.origin, auth_endpoint: 'auth' },
    } })
    status.remove()
  } catch (error) {
    status.textContent = `Could not open the kitchen notebook: ${error.message}`
    console.error('Kitchen notebook initialization failed:', error)
  }
}
openNotebook()
