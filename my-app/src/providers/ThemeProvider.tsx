import { createContext, useState } from 'react';
import { useColorScheme } from 'react-native';

// Definimos las dos paletas (podés ajustar los colores a los tuyos)
const paletaClara = {
  background: '#f4f4f5', surface: '#ffffff', text: '#18181b',
  muted: '#71717a', border: '#e4e4e7', accent: '#3b82f6',
};

const paletaOscura = {
  background: '#09090b', surface: '#18181b', text: '#fafafa',
  muted: '#a1a1aa', border: '#27272a', accent: '#3b82f6',
};

type ModoTema = 'sistema' | 'claro' | 'oscuro';

export const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Leemos el tema nativo del celular (light o dark)
  const temaSistema = useColorScheme();
  
  // Estado para la preferencia del usuario (por defecto respeta al sistema)
  const [modoManual, setModoManual] = useState<ModoTema>('sistema');

  // Calculamos el tema efectivo a aplicar
  const esOscuro = modoManual === 'oscuro' || (modoManual === 'sistema' && temaSistema === 'dark');
  const paleta = esOscuro ? paletaOscura : paletaClara;

  const cambiarTema = (nuevoModo: ModoTema) => setModoManual(nuevoModo);

  return (
    <ThemeContext.Provider value={{ paleta, esOscuro, modoManual, cambiarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}