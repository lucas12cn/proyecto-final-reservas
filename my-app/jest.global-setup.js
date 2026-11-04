// Las pruebas corren siempre en hora de Argentina (UTC-3), donde vive la app. Así no dependen de
// la zona de la computadora o del CI y detectan errores que sólo aparecen de noche (21:00 a 24:00,
// cuando en UTC ya es el día siguiente), como el que tenía la grilla.
module.exports = async () => {
  process.env.TZ = 'America/Argentina/Buenos_Aires';
};
