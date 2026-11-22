# Nexus Store 2.0 — Rediseño de interfaz gaming

**Base de código:** versión de Nexus Store con las 27 pruebas del frontend aprobadas previamente en el equipo del estudiante.

## Concepto visual
Inspirado en la referencia visual compartida: interfaz gaming premium, fondo negro, acentos violeta y cian, navegación compacta y tarjetas inmersivas. Se mantiene **Nexus Store** como marca del proyecto evaluado.

**Mejoras:**
- Encabezado con búsqueda real, acceso a carrito, cuenta y panel ADMIN, navegación adaptable a móvil.
- Hero dinámico alimentado por `GET /api/v1/juegos`; cambios automáticos cada 6,5 segundos, controles anteriores/siguientes, indicadores, pausa al interactuar y animación de entrada.
- Fondos con aurora y malla animada, botones neón y transiciones de hover.
- Tarjetas con zoom de portada, destello de luz, ofertas, stock crítico, detalles reales y compra funcional.
- Chips de categorías enlazados al filtro real de la API.
- Apariencia cohesionada en catálogo, carrito, checkout, cuentas, administración y panel vendedor, manteniendo sus componentes y estructura interna.
- Responsive y soporte para `prefers-reduced-motion`.

## Funciones del proyecto conservadas
No se cambió la comunicación HTTP ni la persistencia: Spring Boot, Oracle, Swagger API v1, JWT access/refresh, sesión, carrito, compra simulada, licencias, historial, IVA, boleta interna y paneles por rol siguen con la misma implementación que la versión original.

Rutas conservadas: `/`, `/categorias`, `/producto/:id`, `/ofertas`, `/carrito`, `/login`, `/registro`, `/blog`, `/nosotros`, `/contacto`, `/acceso-denegado`, `/checkout`, `/pago-correcto`, `/pago-error`, `/boleta/:id`, `/mi-cuenta`, `/vendedor`, `/admin` y la ruta 404.

## Validación antes de entregar
Desde la carpeta `nexus-frontend`:

```powershell
npm install
npm test
npm run build
npm run dev
```

La suite debe mostrar `TOTAL: 27 SUCCESS` y el build debe terminar sin errores. Después hay que ejecutar la compra de prueba conectando a `http://localhost:8080/api/v1`, comprobar el acceso a paneles y actualizar las capturas del manual, pues este rediseño cambia el aspecto de la interfaz.

**Estado de revisión en este entorno:** sintaxis de los componentes JSX y hojas CSS analizada con éxito; no fue posible ejecutar Karma ni Vite aquí al no disponer de las dependencias de Node en caché. No debe presentarse 27/27 para esta nueva versión hasta comprobarlo en Windows.

**Seguridad:** no incluyas `application-local.properties`, tokens, contraseñas ni claves de licencia en GitHub o capturas. Cambia los valores predeterminados para una instalación pública.

**Alcance académico:** el checkout tiene pago simulado; la boleta es una visualización interna y no equivale a un documento tributario emitido por el SII.
