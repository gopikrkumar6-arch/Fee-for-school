import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { User } from '@supabase/supabase-js';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Check current session
        authService.getSession().then((session) => {
            if (mounted) {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = authService.onAuthStateChange(
            (_event, session) => {
                if (mounted) {
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return {
        user,
        loading,
        signOut: authService.signOut.bind(authService),
    };
}
