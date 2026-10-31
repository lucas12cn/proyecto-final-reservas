import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexto/AuthContext';

export default function LoginScreen() {
  // La sesión vive en AuthContext (claves tokenReserva / usuarioReserva): así el resto de
  // la app y el registro del teléfono para push usan siempre el mismo token.
  const { login, token, cargandoSesion } = useAuth();
  const [email, setEmail] = useState('emiliano@mail.com');
  const [password, setPassword] = useState('Villaguay2026');
  const [cargando, setCargando] = useState(false);
  const biometriaPedida = useRef(false);

  useEffect(() => {
    // Con una sesión guardada se pide huella/PIN una sola vez antes de entrar.
    if (cargandoSesion || !token || biometriaPedida.current) return;
    biometriaPedida.current = true;
    verificarSesion();
  }, [cargandoSesion, token]);

  const verificarSesion = async () => {
    const tieneHardware = await LocalAuthentication.hasHardwareAsync();
    const tieneBiometria = await LocalAuthentication.isEnrolledAsync();

    if (tieneHardware && tieneBiometria) {
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Ingresá a tus reservas',
        fallbackLabel: 'Usar PIN del teléfono',
      });

      if (resultado.success) {
        router.replace('/(tabs)' as any);
      } else {
        Alert.alert("Acceso denegado", "No pudimos validar tu identidad.");
      }
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const iniciarSesion = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Completá todos los datos');
      return;
    }

    // Activamos la vibración háptica al presionar el botón
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    setCargando(true);
    biometriaPedida.current = true; // recién ingresó con la contraseña: no pedir huella otra vez
    try {
      await login(email, password); // guarda la sesión y registra el teléfono para push
      router.replace('/(tabs)' as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Credenciales incorrectas o problema de red.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <View style={estilos.contenedor}>
        <Text style={estilos.titulo}>Bienvenido</Text>
        
        <TextInput
          style={estilos.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        
        <TextInput
          style={estilos.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <Button 
          title={cargando ? "Ingresando..." : "Iniciar Sesión"} 
          onPress={iniciarSesion} 
          disabled={cargando}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#121212' },
  contenedor: { flex: 1, padding: 20, justifyContent: 'center' },
  titulo: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#333', color: 'white', padding: 15, borderRadius: 8, marginBottom: 15 }
});