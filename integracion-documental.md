# Integración futura con documentos INTUR

## Plan semanal

La vista `Plan semanal` filtra por semana y delegación y ordena las actividades por fecha y hora. En la siguiente fase, un servicio de exportación deberá transformar esos registros al formato institucional definido por el skill `plan-semanal`:

- usar el último plan aprobado como plantilla;
- conservar diseño, encabezados, logotipos, tipografía, márgenes y numeración;
- numerar las actividades consecutivamente durante toda la semana;
- mantener los campos tema, hora, lugar, participantes proyectados y responsable;
- renderizar y revisar todas las páginas antes de entregar;
- conservar un único archivo canónico por período en Google Drive.

## Informe semanal

La vista `Informe semanal` suma únicamente las actividades desarrolladas con desglose completo. En la siguiente fase, el servicio de exportación deberá aplicar el skill `informe-semanal`:

- diferenciar programadas, desarrolladas, pendientes y canceladas;
- no convertir proyecciones en asistencia real;
- comprobar que hombres más mujeres coincide con el total por actividad y en el informe;
- explicar actividades adicionales, pendientes o sin ejecución;
- usar una copia del último formato aprobado y conservar sus elementos institucionales;
- renderizar y revisar todas las páginas;
- actualizar el único archivo canónico del período en Google Drive.

La generación documental quedará detrás de una interfaz independiente del almacenamiento, para que pueda usar Supabase como fuente sin acoplar los componentes de pantalla al formato Word.
