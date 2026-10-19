# Sistema de Acompañamiento Técnico

Aplicación web responsive para registrar, programar y reportar capacitaciones de las delegaciones territoriales. Esta primera versión funciona con datos de demostración y guarda los cambios temporalmente en el navegador del equipo.

## Funciones disponibles

- Panel mensual con indicadores de actividades y protagonistas.
- Registro de actividades para las 17 delegaciones.
- Registro de la institución que imparte cada capacitación: MIFIC, MINSA, SETEC, Bomberos, Policía, INATEC o DDT (INTUR).
- Selección de la persona facilitadora cuando la capacitación es impartida por DDT (INTUR).
- Buscador y filtros por delegación, estado y mes.
- Calendario mensual con colores consistentes por estado.
- Reporte de hombres y mujeres con total automático.
- Cancelación sin borrar el registro.
- Reprogramación conservando fecha original e historial.
- Vista preliminar de plan semanal, informe semanal y plan mensual.
- Resumen departamental separado por semana y mes para las 17 delegaciones INTUR.
- Diseño adaptado a computadora, tablet y navegador móvil Android.
- Línea gráfica basada en la identidad institucional de INTUR y Mapa Nacional de Turismo.
- Exportación Excel semanal, mensual, departamental y de la base completa.
- Cada Excel incluye hojas de resumen, actividades y catálogos para análisis posterior con IA.
- Herramientas WebMCP para consultar y crear actividades desde agentes compatibles.

Los registros identificados como **DEMO** son ficticios. Las nuevas actividades se almacenan en `localStorage` hasta conectar Supabase.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior, o pnpm 10 o superior.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Con pnpm:

```bash
pnpm install
pnpm dev
```

Abrí la dirección local que muestra la terminal, normalmente `http://127.0.0.1:5173`.

## Validar y crear el build

```bash
npm run lint
npm run build
```

El resultado queda en `dist/`.

## Tecnologías

React, TypeScript, Vite, Tailwind CSS y Lucide React.

## Conexión futura con Supabase

1. Copiar `.env.example` como `.env`.
2. Agregar la URL y la clave pública anónima de Supabase.
3. Instalar `@supabase/supabase-js`.
4. Implementar un repositorio Supabase que cumpla la interfaz `ActivityRepository` en `src/services/activityRepository.ts`.
5. Aplicar `supabase/schema.sql` y revisar las políticas RLS antes de usar datos reales.

Las claves reales nunca deben subirse a GitHub. Los roles previstos son `ADMIN`, `NIVEL_CENTRAL` y `DELEGADO`. La interfaz puede adaptar controles según el rol, pero la protección real deberá hacerse con Row Level Security en Supabase.

## Google Calendar en SAT Central

El botón **Enlazar calendario** del Plan mensual lee las capacitaciones ya guardadas en Supabase y las sincroniza con el calendario principal de la cuenta Google autorizada. Cada evento lleva a la persona responsable en el título, asigna verde a las capacitaciones territoriales y rojo a DDT o INTUR Central, y conserva fecha, horario, lugar y estado.

Para habilitarlo en GitHub Pages:

1. Activar Google Calendar API y crear un ID de cliente OAuth para aplicación web.
2. En la configuración del cliente, permitir como origen autorizado el dominio de GitHub Pages del SAT Central.
3. En el repositorio de GitHub, crear la variable de Actions `VITE_GOOGLE_CLIENT_ID` con ese ID público.
4. Volver a ejecutar el flujo `Publicar SAT en GitHub Pages`.

La sincronización solicita permiso al usuario de Google al enlazar el plan. Los eventos creados se identifican con metadatos privados para actualizarse sin duplicados. No requiere cambios de esquema en Supabase.

## Integración documental INTUR

La arquitectura de las vistas preliminares se alinea con los skills locales de Plan Semanal e Informe Semanal. La generación futura de Word deberá trabajar sobre el último documento aprobado, mantener un único archivo por período y comprobar los totales desde el detalle. Consultá [docs/integracion-documental.md](docs/integracion-documental.md).
