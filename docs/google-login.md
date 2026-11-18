# Configurar el inicio de sesión con Google

La galería ya utiliza Google Identity Services y verifica el ID token en la API. Para habilitar el botón de Google en este entorno:

1. Crea un OAuth Client ID de tipo **Web application** en Google Cloud Console.
2. En **Authorized JavaScript origins**, agrega exactamente `http://localhost:5174` (sin ruta ni barra final).
3. En el archivo local `.env`, define `GOOGLE_CLIENT_ID` con el Client ID web. No uses un client secret en el frontend.
4. Reinicia la API para que lea la nueva variable.

Al publicar el sitio, agrega su dominio HTTPS como origen autorizado. Google recomienda validar el ID token en el servidor y comparar la audiencia con el Client ID de la aplicación.

Documentación oficial: <https://developers.google.com/identity/gsi/web/guides/verify-google-id-token> y <https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid>.

Si aparece `Error 400: origin_mismatch`, abre el sitio en `http://localhost:5174` y revisa que ese mismo origen esté guardado en el Client ID de tipo **Web application**. El servidor Vite está fijado al puerto 5174 para evitar que cambie silenciosamente de puerto.
