import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function EstadoCanchaScreen() {
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  const elegirFoto = async () => {
    // 1. Consultamos el permiso nativo
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permiso.granted === false) {
      Alert.alert("Permiso denegado", "Se necesita acceso a la galería para subir las fotos.");
      return;
    }

    // 2. Abrimos la galería limitando a solo imágenes
    let resultado = await ImagePicker.launchImageLibraryAsync({
      // Se utiliza el array directo para evitar la advertencia de obsolescencia
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!resultado.canceled) {
      setFotoUri(resultado.assets[0].uri);
    }
  };

  const subirFoto = () => {
    if (!fotoUri) return;
    
    // Acá iría el POST a la capa de servicios (src/servicios/reservas.ts)
    Alert.alert("¡Éxito!", "La foto del estado de la cancha se subió correctamente.");
    setFotoUri(null); // Limpiamos la pantalla
  };

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Reportar estado de la cancha</Text>
      <Text style={estilos.descripcion}>
        Subí una foto actualizada para mostrar si el sintético está gastado o si hay charcos por la lluvia.
      </Text>

      <TouchableOpacity style={estilos.boton} onPress={elegirFoto}>
        <Text style={estilos.textoBoton}>Abrir Galería</Text>
      </TouchableOpacity>

      {fotoUri && (
        <View style={estilos.vistaPrevia}>
          <Image source={{ uri: fotoUri }} style={estilos.imagen} />
          <TouchableOpacity style={[estilos.boton, estilos.botonSubir]} onPress={subirFoto}>
            <Text style={estilos.textoBoton}>Confirmar y Subir</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, padding: 20, alignItems: 'center', backgroundColor: '#fff' },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  descripcion: { textAlign: 'center', marginBottom: 20, color: '#666' },
  boton: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center', marginBottom: 10 },
  botonSubir: { backgroundColor: '#10b981', marginTop: 15 },
  textoBoton: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  vistaPrevia: { marginTop: 20, alignItems: 'center', width: '100%' },
  imagen: { width: 300, height: 200, borderRadius: 10 },
});