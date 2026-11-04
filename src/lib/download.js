// SPDX-License-Identifier: MIT

/**
 * Offer text as a file download. Uses a Blob URL, so the size is not limited by the length of a
 * data: URL, and the URL is released again afterwards.
 */
export function downloadText(filename, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // required for firefox
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
