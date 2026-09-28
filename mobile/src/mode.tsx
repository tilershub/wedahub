import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Mode = 'customer' | 'provider';
const Context = createContext<{ mode: Mode; setMode: (mode: Mode) => void } | null>(null);
const storageKey = 'wedahub.mode';

// A view preference, not an authorization claim. Mutations still require a
// signed-in owner and the backend's ownership checks.
export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, update] = useState<Mode>('customer');
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey).then(value => {
      if (active && (value === 'customer' || value === 'provider')) update(value);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const setMode = (value: Mode) => { update(value); void AsyncStorage.setItem(storageKey, value); };
  return <Context.Provider value={{ mode, setMode }}>{children}</Context.Provider>;
}

export function useMode() {
  const value = useContext(Context);
  if (!value) throw new Error('ModeProvider missing');
  return value;
}
