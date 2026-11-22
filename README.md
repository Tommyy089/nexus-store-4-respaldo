# Nexus Store 4.0 — Frontend premium (React + Vite)

Rediseño futurista y responsive de la SPA de **Nexus Store**, integrada con el backend Spring Boot por API REST – DSY1104 Desarrollo Fullstack II, Evaluación Parcial 3.

## 1. Requisitos
- Node.js 20+ y npm.
- Backend en ejecución (por defecto `http://localhost:8080`). Ver el repositorio `nexus-backend`.

## 2. Instalación y ejecución
```bash
npm install
cp .env.example .env      # ajusta VITE_API_URL si el backend usa otro puerto
npm run dev               # http://localhost:5173
```
Otros scripts: `npm run build`, `npm run preview`, `npm test` (Karma + Jasmine, genera cobertura en `coverage/`).

## 3. Cómo se conecta con el backend
| Capa | Archivo | Responsabilidad |
|---|---|---|
| Cliente HTTP | `src/services/http.js` | Adjunta `Authorization: Bearer`, renueva el token ante un 401 (una sola renovación compartida) y normaliza los errores (`ApiError`) |
| Servicios | `src/services/*.js` | `authService`, `juegoService`, `pedidoService`, `usuarioService` (un archivo por recurso de la API) |
| Sesión | `src/services/session.js`, `src/context/AuthContext.jsx` | Guarda y restaura la sesión; la valida con `GET /api/auth/me` al cargar la página |
| Acceso | `src/components/ProtectedRoute.jsx`, `SoloRol.jsx` | Restricción de rutas y de botones/acciones por rol |

## 4. Sesión y persistencia
- Los tokens se guardan en `sessionStorage` (sobreviven a F5, se borran al cerrar la pestaña) o en `localStorage` si el usuario marca *Mantener sesión iniciada*. **Nunca** se guarda la contraseña.
- Al recargar, `AuthProvider` restaura la sesión y la valida con el backend; si el access token venció, se renueva solo con el refresh token; si el servidor rechaza la sesión, se limpia.
- Al cerrar sesión se revoca el refresh token en el servidor.
- Nota de seguridad: guardar tokens en el navegador es vulnerable a XSS; en producción lo más robusto es una cookie `httpOnly` + `SameSite`. Se documenta como mejora futura.

## 5. Restricciones por rol
| Ruta / elemento | Invitado | CLIENTE | ADMIN |
|---|---|---|---|
| Catálogo, detalle, ofertas, carrito | ✔ | ✔ | ✔ |
| `/checkout`, `/pago-*`, `/boleta/:id`, `/mi-cuenta` | → login | ✔ | ✔ |
| `/admin` (CRUD de juegos, usuarios, pedidos) | → login | → acceso denegado | ✔ |
| Botón **Admin** y *Panel Admin* en la barra | oculto | oculto | visible |

> La protección del frontend es de experiencia de usuario. La seguridad real está en el backend: aunque alguien manipule el navegador, la API responde 401/403.

## 6. Estructura
```
src/
├── components/   Navbar, ProductCard, ProtectedRoute, SoloRol, Estado
├── context/      AuthContext (sesión), ToastContext (notificaciones)
├── hooks/        useApi
├── pages/        Home, Catálogo, Compra, Cuenta, Auth, AdminDashboard
├── services/     http, session, auth/juego/pedido/usuario/carrito
├── utils/        format (IVA, formatos)
└── test/         NexusApp.spec.jsx (27 pruebas)
```

## 7. Cuentas de prueba (creadas por el backend)
`admin@nexus.cl` / `Admin12345` (ADMIN) · `cliente@nexus.cl` / `Cliente12345` (CLIENTE)

## 8. Diseño Nexus Store 2.0
La interfaz visual se rediseñó sobre la versión funcional original, sin cambiar los contratos de la API ni la lógica de compra o autenticación.
- Portada animada desde datos reales de Spring Boot; carrusel con controles accesibles y pausa de interacción.
- Fondos neón, tarjetas premium, búsqueda, filtros de categorías, paneles y formulario con tema visual coherente.
- Modo `prefers-reduced-motion` para personas que prefieren menos movimiento.
- Los roles **VENDEDOR, ADMIN y CLIENTE** conservan sus restricciones.

Lee `REDISENO_NEXUS_STORE_2_0.md`. **Tras el rediseño se deben volver a ejecutar `npm test` y `npm run build` y actualizar las capturas de la documentación.**


## 9. Ficha de producto y reputación real — v4.0

Cada juego enlaza a `/producto/:id`. La ficha contiene descripciones, precios, descuentos, stock, favoritos, recomendaciones, reseñas, media de estrellas, distribución, orden y filtro por compra verificada.

Las opiniones se guardan **en Oracle mediante la API REST**, no en `localStorage`. CLIENTE y ADMIN pueden publicar/editar/borrar solo su opinión. VENDEDOR únicamente puede consultar (el backend aplica 403). La marca «Compra verificada» se calcula en el servidor a partir de pedidos completados. No hay opiniones falsas ni calificaciones precargadas.

`src/pages/DetalleProducto.jsx`, `src/services/resenaService.js`, `src/components/Estrellas.jsx`, `src/hooks/useValoracionesResumen.js`.

**Pruebas:** ejecuta nuevamente `npm test` y `npm run build` con la nueva versión. Las cifras antiguas corresponden a otra revisión.
