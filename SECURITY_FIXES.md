# 🔒 Correcciones de Seguridad - Creación de Cuentas

## Resumen

Se han corregido los tres problemas principales de seguridad en el sistema de autenticación:

1. **Contraseñas en texto plano** → Implementación de bcrypt
2. **OAuth hardcodeado** → OAuth real con Google y GitHub  
3. **Sin rate limiting** → Rate limiting con límite de 5 intentos/15 min

---

## Cambios Implementados

### 1. Hash de Contraseñas con Bcrypt

**Antes:**
```typescript
passwordHash: body.password  // ❌ Texto plano
user.passwordHash === body.password  // ❌ Comparación insegura
```

**Después:**
```typescript
import * as bcrypt from "bcrypt";

const passwordHash = await hashPassword(body.password);
const passwordMatch = await verifyPassword(body.password, user.passwordHash);
```

**Archivo:** `backend/src/server.ts` (líneas 204-210)

---

### 2. Rate Limiting

Implementado sistema de rate limiting que:
- Limita a 5 intentos por 15 minutos
- Rastrea intentos por `email`
- Retorna HTTP 429 (Too Many Requests) cuando se excede

```typescript
const loginAttempts = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt || attempt.expiresAt < now) {
    loginAttempts.set(identifier, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (attempt.count >= RATE_LIMIT_MAX_ATTEMPTS) return false;
  attempt.count++;
  return true;
}
```

**Aplicado a:**
- `POST /api/auth/register` - Previene spam de registros
- `POST /api/auth/login` - Protege contra fuerza bruta

---

### 3. OAuth Real (Google + GitHub)

#### Antes:
```typescript
// ❌ Cuenta hardcodeada
const email = `${provider}+demo@qualnexa.local`;
authUsers.set(id, { email, name: "Google user", verified: true, provider: "GOOGLE" });
```

#### Después:
Nuevo archivo: `backend/src/api/oauth-routes.ts`

**Endpoints implementados:**

1. **Google OAuth Callback**
   ```
   GET /api/auth/oauth/google/callback?code=...&state=...
   ```
   - Intercambia código por token de acceso
   - Obtiene info del usuario real desde Google
   - Crea o actualiza usuario con datos reales
   - Retorna sesión activa

2. **GitHub OAuth Callback**
   ```
   GET /api/auth/oauth/github/callback?code=...&state=...
   ```
   - Mismo flujo para GitHub
   - Obtiene email y perfil del usuario

3. **Config Endpoint (Frontend)**
   ```
   GET /api/auth/oauth-config
   ```
   - Retorna client IDs de Google/GitHub
   - Indica si están habilitados
   - Frontend usa esto para iniciar flujo OAuth real

---

## Configuración Requerida

Crear archivo `.env` en la raíz del proyecto:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8080/api/auth/oauth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Email (optional)
RESEND_API_KEY=your_resend_key
EMAIL_FROM=noreply@qualnexa.com

# Server
NODE_ENV=development
PORT=8080
FRONTEND_URL=http://127.0.0.1:5173
```

Ver `.env.example` para referencia completa.

---

## Validaciones Adicionales

### Registro (`POST /api/auth/register`)
- ✅ Email requerido y validado
- ✅ Contraseña mínimo 10 caracteres
- ✅ Nombre requerido (1-100 caracteres)
- ✅ Verificación de email duplicado
- ✅ Contraseña hasheada con bcrypt
- ✅ Rate limiting: máx 5 registros/15 min por email

### Login (`POST /api/auth/login`)
- ✅ Email y contraseña requeridos
- ✅ Verificación segura con bcrypt.compare()
- ✅ Solo usuarios con provider LOCAL
- ✅ Verificación de email obligatoria
- ✅ Rate limiting: máx 5 intentos/15 min por email
- ✅ Sesión con cookie httpOnly

---

## Cambios en Archivos

### Backend
- **`backend/src/server.ts`**
  - Importado bcrypt
  - Agregadas funciones de hash y verificación
  - Rate limiting integrado
  - Endpoints `/api/auth/register` y `/api/auth/login` mejorados
  - Nuevo endpoint `/api/auth/oauth-config`
  - Integración de rutas OAuth

- **`backend/src/api/oauth-routes.ts`** (Nuevo)
  - Implementación completa de OAuth callbacks
  - Validación de tokens de Google y GitHub
  - Creación automática de usuarios

- **`backend/package.json`**
  - ✅ Agregado: `bcrypt`
  - ✅ Agregado: `@types/bcrypt` (dev)

### Frontend
- **`frontend/src/App.tsx`**
  - Nuevo state: `oauthConfig`
  - Nueva función: `loadOAuthConfig()`
  - `handleOAuth()` usa client IDs reales
  - Botones OAuth condicionalmente renderizados (solo si habilitados)
  - Flujo OAuth real: redirige a Google/GitHub

### Config
- **`.env.example`** (Nuevo)
  - Referencia de variables de entorno

---

## Flujo de Autenticación (Diagrama)

### Registro Local
```
Usuario → Frontend (enter email, password, name)
       → POST /api/auth/register
       → Validación + bcrypt hash
       → Email de verificación
       → Usuario crea sesión cuando verifica email
```

### Login Local
```
Usuario → Frontend (email, password)
       → POST /api/auth/login (rate limited)
       → Verificación bcrypt
       → Check email verified
       → Session cookie
```

### OAuth (Google)
```
Usuario → Frontend → GET /api/auth/oauth-config (get client ID)
       → Redirige a accounts.google.com
       → Usuario autentica
       → Redirige a /api/auth/oauth/google/callback?code=...
       → Backend intercambia código por token
       → Backend obtiene datos del usuario
       → Crea/actualiza usuario con datos reales
       → Session cookie
       → Redirige a frontend
```

---

## ⚠️ Limitaciones Actuales

### Almacenamiento en Memoria
- Usuarios guardados en `Map<string, UserData>`
- **Problema:** Datos se pierden al reiniciar servidor
- **Solución próxima:** Implementar SQLite o PostgreSQL

### OAuth Requiere Configuración
- Google y GitHub OAuth deben configurarse manualmente
- Necesita crear apps en Google Cloud Console y GitHub
- Sin credenciales, OAuth botones no aparecen

---

## Testing

### Instalar dependencias:
```bash
npm install
```

### Compilar:
```bash
npm run typecheck
npm run build
```

### Ejecutar en desarrollo:
```bash
npm run dev
```

### Verificar contraseña hasheada:
En browser DevTools:
```javascript
// Verificar que la contraseña NO está en plaintext
await fetch('/api/auth/dev-mailbox').then(r => r.json())
// Los hashes deben ser long strings (bcrypt format)
```

---

## Próximas Mejoras Recomendadas

1. **Base de Datos Real**
   - [ ] Migrar a SQLite (desarrollo) o PostgreSQL (producción)
   - [ ] Persistent user storage

2. **2FA (Two-Factor Authentication)**
   - [ ] TOTP o SMS para mayor seguridad

3. **Password Reset**
   - [ ] Email con link para resetear contraseña

4. **Email Verification Mejorado**
   - [ ] Tokens con expiración más corta
   - [ ] Reintentos limitados

5. **HTTPS en Producción**
   - [ ] Ya configurado con `secure: true` en cookies
   - [ ] Necesita HTTPS en producción

6. **Audit Logging**
   - [ ] Log de intentos de login fallidos
   - [ ] Log de cambios de contraseña
