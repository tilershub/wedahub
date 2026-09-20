import { CATEGORIES } from '../lib/categories.js'
import AppIcon from './AppIcon.jsx'
export default function ServiceHome({ provider, user }) {
  return <div className="wh-home">
    <section className="wh-welcome"><p className="wh-eyebrow">ඔබේ හැකියාවට තැනක්</p><h1>{provider ? 'ඔබේ ඊළඟ වැඩය සොයාගන්න.' : <>ඔබේ වැඩේට,<br/>හරි කෙනා.</>}</h1><p>{provider ? 'අලුත් අවස්ථා සොයන්න. ඔබේ සේවාවට ගනුදෙනුකරුවන් සම්බන්ධ කරගන්න.' : 'එදිනෙදා වැඩවල සිට වෘත්තීය සේවා දක්වා. ශ්‍රී ලංකාව පුරා සේවා සපයන්නන් එකම තැනක.'}</p>
      <form action={provider ? '/jobs' : '/providers'} className="wh-search"><AppIcon name="search"/><input name="q" aria-label="Search services" placeholder={provider ? 'වැඩයක් සොයන්න…' : 'ඔබට අවශ්‍ය සේවාව කුමක්ද?'} /><button aria-label="Search"><AppIcon name="arrow"/></button></form>
      <div className="wh-hero-foot"><span>People · Skills · Opportunities</span><span>ශ්‍රී ලංකාව පුරා</span></div>
    </section>
    <div className="wh-quick-actions"><a href="/post-project"><span className="wh-icon-tile"><AppIcon name="plus"/></span><span><strong>වැඩයක් පළ කරන්න</strong><small>ඔබට අවශ්‍ය සේවාව කියන්න</small></span><AppIcon name="arrow"/></a><a href={provider ? '/account?tab=profile' : '/join-wedahub'}><span className="wh-icon-tile"><AppIcon name="user"/></span><span><strong>{provider ? 'මගේ සේවා පැතිකඩ' : 'සේවා සපයන්නෙකු වන්න'}</strong><small>{provider ? 'ඔබේ හැකියාවන් පෙන්වන්න' : 'ඔබේ හැකියාවට අවස්ථාවක්'}</small></span><AppIcon name="arrow"/></a></div>
    <section><div className="wh-section-head"><h2>ඔබට අවශ්‍ය සේවාව</h2><a href="/categories">සියල්ල →</a></div><div className="wh-category-grid">{CATEGORIES.slice(0,8).map(c => <a key={c.slug} href={`/categories/${c.slug}`}><span className="wh-icon-tile"><AppIcon name={c.symbol}/></span><strong>{c.si}</strong><small>{c.label}</small></a>)}</div></section>
    <section className="wh-next"><div><p className="wh-eyebrow">එක්ව වැඩ කරමු</p><h2>{user ? 'ඔබේ වැඩ, එකම තැනක.' : 'කුඩා වැඩක් හෝ විශාල අවශ්‍යතාවක්.'}</h2><p>{user ? 'වැඩ ආරම්භය, අවසන් කිරීම සහ සමාලෝචන කළමනාකරණය කරන්න.' : 'පැතිකඩ සහ සමාලෝචන බලන්න. ගැළපෙන කෙනා සමඟ සෘජුව කතා කරන්න.'}</p></div><a className="wh-button" href={user ? '/my-jobs' : '/providers'}>{user ? 'මගේ වැඩ බලන්න' : 'සේවා සොයන්න'} →</a></section>
    <p className="wh-home-note">සේවාවක් සපයන ඔබ සැමට — තනිව වැඩ කරන අයට, කණ්ඩායම්වලට සහ ව්‍යාපාරවලට.</p>
  </div>
}
