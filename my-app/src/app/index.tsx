import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const [email, setEmail] = useState('emiliano@mail.com');
  const [password, setPassword] = useState('Villaguay2026');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    const token = await SecureStore.getItemAsync('sesion_token');
    console.log("Token detectado al abrir Login:", token);
    
    if (token && token !== '') {
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
    try {
      const respuesta = await axios.post('http://192.168.1.6:3000/auth/ingreso', {
        email,
        contrasena: password
      });

      console.log("Respuesta del backend:", respuesta.data);

      const token = respuesta.data.datos?.token || respuesta.data.token;
      console.log("Token a guardar:", token);

      if (token) {
        await SecureStore.setItemAsync('sesion_token', token);
        console.log("¡Token guardado exitosamente en la bóveda!");
      } else {
        console.log("¡Cuidado! El token llegó vacío o indefinido.");
      }
      
      setTimeout(() => {
        router.replace('/(tabs)' as any);
      }, 300);

    } catch (error) {
      console.log("Error en login:", error);
      Alert.alert('Error', 'Credenciales incorrectas o problema de red.');
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