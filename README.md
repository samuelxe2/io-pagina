# Escape Room · Solutions TECH (Programación Entera)

Dinámica de clase de **60 minutos**: tres candados de **20 minutos**, cada uno dirigido por un grupo.

| Candado | Grupo | Tema | Clave final |
|---|---|---|---|
| PURA | Grupo 1 | Programación Entera Pura (2 ejercicios) | x = 1, y = 4, Z = 126 |
| MIXTA | Grupo 2 | Entera mixta · Planos de corte (Caso 2) | Z = 153, X = (1, 0, 3/2) |
| BINARIA | Grupo 3 | Programación Entera Binaria | x = (0, 1, 1), Z = 142 |

Cada candado tiene 5 sub-candados que se desbloquean en orden. Los estudiantes juegan **desde el celular** y las respuestas se validan **en el servidor** (no aparecen en el código del navegador).

**Puntaje por candado:** 20 por sub-candado (100), −5 por intento fallido (máx. −50), pistas −10 / −15 / −25, +20 si lo abren antes de 15 minutos, mínimo 20 si lo abren.

## Cómo se juega
1. El profesor abre **`/host`** en el proyector y pulsa **Crear sala**. Aparecen el código y un QR.
2. Cada equipo entra desde el celular (escanea el QR o abre el sitio y escribe el código).
3. Cuando le toca a un grupo, el profesor pulsa **▶ Iniciar** en su candado (20 min). Los celulares entran solos al candado.
4. El grupo expositor guía; el tablero muestra en vivo el progreso y el ranking. **Ver solución** abre la solución para proyectarla al cerrar.
5. Al terminar los tres, **Finalizar juego** muestra el podio en el proyector y la posición final en cada celular.

## Experiencia del estudiante (novela gráfica)
El celular cuenta la historia en 6 episodios: **1 La crisis** (portada y contrato) · **2 La junta** (CEO, Director de Tecnología, Gerente Financiero y el equipo consultor) · **3 Análisis** (expedientes de los proyectos) · **4 El desafío** (un desafío por escena) · **5 Consecuencias** · **6 Informe** ejecutivo final.

Cada desafío usa una mecánica distinta según lo que evalúa: pizarra de ecuaciones, sellos de INFACTIBLE, tablero IMPLEMENTAR/DESCARTAR con barras de recursos, contador de paquetes, terminal del simplex, plano de corte, elección de variable, bóveda de la clave, calculadora y diálogo con la junta. En los tableros de decisión, Z se calcula a partir de lo que el equipo elige; el servidor sigue validando que la combinación sea factible y óptima.

## Editar los candados
Todo el contenido (enunciados, tablas, campos, respuestas, pistas y soluciones) está en **`lib/locks.js`**. Las fracciones se aceptan como `9/11`, `0.8182` o `0,8182` (tolerancia ±0,01).

## Probar en local
```bash
npm run dev
```
Profesor: http://localhost:3000/host · Estudiantes: http://localhost:3000

En local los datos se guardan en memoria (se pierden al reiniciar).

## Desplegar en Vercel
1. Sube esta carpeta a un repositorio de GitHub e impórtalo en vercel.com → **Add New → Project** (Framework Preset: **Other**; no hay que cambiar nada más, `vercel.json` ya indica la carpeta `public`).
2. **Obligatorio:** en el proyecto de Vercel ve a **Storage → Create Database → Upstash (Redis)**, elige el plan gratuito y conéctalo al proyecto. Esto crea las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
3. Haz **Redeploy**. En `/host` ya no debe aparecer el aviso “almacenamiento en memoria”.

> Sin la base de datos, Vercel no comparte la memoria entre peticiones y el juego no funcionará con varios celulares.

## Estructura
```
api/game.js       función serverless (POST /api/game)
lib/engine.js     salas, equipos, puntaje
lib/locks.js      contenido, respuestas y presentación (ui) de los 3 candados
public/js/comic.js      componentes: personajes, globos, viñetas, onomatopeyas, indicadores
public/js/mechanics.js  mecánicas visuales de cada tipo de desafío
public/js/player.js     flujo de episodios del estudiante
lib/store.js      Upstash Redis o memoria
public/           páginas del estudiante (/) y del profesor (/host)
dev-server.js     servidor local
```
