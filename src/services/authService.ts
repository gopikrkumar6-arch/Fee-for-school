import { supabase } from '../lib/supabase';

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface SignUpData extends AuthCredentials {
    name?: string;
}

class AuthService {
    // Sign up new user
    async signUp({ email, password, name }: SignUpData) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name || email.split('@')[0],
                },
            },
        });

        if (error) throw error;
        return data;
    }

    // Sign in existing user
    async signIn({ email, password }: AuthCredentials) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    }

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    // Get current session
    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    }

    // Get current user
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }

    // Listen to auth state changes
    onAuthStateChange(callback: (event: string, session: any) => void) {
        return supabase.auth.onAuthStateChange(callback);
    }

    // Reset password
    async resetPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
    }

    // Update password
    async updatePassword(newPassword: string) {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) throw error;
    }
}

export const authService = new AuthService();
