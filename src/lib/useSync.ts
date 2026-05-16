import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useSyncState<T>(key: string, initialValue: T, column: string) {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  });
  
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSessionUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial data from Supabase
  useEffect(() => {
    if (!supabase || !sessionUser) return;

    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', sessionUser.id)
        .single();
      
      if (!error && data && data[column]) {
        setValue(data[column]);
        localStorage.setItem(key, JSON.stringify(data[column]));
      }
    };
    
    fetchConfig();
  }, [sessionUser, column, key]); // execute only once when user loads

  // Wrap the setter to also update Supabase and localStorage
  const setSyncedValue = (newValue: T | ((val: T) => T)) => {
    const computedValue = newValue instanceof Function ? newValue(value) : newValue;
    setValue(computedValue);
    localStorage.setItem(key, JSON.stringify(computedValue));

    if (supabase && sessionUser) {
      const payload = {
        user_id: sessionUser.id,
        [column]: computedValue,
        updated_at: new Date().toISOString()
      };
      
      // Upsert the user profile data
      supabase.from('user_data').upsert(payload, { onConflict: 'user_id' }).then();
    }
  };

  return [value, setSyncedValue] as const;
}
