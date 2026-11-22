import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import ProtectedRoute from '../components/ProtectedRoute';
import SoloRol from '../components/SoloRol';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import Home from '../pages/Home';
import { Carrito, Checkout, PagoCorrecto, MostrarBoleta } from '../pages/CompraPages';
import { Login, Registro } from '../pages/AuthPages';
import AdminDashboard from '../pages/AdminDashboard';
import { sessionStore } from '../services/session';
import { request, ApiError } from '../services/http';
import { carritoService } from '../services/carritoService';
import { aJuegoUi, aJuegoApi } from '../services/juegoService';
import { calcularDesgloseIVA } from '../utils/format';

// ----------------------------------------------------------------------------------------------
// Utilidades de prueba
// ----------------------------------------------------------------------------------------------
const CLIENTE = { id: 2, nombre: 'Ana', email: 'ana@nexus.cl', rol: 'CLIENTE', activo: true };
const ADMIN = { id: 1, nombre: 'Admin', email: 'admin@nexus.cl', rol: 'ADMIN', activo: true };

const guardarSesion = (usuario, extra = {}) =>
  sessionStorage.setItem('nexus_session', JSON.stringify({ accessToken: 'tok-1', refreshToken: 'ref-1', usuario, ...extra }));

const respuesta = (status, body) =>
  Promise.resolve(
    new Response(body === undefined || body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

/** Simula la API: rutas = [[metodo, sufijoDeRuta, (url, opts) => ({ status, body })], ...] */
function mockApi(rutas) {
  return spyOn(window, 'fetch').and.callFake((url, opts = {}) => {
    const metodo = (opts.method || 'GET').toUpperCase();
    const path = String(url).split('?')[0];
    const ruta = rutas.find(([m, sufijo]) => m === metodo && path.endsWith(sufijo));
    if (!ruta) return respuesta(404, { message: `Sin mock para ${metodo} ${path}` });
    const res = typeof ruta[2] === 'function' ? ruta[2](url, opts) : ruta[2];
    return respuesta(res.status, res.body);
  });
}

const llamadas = (spy, metodo, sufijo) =>
  spy.calls.allArgs().filter(([url, opts = {}]) => (opts.method || 'GET') === metodo && String(url).split('?')[0].endsWith(sufijo));

function renderConApp(ui, { ruta = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function EstadoSesion() {
  const { autenticado, usuario, cargando } = useAuth();
  return <div data-testid="estado">{cargando ? 'cargando' : autenticado ? `usuario:${usuario.nombre}` : 'invitado'}</div>;
}

const JUEGOS_API = [
  { id: 1, titulo: 'Zelda', categoria: 'Aventura', precio: 50, descuento: 20, precioFinal: 40, stock: 3, imagenUrl: 'z.jpg', descripcion: 'd' },
  { id: 2, titulo: 'FIFA', categoria: 'Deportes', precio: 60, descuento: 0, precioFinal: 60, stock: 8, imagenUrl: 'f.jpg', descripcion: 'd' },
  { id: 3, titulo: 'Doom', categoria: 'Shooter', precio: 30, descuento: 0, precioFinal: 30, stock: 2, imagenUrl: 'd.jpg', descripcion: 'd' },
  { id: 4, titulo: 'Halo', categoria: 'Shooter', precio: 40, descuento: 10, precioFinal: 36, stock: 9, imagenUrl: 'h.jpg', descripcion: 'd' },
  { id: 5, titulo: 'Mario', categoria: 'Aventura', precio: 45, descuento: 0, precioFinal: 45, stock: 9, imagenUrl: 'm.jpg', descripcion: 'd' },
  { id: 6, titulo: 'Gran Turismo', categoria: 'Carreras', precio: 55, descuento: 0, precioFinal: 55, stock: 9, imagenUrl: 'g.jpg', descripcion: 'd' },
];

describe('Nexus Store - Evaluación 3 (Jasmine + Karma)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ============================================================================================
  // CAPA DE SERVICIOS: sesión, cliente HTTP, mapeos, carrito
  // ============================================================================================
  describe('Servicios', () => {
    it('TC-01 [Sesión]: se guarda en sessionStorage por defecto y en localStorage si se pide recordar', () => {
      sessionStore.save({ accessToken: 'a' }, false);
      expect(sessionStorage.getItem('nexus_session')).not.toBeNull();
      expect(localStorage.getItem('nexus_session')).toBeNull();

      sessionStore.save({ accessToken: 'b' }, true);
      expect(sessionStorage.getItem('nexus_session')).toBeNull();
      expect(sessionStore.load().accessToken).toBe('b');

      sessionStore.clear();
      expect(sessionStore.load()).toBeNull();
    });

    it('TC-02 [HTTP]: adjunta el access token en la cabecera Authorization', async () => {
      guardarSesion(CLIENTE);
      const fetchSpy = mockApi([['GET', '/pedidos/mis-pedidos', { status: 200, body: [] }]]);
      await request('/pedidos/mis-pedidos');
      expect(fetchSpy.calls.mostRecent().args[1].headers.Authorization).toBe('Bearer tok-1');
    });

    it('TC-03 [HTTP]: ante un 401 renueva la sesión con el refresh token y reintenta la petición', async () => {
      guardarSesion(CLIENTE);
      const fetchSpy = mockApi([
        ['POST', '/auth/refresh', { status: 200, body: { accessToken: 'tok-2', refreshToken: 'ref-2', usuario: CLIENTE } }],
        ['GET', '/pedidos', (url, opts) =>
          opts.headers.Authorization === 'Bearer tok-2' ? { status: 200, body: [{ id: 1 }] } : { status: 401, body: { message: 'expirado' } }],
      ]);

      const datos = await request('/pedidos');

      expect(datos).toEqual([{ id: 1 }]);
      expect(llamadas(fetchSpy, 'POST', '/auth/refresh').length).toBe(1);
      expect(sessionStore.load().refreshToken).toBe('ref-2'); // el refresh token rota
    });

    it('TC-04 [HTTP]: si el refresh es rechazado limpia la sesión y lanza ApiError 401', async () => {
      guardarSesion(CLIENTE);
      mockApi([
        ['POST', '/auth/refresh', { status: 401, body: { message: 'Refresh token ya utilizado' } }],
        ['GET', '/pedidos', { status: 401, body: { message: 'expirado' } }],
      ]);

      let error;
      try { await request('/pedidos'); } catch (e) { error = e; }

      expect(error instanceof ApiError).toBeTrue();
      expect(error.status).toBe(401);
      expect(sessionStore.load()).toBeNull();
    });

    it('TC-05 [Mapeo]: traduce la respuesta de la API al modelo de la interfaz y viceversa', () => {
      const ui = aJuegoUi(JUEGOS_API[0]);
      expect(ui.nombre).toBe('Zelda');
      expect(ui.oferta).toBeTrue();
      expect(ui.precioFinal).toBe(40);

      const api = aJuegoApi({ nombre: ' Zelda ', categoria: 'Aventura', precio: '50.5', descuento: '', stock: '4', imagen: '', descripcion: '' });
      expect(api).toEqual({ titulo: 'Zelda', tipoJuego: 'Licencia digital', categoria: 'Aventura', precio: 50.5, descuento: 0, stock: 4, imagenUrl: null, descripcion: null });
    });

    it('TC-06 [Carrito]: respeta el stock disponible y calcula el total', () => {
      const p = { id: 1, nombre: 'A', precio: 50, precioFinal: 40, stock: 2, imagen: 'i' };
      expect(carritoService.agregar(p).ok).toBeTrue();
      expect(carritoService.agregar(p).ok).toBeTrue();
      expect(carritoService.agregar(p).ok).toBeFalse(); // supera el stock
      expect(carritoService.total()).toBe(80);
      expect(carritoService.agregar({ id: 2, nombre: 'B', precio: 10, stock: 0 }).ok).toBeFalse();
    });

    it('TC-07 [IVA]: desglosa un total con IVA incluido (19%)', () => {
      expect(calcularDesgloseIVA(119)).toEqual({ neto: 100, iva: 19, total: 119 });
    });
  });

  // ============================================================================================
  // COMPONENTES BÁSICOS
  // ============================================================================================
  describe('Componentes', () => {
    it('TC-08 [Renderizado condicional]: ProductCard muestra oferta, stock crítico y precio con descuento', () => {
      const prod = aJuegoUi({ ...JUEGOS_API[0], stock: 3 });
      render(<MemoryRouter><ProductCard producto={prod} /></MemoryRouter>);

      expect(screen.getByTestId('badge-oferta').textContent).toContain('-20% OFERTA');
      expect(screen.getByTestId('badge-critico').textContent).toContain('¡Últimas 3 unidades!');
      expect(screen.getByTestId('precio-original').textContent).toContain('50.00');
      expect(screen.getByTestId('precio-final').textContent).toContain('40.00');
    });

    it('TC-09 [Props y spy]: ProductCard ejecuta onAddToCart y deshabilita el botón sin stock', () => {
      const spy = jasmine.createSpy('onAddToCart');
      const prod = aJuegoUi(JUEGOS_API[1]);
      const { unmount } = render(<MemoryRouter><ProductCard producto={prod} onAddToCart={spy} /></MemoryRouter>);
      fireEvent.click(screen.getByText('Añadir al Carrito'));
      expect(spy).toHaveBeenCalledWith(prod);
      unmount();

      render(<MemoryRouter><ProductCard producto={aJuegoUi({ ...JUEGOS_API[1], stock: 0 })} onAddToCart={spy} /></MemoryRouter>);
      expect(screen.getByText('Agotado').disabled).toBeTrue();
    });
  });

  // ============================================================================================
  // IE3.3.3 / IE3.3.6: RESTRICCIONES DE ACCESO EN EL FRONTEND
  // ============================================================================================
  describe('Restricciones de acceso (rutas y botones por rol)', () => {
    const rutas = (
      <Routes>
        <Route path="/login" element={<div>pantalla-login</div>} />
        <Route path="/acceso-denegado" element={<div>pantalla-denegado</div>} />
        <Route path="/secreta" element={<ProtectedRoute><div>contenido-secreto</div></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><div>panel-admin</div></ProtectedRoute>} />
      </Routes>
    );

    it('TC-10 [ProtectedRoute]: un invitado es redirigido a /login', async () => {
      renderConApp(rutas, { ruta: '/secreta' });
      expect(await screen.findByText('pantalla-login')).toBeTruthy();
    });

    it('TC-11 [ProtectedRoute]: un CLIENTE que entra a /admin va a "acceso denegado"', async () => {
      guardarSesion(CLIENTE);
      mockApi([['GET', '/auth/me', { status: 200, body: CLIENTE }]]);
      renderConApp(rutas, { ruta: '/admin' });
      expect(await screen.findByText('pantalla-denegado')).toBeTruthy();
    });

    it('TC-12 [ProtectedRoute]: un ADMIN sí accede a /admin', async () => {
      guardarSesion(ADMIN);
      mockApi([['GET', '/auth/me', { status: 200, body: ADMIN }]]);
      renderConApp(rutas, { ruta: '/admin' });
      expect(await screen.findByText('panel-admin')).toBeTruthy();
    });

    it('TC-13 [SoloRol]: oculta el contenido a quien no tiene el rol', async () => {
      guardarSesion(CLIENTE);
      mockApi([['GET', '/auth/me', { status: 200, body: CLIENTE }]]);
      renderConApp(<><EstadoSesion /><SoloRol roles={['ADMIN']}><button>boton-admin</button></SoloRol></>);
      await screen.findByText('usuario:Ana');
      expect(screen.queryByText('boton-admin')).toBeNull();
    });

    it('TC-14 [Navbar]: el enlace Admin solo aparece para el rol ADMIN', async () => {
      // Invitado
      let vista = renderConApp(<Navbar />);
      expect(screen.queryByTestId('enlace-admin')).toBeNull();
      expect(screen.getByText('Ingresar')).toBeTruthy();
      vista.unmount();

      // Cliente
      guardarSesion(CLIENTE);
      mockApi([['GET', '/auth/me', { status: 200, body: CLIENTE }]]);
      vista = renderConApp(<Navbar />);
      expect((await screen.findByTestId('navbar-usuario')).textContent).toContain('Ana');
      expect(screen.queryByTestId('enlace-admin')).toBeNull();
      vista.unmount();
    });

    it('TC-15 [Navbar]: un ADMIN ve el enlace Admin', async () => {
      guardarSesion(ADMIN);
      mockApi([['GET', '/auth/me', { status: 200, body: ADMIN }]]);
      renderConApp(<Navbar />);
      expect(await screen.findByTestId('enlace-admin')).toBeTruthy();
    });
  });

  // ============================================================================================
  // IE3.3.2 / IE3.3.5: GESTIÓN DE SESIÓN Y PERSISTENCIA EN RECARGAS
  // ============================================================================================
  describe('Gestión de sesión', () => {
    it('TC-16 [Recarga]: al recargar la página se restaura la sesión y se valida con /auth/me', async () => {
      guardarSesion({ ...CLIENTE, nombre: 'Desactualizado' });
      const fetchSpy = mockApi([['GET', '/auth/me', { status: 200, body: CLIENTE }]]);

      renderConApp(<EstadoSesion />);

      expect(screen.getByTestId('estado').textContent).toBe('cargando');
      expect(await screen.findByText('usuario:Ana')).toBeTruthy();
      expect(llamadas(fetchSpy, 'GET', '/auth/me')[0][1].headers.Authorization).toBe('Bearer tok-1');
      expect(sessionStore.load().usuario.nombre).toBe('Ana'); // datos refrescados desde el servidor
    });

    it('TC-17 [Recarga]: si el servidor rechaza la sesión guardada, se limpia y queda como invitado', async () => {
      guardarSesion(CLIENTE);
      mockApi([
        ['GET', '/auth/me', { status: 401, body: { message: 'expirado' } }],
        ['POST', '/auth/refresh', { status: 401, body: { message: 'Refresh token inválido' } }],
      ]);

      renderConApp(<EstadoSesion />);

      // findByText espera a que React finalice la validación asíncrona.
      // Jasmine expect() no lanza una excepción al fallar, por lo que no sirve
      // por sí solo como condición de reintento dentro de waitFor().
      expect(await screen.findByText('invitado')).toBeTruthy();
      expect(sessionStore.load()).toBeNull();
    });

    it('TC-18 [Login]: envía las credenciales, guarda la sesión y redirige', async () => {
      const fetchSpy = mockApi([
        ['POST', '/auth/login', { status: 200, body: { accessToken: 'A', refreshToken: 'R', tokenType: 'Bearer', expiresIn: 900, usuario: CLIENTE } }],
      ]);
      renderConApp(
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>pantalla-inicio</div>} />
        </Routes>,
        { ruta: '/login' },
      );

      fireEvent.change(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@nexus.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave12345' } });
      fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

      expect(await screen.findByText('pantalla-inicio')).toBeTruthy();
      expect(JSON.parse(llamadas(fetchSpy, 'POST', '/auth/login')[0][1].body)).toEqual({ email: 'ana@nexus.cl', password: 'Clave12345' });
      expect(JSON.parse(sessionStorage.getItem('nexus_session')).accessToken).toBe('A');
      expect(sessionStorage.getItem('nexus_session')).not.toContain('Clave12345'); // nunca se guarda la contraseña
    });

    it('TC-19 [Login]: muestra el error que devuelve el backend si las credenciales son incorrectas', async () => {
      mockApi([['POST', '/auth/login', { status: 401, body: { message: 'Correo o contraseña incorrectos.' } }]]);
      renderConApp(<Login />);

      fireEvent.change(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@nexus.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'mala' } });
      fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

      expect((await screen.findByTestId('auth-error')).textContent).toContain('Correo o contraseña incorrectos.');
      expect(sessionStore.load()).toBeNull();
    });

    it('TC-20 [Registro]: contraseñas distintas muestran error y NO llaman a la API', () => {
      const fetchSpy = mockApi([]);
      renderConApp(<Registro />);

      fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
      fireEvent.change(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@nexus.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave12345' } });
      fireEvent.change(screen.getByLabelText('Confirmar'), { target: { value: 'Otra12345' } });
      fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

      expect(screen.getByTestId('registro-error').textContent).toContain('no coinciden');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('TC-21 [Logout]: revoca el refresh token en el servidor y borra la sesión local', async () => {
      guardarSesion(CLIENTE);
      const fetchSpy = mockApi([
        ['GET', '/auth/me', { status: 200, body: CLIENTE }],
        ['POST', '/auth/logout', { status: 204, body: null }],
      ]);
      renderConApp(<Navbar />);
      await screen.findByTestId('navbar-usuario');

      fireEvent.click(screen.getByText('Cerrar Sesión'));

      await waitFor(() => {
        if (sessionStore.load() !== null) throw new Error('La sesión local aún no se eliminó.');
      });
      expect(sessionStore.load()).toBeNull();
      expect(JSON.parse(llamadas(fetchSpy, 'POST', '/auth/logout')[0][1].body)).toEqual({ refreshToken: 'ref-1' });
    });
  });

  // ============================================================================================
  // IE3.2.2: INTEGRACIÓN FRONTEND <-> BACKEND (flujo de datos por la API REST)
  // ============================================================================================
  describe('Integración con la API', () => {
    it('TC-22 [Home]: el catálogo se carga desde GET /juegos', async () => {
      mockApi([['GET', '/juegos', { status: 200, body: JUEGOS_API }]]);
      renderConApp(<Home />);
      const tarjetas = await screen.findAllByTestId('product-card');
      expect(tarjetas.length).toBe(6);
    });

    it('TC-23 [Carrito]: calcula el total y elimina un producto (con confirmación)', async () => {
      localStorage.setItem('nexus_carrito', JSON.stringify([
        { id: 1, nombre: 'Zelda', precio: 40, cantidad: 2, stock: 3 },
        { id: 2, nombre: 'FIFA', precio: 10, cantidad: 1, stock: 8 },
      ]));
      spyOn(window, 'confirm').and.returnValue(true);
      renderConApp(<Carrito />);

      expect(screen.getByTestId('cart-total').textContent).toContain('90.00');
      fireEvent.click(screen.getAllByLabelText('Eliminar del carrito')[0]);

      await waitFor(() => {
        if (screen.queryAllByTestId('cart-row').length !== 1) {
          throw new Error('El carrito aún no muestra una única fila.');
        }
      });
      expect(screen.getAllByTestId('cart-row').length).toBe(1);
      expect(screen.getByTestId('cart-total').textContent).toContain('10.00');
    });

    it('TC-24 [Checkout]: envía SOLO ids y cantidades (el total lo calcula el servidor) con el token', async () => {
      guardarSesion(CLIENTE);
      localStorage.setItem('nexus_carrito', JSON.stringify([{ id: 3, nombre: 'Doom', precio: 30, cantidad: 2, stock: 5 }]));
      const fetchSpy = mockApi([
        ['GET', '/auth/me', { status: 200, body: CLIENTE }],
        ['POST', '/pedidos', { status: 201, body: { id: 77, total: 60, licencias: [{ id: 1, juegoTitulo: 'Doom', claveActivacion: 'NX77-AAAA-BBBB' }] } }],
      ]);
      const { container } = renderConApp(
        <Routes>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pago-correcto" element={<PagoCorrecto />} />
        </Routes>,
        { ruta: '/checkout' },
      );

      fireEvent.change(container.querySelector('input[name="calle"]'), { target: { value: 'Av. Siempre Viva 123' } });
      fireEvent.click(screen.getByRole('button', { name: /Pagar ahora/ }));

      expect((await screen.findByTestId('pago-orden')).textContent).toContain('#77');
      const [, opts] = llamadas(fetchSpy, 'POST', '/pedidos')[0];
      const body = JSON.parse(opts.body);
      expect(opts.headers.Authorization).toBe('Bearer tok-1');
      expect(body.items).toEqual([{ juegoId: 3, cantidad: 2 }]);
      expect(body.total).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain('precio');
      expect(localStorage.getItem('nexus_carrito')).toBeNull(); // carrito vaciado
      expect(screen.getByText('NX77-AAAA-BBBB')).toBeTruthy();   // licencia emitida por el backend
    });

    it('TC-25 [Boleta]: muestra neto, IVA y total calculados por el backend', async () => {
      guardarSesion(CLIENTE);
      mockApi([
        ['GET', '/auth/me', { status: 200, body: CLIENTE }],
        ['GET', '/pedidos/5', { status: 200, body: {
          id: 5, nombreCliente: 'Ana', emailCliente: 'ana@nexus.cl', estado: 'COMPLETADO', fechaPedido: '2026-11-10T10:00:00',
          neto: 67.23, iva: 12.77, total: 80, detalles: [{ juegoId: 1, titulo: 'Zelda', precioUnitario: 40, cantidad: 2, subtotal: 80 }], licencias: [],
        } }],
      ]);
      renderConApp(
        <Routes><Route path="/boleta/:id" element={<MostrarBoleta />} /></Routes>,
        { ruta: '/boleta/5' },
      );

      expect((await screen.findByTestId('boleta-neto')).textContent).toContain('67.23');
      expect(screen.getByTestId('boleta-iva').textContent).toContain('12.77');
      expect(screen.getByTestId('boleta-total').textContent).toContain('80.00');
    });
  });

  // ============================================================================================
  // PANEL ADMIN: CRUD contra la API
  // ============================================================================================
  describe('Panel de administración', () => {
    const montarAdmin = () => {
      guardarSesion(ADMIN);
      return mockApi([
        ['GET', '/auth/me', { status: 200, body: ADMIN }],
        ['GET', '/juegos', { status: 200, body: JUEGOS_API }],
        ['GET', '/usuarios', { status: 200, body: [ADMIN, CLIENTE] }],
        ['GET', '/pedidos', { status: 200, body: [] }],
        ['POST', '/juegos', (url, opts) => ({ status: 201, body: { id: 99, ...JSON.parse(opts.body), precioFinal: 19.99 } })],
      ]);
    };

    it('TC-26 [Admin]: los KPI salen de la API (stock crítico ≤ 5) y se listan los juegos', async () => {
      montarAdmin();
      renderConApp(<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>);

      // Esperar la respuesta REST y el renderizado completo del inventario antes
      // de leer los KPI. Se conservan las verificaciones exactas de 6 juegos
      // y 2 con stock crítico (Zelda 3, Doom 2).
      const filas = await screen.findAllByTestId('fila-juego');
      expect(filas.length).toBe(6);
      expect(screen.getByTestId('kpi-juegos').textContent).toBe('6');
      expect(screen.getByTestId('kpi-criticos').textContent).toBe('2');
    });

    it('TC-27 [Admin]: crear un juego hace POST /juegos con el token y el cuerpo de la API', async () => {
      const fetchSpy = montarAdmin();
      renderConApp(<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>);
      await screen.findAllByTestId('fila-juego');

      fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Nuevo Juego' } });
      fireEvent.change(screen.getByLabelText('Categoría del producto'), { target: { value: 'Indie' } });
      fireEvent.change(screen.getByLabelText('Precio del producto'), { target: { value: '19.99' } });
      fireEvent.change(screen.getByLabelText('Stock del producto'), { target: { value: '7' } });
      fireEvent.click(screen.getByRole('button', { name: 'Crear juego' }));

      await waitFor(() => {
        if (llamadas(fetchSpy, 'POST', '/juegos').length !== 1) {
          throw new Error('La creación del juego aún no llegó a la API.');
        }
      });
      expect(llamadas(fetchSpy, 'POST', '/juegos').length).toBe(1);
      const [, opts] = llamadas(fetchSpy, 'POST', '/juegos')[0];
      expect(opts.headers.Authorization).toBe('Bearer tok-1');
      expect(JSON.parse(opts.body)).toEqual(jasmine.objectContaining({ titulo: 'Nuevo Juego', categoria: 'Indie', precio: 19.99, stock: 7 }));
    });
  });
});
