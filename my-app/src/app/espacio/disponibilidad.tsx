import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../../hooks/use-theme';
import { obtenerTurnosEspacio } from '../../servicios/reservas';

// AAAA-MM-DD con la fecha LOCAL del teléfono. No usar toISOString(): devuelve la fecha en UTC y
// en Argentina (UTC-3), de 21:00 a 24:00, UTC ya es el día siguiente (el "Hoy" pediría mañana).
const aFechaLocal = (fecha: Date) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const generarProximosDias = () => {
  const dias = [];
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let i = 0; i < 7; i++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + i);
    const isoString = aFechaLocal(fecha);
    dias.push({
      iso: isoString,
      nombre: i === 0 ? 'Hoy' : nombresDias[fecha.getDay()],
      numero: fecha.getDate()
    });
  }
  return dias;
};

export default function DisponibilidadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paleta } = useTema();
  
  const proximosDias = generarProximosDias();
  const [fechaSeleccionada, setFechaSeleccionada] = useState(proximosDias[0].iso);
  const [turnosReales, setTurnosReales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Forzamos el refresco limpio cada vez que la pantalla gana el foco
  useFocusEffect(
    useCallback(() => {
      let estaActivo = true;

      const cargarGrilla = async () => {
        setCargando(true);
        try {
          if (!id) return;
          const datosTurnos = await obtenerTurnosEspacio(id as string, fechaSeleccionada);
          if (estaActivo) {
            setTurnosReales(datosTurnos);
          }
        } catch (error) {
          console.log("Error al cargar disponibilidad:", error);
        } finally {
          if (estaActivo) {
            setCargando(false);
          }
        }
      };

      cargarGrilla();

      return () => {
        estaActivo = false;
      };
    }, [id, fechaSeleccionada])
  );

  const renderBotonEstado = (estado: string) => {
    switch (estado) {
      case 'libre':
        return (
          <View style={[estilos.botonEstado, { backgroundColor: '#10b981' }]}>
            <Text style={estilos.textoEstadoFuerte}>Disponible</Text>
          </View>
        );
      case 'reservado':
      case 'fijo':
        return (
          <View style={[estilos.botonEstado, { backgroundColor: paleta.surface, borderColor: paleta.border, borderWidth: 1 }]}>
            <Text style={[estilos.textoEstadoDebil, { color: paleta.muted }]}>Ocupado</Text>
          </View>
        );
      case 'mantenimiento':
        return (
          <View style={[estilos.botonEstado, { backgroundColor: '#f59e0b' }]}>
            <Text style={estilos.textoEstadoFuerte}>Mantenimiento</Text>
          </View>
        );
      case 'pasado':
        return (
          <View style={[estilos.botonEstado, { backgroundColor: 'transparent' }]}>
            <Text style={[estilos.textoEstadoDebil, { color: paleta.border }]}>Finalizado</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const calcularEstadoVisual = (turno: any) => {
    const [year, month, day] = fechaSeleccionada.split('-').map(Number);
    const fechaCalendario = new Date(year, month - 1, day); 
    
    const hoy = new Date();
    const hoyMedianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    if (fechaCalendario < hoyMedianoche) {
      return 'pasado'; 
    }
    
    if (fechaCalendario.getTime() === hoyMedianoche.getTime()) {
      const horaActual = hoy.getHours();
      const horaTurno = parseInt(turno.inicio.split(':')[0], 10);
      if (horaTurno <= horaActual) {
        return 'pasado';
      }
    }
    
    return turno.estado; 
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: paleta.background }]} edges={['top']}>
      <View style={estilos.cabecera}>
        <TouchableOpacity onPress={() => router.back()} style={estilos.botonVolver}>
          <Ionicons name="arrow-back" size={24} color={paleta.text} />
        </TouchableOpacity>
        <Text style={[estilos.tituloCabecera, { color: paleta.text }]}>Elegir Turno</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[estilos.contenedorFechas, { borderBottomColor: paleta.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.scrollFechas}>
          {proximosDias.map((dia) => {
            const activo = dia.iso === fechaSeleccionada;
            return (
              <TouchableOpacity 
                key={dia.iso} 
                style={[
                  estilos.botonFecha, 
                  activo && { backgroundColor: paleta.accent, borderColor: paleta.accent }
                ]}
                onPress={() => setFechaSeleccionada(dia.iso)}
              >
                <Text style={[estilos.nombreDia, { color: activo ? 'white' : paleta.muted }]}>{dia.nombre}</Text>
                <Text style={[estilos.numeroDia, { color: activo ? 'white' : paleta.text }]}>{dia.numero}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color={paleta.accent} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.listaTurnos}>
          {turnosReales.length === 0 ? (
            <Text style={{ textAlign: 'center', color: paleta.muted, marginTop: 20 }}>
              No hay turnos disponibles para esta fecha.
            </Text>
          ) : (
            turnosReales.map((turno) => {
              const estadoVisual = calcularEstadoVisual(turno);
              const horaCorta = turno.inicio.substring(0, 5); 

              return (
                <TouchableOpacity 
                  key={turno.id} 
                  style={[estilos.filaTurno, { borderBottomColor: paleta.border }]}
                  disabled={estadoVisual !== 'libre'} 
                  activeOpacity={0.7}
                  onPress={() => router.push({ 
                    pathname: "/espacio/confirmar", 
                    params: { id, fecha: fechaSeleccionada, hora: horaCorta, turnoId: turno.id } 
                  })}
                >
                  <Text style={[estilos.textoHora, { color: estadoVisual === 'pasado' ? paleta.border : paleta.text }]}>
                    {horaCorta}
                  </Text>
                  {renderBotonEstado(estadoVisual)}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  botonVolver: { padding: 5 },
  tituloCabecera: { fontSize: 18, fontWeight: 'bold' },
  contenedorFechas: { borderBottomWidth: 1, paddingBottom: 15 },
  scrollFechas: { paddingHorizontal: 15, gap: 12 },
  botonFecha: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  nombreDia: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  numeroDia: { fontSize: 20, fontWeight: 'bold' },
  listaTurnos: { padding: 20 },
  filaTurno: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  textoHora: { width: 60, fontSize: 16, fontWeight: 'bold' },
  botonEstado: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  textoEstadoFuerte: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  textoEstadoDebil: { fontWeight: '600', fontSize: 16 }
});