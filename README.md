# Inventario del Gremio

Gestor de inventario para los 6 miembros del gremio: Alejandro Savedra, Ian Outen, Ernie Biens, Jassiel Solis, Germán Peña y Luis Mendoza.

- Cada compra se reparte en partes iguales entre los 6 (una caja de 24 sodas da 4 para cada uno).
- Lo que no alcanza para todos queda en la **bolsa común** y se reparte cuando se completa otra ronda.
- Cada miembro registra lo que consume y ve su saldo.
- Los datos se guardan en una **Google Sheet** a través de Google Apps Script. La página se publica gratis en **GitHub Pages**.

## Estructura

```
index.html            Página
styles.css            Estilos
app.js                Lógica (reparto, saldos, historial)
config.js             URL del Apps Script y lista de miembros
apps-script/Code.gs   Backend que va pegado en Google Apps Script
```

## 1. Crear la hoja y el backend (Google Sheets)

1. Crea una hoja nueva en Google Sheets, por ejemplo "Inventario del Gremio".
2. Menú **Extensiones → Apps Script**.
3. Borra lo que trae `Código.gs` y pega todo el contenido de `apps-script/Code.gs`. Guarda.
4. Arriba, elige la función `configurar` y pulsa **Ejecutar**. Autoriza los permisos (cuenta propia → Avanzado → Ir al proyecto).
   Esto crea la pestaña `movimientos` con sus columnas.
5. **Configuración del proyecto** (engranaje) → **Propiedades del script** → cambia el valor de `CLAVE_GREMIO` por la clave que acuerden entre los 6.
6. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
7. Copia la URL que termina en `/exec`.

## 2. Configurar la página

Abre `config.js` y pega la URL en `API_URL`:

```js
API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
```

## 3. Subir a GitHub y publicar

```bash
git init
git add .
git commit -m "Inventario del Gremio"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gestor_de_inventario_el_gremio.git
git push -u origin main
```

En GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
En uno o dos minutos queda en `https://TU_USUARIO.github.io/gestor_de_inventario_el_gremio/`.

## Uso

1. Cada miembro abre el enlace, elige su nombre en **Soy** y escribe la clave del gremio una vez.
2. **Cargar compra**: producto, tipo, quién compró, paquetes × unidades y el costo (opcional, muestra cuánto paga cada uno).
3. **Registrar consumo**: quién, producto y cantidad. No deja consumir más de lo que le queda a esa persona.
4. Se puede consumir de la **Bolsa común** (por ejemplo, para algo compartido).
5. En el **Historial** se puede borrar un movimiento equivocado (pide confirmar).

## Notas

- La URL del Apps Script queda pública en `config.js`; por eso escribir exige la clave del gremio. Leer el inventario no la pide.
- Si cambias `Code.gs`, vuelve a publicarlo en **Implementar → Gestionar implementaciones → Editar → Nueva versión** para que la URL siga siendo la misma.
- Para cambiar los miembros, edita `MEMBERS` en `config.js`.
