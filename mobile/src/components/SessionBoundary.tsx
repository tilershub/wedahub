import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { configured, supabase } from '../lib/supabase';
import { theme } from '../theme';

// Remount navigation when the account changes. Private screen state and drafts
// must not survive sign-out or be displayed to the next person on this device.
export function SessionBoundary({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<string | null>(configured ? null : 'guest');
  useEffect(() => {
    if (!configured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIdentity(session?.user.id || 'guest');
    });
    return () => subscription.unsubscribe();
  }, []);
  if (identity === null) return <ActivityIndicator style={{ flex: 1 }} color={theme.goldText} />;
  return <View key={identity} style={{ flex: 1 }}>{children}</View>;
}
