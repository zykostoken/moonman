# ⚡ QUICK START - 5 Minutos para Testear

## 🎯 Lo que vas a hacer:
1. Instalar dependencias (2 min)
2. Correr tests (2 min)
3. Ver resultados (1 min)

**Total:** 5 minutos

---

## 📝 Comandos (Copy/Paste)

### Paso 1: Ir al directorio
```bash
cd /home/user/moonman
```

### Paso 2: Instalar dependencias
```bash
npm install
```
*Esperá 1-2 minutos mientras instala...*

### Paso 3: Compilar contrato
```bash
npx hardhat compile
```
*Deberías ver: "Compilation successful"*

### Paso 4: Correr todos los tests
```bash
npx hardhat test
```
*Deberías ver algo como:*
```
  ZykosToken - Complete Test Suite
    Deployment
      ✓ Should have correct name and symbol
      ✓ Should have total supply of 100M
      ...
    70 passing (2s)
```

---

## ✅ ¿Qué significa si todo pasó?

**Si ves "70 passing" o similar:**
- ✅ El contrato funciona correctamente
- ✅ Todas las validaciones pasan
- ✅ Seguridad básica OK
- ✅ Estás listo para el siguiente paso (testnet)

---

## ❌ ¿Qué hacer si algo falló?

**Si ves errores:**
1. Copiá el error completo
2. Mandame el error
3. Lo arreglamos juntos

**Errores comunes:**

**Error: "Cannot find module"**
```bash
# Solución: Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

**Error: "Hardhat not found"**
```bash
# Solución: Instalar Hardhat localmente
npm install --save-dev hardhat
```

**Error: "Compilation failed"**
```bash
# Solución: Verificar versión de Solidity
npx hardhat compile --verbose
# Si falla, mandame el error
```

---

## 🔥 Próximo Paso (Solo si los tests pasaron)

### Opción A: Audit Completo Automatizado
```bash
./run-security-audit.sh
```
Esto corre:
- ✅ Tests
- ✅ Coverage
- ✅ Slither (si está instalado)
- ✅ Aderyn (si está instalado)
- ✅ Checklist de seguridad

**Tiempo:** 5-10 minutos

---

### Opción B: Deploy en Testnet (Gratis)

**1. Conseguir testnet ETH:**
- Ir a: https://faucet.quicknode.com/base/goerli
- Poner tu address de MetaMask
- Esperar 1 minuto
- Recibir ETH de testnet (gratis)

**2. Crear archivo `.env`:**
```bash
cp .env.example .env
nano .env
```

Poner tu private key (⚠️ SOLO DE TESTNET, NUNCA MAINNET):
```
PRIVATE_KEY=tu_private_key_aqui
```

**3. Deploy:**
```bash
npx hardhat run scripts/deploy.js --network base-goerli
```

**4. Guardar el address del contrato:**
```
Contrato deployado en: 0x...
```

**5. Probar comprando tokens:**
- Ir a BaseScan Goerli: https://goerli.basescan.org
- Buscar tu contrato
- Interactuar con él

---

## 📚 Documentación Completa

- **RESUMEN_FINAL.md** - Todo el proyecto explicado
- **TESTING_GUIDE.md** - Cómo testear y auditar (gratis)
- **DEPLOYMENT_GUIDE.md** - Deploy paso a paso
- **NETLIFY_SETUP.md** - Frontend setup

---

## 🆘 Ayuda Rápida

**Si estás trabado:**
1. Lee el error completo
2. Buscá en TESTING_GUIDE.md
3. Si no encontrás solución → mandame el error

**Si todo funciona:**
1. ✅ Lee RESUMEN_FINAL.md
2. ✅ Seguí con testnet
3. ✅ Después → community review
4. ✅ Finalmente → mainnet launch 🚀

---

## 🎬 EMPEZÁ AHORA

```bash
cd /home/user/moonman
npm install
npx hardhat test
```

**Si vez "passing" → Siguiente paso: ./run-security-audit.sh**

**¡Éxitos! 🚀**
