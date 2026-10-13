# Plantilla Word del informe semanal INTUR

## Análisis visual y estructural

- Documento de referencia: `Informe_semanal_21_al_25_septiembre_2026(1)(2).docx`.
- Formato: carta vertical, márgenes aproximados de 1.23 pulgadas arriba, 1.05 abajo y 0.54 a izquierda y derecha.
- Identidad institucional: logotipos superiores, fondo gráfico tenue de página completa y distintivo inferior conservados en los encabezados de Word.
- Tipografía: Courier New; encabezado principal de 12 pt en negrita; período y cuerpo de 10.5 pt.
- Estructura: dirección y nombre del informe centrados; período centrado; resumen justificado; total validado; actividades agrupadas por día y numeradas consecutivamente.
- Campos de actividad: nombre, hora, lugar, instituciones participantes, asistencia y observación cuando corresponde.
- El documento no usa tablas para el cuerpo. Cada campo ocupa un párrafo y sus etiquetas se muestran en negrita.

## Decisiones de implementación

- La aplicación carga una copia de la plantilla desde `public/templates` y modifica únicamente `word/document.xml` dentro del paquete DOCX.
- Se preservan sin cambios las imágenes, encabezados, relaciones, estilos, temas, márgenes y propiedades de sección.
- Los totales se calculan solamente desde actividades desarrolladas con asistencia válida: hombres + mujeres = total.
- Las actividades programadas, reprogramadas, canceladas y desarrolladas con reporte incompleto se conservan en el detalle y no se suman como ejecución validada.
- El nombre descargado sigue el patrón `Informe_semanal_<inicio>_al_<fin>.docx`.

## Validación prevista

- Compilar la aplicación y comprobar la descarga desde la vista Informe semanal.
- Abrir el DOCX generado con Microsoft Word, exportarlo a PDF y renderizar todas las páginas.
- Revisar visualmente encabezados, fondo, tipografía, saltos de página, orden cronológico, numeración y coherencia de sumas.
