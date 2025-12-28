import { supabase, isSupabaseConfigured } from './supabaseClient';

// Generate a random short code for shareable links
const generateShortCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Interface for shared set data
export interface SharedSetData {
    id: string;
    short_code: string;
    set_name: string;
    set_series: string;
    cards: any[];
    created_at: string;
    expires_at: string;
    view_count: number;
}

// Generate a simple hash from content for deduplication
const generateContentHash = (setName: string, cards: any[]): string => {
    // Create a deterministic string from the set content
    const cardIds = cards.map(c => `${c.id || c.name}-${c.variation || 'normal'}`).sort().join(',');
    const content = `${setName}:${cardIds}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
};

/**
 * Share a custom set - creates a record in Supabase and returns shareable URL
 * Reuses existing share if identical content was shared before (prevents spam)
 */
export const shareCustomSet = async (
    set: { name: string; series?: string },
    cards: any[]
): Promise<{ success: boolean; shareUrl?: string; shortCode?: string; error?: string }> => {
    if (!isSupabaseConfigured()) {
        return {
            success: false,
            error: 'Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
        };
    }

    try {
        // Generate content hash to check for duplicates
        const contentHash = generateContentHash(set.name, cards);

        // Check if this exact content was already shared
        const { data: existingShare } = await supabase!
            .from('shared_sets')
            .select('short_code, expires_at')
            .eq('content_hash', contentHash)
            .gt('expires_at', new Date().toISOString())
            .single();

        // If found and not expired, reuse it
        if (existingShare) {
            const baseUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${baseUrl}?share=${existingShare.short_code}`;
            return { success: true, shareUrl, shortCode: existingShare.short_code };
        }

        // Create new share
        const shortCode = generateShortCode();

        const { data, error } = await supabase!
            .from('shared_sets')
            .insert({
                short_code: shortCode,
                set_name: set.name,
                set_series: set.series,
                cards: cards,
                content_hash: contentHash,
            })
            .select()
            .single();

        if (error) {
            console.error('Error sharing set:', error);
            return { success: false, error: error.message };
        }

        // Generate shareable URL using the current origin
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}?share=${shortCode}`;

        return { success: true, shareUrl, shortCode: data.short_code };
    } catch (err) {
        console.error('Error sharing set:', err);
        return { success: false, error: 'Failed to share set. Please try again.' };
    }
};

/**
 * Get a shared set by its short code
 */
export const getSharedSet = async (
    shortCode: string
): Promise<{ success: boolean; data?: SharedSetData; error?: string }> => {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase is not configured.' };
    }

    try {
        // Fetch the shared set
        const { data, error } = await supabase!
            .from('shared_sets')
            .select('*')
            .eq('short_code', shortCode)
            .single();

        if (error) {
            console.error('Error fetching shared set:', error);
            return { success: false, error: 'Shared set not found or has expired.' };
        }

        // Check if expired
        if (new Date(data.expires_at) < new Date()) {
            return { success: false, error: 'This shared set has expired.' };
        }

        // Increment view count (fire and forget)
        supabase!
            .from('shared_sets')
            .update({ view_count: data.view_count + 1 })
            .eq('id', data.id)
            .then(() => { });

        return { success: true, data: data as SharedSetData };
    } catch (err) {
        console.error('Error fetching shared set:', err);
        return { success: false, error: 'Failed to load shared set.' };
    }
};

/**
 * Check URL for share code and return it if present
 */
export const getShareCodeFromUrl = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('share');
};

/**
 * Clear share code from URL without page reload
 */
export const clearShareCodeFromUrl = (): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    window.history.replaceState({}, '', url.toString());
};
