import AppIcon from './AppIcon.jsx'
const tabs = [
  ['/', 'home', 'මුල් පිටුව', 'Home'], ['/providers', 'search', 'සේවා', 'Services'], ['/jobs', 'briefcase', 'වැඩ', 'Find work'], ['/my-jobs', 'jobs', 'මගේ වැඩ', 'My jobs'], ['/account', 'user', 'ගිණුම', 'Account'],
]
export default function AppShell({ path = '/', initialUser }) {
  const active = href => href === '/' ? path === '/' : path === href || path.startsWith(href + '/')
  return <>
    <header className="wh-header"><div className="wh-header-inner">
      <a href="/" className="wh-brand" aria-label="වැඩHUB — Home"><img src="/icon-192.png" width="40" height="40" alt=""/><span>වැඩ<span>HUB</span><small>People · Skills · Opportunities</small></span></a>
      <div className="wh-header-actions"><a href="/notifications" aria-label="Notifications"><AppIcon name="bell"/></a><button aria-label="Open menu" onClick={() => window.dispatchEvent(new CustomEvent('th-drawer-open'))}><AppIcon name="menu"/></button></div>
    </div></header>
    <nav className="wh-tabs" aria-label="Main navigation">{tabs.map(([href, icon, si, en]) => <a key={href} href={href} aria-label={en} aria-current={active(href) ? 'page' : undefined}><AppIcon name={icon}/><span>{si}</span></a>)}</nav>
  </>
}
