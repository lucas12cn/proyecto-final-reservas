import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../../hooks/use-theme';
import { obtenerEspacios, obtenerDeportes } from '../../servicios/reservas';
import { Espacio, Deporte } from '../../tipos';

export default function EspaciosScreen() {
  const { paleta } = useTema();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados para los filtros
  const [deporteFiltro, setDeporteFiltro] = useState<string | null>(null);
  const [complejoFiltro, setComplejoFiltro] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [espaciosData, deportesData] = await Promise.all([
        obtenerEspacios(),
        obtenerDeportes()
      ]);
      setEspacios(espaciosData);
      setDeportes(deportesData);
    } catch (error) {
      console.log("Error al cargar datos:", error);
    } finally {
      setCargando(false);
    }
  };

  const complejosUnicos = Array.from(new Set(espacios.map(e => e.complejo)));

  const espaciosFiltrados = espacios.filter(espacio => {
    const pasaDeporte = deporteFiltro ? espacio.deporteId === deporteFiltro : true;
    const pasaComplejo = complejoFiltro ? espacio.complejo === complejoFiltro : true;
    return pasaDeporte && pasaComplejo;
  });

  const renderFiltroBoton = (llave: string, titulo: string, activo: boolean, onPress: () => void) => (
    <TouchableOpacity 
      key={llave}
      style={[
        estilos.botonFiltro, 
        { 
          backgroundColor: activo ? paleta.accent : paleta.surface,
          borderColor: activo ? paleta.accent : paleta.border
        }
      ]} 
      onPress={onPress}
    >
      <Text style={{ color: activo ? 'white' : paleta.text, fontWeight: activo ? 'bold' : 'normal' }}>
        {titulo}
      </Text>
    </TouchableOpacity>
  );

  const renderEspacio = ({ item }: { item: Espacio }) => (
    <TouchableOpacity 
      style={[estilos.tarjeta, { backgroundColor: paleta.surface, borderColor: paleta.border }]}
      activeOpacity={0.8}
      // Acá está el cambio: ahora navega a la ficha usando el ID
      onPress={() => router.push({ pathname: "/espacio/[id]", params: { id: item.id } })}
    >
      <Image 
        source={{ uri: item.imagenes && item.imagenes.length > 0 ? item.imagenes[0] : 'https://via.placeholder.com/300x150' }} 
        style={estilos.imagen} 
      />
      <View style={estilos.infoContenedor}>
        <View style={estilos.filaTitulo}>
          <Text style={[estilos.nombre, { color: paleta.text }]}>{item.nombre}</Text>
          <Text style={[estilos.precio, { color: paleta.accent }]}>${item.precioPorHora}/h</Text>
        </View>
        <Text style={{ color: paleta.muted, marginBottom: 10 }}>{item.complejo}</Text>
        <View style={estilos.detallesFila}>
          <View style={[estilos.etiqueta, { backgroundColor: paleta.background }]}>
            <Ionicons name="layers-outline" size={14} color={paleta.text} />
            <Text style={[estilos.textoEtiqueta, { color: paleta.text }]}>{item.superficie}</Text>
          </View>
          {item.iluminacion && (
            <View style={[estilos.etiqueta, { backgroundColor: '#332914' }]}>
              <Ionicons name="flashlight" size={14} color="#f59e0b" />
              <Text style={[estilos.textoEtiqueta, { color: '#f59e0b' }]}>Luz nocturna</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: paleta.background }]} edges={['top']}>
      <View style={estilos.cabecera}>
        <Text style={[estilos.tituloCentral, { color: paleta.text }]}>Explorar Canchas</Text>
      </View>

      <View style={estilos.contenedorFiltros}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.scrollFiltros}>
          {renderFiltroBoton("todos-dep", "Todos los deportes", deporteFiltro === null, () => setDeporteFiltro(null))}
          {deportes.map(dep => 
            renderFiltroBoton(dep.id, dep.nombre, deporteFiltro === dep.id, () => setDeporteFiltro(dep.id))
          )}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[estilos.scrollFiltros, { marginTop: 10 }]}>
          {renderFiltroBoton("todos-comp", "Todos los complejos", complejoFiltro === null, () => setComplejoFiltro(null))}
          {complejosUnicos.map(comp => 
            renderFiltroBoton(comp, comp, complejoFiltro === comp, () => setComplejoFiltro(comp))
          )}
        </ScrollView>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color={paleta.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={espaciosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderEspacio}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ color: paleta.muted, textAlign: 'center', marginTop: 20 }}>
              No hay canchas que coincidan con estos filtros.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  tituloCentral: { fontSize: 26, fontWeight: 'bold' },
  contenedorFiltros: { paddingBottom: 15 },
  scrollFiltros: { paddingHorizontal: 15, gap: 10 },
  botonFiltro: { borderWidth: 1, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20 },
  lista: { paddingHorizontal: 15, paddingBottom: 20 },
  tarjeta: { borderRadius: 12, marginBottom: 20, borderWidth: 1, overflow: 'hidden' },
  imagen: { width: '100%', height: 160, backgroundColor: '#333' },
  infoContenedor: { padding: 15 },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nombre: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  precio: { fontSize: 16, fontWeight: 'bold' },
  detallesFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, gap: 5 },
  textoEtiqueta: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }
});