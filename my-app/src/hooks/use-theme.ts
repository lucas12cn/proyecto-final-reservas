import { useContext } from 'react';
import { ThemeContext } from '../providers/ThemeProvider';

export const useTema = () => {
  const contexto = useContext(ThemeContext);
  if (!contexto) throw new Error('useTema debe usarse dentro de ThemeProvider');
  return contexto;
};