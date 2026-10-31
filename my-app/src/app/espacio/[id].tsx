import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { useTema } from '../../hooks/use-theme';
import { obtenerEspacioPorId, alternarFavoritoApi, obtenerMisFavoritos } from '../../servicios/reservas';
import { Espacio } from '../../tipos';

const ReproductorCancha = ({ url }: { url: string }) => {
  const player = useVideoPlayer(url, (p) => { p.loop = true; });
  return <VideoView player={player} style={estilos.video} />;
};

const ReproductorMini = ({ url }: { url: string }) => {
  const player = useVideoPlayer(url, (p) => { p.loop = true; p.muted = true; });
  return <VideoView player={player} style={estilos.fotoGaleria} />;
};

// Variable global para mantener la conexión abierta
let db: SQLite.SQLiteDatabase | null = null;

export default function FichaEspacioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paleta } = useTema();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [esFavorito, setEsFavorito] = useState(false);
  const [archivosComunidad, setArchivosComunidad] = useState<{uri: string, tipo: string}[]>([]);
  const [imagenCache, setImagenCache] = useState<string | null>(null);
  const [videoCache, setVideoCache] = useState<string | null>(null);
  const [dbLista, setDbLista] = useState(false);

  // Inicialización segura de la base de datos
  useEffect(() => {
    let montado = true;
    const inicializarDB = async () => {
      try {
        if (!db) {
           db = await SQLite.openDatabaseAsync('canchas_galeria.db');
        }
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS galeria (
            espacioId TEXT PRIMARY KEY,
            fotos_json TEXT
          );
        `);
        if (montado) setDbLista(true);
      } catch (error) {
        console.error("Error inicializando SQLite en Ficha:", error);
      }
    };
    inicializarDB();
    return () => { montado = false; };
  }, []);

  const cargarGaleriaLocal = async () => {
    if (!id || !dbLista || !db) return;
    try {
      const fila = await db.getFirstAsync<{ fotos_json: string }>(
        'SELECT fotos_json FROM galeria WHERE espacioId = ?',
        [id as string]
      );

      if (fila && fila.fotos_json) {
        const datosParseados = JSON.parse(fila.fotos_json);
        const archivosNormalizados = datosParseados.map((item: any) => 
          typeof item === 'string' ? { uri: item, tipo: 'image' } : item
        );
        setArchivosComunidad(archivosNormalizados);
      }
    } catch (error) {
      console.error("Error cargando galería local:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDetalle();
      if (dbLista) {
          cargarGaleriaLocal();
      }
    }, [id, dbLista])
  );

  const cargarDetalle = async () => {
    try {
      if (!id) return;
      const data = await obtenerEspacioPorId(id as string);
      if (!data) { setCargando(false); return; }
      setEspacio(data);
      
      const misFavs = await obtenerMisFavoritos();
      setEsFavorito(misFavs.some((fav: any) => String(fav.id || fav) === String(id)));

      const directorio = (FileSystem as any).documentDirectory;
      if (!directorio) return;

      const imgUrl = data.imagenes && data.imagenes.length > 0 ? data.imagenes[0] : null;
      if (imgUrl) {
        const fileUriImg = directorio + `esp_img_${id}.jpg`;
        const infoImg = await FileSystem.getInfoAsync(fileUriImg);
        if (infoImg.exists) { 
          setImagenCache(infoImg.uri); 
        } else {
          try {
            const resultImg = await FileSystem.downloadAsync(imgUrl, fileUriImg);
            setImagenCache(resultImg.uri);
          } catch (e) { setImagenCache(imgUrl); }
        }
      }

      const vidUrl = data.videoUrl;
      if (vidUrl) {
        const fileUriVid = directorio + `esp_vid_${id}.mp4`;
        const infoVid = await FileSystem.getInfoAsync(fileUriVid);
        if (infoVid.exists) { 
          setVideoCache(infoVid.uri); 
        } else {
          try {
            const resultVid = await FileSystem.downloadAsync(vidUrl, fileUriVid);
            setVideoCache(resultVid.uri);
          } catch (e) { setVideoCache(vidUrl); }
        }
      }
    } catch (error) {
      console.log("Error al cargar la cancha:", error);
    } finally {
      setCargando(false);
    }
  };

  const manejarFavorito = async () => {
    const nuevoEstado = !esFavorito;
    setEsFavorito(nuevoEstado);
    try {
      await alternarFavoritoApi(id as string, nuevoEstado);
    } catch (error: any) {
      setEsFavorito(!nuevoEstado);
      Alert.alert("Error", error.message);
    }
  };

  const reportarEstado = async () => {
    if (!dbLista || !db) {
        Alert.alert("Error", "La base de datos aún no está lista.");
        return;
    }

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { Alert.alert("Permiso denegado"); return; }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], quality: 0.7, allowsEditing: true,
    });

    if (!resultado.canceled && resultado.assets.length > 0) {
      const asset = resultado.assets[0];
      const nuevoArchivo = { uri: asset.uri, tipo: asset.type === 'video' ? 'video' : 'image' };
      const nuevaLista = [nuevoArchivo, ...archivosComunidad];
      setArchivosComunidad(nuevaLista);
      
      try {
        await db.runAsync(
          'INSERT OR REPLACE INTO galeria (espacioId, fotos_json) VALUES (?, ?)',
          [id as string, JSON.stringify(nuevaLista)]
        );
        Alert.alert("¡Reporte subido!");
      } catch (error) {
        console.error("Error guardando en galería local:", error);
        Alert.alert("Error al guardar localmente.");
      }
    }
  };

  if (cargando) return <View style={[estilos.centrado, { backgroundColor: paleta.background }]}><ActivityIndicator size="large" color={paleta.accent} /></View>;
  if (!espacio) return <View style={[estilos.centrado, { backgroundColor: paleta.background }]}><Text style={{ color: paleta.text }}>Error.</Text></View>;

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: paleta.background }]} edges={['top']}>
      <View style={estilos.cabecera}>
        <TouchableOpacity onPress={() => router.back()} style={estilos.botonCabecera}><Ionicons name="arrow-back" size={24} color={paleta.text} /></TouchableOpacity>
        <Text style={[estilos.tituloCabecera, { color: paleta.text }]}>Detalle de Cancha</Text>
        <TouchableOpacity onPress={manejarFavorito} style={estilos.botonCabecera}>
          <Ionicons name={esFavorito ? "heart" : "heart-outline"} size={26} color={esFavorito ? "#ef4444" : paleta.text} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>
        <Image source={{ uri: imagenCache || espacio.imagenes?.[0] || 'https://via.placeholder.com/400x200' }} style={estilos.imagenPrincipal} />
        <View style={estilos.contenedorInfo}>
          <Text style={[estilos.nombre, { color: paleta.text }]}>{espacio.nombre}</Text>
          <Text style={{ color: paleta.muted, fontSize: 16 }}>{espacio.complejo}</Text>
          <View style={[estilos.cajaPrecio, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
            <Text style={[estilos.textoPrecio, { color: paleta.accent }]}>${espacio.precioPorHora} / hora</Text>
            <Text style={{ color: paleta.text }}>Capacidad: {espacio.capacidad} personas</Text>
          </View>
          <Text style={[estilos.subtitulo, { color: paleta.text }]}>Características</Text>
          <View style={estilos.contenedorChips}>
            <View style={[estilos.chip, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
              <Ionicons name="layers-outline" size={16} color={paleta.text} />
              <Text style={[estilos.textoChip, { color: paleta.text }]}>{espacio.superficie}</Text>
            </View>
            {espacio.iluminacion && (
              <View style={[estilos.chip, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
                <Ionicons name="flashlight" size={16} color="#eab308" />
                <Text style={[estilos.textoChip, { color: '#eab308' }]}>Luz Nocturna</Text>
              </View>
            )}
            <View style={[estilos.chip, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
              <Ionicons name={espacio.techado ? "home-outline" : "cloud-outline"} size={16} color={paleta.text} />
              <Text style={[estilos.textoChip, { color: paleta.text }]}>{espacio.techado ? 'Techado' : 'Cielo Abierto'}</Text>
            </View>
          </View>
          <Text style={[estilos.subtitulo, { color: paleta.text }]}>Reglas del lugar</Text>
          <View style={[estilos.cajaReglas, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
            <Ionicons name="information-circle" size={22} color={paleta.accent} style={estilos.iconoReglas} />
            <Text style={[estilos.textoReglas, { color: paleta.text }]}>{espacio.reglas || 'No hay reglas específicas para este espacio.'}</Text>
          </View>
          <View style={estilos.seccionEstado}>
            <View style={estilos.cabeceraEstado}>
              <Text style={[estilos.subtitulo, { color: paleta.text, marginTop: 0, marginBottom: 0 }]}>Estado actual</Text>
              <TouchableOpacity onPress={reportarEstado} style={[estilos.botonReportar, { backgroundColor: paleta.accent }]}>
                <Ionicons name="camera" size={16} color="white" />
                <Text style={estilos.textoBotonReportar}>Reportar</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: paleta.muted, fontSize: 13, marginBottom: 12 }}>Archivos recientes de la comunidad</Text>
            {!dbLista ? (
                <Text style={{ color: paleta.muted, textAlign: 'center', marginTop: 10 }}>Preparando galería...</Text>
            ) : archivosComunidad.length === 0 ? (
              <View style={[estilos.cajaVacia, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
                <Ionicons name="images-outline" size={32} color={paleta.muted} />
                <Text style={{ color: paleta.muted, marginTop: 8 }}>Nadie subió archivos aún. ¡Sé el primero!</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {archivosComunidad.map((archivo, index) => (
                  archivo.tipo === 'video' ? (
                    <View key={index} style={estilos.fotoGaleria}><ReproductorMini url={archivo.uri} /></View>
                  ) : (
                    <Image key={index} source={{ uri: archivo.uri }} style={estilos.fotoGaleria} />
                  )
                ))}
              </ScrollView>
            )}
          </View>
          {videoCache ? (
            <View>
              <Text style={[estilos.subtitulo, { color: paleta.text }]}>Recorrido en video (Guardado offline)</Text>
              <ReproductorCancha url={videoCache} />
            </View>
          ) : espacio.videoUrl ? (
            <View>
              <Text style={[estilos.subtitulo, { color: paleta.text }]}>Recorrido en video</Text>
              <ReproductorCancha url={espacio.videoUrl} />
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={[estilos.pie, { backgroundColor: paleta.background, borderTopColor: paleta.border }]}>
        <TouchableOpacity 
          style={[estilos.botonReservar, { backgroundColor: paleta.accent }]} 
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: "/espacio/disponibilidad", params: { id } })}
        >
          <Text style={estilos.textoBotonReservar}>Ver Disponibilidad</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pantalla: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  botonCabecera: { padding: 5 },
  tituloCabecera: { fontSize: 18, fontWeight: 'bold' },
  scroll: { paddingBottom: 100 },
  imagenPrincipal: { width: '100%', height: 220, backgroundColor: '#333' },
  contenedorInfo: { padding: 20 },
  nombre: { fontSize: 26, fontWeight: 'bold', marginBottom: 5 },
  cajaPrecio: { marginTop: 20, padding: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 5 },
  textoPrecio: { fontSize: 22, fontWeight: 'bold' },
  subtitulo: { fontSize: 18, fontWeight: 'bold', marginTop: 25, marginBottom: 12 },
  contenedorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, gap: 6 },
  textoChip: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  cajaReglas: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  iconoReglas: { marginRight: 10, marginTop: 2 },
  textoReglas: { flex: 1, fontSize: 14.5, lineHeight: 22 },
  seccionEstado: { marginTop: 25 },
  cabeceraEstado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  botonReportar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  textoBotonReportar: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  cajaVacia: { alignItems: 'center', justifyContent: 'center', padding: 25, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  fotoGaleria: { width: 140, height: 100, borderRadius: 8, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  video: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#000', marginTop: 15 },
  pie: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
  botonReservar: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  textoBotonReservar: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});