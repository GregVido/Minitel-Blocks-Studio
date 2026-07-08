# Minitel Blocks Studio

Application Electron + React pour construire visuellement un programme ESP32 qui pilote un Minitel avec la librairie `MinitelESP32`.

## Lancer

```bash
npm install
npm run dev
```

La commande `npm run dev` compile l'interface, lance un serveur local, puis ouvre Electron.
Pour tester seulement dans le navigateur :

```bash
npm run build
npm run serve
```

Puis ouvrir http://127.0.0.1:4173/.

## Ce que l'app permet

- Construire un programme avec des blocs empilables comme Scratch.
- Déplacer un bloc avec toute la suite connectée derrière lui.
- Imbriquer des blocs dans `répéter`, `si`, `si / sinon`, `toujours` et `pour`.
- Créer des variables, leur donner une valeur initiale et les utiliser dans les champs des blocs.
- Utiliser des expressions : nombre, variable, calcul, comparaison.
- Prévisualiser l'écran Minitel en 40 x 24.
- Générer, exporter et téléverser le sketch ESP32 sans ouvrir Arduino.

## Téléversement ESP32

Le bouton `Téléverser` utilise PlatformIO. Il crée un projet temporaire, copie la librairie `MinitelESP32`, écrit le sketch dans `src/main.cpp`, puis lance `platformio run -t upload`.

PlatformIO doit être installé. L'app cherche d'abord `PLATFORMIO_EXE`, puis `C:\Users\<vous>\.platformio\penv\Scripts\platformio.exe` sous Windows.

## Fichiers principaux

- `src/App.tsx` : blocs imbriqués, variables, expressions, simulation Minitel, génération Arduino.
- `src/styles.css` : interface, blocs colorés, animations et suppression animée.
- `electron/main.cjs` : export du sketch et téléversement PlatformIO.
- `resources/MinitelESP32` : copie locale de la librairie Minitel utilisée au téléversement.
