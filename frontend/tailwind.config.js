/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require("daisyui")
  ],
  daisyui: {
    themes: [
      {
        "birdsphere": {
          "primary": "#F4B942",        // Bright golden yellow (main brand color)
          "primary-content": "#8B4513", // Rich brown for text on primary
          "secondary": "#F28B2C",      // Warm orange accent
          "secondary-content": "#FFFFFF", // White text on secondary
          "accent": "#E6A532",         // Deep amber
          "accent-content": "#8B4513",   // Brown text on accent
          "neutral": "#8B4513",        // Rich brown for main text
          "neutral-content": "#FFFFFF", // White text on neutral
          "base-100": "#FFF8E7",       // Light cream background
          "base-200": "#F4B942",       // Golden background for cards
          "base-300": "#E6A532",       // Deeper golden for borders
          "base-content": "#8B4513",   // Brown text on base
          "info": "#3ABFF8",           // Keep default info blue
          "info-content": "#FFFFFF",
          "success": "#36D399",        // Keep default success green
          "success-content": "#FFFFFF",
          "warning": "#FBBD23",        // Warm yellow for warnings
          "warning-content": "#8B4513",
          "error": "#F87272",          // Keep default error red
          "error-content": "#FFFFFF",
        },
      },
      "light",
      "dark",
      "cupcake",
      "bumblebee", 
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
    ],
  },
}