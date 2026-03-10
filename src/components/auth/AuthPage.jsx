/**
 * AuthPage.jsx — pantalla de login con Google y Email/Contraseña.
 *
 * Flujo:
 *   · Google Sign-In   → signInWithPopup
 *   · Email/Password   → signInWithEmailAndPassword (login)
 *                      → createUserWithEmailAndPassword (registro)
 *
 * Requisitos de contraseña: 12+ caracteres, mayúscula, minúscula, carácter especial.
 *
 * Persistencia: browserSessionPersistence (configurada en firebase.js).
 *   F5 mantiene la sesión; cerrar el browser la borra.
 */
import { useState, useMemo } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { setSoloMode } from '../../lib/firestoreService';

const googleProvider = new GoogleAuthProvider();

// ── Validación de contraseña ──────────────────────────────────────────────────
const PASSWORD_RULES = [
  { id: 'length',    label: 'Al menos 12 caracteres',        test: (p) => p.length >= 12 },
  { id: 'upper',     label: 'Una letra mayúscula (A-Z)',      test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',     label: 'Una letra minúscula (a-z)',      test: (p) => /[a-z]/.test(p) },
  { id: 'special',   label: 'Un carácter especial (!@#$…)',   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function validatePassword(password) {
  return PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) }));
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AuthPage({ onSoloMode }) {
  // 'google' | 'email'
  const [method,   setMethod]   = useState('google');
  // 'login' | 'register'
  const [emailTab, setEmailTab] = useState('login');

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [passConf, setPassConf] = useState('');
  const [name,     setName]     = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [info,     setInfo]     = useState(''); // mensaje de éxito / info

  // Resultados de validación en tiempo real
  const passChecks = useMemo(() => validatePassword(password), [password]);
  const allPassOk  = passChecks.every((c) => c.ok);

  const reset = () => { setError(''); setInfo(''); };

  // ── Google ────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); reset();
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged en App.jsx toma el control
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Auth/Google]', e.code, e.message);
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setLoading(false); return;
      }
      setError(getErrorMessage(e.code, e.message));
      setLoading(false);
    }
  };

  // ── Email: Login ──────────────────────────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Completá email y contraseña.'); return; }
    setLoading(true); reset();
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged toma el control
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Auth/Email Login]', err.code, err.message);
      setError(getErrorMessage(err.code, err.message));
      setLoading(false);
    }
  };

  // ── Email: Registro ───────────────────────────────────────────────────────
  const handleEmailRegister = async (e) => {
    e.preventDefault();
    reset();
    if (!name.trim())          { setError('Ingresá tu nombre.'); return; }
    if (!email.trim())         { setError('Ingresá tu email.'); return; }
    if (!allPassOk)            { setError('La contraseña no cumple todos los requisitos.'); return; }
    if (password !== passConf) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Asignar nombre de perfil
      await updateProfile(cred.user, { displayName: name.trim() });
      // Enviar verificación de email (no bloquea el acceso)
      await sendEmailVerification(cred.user).catch(() => {});
      setInfo('¡Cuenta creada! Revisá tu email para verificar tu cuenta.');
      // onAuthStateChanged toma el control después de un instante
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Auth/Email Register]', err.code, err.message);
      setError(getErrorMessage(err.code, err.message));
      setLoading(false);
    }
  };

  const handleSolo = () => { setSoloMode(true); onSoloMode(); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-10 pb-5 text-center">
          <div className="text-5xl mb-3">📊</div>
          <h1 className="text-2xl font-bold text-white">Gestor de Gastos</h1>
          <p className="text-slate-400 text-sm mt-1">
            Iniciá sesión para acceder a tu cartera
          </p>
        </div>

        {/* Tabs de método: Google | Email */}
        <div className="flex mx-8 mb-5 bg-white/5 rounded-2xl p-1 gap-1">
          {[
            { id: 'google', label: '🔵  Google' },
            { id: 'email',  label: '✉️  Email' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setMethod(id); reset(); }}
              className={`
                flex-1 text-sm font-semibold py-2 rounded-xl transition-all
                ${method === id
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Panel Google ─────────────────────────────────────────────── */}
        {method === 'google' && (
          <div className="px-8 pb-6">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="
                w-full flex items-center justify-center gap-3
                bg-white hover:bg-gray-50 active:bg-gray-100
                text-gray-700 font-semibold text-sm
                px-6 py-3.5 rounded-2xl
                shadow-lg hover:shadow-xl
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  Verificando…
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Continuar con Google
                </>
              )}
            </button>
            <ErrorBox msg={error} />
          </div>
        )}

        {/* ── Panel Email ──────────────────────────────────────────────── */}
        {method === 'email' && (
          <div className="px-8 pb-6">

            {/* Sub-tabs: Iniciar sesión | Registrarse */}
            <div className="flex bg-white/5 rounded-xl p-0.5 gap-0.5 mb-5">
              {[
                { id: 'login',    label: 'Iniciar sesión' },
                { id: 'register', label: 'Crear cuenta' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { setEmailTab(id); reset(); setPassword(''); setPassConf(''); }}
                  className={`
                    flex-1 text-xs font-semibold py-2 rounded-lg transition-all
                    ${emailTab === id
                      ? 'bg-white/15 text-white'
                      : 'text-slate-500 hover:text-slate-300'}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Formulario LOGIN */}
            {emailTab === 'login' && (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <Field label="Email" type="email" value={email}
                  onChange={(v) => { setEmail(v); reset(); }}
                  placeholder="vos@email.com" autoComplete="email" />
                <PasswordField label="Contraseña" value={password} show={showPass}
                  onToggle={() => setShowPass((s) => !s)}
                  onChange={(v) => { setPassword(v); reset(); }}
                  autoComplete="current-password" />
                <ErrorBox msg={error} />
                <InfoBox msg={info} />
                <SubmitBtn loading={loading} label="Iniciar sesión" />
              </form>
            )}

            {/* Formulario REGISTRO */}
            {emailTab === 'register' && (
              <form onSubmit={handleEmailRegister} className="space-y-3">
                <Field label="Nombre" type="text" value={name}
                  onChange={(v) => { setName(v); reset(); }}
                  placeholder="Jorge Ramos" autoComplete="name" maxLength={100} />
                <Field label="Email" type="email" value={email}
                  onChange={(v) => { setEmail(v); reset(); }}
                  placeholder="vos@email.com" autoComplete="email" />
                <PasswordField label="Contraseña" value={password} show={showPass}
                  onToggle={() => setShowPass((s) => !s)}
                  onChange={(v) => { setPassword(v); reset(); }}
                  autoComplete="new-password" />

                {/* Checklist de requisitos */}
                {password.length > 0 && (
                  <div className="bg-white/5 rounded-xl px-4 py-3 space-y-1.5">
                    {passChecks.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className={c.ok ? 'text-emerald-400' : 'text-slate-500'}>
                          {c.ok ? '✓' : '○'}
                        </span>
                        <span className={`text-xs ${c.ok ? 'text-emerald-300' : 'text-slate-500'}`}>
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <PasswordField label="Confirmar contraseña" value={passConf} show={showConf}
                  onToggle={() => setShowConf((s) => !s)}
                  onChange={(v) => { setPassConf(v); reset(); }}
                  autoComplete="new-password"
                  invalid={passConf.length > 0 && password !== passConf} />

                {passConf.length > 0 && password !== passConf && (
                  <p className="text-red-400 text-xs">Las contraseñas no coinciden.</p>
                )}

                <ErrorBox msg={error} />
                <InfoBox msg={info} />
                <SubmitBtn loading={loading} label="Crear cuenta" />
              </form>
            )}
          </div>
        )}

        {/* Divisor */}
        <div className="flex items-center gap-3 px-8 pb-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-slate-600 text-xs">o</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Modo solo */}
        <div className="px-8 pb-8">
          <button
            onClick={handleSolo}
            className="
              w-full text-slate-400 hover:text-slate-200
              text-sm font-medium py-3 rounded-2xl
              border border-white/10 hover:border-white/20
              hover:bg-white/5 transition-all duration-200
            "
          >
            Continuar sin cuenta (modo solo)
          </button>
          <p className="text-slate-600 text-xs text-center mt-2">
            En modo solo los datos se guardan solo en este dispositivo
          </p>
        </div>

        {/* Features footer */}
        <div className="border-t border-white/10 px-8 py-5">
          <p className="text-slate-500 text-xs text-center mb-3">Con cuenta obtenés:</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: '👥', label: 'Carteras compartidas' },
              { icon: '🔄', label: 'Sync en tiempo real'  },
              { icon: '💾', label: 'Datos persistentes'   },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-white/5 rounded-xl py-3 px-2">
                <div className="text-xl mb-1">{icon}</div>
                <p className="text-slate-400 text-xs leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Field({ label, type, value, onChange, placeholder, autoComplete, maxLength }) {
  return (
    <div>
      <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required
        className="
          w-full bg-white/10 border border-white/20 rounded-xl
          px-4 py-2.5 text-white text-sm placeholder:text-slate-500
          focus:outline-none focus:border-blue-400 transition
        "
      />
    </div>
  );
}

function PasswordField({ label, value, show, onToggle, onChange, autoComplete, invalid }) {
  return (
    <div>
      <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className={`
            w-full bg-white/10 border rounded-xl
            px-4 py-2.5 pr-11 text-white text-sm placeholder:text-slate-500
            focus:outline-none transition
            ${invalid ? 'border-red-400 focus:border-red-400' : 'border-white/20 focus:border-blue-400'}
          `}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs transition"
          tabIndex={-1}
        >
          {show ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  );
}

function SubmitBtn({ loading, label }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        w-full bg-blue-500 hover:bg-blue-400 active:bg-blue-600
        text-white font-bold py-3 rounded-xl
        shadow-lg hover:shadow-blue-500/30
        transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
      "
    >
      {loading
        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando…</>
        : label}
    </button>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
      <p className="text-red-400 text-xs">{msg}</p>
    </div>
  );
}

function InfoBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
      <p className="text-emerald-400 text-xs">{msg}</p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Mensajes de error ─────────────────────────────────────────────────────────
function getErrorMessage(code, rawMessage) {
  switch (code) {
    case 'auth/invalid-email':            return 'El formato del email no es válido.';
    case 'auth/user-not-found':           return 'No existe una cuenta con ese email.';
    case 'auth/wrong-password':           return 'Contraseña incorrecta. Intentá de nuevo.';
    case 'auth/invalid-credential':       return 'Email o contraseña incorrectos.';
    case 'auth/email-already-in-use':     return 'Ese email ya tiene una cuenta. Iniciá sesión o usá otro email.';
    case 'auth/weak-password':            return 'La contraseña es demasiado débil. Usá al menos 12 caracteres con mayúsculas, minúsculas y un símbolo.';
    case 'auth/too-many-requests':        return 'Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.';
    case 'auth/user-disabled':            return 'Esta cuenta fue deshabilitada. Contactá al administrador.';
    case 'auth/unauthorized-domain':      return 'Dominio no autorizado. Agregá este dominio en Firebase Console → Authentication → Authorized domains.';
    case 'auth/popup-blocked':            return 'El navegador bloqueó el popup de Google. Habilitalo en la barra de direcciones.';
    case 'auth/network-request-failed':   return 'Error de red. Verificá tu conexión e intentá de nuevo.';
    case 'auth/operation-not-allowed':    return 'Este método de login no está habilitado. Activalo en Firebase Console.';
    case 'auth/internal-error':           return 'Error interno de Google. Si el problema persiste, revisá F12 → Console para más detalles.';
    default:
      return `Error (${code ?? 'desconocido'}): ${rawMessage ?? ''}. Revisá F12 → Console.`;
  }
}
