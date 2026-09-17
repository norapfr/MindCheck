<div align="center">

# 🌸🧠 MindCheck

### A private, on-device mood journal · Un diario de bienestar emocional, privado y en tu dispositivo

<p>
  <img src="https://img.shields.io/badge/React_Native-Expo_SDK_57-E97CA0?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-Python-3A2530?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/On--device_ML-ONNX_%2B_TFLite-D45C82?style=for-the-badge" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-9C8790?style=for-the-badge&logo=postgresql&logoColor=white" />
</p>

<p>
  <a href="#-english"><strong>🇬🇧 Read in English</strong></a>
  &nbsp;•&nbsp;
  <a href="#-español"><strong>🇪🇸 Leer en Español</strong></a>
</p>

<p>
  🌸 <strong><a href="https://mindcheck-backend-h77p.onrender.com/">Open MindCheck Landing Page</a></strong>
</p>



</div>

<br/>

---

## 🇬🇧 English

### 💗 What is MindCheck?

**MindCheck** is a mobile journaling app that gently helps you notice patterns in how you feel over time. You write, in your own words, how your day went — and the app quietly estimates a depression and suicide-risk signal from the text, right there on your phone. No raw journal text and no cloud AI model ever have to touch a server to produce that score.

It's a personal/portfolio project built end-to-end: mobile app, backend API, and a full migration of a BERT + neural-network risk model from a Python server to fully **on-device inference**.

> ⚠️ MindCheck is a self-awareness and emotional support tool. It does **not** diagnose any medical condition and does **not** replace professional help. If you or someone you know is struggling, please reach out to a crisis line or a mental health professional — the app's own "Help Resources" screen keeps a few close at hand.

<br/>

### ✨ Features

- 📓 **Daily journaling** with gentle writing prompts and a day-streak tracker
- 🧠 **On-device risk analysis** — a BERT embedding model (ONNX) + two lightweight classifiers (TFLite) run *locally* on the phone, not on a server
- 📈 **Mood history** with a trend chart, date-range filters, and per-entry detail view
- 🆘 **Automatic safety redirect** to a curated Help Resources screen when an entry scores high risk
- 🔐 **Private by design** — journal text is encrypted at rest; account data can be exported (JSON or a clean PDF report to share with a therapist) or permanently deleted, anytime
- 🌗 **Light & dark themes**, both in the same soft sakura-pink palette
- 🔑 Full account flow: register, log in, change password, session-expiry handling
- 🛡️ Rate-limited, JWT-authenticated API with bcrypt password hashing

<br/>

### 🏗️ How it's built

The interesting engineering story here is the **architecture migration**: MindCheck originally ran its ML pipeline (TensorFlow + PyTorch + BERT) entirely on the backend — which made it far too heavy to host for free. Instead of paying for a bigger server, the risk-scoring pipeline was **converted and moved onto the phone itself**:

```
┌─────────────────────────┐        ┌──────────────────────────┐
│   📱  Mobile app          │        │   ☁️  Backend (FastAPI)    │
│   (React Native / Expo)  │        │                            │
│                           │        │  • Auth (JWT + bcrypt)    │
│  1. raw journal text ───────────▶ │  • Text cleaning           │
│                           │        │    (spaCy + NLTK +        │
│  2. cleaned text ◀────────────────│    language detection)    │
│                           │        │  • Encrypted storage      │
│  3. BERT (ONNX) + TFLite  │        │    (Fernet, Postgres)     │
│     classifiers run       │        │  • Score validation       │
│     ON-DEVICE             │        │    & risk category        │
│                           │        │                            │
│  4. scores ─────────────────────▶ │  → saved encrypted         │
└─────────────────────────┘        └──────────────────────────┘
```

The backend never sees a raw ML embedding or runs the heavy model — it only cleans the text and decides the final risk *category* from the scores the phone computed, so a threshold change never requires an app update. The on-device tokenizer (a hand-written BERT WordPiece implementation in TypeScript) and every converted model were validated token-for-token and score-for-score against the original Python pipeline before shipping.

**Mobile**
- React Native + Expo (SDK 57, New Architecture, custom dev client)
- `react-native-nitro-onnxruntime` for the BERT embedding model
- `react-native-fast-tflite` for the depression / suicide-risk classifiers
- React Navigation (stack + drawer), `expo-secure-store`, `expo-print`

**Backend**
- FastAPI + SQLAlchemy, PostgreSQL (hosted on Neon)
- JWT auth, bcrypt password hashing, `slowapi` rate limiting
- spaCy + NLTK text preprocessing, `langdetect` for language gating
- Fernet symmetric encryption for journal content at rest
- Deployed on Render

**ML pipeline**
- `bert-base-uncased` exported to ONNX (float32, unquantized — no precision was traded away)
- Two custom classifier heads (GRU / CNN) exported from Keras to TFLite
- A Python ↔ TypeScript validation harness comparing outputs on a fixed test set before every model swap

<br/>

### 🚀 Getting started

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL
uvicorn app.main:app --reload
```

**Mobile**

```bash
cd mobile
npm install
npx expo install   # syncs native deps with your Expo SDK version
eas build --profile development --platform android   # native modules require a dev client, not Expo Go
npx expo start --dev-client
```

> Because the app uses native ML modules (ONNX Runtime, TFLite), it can't run inside plain Expo Go — you'll need a development build.

<br/>

### 💗 A note on privacy

The whole point of moving inference on-device was that **the emotional content of a journal entry never has to leave the phone as anything but already-computed numbers**. The backend's job is deliberately narrow: clean the text, store it encrypted, and hold the account. That separation is the part of this project I'm proudest of.

<br/>

<div align="right"><a href="#-mindcheck">↑ back to top</a></div>

---

## 🇪🇸 Español

### 💗 ¿Qué es MindCheck?

**MindCheck** es una app móvil de diario personal que ayuda, con delicadeza, a notar patrones en cómo te sientes con el paso del tiempo. Escribes, con tus propias palabras, cómo fue tu día — y la app estima en silencio una señal de riesgo de depresión y de riesgo suicida a partir del texto, directamente en tu teléfono. Ni el texto original del diario ni ningún modelo de IA en la nube necesitan tocar un servidor para producir esa puntuación.

Es un proyecto personal/de portfolio construido de principio a fin: app móvil, API de backend, y una migración completa de un modelo de riesgo (BERT + redes neuronales) desde un servidor Python hasta una **inferencia completamente local, en el propio dispositivo**.

> ⚠️ MindCheck es una herramienta de autoconocimiento y apoyo emocional. **No** diagnostica ninguna condición médica y **no** sustituye la ayuda profesional. Si tú o alguien que conoces lo está pasando mal, por favor contacta con una línea de crisis o un profesional de salud mental — la propia pantalla de "Recursos de ayuda" de la app mantiene varios siempre a mano.

<br/>

### ✨ Funcionalidades

- 📓 **Diario diario** con sugerencias de escritura y seguimiento de racha de días
- 🧠 **Análisis de riesgo en el dispositivo** — un modelo de embeddings BERT (ONNX) + dos clasificadores ligeros (TFLite) corren *localmente* en el teléfono, no en un servidor
- 📈 **Historial de estado de ánimo** con gráfica de tendencia, filtros por rango de fechas, y vista de detalle por entrada
- 🆘 **Redirección automática de seguridad** a una pantalla de Recursos de Ayuda cuando una entrada puntúa alto riesgo
- 🔐 **Privacidad por diseño** — el texto del diario se cifra en reposo; los datos de la cuenta se pueden exportar (JSON o un PDF legible para compartir con un terapeuta) o borrar permanentemente, en cualquier momento
- 🌗 **Modo claro y oscuro**, ambos en la misma paleta suave rosa sakura
- 🔑 Flujo de cuenta completo: registro, inicio de sesión, cambio de contraseña, manejo de expiración de sesión
- 🛡️ API con límite de peticiones, autenticada con JWT, y contraseñas con hash bcrypt

<br/>

### 🏗️ Cómo está construido

La parte de ingeniería más interesante aquí es la **migración de arquitectura**: MindCheck originalmente corría todo su pipeline de ML (TensorFlow + PyTorch + BERT) en el backend — lo cual lo hacía demasiado pesado para alojar gratis. En vez de pagar por un servidor más grande, el pipeline de puntuación de riesgo se **convirtió y se trasladó al propio teléfono**:

```
┌─────────────────────────┐        ┌──────────────────────────┐
│   📱  App móvil            │        │   ☁️  Backend (FastAPI)    │
│   (React Native / Expo)  │        │                            │
│                           │        │  • Auth (JWT + bcrypt)    │
│  1. texto original ─────────────▶ │  • Limpieza de texto       │
│                           │        │    (spaCy + NLTK +        │
│  2. texto limpio ◀─────────────── │    detección de idioma)   │
│                           │        │  • Almacenamiento cifrado │
│  3. BERT (ONNX) + TFLite  │        │    (Fernet, Postgres)     │
│     corren EN EL           │        │  • Validación de          │
│     DISPOSITIVO           │        │    puntuaciones y         │
│                           │        │    categoría de riesgo    │
│  4. puntuaciones ───────────────▶ │  → se guarda cifrado       │
└─────────────────────────┘        └──────────────────────────┘
```

El backend nunca ve un embedding de ML crudo ni ejecuta el modelo pesado — solo limpia el texto y decide la *categoría* final de riesgo a partir de las puntuaciones que ya calculó el teléfono, así que cambiar un umbral nunca exige actualizar la app. El tokenizador en el dispositivo (una implementación de WordPiece de BERT escrita a mano en TypeScript) y cada modelo convertido se validaron token a token y puntuación a puntuación contra el pipeline original en Python antes de publicarlos.

**Móvil**
- React Native + Expo (SDK 57, Nueva Arquitectura, development client propio)
- `react-native-nitro-onnxruntime` para el modelo de embeddings BERT
- `react-native-fast-tflite` para los clasificadores de depresión / riesgo suicida
- React Navigation (stack + drawer), `expo-secure-store`, `expo-print`

**Backend**
- FastAPI + SQLAlchemy, PostgreSQL (alojado en Neon)
- Autenticación JWT, hash de contraseñas con bcrypt, límite de peticiones con `slowapi`
- Preprocesado de texto con spaCy + NLTK, `langdetect` para el filtro de idioma
- Cifrado simétrico Fernet para el contenido del diario en reposo
- Desplegado en Render

**Pipeline de ML**
- `bert-base-uncased` exportado a ONNX (float32, sin cuantizar — no se sacrificó precisión)
- Dos cabezas de clasificación personalizadas (GRU / CNN) exportadas de Keras a TFLite
- Un arnés de validación Python ↔ TypeScript que compara resultados sobre un conjunto de prueba fijo antes de cada cambio de modelo

<br/>

### 🚀 Cómo empezar

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # rellena JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL
uvicorn app.main:app --reload
```

**Móvil**

```bash
cd mobile
npm install
npx expo install   # sincroniza dependencias nativas con tu version de Expo SDK
eas build --profile development --platform android   # los modulos nativos necesitan un dev client, no Expo Go
npx expo start --dev-client
```

> Como la app usa módulos nativos de ML (ONNX Runtime, TFLite), no puede correr dentro de Expo Go normal — hace falta un development build.

<br/>

### 💗 Una nota sobre privacidad

Todo el sentido de mover la inferencia al dispositivo fue que **el contenido emocional de una entrada de diario nunca tiene que salir del teléfono como algo más que números ya calculados**. El trabajo del backend es deliberadamente estrecho: limpiar el texto, guardarlo cifrado, y gestionar la cuenta. Esa separación es la parte de este proyecto de la que más orgullosa estoy.

<br/>

<div align="right"><a href="#-mindcheck">↑ volver arriba</a></div>

---

<div align="center">

Made with 💗 by <a href="https://github.com/norapfr">@norapfr</a>

</div>