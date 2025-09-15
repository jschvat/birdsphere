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
          "primary": "#F39C12",           // Golden yellow from cockatiel crest
          "primary-content": "#1A5A3E",   // Dark forest green text on primary
          "secondary": "#4CAF50",         // Fresh green from lovebird
          "secondary-content": "#FFFFFF", // White text on secondary
          "accent": "#FF8A65",            // Warm coral orange from bird features
          "accent-content": "#FFFFFF",    // White text on accent
          "neutral": "#1A5A3E",           // Deep forest green from background
          "neutral-content": "#FFFFFF",   // White text on neutral
          "base-100": "#2D5A42",          // Rich forest green background
          "base-200": "#1A5A3E",          // Darker green for cards
          "base-300": "#0F3A28",          // Deep green for borders
          "base-content": "#E8F5E8",      // Light green-tinted text
          "info": "#64B5F6",              // Soft blue
          "info-content": "#FFFFFF",
          "success": "#4CAF50",           // Matching secondary green
          "success-content": "#FFFFFF",
          "warning": "#FFB74D",           // Soft golden warning
          "warning-content": "#1A5A3E",
          "error": "#EF5350",             // Soft red
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