import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'si' | 'ta' | 'en';
const messages = {
  en: {
    tagline: 'PEOPLE • SKILLS • OPPORTUNITIES', find: 'Find skilled people', search: 'Name or service',
    searchHint: 'Tiler, plumber, teacher…', allIsland: 'Across Sri Lanka', searchButton: 'Search',
    loading: 'Finding providers…', empty: 'No matching providers yet. Try another search.',
    retry: 'Could not load providers. Try again.', view: 'View profile', reviews: 'reviews',
    noReviews: 'No reviews yet', listed: 'Listed profile', verificationUnknown: 'Verification details not available',
    profile: 'Provider profile', services: 'Services', location: 'Location', account: 'My account',
    signIn: 'Sign in or join', signOut: 'Sign out', phone: 'Sri Lankan mobile number',
    phoneHint: '077 123 4567', code: '6-digit SMS code', send: 'Send code', verify: 'Verify code',
    change: 'Change number', sent: 'Code sent to', invalidPhone: 'Enter a valid Sri Lankan mobile number.',
    invalidCode: 'Enter the 6-digit code.', authError: 'Could not verify. Please try again.',
    resendWait: 'Please wait before requesting another code.', existing: 'Already use email or Google on the website? Link your phone there first to keep your profile and jobs.',
    setup: 'Connect the වැඩHUB Supabase publishable key to use this app.',
    welcome: 'Welcome to වැඩHUB', selectLanguage: 'Choose your language',
    signedIn: 'Signed in', signInRequired: 'Sign in to manage your work.',
    profileMissing: 'This profile is unavailable.', back: 'Back',
  },
  si: {
    tagline: 'PEOPLE • SKILLS • OPPORTUNITIES', find: 'දක්ෂ සේවා සපයන්නන් සොයන්න', search: 'නම හෝ සේවාව',
    searchHint: 'ටයිල්, ජලනළ, ගුරු…', allIsland: 'ශ්‍රී ලංකාව පුරා', searchButton: 'සොයන්න',
    loading: 'සේවා සපයන්නන් සොයමින්…', empty: 'ගැළපෙන පැතිකඩක් නැහැ. වෙනත් සෙවුමක් උත්සාහ කරන්න.',
    retry: 'පැතිකඩ පූරණය කළ නොහැක. නැවත උත්සාහ කරන්න.', view: 'පැතිකඩ බලන්න', reviews: 'සමාලෝචන',
    noReviews: 'තවමත් සමාලෝචන නැහැ', listed: 'ලැයිස්තුගත පැතිකඩ', verificationUnknown: 'තහවුරු කිරීමේ විස්තර නොමැත',
    profile: 'සේවා සපයන්නාගේ පැතිකඩ', services: 'සේවා', location: 'ස්ථානය', account: 'මගේ ගිණුම',
    signIn: 'පිවිසෙන්න හෝ ලියාපදිංචි වන්න', signOut: 'ඉවත් වන්න', phone: 'ශ්‍රී ලංකා ජංගම දුරකථන අංකය',
    phoneHint: '077 123 4567', code: 'අංක 6ක SMS කේතය', send: 'කේතය යවන්න', verify: 'කේතය තහවුරු කරන්න',
    change: 'අංකය වෙනස් කරන්න', sent: 'කේතය යවන ලදී:', invalidPhone: 'වලංගු ශ්‍රී ලංකා ජංගම අංකයක් ඇතුළු කරන්න.',
    invalidCode: 'අංක 6ක කේතය ඇතුළු කරන්න.', authError: 'තහවුරු කළ නොහැක. නැවත උත්සාහ කරන්න.',
    resendWait: 'නැවත කේතයක් ඉල්ලීමට මඳක් රැඳී සිටින්න.', existing: 'ඔබ දැනටමත් වෙබ් අඩවියේ ඊමේල් හෝ Google භාවිත කරන්නේද? ඔබේ පැතිකඩ හා වැඩ රැක ගැනීමට පළමුව එහිදී දුරකථනය සම්බන්ධ කරන්න.',
    setup: 'යෙදුම භාවිත කිරීමට වැඩHUB Supabase publishable key සම්බන්ධ කරන්න.',
    welcome: 'වැඩHUB වෙත සාදරයෙන් පිළිගනිමු', selectLanguage: 'ඔබේ භාෂාව තෝරන්න',
    signedIn: 'පිවිස ඇත', signInRequired: 'ඔබේ වැඩ කළමනාකරණය කිරීමට පිවිසෙන්න.',
    profileMissing: 'මෙම පැතිකඩ ලබා ගත නොහැක.', back: 'ආපසු',
  },
  ta: {
    tagline: 'PEOPLE • SKILLS • OPPORTUNITIES', find: 'திறமையான சேவை வழங்குநர்களைக் கண்டறியுங்கள்', search: 'பெயர் அல்லது சேவை',
    searchHint: 'டைலர், பிளம்பர், ஆசிரியர்…', allIsland: 'இலங்கை முழுவதும்', searchButton: 'தேடுங்கள்',
    loading: 'சேவை வழங்குநர்களைத் தேடுகிறோம்…', empty: 'பொருத்தமானவர்கள் இல்லை. வேறு தேடலை முயற்சிக்கவும்.',
    retry: 'சேவை வழங்குநர்களை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.', view: 'சுயவிவரத்தைப் பார்க்க', reviews: 'மதிப்புரைகள்',
    noReviews: 'இன்னும் மதிப்புரைகள் இல்லை', listed: 'பட்டியலிடப்பட்ட சுயவிவரம்', verificationUnknown: 'சரிபார்ப்பு விவரம் இல்லை',
    profile: 'சேவை வழங்குநர் சுயவிவரம்', services: 'சேவைகள்', location: 'இடம்', account: 'என் கணக்கு',
    signIn: 'உள்நுழைக அல்லது சேருங்கள்', signOut: 'வெளியேறு', phone: 'இலங்கை கைபேசி எண்',
    phoneHint: '077 123 4567', code: '6 இலக்க SMS குறியீடு', send: 'குறியீட்டை அனுப்பு', verify: 'குறியீட்டை உறுதிசெய்',
    change: 'எண்ணை மாற்று', sent: 'குறியீடு அனுப்பப்பட்டது:', invalidPhone: 'சரியான இலங்கை கைபேசி எண்ணை உள்ளிடவும்.',
    invalidCode: '6 இலக்க குறியீட்டை உள்ளிடவும்.', authError: 'உறுதிசெய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    resendWait: 'மற்றொரு குறியீட்டைக் கோருவதற்கு முன் காத்திருக்கவும்.', existing: 'இணையதளத்தில் ஏற்கனவே மின்னஞ்சல் அல்லது Google பயன்படுத்துகிறீர்களா? உங்கள் சுயவிவரத்தையும் வேலைகளையும் காக்க, முதலில் அங்கே கைபேசி எண்ணை இணைக்கவும்.',
    setup: 'பயன்பாட்டைப் பயன்படுத்த වැඩHUB Supabase publishable key ஐ இணைக்கவும்.',
    welcome: 'වැඩHUB க்கு வரவேற்கிறோம்', selectLanguage: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    signedIn: 'உள்நுழைந்துள்ளீர்கள்', signInRequired: 'உங்கள் வேலையை நிர்வகிக்க உள்நுழையவும்.',
    profileMissing: 'இந்தச் சுயவிவரம் கிடைக்கவில்லை.', back: 'பின்செல்',
  },
} as const;

type Key = keyof typeof messages.en;
type LanguageContextValue = { language: Language; setLanguage: (value: Language) => void; t: (key: Key) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = 'wedahub.language';
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, update] = useState<Language>('si');
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey).then(saved => {
      const locale = getLocales()[0]?.languageCode;
      const next = saved === 'si' || saved === 'ta' || saved === 'en' ? saved : locale === 'ta' || locale === 'en' ? locale : 'si';
      if (active) update(next);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const setLanguage = (value: Language) => { update(value); void AsyncStorage.setItem(storageKey, value); };
  return <LanguageContext.Provider value={{ language, setLanguage, t: key => messages[language][key] }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider missing');
  return value;
}
