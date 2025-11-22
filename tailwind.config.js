/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cyber: {
                    black: '#0a0a0a',
                    dark: '#121212',
                    gray: '#1e1e1e',
                    neon: '#ff00ff',
                    cyan: '#00ffff',
                    green: '#00ff00',
                }
            },
            fontFamily: {
                mono: ['"Fira Code"', 'monospace'],
            }
        },
    },
    plugins: [],
}
