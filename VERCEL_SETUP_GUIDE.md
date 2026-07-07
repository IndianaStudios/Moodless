# Guía de Configuración de Vercel para Moodless

## Problema actual
En localhost funciona, pero en Vercel da error 500. Esto se debe a que las variables de entorno no están correctamente configuradas en Vercel.

## Variables de Entorno en Vercel

### ⚠️ IMPORTANTE: Diferencia entre BACKEND y FRONTEND

- **Backend (API routes `/api/*`)**: Usa `process.env.NOMBRE_VARIABLE` → Estas **DEBEN** ser **SENSIBLES**
- **Frontend (Vite)**: Usa `import.meta.env.VITE_NOMBRE` → Estas **NO DEBEN** ser sensibles (el navegador las necesita)

Si marcas una variable `VITE_*` como sensible, **el frontend NO podrá acceder a ella** y la app no funcionará.

---

## Paso 1: Configura ESTAS variables en Vercel (Settings → Environment Variables)

### 🔴 VARIABLES SENSIBLES (marca el checkbox "Sensitive") - BACKEND

| Nombre | Valor | ¿Sensible? |
|--------|-------|------------|
| `FIREBASE_PROJECT_ID` | `moodless-4you` | ✅ **Sí** |
| `FIREBASE_CLIENT_EMAIL` | `[REDACTED_EMAIL]` | ✅ **Sí** |
| `FIREBASE_PRIVATE_KEY` | `[REDACTED_PRIVATE_KEY]` | ✅ **Sí** |
| `MISTRAL_API_KEY` | `[REDACTED_MISTRAL_KEY]` | ✅ **Sí** |
| `YOUTUBE_API_KEY` | `[REDACTED_YOUTUBE_KEY]` | ✅ **Sí** |
| `UPSTASH_REDIS_REST_URL` | `[REDACTED_UPSTASH_URL]` | ✅ **Sí** |
| `UPSTASH_REDIS_REST_TOKEN` | `[REDACTED_UPSTASH_TOKEN]` | ✅ **Sí** |
| `QSTASH_CURRENT_SIGNING_KEY` | `[REDACTED_QSTASH_KEY1]` | ✅ **Sí** |
| `QSTASH_NEXT_SIGNING_KEY` | `[REDACTED_QSTASH_KEY2]` | ✅ **Sí** |

### 🟢 VARIABLES NO SENSIBLES (NO marques "Sensitive") - FRONTEND

| Nombre | Valor | ¿Sensible? |
|--------|-------|------------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyD8RrlU7DWcpqh4RBWrlyevEPR7HTTqINM` | ❌ **No** |
| `VITE_FIREBASE_AUTH_DOMAIN` | `moodless-4you.firebaseapp.com` | ❌ **No** |
| `VITE_FIREBASE_PROJECT_ID` | `moodless-4you` | ❌ **No** |
| `VITE_FIREBASE_STORAGE_BUCKET` | `moodless-4you.firebasestorage.app` | ❌ **No** |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `85765511157` | ❌ **No** |
| `VITE_FIREBASE_APP_ID` | `1:85765511157:web:ec7be81b029b0b892df2bc` | ❌ **No** |
| `VITE_RECAPTCHA_SITE_KEY` | `6LdkjKssAAAAAL2QM_jKOT5HmgDGxeWBULyGQpaz` | ❌ **No** |

---

## Paso 2: Copia la clave privada CORRECTAMENTE

La `FIREBASE_PRIVATE_KEY` debe copiarse **exactamente** así:

```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCmpwbWxysjV30B
77sd1ttSz/fjQ3b5jut/SJcrLkm7PQGbgARVxK4VrgTt/w74IENhEkm2udSVT/FN
QXGlAoG6EN8LS4THLCqnGH64JlAOMi51NCPT3/qiY1BjB2uhM2jql+sqPTeYslY8
i/Gojkzq3JL7QvQrC8LxdGn+gp7QLhnRQ8vuoO3eButv1Q/W7GR8fCsvJcbTMCcG
up73ZuZbvXA70aNTMSm1K9bbIeV6DmPy2LryZAFNHoGEjAXIT0dUj9ZQnN92HCi6
BEfMKLEinu3QpGTQ3Dq25PRZlfqhuyFjT9tO6YQRs24HN5ps2QRoC1KrQhvNGCTR
EMwBkRyVAgMBAAECggEAFm3vfTO0Kh8Jy5ts1zDGNwiXh+ZaGm9yYaCu+9hQgxtM
XpXlv3dnqLJRpoiIBrws5WE1O5saMfhe9TNkLL3AIP9JTbddyQK4QOIKmBVL/AUj
/JFGays/i+CK/rEOetU0/zHwLDCuDWafNanuHe39CzUhsSCLRUnhdGbjJyaEYmdC
R4yX3ONBsRDPxlYq5tQyFtfyzeIAMyH7jhCX0B2ZwjELq08M/3dU5hIyk6yjwdJy
4l/B/X9AF+6cfmPQ2F+vpW0HescJaeFSoWPS0Luf69myBhGuwSoa0E0fPl7uC2tU
P50B9ZCrlE4e7kjoXWJ5b0pFxSKtDi7NkFpGoiyqhwKBgQDc8l3GJ8tHwDd+ynoB
9bzlokJbfZ6jIq+crNn2YbHpaML8XN2686ymoJeNDg152+LxLsDGLzrZ7nrcjphS
APHBQtJOWCK6IFQcAR2dnn53DZALtsKpAZ7BOOEOIuk9IRamyEI9HRjk/F9+mx5A
Mh8d799z1hzjlw0ydZgfeg2i/wKBgQDBF4bUJby+ngVEalLvby3fYf7ne6Mk/dvB
VZejs+w5Gx+MZlrFmkt0xlRjorMQT8lMzwRIQUZGqoAMqTSTt4+s5jNICbO1P+Bi
qyjrQvDWCigQh9wM2NYfjUEbrLjUtgUfI/LbOn04Af4XjLnVGwXcByJVpGNHxY11
Et/PAq4EawKBgQCiu+iRoJG64Tp+qoc+lk5xHBef52BGa6/IyA8pxz8Q2VZ0Jboy
jnNlrvawr98BGBGI7pSR5AuGpH3doTFThNqLK7pWddfuGw2YKsIza59d9KFZ31x0
unrBejFZBiGgIpTadrlC5gGF9tQnHf0j70a3+Asu+E8C2iigN7i5xl3w5QKBgHH+
E6j2xmC6JV3obyHPPwObdMLv6LaT78JJZ4ZLV++2pX9bhccWeelslLFlgdTlZW+k
32BQuM5LJeFTmyiBu55VIH0szRz5otxdM4EAOfICePiZXD1xXaeu2nseEtfwxUFH
Fb563yXLd1gryiGXHHRy+cAZlkruw74T8HDjohwVAoGBANkidbicXJXM8QzSHLJz
/YW7c/RykDHgJ78qkZVSTJ95OtLwpNyNqkK/osalbs+g86p6zWGQ5EyU/cy+s+HR
qqMVBj1k1wKAAFGVzWrz/tVa5/SStir8ygAWR1sp/b/NgeaXny1HvPBhyHG09TlB
Bp7Wy74yLbRftVAam5Pj+qc2
-----END PRIVATE KEY-----
```

**⚠️ ATENCIÓN:** En Vercel, al pegar la clave, asegúrate de que:
1. No haya espacios extra al inicio o final
2. Los saltos de línea se preserven (Vercel los maneja automáticamente)
3. No estén escapados (no debe tener `\n` en lugar de saltos de línea reales)

---

## Paso 3: Verifica el CSP en vercel.json

El archivo `vercel.json` actual ya tiene un CSP adecuado, pero debemos añadir el dominio de Mistral AI:

```json
connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://esm.sh https://cdn.tailwindcss.com https://www.google.com https://apis.google.com https://accounts.google.com https://health.googleapis.com https://www.recaptcha.net https://api.mistral.ai
```

---

## Paso 4: Redeploy

Después de configurar todas las variables:
1. Ve a la pestaña "Deployments" en Vercel
2. Haz clic en "Redeploy" o empuja un cambio pequeño al repositorio
3. Verifica que el nuevo deployment no tenga errores

---

## Solución de Problemas

### 🔴 Error 500 en `/api/generate-ai`
**Causa:** Falta `MISTRAL_API_KEY` o `FIREBASE_PRIVATE_KEY` mal configurada
**Solución:** Verifica que todas las variables sensibles estén correctamente configuradas

### 🔴 Error "Search engine null is not supported"
**Causa:** Extensión de navegador (Bitdefender Traffic Light) o problema de CSP
**Solución:** 
1. Desactiva extensiones del navegador
2. Verifica el CSP en vercel.json

### 🔴 Error 404 en `/api/generate-ai`
**Causa:** La ruta API no está siendo reconocida
**Solución:** Verifica que el deployment se haya completado correctamente

### 🔴 Error de Firebase Admin
**Causa:** Las variables `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` o `FIREBASE_PRIVATE_KEY` están mal configuradas
**Solución:** Verifica que las tres variables estén configuradas y que la clave privada esté completa

---

## Variables Resumen

### Backend (sensibles) - 9 variables
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL  
- FIREBASE_PRIVATE_KEY
- MISTRAL_API_KEY
- YOUTUBE_API_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- QSTASH_CURRENT_SIGNING_KEY
- QSTASH_NEXT_SIGNING_KEY

### Frontend (NO sensibles) - 7 variables
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_RECAPTCHA_SITE_KEY

**Total: 16 variables de entorno**
