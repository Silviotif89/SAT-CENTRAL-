# Outstrip · Votación de desafíos

Página responsive para puntuar los nueve desafíos del Rally Latinoamericano de Innovación 2026. Cada evaluador puntúa del 1 al 10; el resumen calcula el promedio de cada tema y coloca primero el de menor promedio como candidato a descarte.

## Estado

La página ya tiene la interfaz, la lista de siete integrantes compartida por el usuario y el evaluador adicional `Mentor/a`. El botón superior **Modo mentor** abre una matriz de evaluaciones individuales y promedios, con opción para descargar un CSV. Sin configurar Supabase, funciona en modo demostración y conserva las evaluaciones únicamente en el navegador local. Para compartir resultados entre estudiantes hace falta conectar un proyecto Supabase.

## Conectar Supabase

1. Crear o elegir un proyecto Supabase.
2. En el proyecto, vincular GitHub desde **Project Settings > Integrations > GitHub Integration**, elegir este repositorio y habilitar la integración.
3. La migración en `supabase/migrations/` crea la tabla y sus políticas en el proyecto vinculado.
4. Copiar la URL del proyecto y la clave pública `anon`/`publishable` en `config.js`.
5. Habilitar GitHub Pages desde **Settings > Pages > GitHub Actions**. Cada cambio en `main` publica la página.

Supabase recomienda mantener los cambios de base de datos en migraciones versionadas. Su integración oficial puede sincronizar la carpeta `supabase/` y aplicar migraciones según la configuración del proyecto.

La clave pública puede estar en el navegador; nunca usar `service_role`. Esta primera versión usa acceso anónimo: cualquier persona que encuentre la página podría leer y modificar las evaluaciones, incluso seleccionando el nombre de otro integrante o `Mentor/a`. El botón **Modo mentor** es solo una vista de interfaz, no una autenticación ni un permiso protegido. Antes de publicar los datos reales conviene incorporar inicio de sesión y políticas RLS que limiten la lectura del detalle a mentores autorizados.

## Estructura

La tabla `public.rally_evaluations` almacena una fila por integrante. `scores` contiene los puntajes por número de desafío, entre 1 y 10. La llave primaria por nombre permite que una persona guarde una nueva versión de sus notas sin duplicar su voto; la base conserva la fecha de creación y actualiza `updated_at` desde la página. La página consulta el ranking cada 15 segundos.
