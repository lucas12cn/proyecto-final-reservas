import { useState } from 'react';
import { Alert } from 'react-native';

export function useLogin() {
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async (email: string, contrasena: string) => {
    if (email.trim() === "" || contrasena.trim() === "") {
      Alert.alert("Error", "Completá todos los campos para continuar.");
      return null;
    }

    setCargando(true);
    try {
      // Reemplazá TU_IP_LOCAL por la IP de tu computadora (ej: 192.168.0.15)
      const url = "http://TU_IP_LOCAL:3000/auth/ingreso";
      const respuesta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), contrasena: contrasena.trim() })
      });

      const json = await respuesta.json();

      if (respuesta.ok) {
        return json.datos;
      } else {
        Alert.alert("Error", json.error?.mensaje || "No se pudo iniciar sesión.");
        return null;
      }
    } catch (error) {
      Alert.alert("Sin conexión", "Asegurate de que la API esté encendida en la IP correcta.");
      return null;
    } finally {
      setCargando(false);
    }
  };

  return { iniciarSesion, cargando };
}