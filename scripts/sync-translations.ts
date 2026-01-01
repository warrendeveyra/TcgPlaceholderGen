import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !GEMINI_API_KEY) {
    console.error('Missing environment variables. Please ensure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and GEMINI_API_KEY are set.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function syncTranslations() {
    try {
        console.log('Fetching sets from TCGdex API...');
        // Fetch Japanese sets
        const response = await axios.get('https://api.tcgdex.net/v2/ja/sets');
        const sets = response.data as any[];

        console.log(`Found ${sets.length} sets. Checking Supabase for missing translations...`);

        // Get existing translations
        const { data: existing, error: fetchError } = await supabase
            .from('translations')
            .select('ja_name');

        if (fetchError) throw fetchError;

        const existingNames = new Set(existing.map(r => r.ja_name));
        const missingSets = sets.filter((s: any) => !existingNames.has(s.name) || !existingNames.has(s.series));

        if (missingSets.length === 0) {
            console.log('All sets already translated. Nothing to do!');
            return;
        }

        console.log(`Need to translate ${missingSets.length} new sets.`);

        // Helper for rate-limited AI calls with retries and fallback
        const callWithRetry = async (prompt: string, jaNames: string[], jaSeries: string[] = [], maxRetries = 2) => {
            let lastError;

            // 1. Try Gemini first
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`[Gemini] Attempting translation (Attempt ${attempt})...`);
                    const result = (await ai.models.generateContent({
                        model: 'gemini-2.0-flash',
                        contents: prompt
                    })) as any;

                    const text = result.text;
                    if (!text) throw new Error('No text returned from Gemini');
                    return text;
                } catch (error: any) {
                    lastError = error;
                    // If Quota exceeded (429) or other identifiable errors
                    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
                        console.warn(`[Gemini] Quota exceeded (429). Falling back to MyMemory API for this batch...`);
                        break; // Exit retry loop and go to fallback
                    }

                    const waitTime = 10000 * attempt;
                    console.log(`[Gemini] Error: ${error.message}. Waiting ${waitTime / 1000}s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }

            // 2. Fallback to MyMemory API
            console.log(`[MyMemory] Translating ${jaNames.length} names and ${jaSeries.length} series...`);

            const translateMap = async (list: string[]) => {
                const map: Record<string, string> = {};
                for (const text of list) {
                    try {
                        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`;
                        const res = await axios.get(url);
                        const translated = (res.data as any)?.responseData?.translatedText || text;
                        map[text] = translated;
                        await new Promise(r => setTimeout(r, 500));
                    } catch (err) {
                        map[text] = text;
                    }
                }
                return map;
            };

            const nameTranslations = await translateMap(jaNames);
            const seriesTranslations = await translateMap(jaSeries);

            if (prompt.includes('keys "names" and "series"')) {
                return JSON.stringify({
                    names: nameTranslations,
                    series: seriesTranslations
                });
            }
            return JSON.stringify(nameTranslations);
        };

        // Robust JSON extraction
        const extractJson = (text: string) => {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return jsonMatch ? jsonMatch[0] : text;
        };

        // Local cache for this run to avoid translating the same series multiple times
        const translatedSeriesCache = new Map<string, string>();

        // Process in batches of 15 to minimize total requests
        const batchSize = 15;
        for (let i = 0; i < missingSets.length; i += batchSize) {
            const batch = missingSets.slice(i, i + batchSize);
            const jaNames = batch.map((s: any) => s.name);

            // Only translate series we haven't seen in this run yet
            const jaSeries = [...new Set(batch.map((s: any) => s.series))]
                .filter(s => !translatedSeriesCache.has(s) && !existingNames.has(s));

            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(missingSets.length / batchSize)}...`);

            const prompt = `Translate these Japanese Pokemon TCG set names and series to their official or most accurate English equivalent. 
            Return ONLY a raw JSON object with keys "names" and "series" where values are objects mapping Japanese to English.
            Do not include any conversational text or markdown.
            
            Sets: ${JSON.stringify(jaNames)}
            ${jaSeries.length > 0 ? `Series: ${JSON.stringify(jaSeries)}` : ''}`;

            const responseText = await callWithRetry(prompt, jaNames, jaSeries);
            const translations = JSON.parse(extractJson(responseText).replace(/```json|```/g, '').trim());

            // 3. Prepare data for Supabase
            const rows: any[] = [];

            // Add Names
            if (translations.names) {
                Object.entries(translations.names).forEach(([ja, en]) => {
                    rows.push({ ja_name: ja, en_name: en as string, type: 'set_name' });
                });
            }

            // Add Series
            if (translations.series) {
                Object.entries(translations.series).forEach(([ja, en]) => {
                    translatedSeriesCache.set(ja, en as string);
                    rows.push({ ja_name: ja, en_name: en as string, type: 'series' });
                });
            }

            // Also check if we have cached series from previous batches
            batch.forEach((s: any) => {
                if (translatedSeriesCache.has(s.series) && !existingNames.has(s.series)) {
                    // This will be handled by the upsert if multiple rows have same ja_name
                    // but it's safer to just push it if not already in rows for this batch
                    if (!rows.some(r => r.ja_name === s.series)) {
                        rows.push({
                            ja_name: s.series,
                            en_name: translatedSeriesCache.get(s.series),
                            type: 'series'
                        });
                    }
                }
            });

            // 4. Insert into Supabase
            if (rows.length > 0) {
                const { error: insertError } = await supabase
                    .from('translations')
                    .upsert(rows, { onConflict: 'ja_name' });

                if (insertError) {
                    console.error('Error inserting batch:', insertError);
                } else {
                    console.log(`Successfully synced ${rows.length} translations.`);
                }
            }

            // Wait 10 seconds between batches
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        console.log('Synchronization complete!');

    } catch (error) {
        console.error('Sync failed:', error);
    }
}

syncTranslations();
