import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
    try {
        console.log("Function triggered");

        if (!GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is missing");
            throw new Error("GEMINI_API_KEY environment variable is not set");
        }

        // In Edge Functions, these are usually available by default
        const url = SUPABASE_URL ?? Deno.env.get("SUPABASE_URL");
        const key = SUPABASE_SERVICE_ROLE_KEY ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!url || !key) {
            console.error("Supabase config missing:", { url: !!url, key: !!key });
            throw new Error("Supabase environment variables are missing");
        }

        const supabase = createClient(url, key);

        console.log("Fetching Japanese sets from TCGdex...");
        const response = await fetch("https://api.tcgdex.net/v2/ja/sets");
        if (!response.ok) throw new Error(`TCGdex API error: ${response.statusText}`);

        const sets = await response.json() as any[];

        console.log(`Found ${sets.length} sets. Checking existing translations...`);
        const { data: existing, error: fetchError } = await supabase
            .from("translations")
            .select("ja_name");

        if (fetchError) {
            console.error("Supabase fetch error:", fetchError);
            throw fetchError;
        }

        const existingNames = new Set(existing?.map((r: any) => r.ja_name) || []);
        const missingSets = sets.filter((s: any) => !existingNames.has(s.name));

        console.log(`Status: ${existingNames.size} existing, ${missingSets.length} missing.`);

        if (missingSets.length === 0) {
            return new Response(JSON.stringify({ message: "No new sets to translate" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Helper for translation with fallback
        const translateBatch = async (batch: any[], translatedSeriesCache: Map<string, string>) => {
            const jaNames = batch.map(s => s.name);
            const jaSeries = [...new Set(batch.map(s => s.series))]
                .filter(s => !translatedSeriesCache.has(s) && !existingNames.has(s));

            const prompt = `Translate these Japanese Pokemon TCG set names and series to their official or most accurate English equivalent. 
      Return ONLY a raw JSON object with keys "names" and "series" where values are objects mapping Japanese to English.
      Do not include any conversational text or markdown formatting.
      
      Sets: ${JSON.stringify(jaNames)}
      ${jaSeries.length > 0 ? `Series: ${JSON.stringify(jaSeries)}` : ""}`;

            // 1. Try Gemini first
            try {
                console.log(`[Gemini] Attempting translation for batch...`);
                const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        const jsonText = jsonMatch ? jsonMatch[0] : text;
                        return JSON.parse(jsonText);
                    }
                } else {
                    const errStatus = aiResponse.status;
                    if (errStatus === 429) {
                        console.warn("[Gemini] Quota exceeded. Falling back to MyMemory...");
                    } else {
                        console.error(`[Gemini] API Error ${errStatus}`);
                    }
                }
            } catch (error) {
                console.warn("[Gemini] Request failed, falling back to MyMemory:", error);
            }

            // 2. Fallback to MyMemory (Individual calls)
            console.log(`[MyMemory] Translating ${jaNames.length} names and ${jaSeries.length} series...`);

            const translateList = async (list: string[]) => {
                const map: Record<string, string> = {};
                for (const text of list) {
                    try {
                        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`;
                        const res = await fetch(url);
                        const data = await res.json();
                        map[text] = data?.responseData?.translatedText || text;
                        // Small delay
                        await new Promise(r => setTimeout(r, 500));
                    } catch (e) {
                        map[text] = text;
                    }
                }
                return map;
            };

            const nameMap = await translateList(jaNames);
            const seriesMap = await translateList(jaSeries);

            return { names: nameMap, series: seriesMap };
        };

        // Process in batches
        const batchSize = 15;
        let totalSynced = 0;
        const translatedSeriesCache = new Map<string, string>();

        for (let i = 0; i < missingSets.length; i += batchSize) {
            const batch = missingSets.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(missingSets.length / batchSize)}...`);

            try {
                const translations = await translateBatch(batch, translatedSeriesCache);
                const rows: any[] = [];

                // Add names
                if (translations.names) {
                    Object.entries(translations.names).forEach(([ja, en]) => {
                        rows.push({ ja_name: ja, en_name: en as string, type: "set_name" });
                    });
                }

                // Add series
                if (translations.series) {
                    Object.entries(translations.series).forEach(([ja, en]) => {
                        translatedSeriesCache.set(ja, en as string);
                        rows.push({ ja_name: ja, en_name: en as string, type: "series" });
                    });
                }

                // Push cached series for sets that were missing it
                batch.forEach(s => {
                    if (translatedSeriesCache.has(s.series) && !existingNames.has(s.series)) {
                        if (!rows.some(r => r.ja_name === s.series)) {
                            rows.push({
                                ja_name: s.series,
                                en_name: translatedSeriesCache.get(s.series),
                                type: "series"
                            });
                        }
                    }
                });

                if (rows.length > 0) {
                    console.log(`Upserting ${rows.length} rows...`);
                    const { error: insertError } = await supabase
                        .from("translations")
                        .upsert(rows, { onConflict: "ja_name" });

                    if (insertError) {
                        console.error("Supabase upsert error:", insertError);
                    } else {
                        totalSynced += rows.length;
                    }
                }
            } catch (err: any) {
                console.error(`Error in batch starting at ${i}:`, err.message);
            }

            // Delay between batches
            if (i + batchSize < missingSets.length) {
                console.log("Waiting 10s for next batch...");
                await new Promise(r => setTimeout(r, 10000));
            }
        }

        console.log("Sync complete!");
        return new Response(JSON.stringify({
            success: true,
            message: `Synced ${totalSynced} translations.`,
            processed: missingSets.length
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Final Function error:", errorMsg);
        return new Response(JSON.stringify({
            error: errorMsg,
            stack: error instanceof Error ? error.stack : undefined
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
