'use client';

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'engineer' | 'observer' | 'client' | 'super_admin';
  access_level: number;
  created_at?: string;
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string, userEmail?: string) {
    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create a default one
          const isMorgan = userEmail?.includes('morgan@mycosoft.org');
          const { data: newProfile, error: createError } = await supabase!
            .from('profiles')
            .insert([
              {
                id: userId,
                email: userEmail,
                role: isMorgan ? 'super_admin' : 'observer',
                access_level: isMorgan ? 10 : 1
              }
            ])
            .select()
            .single();

          if (!createError) setProfile(newProfile);
        } else {
          console.error('Error fetching profile:', error);
        }
      } else {
        // If it's morgan but role is not super_admin, we might want to upgrade it here for the session
        const isMorgan = data.email?.includes('morgan@mycosoft.org');
        if (isMorgan && data.role !== 'super_admin') {
          setProfile({ ...data, role: 'super_admin', access_level: 10 });
        } else {
          setProfile(data);
        }
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  return { user, profile, session, loading };
}
