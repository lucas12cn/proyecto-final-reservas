import { Tabs, router } from 'expo-router';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../../hooks/use-theme';
import { useAuth } from '../../contexto/AuthContext';

export default function TabsLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  const { paleta } = useTema(); 
  const { usuario } = useAuth();
  // El escáner de ingresos es del personal: el ícono QR sólo se muestra a encargados y administradores.
  const esPersonal = usuario?.rol === 'encargado' || usuario?.rol === 'administrador';

  const irA = (ruta: any) => {
    setMenuVisible(false);
    router.push(ruta);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: paleta.accent,
          tabBarInactiveTintColor: paleta.muted,
          tabBarStyle: { backgroundColor: paleta.background, borderTopColor: paleta.border },
          headerShown: true, 
          headerStyle: { backgroundColor: paleta.background, shadowColor: 'transparent', elevation: 0, borderBottomWidth: 1, borderBottomColor: paleta.border },
          headerTintColor: paleta.text,
          headerTitle: 'Deportes Villaguay',
          
          headerRight: esPersonal
            ? () => (
                <TouchableOpacity onPress={() => router.push('/escaner')} style={{ marginRight: 15 }}>
                  <Ionicons name="qr-code-outline" size={24} color={paleta.text} />
                </TouchableOpacity>
              )
            : undefined,
          
          headerLeft: () => (
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ marginLeft: 15 }}>
              <Ionicons name="menu-outline" size={28} color={paleta.text} />
            </TouchableOpacity>
          )
        }}
      >
        {/* PESTAÑAS PRINCIPALES */}
        <Tabs.Screen name="index" options={{ title: 'Mis Reservas', tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} /> }} />
        <Tabs.Screen name="espacios" options={{ title: 'Canchas', tabBarIcon: ({ color }) => <Ionicons name="football" size={24} color={color} /> }} />
        <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> }} />
        
        {/* PESTAÑAS OCULTAS (Vuelven las del mapa y estado para que no se rompan los botones de arriba) */}
        <Tabs.Screen name="escaner" options={{ href: null }} />
        <Tabs.Screen name="mapa" options={{ href: null }} />
      </Tabs>

      {/* MENÚ DESPLEGABLE */}
      <Modal visible={menuVisible} transparent={true} animationType="fade">
        <Pressable style={estilos.fondoModal} onPress={() => setMenuVisible(false)}>
          <View style={[estilos.menuDesplegable, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
            <Text style={[estilos.tituloMenu, { color: paleta.muted }]}>Más opciones</Text>

            <TouchableOpacity 
              style={[estilos.opcionMenu, { borderBottomColor: paleta.border, borderBottomWidth: 0 }]} 
              onPress={() => irA('/mapa')}
            >
              <Ionicons name="map-outline" size={22} color={paleta.text} />
              <Text style={[estilos.textoOpcion, { color: paleta.text }]}>Mapa de Complejos</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start' },
  menuDesplegable: { marginTop: 60, marginLeft: 15, width: 220, borderRadius: 12, padding: 15, borderWidth: 1, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  tituloMenu: { fontSize: 13, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase' },
  opcionMenu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  textoOpcion: { fontSize: 16, fontWeight: '500' }
});