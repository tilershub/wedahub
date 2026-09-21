import AppIcon from './AppIcon.jsx'
const customerTabs = [
  ['/', 'home', 'මුල් පිටුව', 'මුල් පිටුව'], ['/providers', 'search', 'සේවා', 'සේවා සොයන්න'], ['/post-project', 'plus', 'වැඩක් පළ කරන්න', 'වැඩක් පළ කරන්න'], ['/my-jobs', 'jobs', 'මගේ වැඩ', 'මගේ වැඩ'], ['/account', 'user', 'ගිණුම', 'ගිණුම'],
]
const providerTabs = [
  ['/', 'home', 'මුල් පිටුව', 'මුල් පිටුව'], ['/jobs', 'briefcase', 'වැඩ සොයන්න', 'වැඩ සොයන්න'], ['/my-jobs', 'jobs', 'මගේ වැඩ', 'මගේ වැඩ'], ['/notifications', 'bell', 'දැනුම්දීම්', 'දැනුම්දීම්'], ['/account', 'user', 'ගිණුම', 'ගිණුම'],
]
export default function AppShell({ path = '/', role = 'client' }) {
  const tabs = role === 'provider' ? providerTabs : customerTabs
  const active = href => href === '/' ? path === '/' : path === href || path.startsWith(href + '/')
  return <>
    <header className="wh-header"><div className="wh-header-inner">
      <a href="/" className="wh-brand" aria-label="වැඩHUB මුල් පිටුව"><img src="/icon-192.png" width="40" height="40" alt=""/><span>වැඩ<span>HUB</span><small>People · Skills · Opportunities</small></span></a>
      <div className="wh-header-actions"><a href="/notifications" aria-label="දැනුම්දීම්"><AppIcon name="bell"/></a><button aria-label="මෙනුව විවෘත කරන්න" onClick={() => window.dispatchEvent(new CustomEvent('th-drawer-open'))}><AppIcon name="menu"/></button></div>
    </div></header>
    <nav className="wh-tabs" aria-label="ප්‍රධාන මෙනුව">{tabs.map(([href, icon, si, label]) => <a key={href} href={href} aria-label={label} aria-current={active(href) ? 'page' : undefined}><AppIcon name={icon}/><span>{si}</span></a>)}</nav>
  </>
}
