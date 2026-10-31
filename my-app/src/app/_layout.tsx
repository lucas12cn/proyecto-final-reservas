import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from '../providers/ThemeProvider';
import { AuthProvider, useAuth } from '../contexto/AuthContext';

// Al tocar un aviso (con la app cerrada, en segundo plano o abierta) vamos a la pantalla
// que corresponde según los `datos` que manda la API.
function NavegarAlTocarAviso() {
  const respuesta = Notifications.useLastNotificationResponse();
  const { usuario, cargandoSesion } = useAuth();
  const segmentos = useSegments();
  // Mientras está la pantalla de entrada (huella/PIN) no se navega: si no, el aviso se
  // saltearía esa verificación.
  const primero = (segmentos as string[])[0];
  const enEntrada = !primero || primero === 'index';

  useEffect(() => {
    if (!respuesta || cargandoSesion || !usuario || enEntrada) return;
    if (respuesta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const datos = respuesta.notification.request.content.data;
    if (typeof datos?.espacioId === 'string') {
      // "Se liberó un turno": al espacio favorito.
      router.push({ pathname: '/espacio/[id]', params: { id: datos.espacioId } });
    } else {
      // "Reserva cancelada" (datos.reservaId): a la pestaña Mis Reservas.
      router.navigate('/(tabs)' as any);
    }
    Notifications.clearLastNotificationResponse();
  }, [respuesta, cargandoSesion, usuario, enEntrada]);

  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavegarAlTocarAviso />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ title: 'Ingresar' }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
