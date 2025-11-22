/**
/**
 * OpenRouter API Client
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const defaultModels = [
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)" },
    { id: "google/gemini-2.0-pro-exp-02-05:free", name: "Gemini 2.0 Pro (Free)" },
    { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (Free)" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
    { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B (Free)" },
    { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)" },
    { id: "deepseek/deepseek-r1-distill-llama-70b:free", name: "DeepSeek R1 Distill 70B (Free)" },
    { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (Free)" },
    { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)" },
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 405B (Free)" },
];

const SYSTEM_PROMPT = `
You are a live coding music assistant using Strudel (Tidal). 
Your goal is to generate and ITERATE on music patterns based on the user's description.

CRITICAL INSTRUCTIONS:
1. If the user asks to modify the music (e.g. "add bass", "make it faster"), you MUST output the FULL updated code.
2. Do NOT return only the new part. Return the COMPLETE runnable code block.
3. You MUST return ONLY valid Strudel code.
4. Do NOT include markdown code blocks (like \`\`\`javascript).
5. Do NOT include explanations or conversational text.
6. The code should be ready to run immediately.

Example output:
note("c3 eb3 g3 bb3").s("sawtooth").lpf(1000).lpq(2).clip(1)
`;

export async function generateStrudelCode(apiKey, model, chatHistory, userMessage) {
    const cleanApiKey = apiKey?.trim();
    if (!cleanApiKey) {
        throw new Error("API Key is required");
    }

    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...chatHistory,
        { role: "user", content: userMessage }
    ];

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${cleanApiKey}`,
                "HTTP-Referer": window.location.href, // Required by OpenRouter
                "X-Title": "Strudel Vibe Coder", // Optional
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("OpenRouter Error Response:", errorData);
            throw new Error(errorData.error?.message || `OpenRouter API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            throw new Error("No response from model");
        }

        let content = data.choices[0].message.content;

        // Cleanup: Remove markdown code blocks if the LLM ignores instructions
        content = content.replace(/```javascript/g, "").replace(/```/g, "").trim();

        return {
            content: content,
            role: "assistant"
        };
    } catch (error) {
        console.error("OpenRouter API Error:", error);
        throw error;
    }
}
