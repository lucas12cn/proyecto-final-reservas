// src/theme/colors.ts

// 1. Definimos los colores oscuros primero
export const darkColors = {
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  accent: '#0B5394', // El azulcito que pide el apunte de la facu
  accentMuted: '#7FB3E0',
  muted: '#888888',
  border: '#333333',
  onAccent: '#ffffff',
};

// Extraemos el tipo Palette para que TypeScript nos ayude a no pifiarle con los nombres
export type Palette = typeof darkColors;

// 2. Definimos los colores claros obligándonos a usar la misma estructura (Palette)
export const lightColors: Palette = {
  background: '#f4f5f8',
  surface: '#ffffff',
  text: '#161826',
  accent: '#0B5394',
  accentMuted: '#7d74b8',
  muted: '#5c6070',
  border: '#d8dbe3',
  onAccent: '#ffffff',
};

// 3. Exportamos las dos paletas juntas para que el Provider las pueda elegir
export const palettes = {
  light: lightColors,
  dark: darkColors,
};