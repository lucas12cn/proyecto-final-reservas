import { Stack } from 'expo-router';
import { ThemeProvider } from '../providers/ThemeProvider';
import { AuthProvider } from '../contexto/AuthContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ title: 'Ingresar' }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}