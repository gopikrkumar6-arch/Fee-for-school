import { supabase, Student, FeeRecord } from '../lib/supabase';

class SyncService {
    // Students CRUD operations
    async getStudents(userId: string): Promise<Student[]> {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async createStudent(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('students')
            .insert([student])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateStudent(id: string, updates: Partial<Student>) {
        const { data, error } = await supabase
            .from('students')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteStudent(id: string) {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Fee Records CRUD operations
    async getFeeRecords(userId: string): Promise<FeeRecord[]> {
        const { data, error } = await supabase
            .from('fee_records')
            .select('*')
            .eq('user_id', userId)
            .order('payment_date', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async createFeeRecord(record: Omit<FeeRecord, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('fee_records')
            .insert([record])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateFeeRecord(id: string, updates: Partial<FeeRecord>) {
        const { data, error } = await supabase
            .from('fee_records')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteFeeRecord(id: string) {
        const { error } = await supabase
            .from('fee_records')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Real-time subscriptions
    subscribeToStudents(userId: string, callback: (payload: any) => void) {
        return supabase
            .channel('students_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'students',
                    filter: `user_id=eq.${userId}`,
                },
                callback
            )
            .subscribe();
    }

    subscribeToFeeRecords(userId: string, callback: (payload: any) => void) {
        return supabase
            .channel('fee_records_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'fee_records',
                    filter: `user_id=eq.${userId}`,
                },
                callback
            )
            .subscribe();
    }

    // Offline queue management
    private offlineQueue: Array<{ operation: string; data: any }> = [];

    queueOperation(operation: string, data: any) {
        this.offlineQueue.push({ operation, data });
        localStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
    }

    async processOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');

        for (const item of queue) {
            try {
                // Process each queued operation
                // Implementation depends on operation type
                console.log('Processing offline operation:', item);
            } catch (error) {
                console.error('Failed to process offline operation:', error);
            }
        }

        // Clear queue after processing
        localStorage.removeItem('offline_queue');
        this.offlineQueue = [];
    }
}

export const syncService = new SyncService();
