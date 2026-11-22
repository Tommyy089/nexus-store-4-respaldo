import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function ErroresApi({ error }) {
  if (!error) return null;
  const detalles = error.details ? Object.values(error.details) : [];
  return (
    <div className="alert alert-danger py-2 small" role="alert" data-testid="auth-error">
      {error.message}
      {detalles.length > 0 && (
        <ul className="mb-0 mt-1 ps-3">
          {detalles.map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}
    </div>
  );
}

export function Login() {
  const [correo, setCorreo] = useState('');
  const [pass, setPass] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const { login, autenticado } = useAuth();
  const { notificar } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.desde || '/';

  if (autenticado) return <Navigate to={destino} replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const usuario = await login(correo, pass, recordar);
      notificar(`¡Bienvenido, ${usuario.alias || usuario.nombre}!`);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container py-5 text-light" style={{ maxWidth: '480px' }}>
      <div className="p-4 p-md-5 bg-dark rounded-4 border border-secondary border-opacity-25 shadow-lg">
        <h3 className="fw-bold text-center mb-4">Iniciar Sesión</h3>
        {location.state?.desde && (
          <div className="alert alert-info py-2 small">Inicia sesión para continuar.</div>
        )}
        <ErroresApi error={error} />
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label htmlFor="login-correo" className="form-label small text-secondary">Correo Electrónico</label>
            <input id="login-correo" type="email" autoComplete="username" className="form-control bg-black text-light border-secondary" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label htmlFor="login-pass" className="form-label small text-secondary">Contraseña</label>
            <input id="login-pass" type="password" autoComplete="current-password" className="form-control bg-black text-light border-secondary" value={pass} onChange={(e) => setPass(e.target.value)} required />
          </div>
          <div className="form-check mb-4">
            <input id="login-recordar" type="checkbox" className="form-check-input" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
            <label htmlFor="login-recordar" className="form-check-label small text-secondary">Mantener sesión iniciada en este equipo</label>
          </div>
          <button type="submit" disabled={enviando} className="btn btn-primary w-100 fw-bold py-2 rounded-3 mb-3">
            {enviando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <div className="text-center small text-secondary">
          ¿No tienes cuenta? <Link to="/registro" className="text-info">Regístrate</Link>
        </div>
      </div>
    </div>
  );
}

export function Registro() {
  const [datos, setDatos] = useState({ nombre: '', correo: '', pass: '', confirm: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [errorApi, setErrorApi] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const { registro } = useAuth();
  const { notificar } = useToast();
  const navigate = useNavigate();

  const handleRegistro = async (e) => {
    e.preventDefault();
    setErrorApi(null);
    if (datos.pass !== datos.confirm) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }
    setErrorMsg('');
    setEnviando(true);
    try {
      const usuario = await registro({
        nombre: datos.nombre,
        email: datos.correo,
        password: datos.pass,
      });
      notificar(`Cuenta creada exitosamente para ${usuario.nombre}.`);
      navigate('/', { replace: true });
    } catch (err) {
      setErrorApi(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container py-5 text-light" style={{ maxWidth: '520px' }}>
      <div className="p-4 p-md-5 bg-dark rounded-4 border border-secondary border-opacity-25 shadow-lg">
        <h3 className="fw-bold text-center mb-4">Crear Cuenta</h3>
        {errorMsg && (
          <div className="alert alert-danger py-2" data-testid="registro-error">
            {errorMsg}
          </div>
        )}
        <ErroresApi error={errorApi} />
        <form onSubmit={handleRegistro}>
          <div className="mb-3">
            <label className="form-label small text-secondary">Nombre</label>
            <input
              type="text"
              aria-label="Nombre"
              className="form-control bg-black text-light border-secondary"
              value={datos.nombre}
              onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label small text-secondary">Correo Electrónico</label>
            <input
              type="email"
              aria-label="Correo Electrónico"
              className="form-control bg-black text-light border-secondary"
              value={datos.correo}
              onChange={(e) => setDatos({ ...datos, correo: e.target.value })}
              required
            />
          </div>
          <div className="row g-2 mb-2">
            <div className="col-6">
              <label className="form-label small text-secondary">Contraseña</label>
              <input
                type="password"
                aria-label="Contraseña"
                autoComplete="new-password"
                className="form-control bg-black text-light border-secondary"
                value={datos.pass}
                onChange={(e) => setDatos({ ...datos, pass: e.target.value })}
                required
              />
            </div>
            <div className="col-6">
              <label className="form-label small text-secondary">Confirmar</label>
              <input
                type="password"
                aria-label="Confirmar"
                autoComplete="new-password"
                className="form-control bg-black text-light border-secondary"
                value={datos.confirm}
                onChange={(e) => setDatos({ ...datos, confirm: e.target.value })}
                required
              />
            </div>
          </div>
          <p className="small text-secondary mb-4">Mínimo 8 caracteres, con letras y números.</p>
          <button type="submit" disabled={enviando} className="btn btn-success w-100 fw-bold py-2 rounded-3 mb-3">
            {enviando ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>
        <div className="text-center small text-secondary">
          ¿Ya tienes cuenta? <Link to="/login" className="text-info">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}

export function AccesoDenegado() {
  return (
    <div className="container py-5 text-light text-center" style={{ maxWidth: '560px' }} data-testid="acceso-denegado">
      <i className="bi bi-shield-x text-danger" style={{ fontSize: '4rem' }}></i>
      <h2 className="fw-bold mt-3">Acceso denegado</h2>
      <p className="text-secondary">No tienes los permisos necesarios para ver esta sección.</p>
      <Link to="/" className="btn btn-primary mt-2">Volver al inicio</Link>
    </div>
  );
}

export function NoEncontrado() {
  return (
    <div className="container py-5 text-light text-center">
      <h2 className="fw-bold">Página no encontrada</h2>
      <Link to="/" className="btn btn-primary mt-3">Volver al inicio</Link>
    </div>
  );
}
