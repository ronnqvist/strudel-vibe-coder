export function extractCode(content) {
    if (!content) return '';

    // Try to match markdown code blocks first
    const codeBlockRegex = /```(?:javascript|js)?\s*([\s\S]*?)\s*```/i;
    const match = content.match(codeBlockRegex);

    if (match && match[1]) {
        return match[1].trim();
    }

    // If no code block found, return the content as is (fallback)
    // or maybe we should return empty if we want to be strict?
    // For now, let's assume if there's no code block, the whole thing might be code 
    // or just text that the user wants to try running (though unlikely for chat output).
    // Given the requirement "only import the javascript block", let's be strict.
    return '';
}

export function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
}
