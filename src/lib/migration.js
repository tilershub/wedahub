// Fixed origins prevent user-controlled redirect destinations. Keep query strings.
export function migrationRedirect(url) {
  const path = url.pathname.replace(/\/+$/, '') || '/'
  if (['/blog', '/guides'].some(p => path === p || path.startsWith(p + '/'))) {
    return 'https://tilershub.lk' + url.pathname + url.search
  }
  if (path === '/estimator' || path.startsWith('/estimator/')) return 'https://wedahub.lk/providers'
  if (path === '/join-tilershub') return 'https://wedahub.lk/join-wedahub' + url.search
  return null
}
