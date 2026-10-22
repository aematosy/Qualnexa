# 🔐 Configurar Google OAuth - Guía Paso a Paso

## Opción 1: Uso Rápido (Sin OAuth configurado)

Si solo quieres probar la app SIN Google/GitHub, simplemente:

1. **Usa login local:**
   - Crear cuenta con email y contraseña
   - Email se verifica automáticamente (dev mode)
   - Haz login con esas credenciales

2. **Ignora los botones de OAuth:**
   - Están ahí pero no funcionan sin configuración
   - Solo para cuando tengas credenciales

---

## Opción 2: Configurar Google OAuth (Completo)

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ir a: https://console.cloud.google.com/
2. Haz login con tu cuenta Google (amatos3@gmail.com)
3. En la parte superior, haz clic en el selector de proyecto
4. Haz clic en "New Project"
5. Nombre: `Qualnexa` (o lo que quieras)
6. Haz clic en "Create"
7. Espera a que se cree el proyecto

### Paso 2: Habilitar Google OAuth API

1. En Google Cloud Console, ve a: Menu (≡) → APIs & Services → Library
2. Busca: `Google+ API` o `OAuth 2.0`
3. Abre "Google+ API"
4. Haz clic en "Enable"
5. Espera un momento

### Paso 3: Crear Credenciales OAuth

1. Ve a: Menu (≡) → APIs & Services → Credentials
2. Haz clic en "Create Credentials" → "OAuth client ID"
3. **Si aparece un aviso:** Haz clic en "Configure OAuth consent screen"
   - User Type: "External"
   - Haz clic en "Create"
   - Completa con:
     - App name: `Qualnexa`
     - User support email: `amatos3@gmail.com`
     - Developer contact: `amatos3@gmail.com`
   - Haz clic en "Save and Continue"
   - En "Scopes": Deja los defaults, "Save and Continue"
   - En "Test users": Agrega tu email (amatos3@gmail.com)
   - "Save and Continue"

4. Vuelve a: APIs & Services → Credentials
5. Haz clic en "Create Credentials" → "OAuth client ID"
6. Application type: **"Web application"**
7. Name: `Qualnexa Dev`
8. En "Authorized JavaScript origins", agrega:
   ```
   http://localhost:8080
   http://127.0.0.1:8080
   http://localhost:5173
   http://127.0.0.1:5173
   ```
9. En "Authorized redirect URIs", agrega:
   ```
   http://127.0.0.1:8080/api/auth/oauth/google/callback
   http://localhost:8080/api/auth/oauth/google/callback
   ```
10. Haz clic en "Create"
11. **Copia el "Client ID" y "Client Secret"**

### Paso 4: Agregar a .env

Crea archivo `.env` en la raíz del proyecto (igual nivel que `package.json`):

```env
# Google OAuth
GOOGLE_CLIENT_ID=<el_que_copiaste>
GOOGLE_CLIENT_SECRET=<el_secret_que_copiaste>
GOOGLE_REDIRECT_URI=http://127.0.0.1:8080/api/auth/oauth/google/callback

# Otros (opcional)
NODE_ENV=development
PORT=8080
HOST=127.0.0.1
FRONTEND_URL=http://127.0.0.1:5173
```

### Paso 5: Reinicia la App

```bash
npm run dev
```

Ahora el botón Google debería funcionar.

---

## ¿Por qué ves "OAuth client was not found"?

Porque:
1. ✅ El botón Google existe en el frontend
2. ✅ El backend intenta iniciar OAuth con Google
3. ❌ **Pero no hay credenciales configuradas en `.env`**
4. ❌ El cliente_id que envía es `YOUR_GOOGLE_CLIENT_ID` (placeholder)
5. ❌ Google rechaza porque no es válido

**Solución:** Sigue los pasos arriba para conseguir credenciales reales.

---

## Alternativa: GitHub OAuth (Similar)

1. Ir a: https://github.com/settings/developers
2. New OAuth App
3. Application name: `Qualnexa Dev`
4. Homepage URL: `http://127.0.0.1:5173`
5. Authorization callback URL: `http://127.0.0.1:8080/api/auth/oauth/github/callback`
6. Create Application
7. Copiar Client ID y Client Secret
8. Agregar a `.env`:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

---

## Solucionar Errores Comunes

### "The OAuth client was not found"
→ `GOOGLE_CLIENT_ID` no está en `.env` o es incorrecto

### "Redirect URI mismatch"
→ La URL en `.env` `GOOGLE_REDIRECT_URI` no coincide con Google Cloud Console
→ Verifica que sea exactamente: `http://127.0.0.1:8080/api/auth/oauth/google/callback`

### "Access blocked: This app's request is invalid"
→ Debes agregar tu email (amatos3@gmail.com) como test user en Google Cloud
→ Ve a: OAuth consent screen → Test users → Add users

### Botón Google no funciona pero no hay error
→ Frontend no tiene client ID
→ Verifica `.env` y reinicia con `npm run dev`

---

## Opción Más Rápida: Solo Login Local (SIN OAuth)

Si no quieres complicarte con Google ahora:

1. **Elimina o deja vacío `.env`:**
   ```env
   # Dejar en blanco o eliminar GOOGLE_CLIENT_ID
   NODE_ENV=development
   PORT=8080
   FRONTEND_URL=http://127.0.0.1:5173
   ```

2. **Usa la app con:**
   - Crear cuenta local (email + contraseña)
   - Login local
   - Los botones de Google/GitHub estarán pero inactivos

3. **Cuando quieras OAuth, vuelve y sigue esta guía**

---

## Debugging

**Ver si las credenciales están cargadas:**

Abre browser DevTools → Console:
```javascript
fetch('/api/auth/oauth-config')
  .then(r => r.json())
  .then(c => console.log(c))
```

Si ves:
```json
{
  "google": { "enabled": true, "clientId": "xxxxx..." },
  "github": { "enabled": false, "clientId": "" }
}
```
→ ✅ Credenciales cargadas

Si ves:
```json
{
  "google": { "enabled": false, "clientId": "" },
  "github": { "enabled": false, "clientId": "" }
}
```
→ ❌ Sin credenciales, `.env` no está configurado
