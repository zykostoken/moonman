# 🚀 Deploy Frontend en Netlify - ZYKOS

## 📋 Prerequisitos

- Cuenta de Netlify (gratis): https://netlify.com
- Los dominios ya registrados:
  - zykos.ar
  - zykotoken.ar
  - zykotoken.com

---

## 🎯 Opción 1: Deploy Manual (Más Fácil)

### Paso 1: Preparar el Frontend

1. **Actualizar `app.js` con el address del contrato deployado:**

```bash
cd /home/user/moonman/zykos-frontend

# Editar app.js
nano app.js

# Buscar la línea:
CONTRACT_ADDRESS: 'TBD_AFTER_DEPLOYMENT'

# Reemplazar con el address real después de deployar el contrato
CONTRACT_ADDRESS: '0xTU_CONTRATO_AQUI'

# Guardar: Ctrl+O, Enter, Ctrl+X
```

### Paso 2: Deploy en Netlify (Drag & Drop)

1. **Ir a:** https://app.netlify.com
2. **Crear cuenta / Login**
3. **Click:** "Add new site" → "Deploy manually"
4. **Arrastrar la carpeta** `zykos-frontend` completa
5. **Esperar** ~30 segundos → Sitio deployado! ✅

Te va a dar una URL random tipo: `https://random-name-123.netlify.app`

---

### Paso 3: Conectar tus Dominios Personalizados

#### Para zykos.ar:

1. En Netlify, ir a: **Site settings** → **Domain management**
2. Click: **Add custom domain**
3. Poner: `zykos.ar`
4. Netlify te va a dar los DNS records:

```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: random-name-123.netlify.app
```

5. **Ir a tu registrador de dominio** (donde compraste zykos.ar)
6. **DNS settings** → Agregar esos records
7. **Esperar** 5-30 minutos (propagación DNS)

#### Para zykotoken.ar y zykotoken.com:

**Repetir el proceso:**
1. **Add custom domain** → `zykotoken.ar`
2. Agregar DNS records en el registrador
3. **Add custom domain** → `zykotoken.com`
4. Agregar DNS records en el registrador

**Resultado:** Los 3 dominios apuntan al mismo sitio.

---

### Paso 4: Activar HTTPS (Gratis)

1. En Netlify: **Site settings** → **Domain management** → **HTTPS**
2. Click: **Verify DNS configuration**
3. Click: **Provision certificate** (Let's Encrypt gratis)
4. Esperar ~1 minuto
5. ✅ HTTPS activado

---

## 🎯 Opción 2: Deploy con Git (Más Profesional)

### Paso 1: Subir a GitHub

```bash
cd /home/user/moonman/zykos-frontend

git init
git add .
git commit -m "Initial frontend deployment"

# Crear repo en GitHub: https://github.com/new
# Nombre: zykos-frontend

git remote add origin https://github.com/TU_USUARIO/zykos-frontend.git
git push -u origin main
```

### Paso 2: Conectar Netlify a GitHub

1. **Netlify:** "Add new site" → "Import an existing project"
2. **Elegir:** GitHub
3. **Autorizar** Netlify
4. **Seleccionar** el repo: `zykos-frontend`
5. **Build settings:**
   - Build command: (dejar vacío)
   - Publish directory: `.`
6. **Deploy!**

**Ventaja:** Cada vez que hagas `git push`, Netlify auto-deploya.

---

### Paso 3: Variables de Entorno (Opcional)

Si querés que el `CONTRACT_ADDRESS` sea configurable:

1. **Netlify:** Site settings → Environment variables
2. **Agregar:**
   - Key: `CONTRACT_ADDRESS`
   - Value: `0xTU_CONTRATO_AQUI`

3. **Actualizar `app.js`:**
```javascript
const CONFIG = {
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || 'TBD_AFTER_DEPLOYMENT'
};
```

---

## 🔧 Troubleshooting

### Problema: "Site not found" después de DNS

**Solución:** Esperar más tiempo (hasta 24hs en algunos casos)

**Check propagación:**
```bash
dig zykos.ar
```

Debe mostrar: `75.2.60.5` (IP de Netlify)

---

### Problema: "Mixed content" (HTTP/HTTPS)

**Solución:** Asegurar que todas las URLs en el código sean HTTPS:
- En `app.js`: Usar `https://mainnet.base.org` (no http)
- En `index.html`: Usar `https://` para todos los scripts

---

### Problema: MetaMask no conecta

**Solución:**
1. Verificar que `app.js` tenga el `CONTRACT_ADDRESS` correcto
2. Abrir consola del browser (F12) y ver errores
3. Asegurar que MetaMask esté en Base network

---

## 📊 Monitoreo Post-Deploy

### Analytics (Gratis)

Netlify incluye analytics básicos:
- **Site settings** → **Analytics** → Ver visitantes, pageviews, etc.

### Para más detalle (Opcional):

**Google Analytics:**
1. Crear cuenta en: https://analytics.google.com
2. Copiar tracking ID: `G-XXXXXXXXXX`
3. Agregar en `index.html` antes de `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🎨 Customizaciones Futuras

### Cambiar colores:

Editar `styles.css`:
```css
:root {
    --primary: #8b5cf6; /* ← Cambiar este color */
    --secondary: #06b6d4;
    /* ... */
}
```

### Agregar logo:

1. Subir imagen: `logo.png` a la carpeta
2. En `index.html`:
```html
<div class="logo">
    <img src="logo.png" alt="Zykos" width="40">
    <h1>$ZKS</h1>
</div>
```

### Agregar FAQ section:

En `index.html`, antes del footer:
```html
<section id="faq" class="section">
    <div class="container">
        <h2 class="section-title">FAQ</h2>
        <!-- Agregar preguntas frecuentes -->
    </div>
</section>
```

---

## ✅ Checklist Final de Deploy

- [ ] Contrato deployado en Base Mainnet
- [ ] `CONTRACT_ADDRESS` actualizado en `app.js`
- [ ] Frontend deployado en Netlify
- [ ] Dominios configurados (zykos.ar, zykotoken.ar, zykotoken.com)
- [ ] HTTPS activado
- [ ] MetaMask conecta correctamente
- [ ] Compra de prueba exitosa (con cuenta de test)
- [ ] Analytics configurado
- [ ] Links de redes sociales actualizados en footer
- [ ] Disclaimer legal visible
- [ ] BaseScan link funciona

---

## 🚀 Post-Launch

### Día 1:
- Monitorear errores en consola del browser
- Verificar que las compras funcionen
- Responder rápido a bugs reportados

### Semana 1:
- Agregar FAQ según preguntas comunes
- Ajustar textos/diseño según feedback
- Promocionar en redes sociales

### Mes 1:
- Revisar analytics (qué páginas más visitadas)
- Optimizar UX según comportamiento real
- Agregar features (calculator, stats avanzados, etc.)

---

¿Querés que te ayude con algún paso específico del deploy?

**Para deploy manual rápido:**
```bash
cd /home/user/moonman/zykos-frontend
zip -r zykos-frontend.zip .
```

Luego arrastrá el `.zip` a Netlify y listo!
