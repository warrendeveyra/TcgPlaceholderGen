import { GoogleGenAI } from '@google/genai';

// Get API key from localStorage
const getApiKey = () => localStorage.getItem('GEMINI_API_KEY') || '';

const MODEL_NAME = 'gemini-2.5-flash';

export const geminiService = {
    suggestBinderBrands: async (pocketSize: number, totalCards: number, pagesNeeded: number) => {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error('Gemini API Key is missing. Please add it in settings.');

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `As a Pokemon TCG collector expert, suggest 3-5 of the best ${pocketSize}-pocket binder brands for storing ${totalCards} cards (approximately ${pagesNeeded} pages needed).

Include popular TCG binder brands like:
- Ultra Pro
- Ultimate Guard
- Dragon Shield  
- Vault X
- 1up Trading
- TopDeck
- BCW
- DEX Protection

For each suggestion, provide:
1. Brand & model name
2. Approximate capacity (pages/slots)
3. Price range ($)
4. Key feature (zipper, side-loading, D-ring, etc.)
5. Where to buy (Amazon, local game store, etc.)

Format as a clean list. Be specific about models that fit ${pocketSize}-pocket pages and can hold at least ${totalCards} cards.`,
        });

        return response.text;
    },
};
