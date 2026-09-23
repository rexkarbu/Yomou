const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, './App.{js,jsx,ts,tsx}'),
    path.join(__dirname, './src/**/*.{js,jsx,ts,tsx}'),
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Semantic Tri-Theme Colors (PRD & anti-patterns-ui.md Section 4.1)
        light: {
          background: '#FFFFFF',
          raised: '#F9FAFB',
          overlay: '#FFFFFF',
          primary: '#111827',
          secondary: '#4B5563',
          borderSubtle: '#E5E7EB',
          borderStrong: '#D1D5DB',
          accent: '#2563EB',
          accentOnPrimary: '#FFFFFF',
          error: '#DC2626',
          success: '#15803D',
        },
        dark: {
          background: '#121212',
          raised: '#1E1E1E',
          overlay: '#242424',
          primary: '#F3F4F6',
          secondary: '#9CA3AF',
          borderSubtle: '#27272A',
          borderStrong: '#3F3F46',
          accent: '#60A5FA',
          accentOnPrimary: '#121212',
          error: '#F87171',
          success: '#22C55E',
        },
        sepia: {
          background: '#F4ECD8',
          raised: '#EAE0C8',
          overlay: '#E6DCB8',
          primary: '#2D241E',
          secondary: '#655344',
          borderSubtle: '#DDD2B8',
          borderStrong: '#C8BCA0',
          accent: '#8B4513',
          accentOnPrimary: '#FFFFFF',
          error: '#991B1B',
          success: '#1B5E20',
        },
      },
    },
  },
  plugins: [],
};
