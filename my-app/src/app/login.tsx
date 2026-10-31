import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../hooks/use-theme';
import { useAuth } from '../contexto/AuthContext';

export default function LoginScreen() {
  const { paleta } = useTema();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarIngreso = async () => {
    if (!email || !contrasena) {
      Alert.alert('Error', 'Por favor completá todos los campos.');
      return;
    }

    setCargando(true);
    try {
      await login(email, contrasena);
      // Si el login es exitoso, lo mandamos al catálogo
      router.replace('/(tabs)/espacios');
    } catch (error: any) {
      Alert.alert('Error al ingresar', error.message || 'Verificá tus credenciales.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: paleta.background }]} edges={['top', 'bottom']}>
      <TouchableOpacity style={estilos.botonCerrar} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color={paleta.text} />
      </TouchableOpacity>

      <View style={estilos.contenedor}>
        <Ionicons name="person-circle-outline" size={80} color={paleta.accent} style={estilos.iconoCentral} />
        <Text style={[estilos.titulo, { color: paleta.text }]}>Iniciar Sesión</Text>
        <Text style={[estilos.subtitulo, { color: paleta.muted }]}>Ingresá para gestionar tus reservas</Text>

        <View style={estilos.formulario}>
          <TextInput
            style={[estilos.input, { backgroundColor: paleta.surface, color: paleta.text, borderColor: paleta.border }]}
            placeholder="Correo electrónico"
            placeholderTextColor={paleta.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[estilos.input, { backgroundColor: paleta.surface, color: paleta.text, borderColor: paleta.border }]}
            placeholder="Contraseña"
            placeholderTextColor={paleta.muted}
            secureTextEntry
            value={contrasena}
            onChangeText={setContrasena}
          />

          <TouchableOpacity 
            style={[estilos.botonPrincipal, { backgroundColor: cargando ? paleta.muted : paleta.accent }]}
            onPress={manejarIngreso}
            disabled={cargando}
          >
            {cargando ? <ActivityIndicator color="white" /> : <Text style={estilos.textoBotonPrincipal}>Ingresar</Text>}
          </TouchableOpacity>
        </View>

        <View style={estilos.pie}>
          <Text style={{ color: paleta.text }}>¿No tenés cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/registro')}>
            <Text style={[estilos.textoEnlace, { color: paleta.accent }]}>Registrate acá</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  botonCerrar: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  contenedor: { flex: 1, padding: 20, justifyContent: 'center' },
  iconoCentral: { alignSelf: 'center', marginBottom: 10 },
  titulo: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  subtitulo: { fontSize: 16, textAlign: 'center', marginBottom: 30 },
  formulario: { gap: 15 },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16 },
  botonPrincipal: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  textoBotonPrincipal: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  pie: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  textoEnlace: { fontWeight: 'bold', fontSize: 16 }
});