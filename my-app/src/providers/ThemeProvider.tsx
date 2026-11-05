import { createContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

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

const CLAVE_TEMA = 'modoTema';
const MODOS: ModoTema[] = ['sistema', 'claro', 'oscuro'];

// El modo elegido se guarda en kv-store (preferencias simples) para que sobreviva al cierre de la app.
// La lectura es síncrona: la app arranca ya con el tema correcto, sin un destello del otro.
const leerModoGuardado = (): ModoTema => {
  try {
    const guardado = Storage.getItemSync(CLAVE_TEMA);
    return MODOS.includes(guardado as ModoTema) ? (guardado as ModoTema) : 'sistema';
  } catch {
    return 'sistema';
  }
};

export const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Leemos el tema nativo del celular (light o dark)
  const temaSistema = useColorScheme();
  
  // Estado para la preferencia del usuario (por defecto respeta al sistema)
  const [modoManual, setModoManual] = useState<ModoTema>(leerModoGuardado);

  // Calculamos el tema efectivo a aplicar
  const esOscuro = modoManual === 'oscuro' || (modoManual === 'sistema' && temaSistema === 'dark');
  const paleta = esOscuro ? paletaOscura : paletaClara;

  const cambiarTema = (nuevoModo: ModoTema) => {
    setModoManual(nuevoModo);
    try {
      Storage.setItemSync(CLAVE_TEMA, nuevoModo);
    } catch {
      // Si no se puede guardar, el cambio igual rige hasta cerrar la app
    }
  };

  return (
    <ThemeContext.Provider value={{ paleta, esOscuro, modoManual, cambiarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}