# Minitel Blocks Studio

Minitel Blocks Studio est une application Electron + React pour programmer un ESP32 qui pilote un Minitel avec des blocs visuels, dans l'esprit de Scratch. L'objectif est simple : permettre de créer des écrans, des interactions clavier, des boucles, des variables et des sons sans avoir besoin d'écrire du C++.

![Minitel Blocks Studio](public/logo.png)

## Fonctionnalités

- Éditeur de blocs empilables, colorés et imbriqués.
- Blocs de démarrage, boucle, clavier, texte, couleurs, son, graphismes, variables, conditions et boucles.
- Variables utilisables dans les blocs, par exemple pour faire un bip plusieurs fois ou placer du texte à une position calculée.
- Opérations visuelles : nombres, variables, calculs et comparaisons.
- Simulation Minitel intégrée avec écran 40 x 24, touches simulées, variables et mode pas à pas.
- Annulation et rétablissement avec boutons, `Ctrl+Z`, `Ctrl+Y` et `Ctrl+Shift+Z`.
- Génération automatique du code ESP32 / Arduino.
- Téléversement direct vers l'ESP32 depuis l'application, sans ouvrir Arduino IDE.
- Installateur Windows `.exe` généré automatiquement par GitHub Actions.

## Installation pour utiliser l'application

1. Va dans l'onglet **Actions** ou **Releases** du dépôt GitHub.
2. Télécharge l'artefact ou le fichier `Minitel Blocks Studio-Setup-0.1.0.exe`.
3. Lance l'installateur Windows.
4. Ouvre **Minitel Blocks Studio** depuis le menu Démarrer ou le raccourci bureau.

L'application embarque l'interface, la bibliothèque `MinitelESP32` et la logique de génération du projet PlatformIO temporaire.

## Téléverser sur un ESP32

1. Branche l'ESP32 en USB.
2. Ouvre l'onglet **ESP32** dans l'application.
3. Choisis la carte si nécessaire : `ESP32 Dev Module`, `NodeMCU-32S` ou `DOIT ESP32 DevKit V1`.
4. Laisse le port sur `auto` ou renseigne un port comme `COM3`.
5. Clique sur **Envoyer à l'ESP32**.

Le premier téléversement peut télécharger les outils ESP32 et préparer un environnement PlatformIO privé dans les données de l'application. Arduino IDE n'est pas nécessaire. Une connexion Internet peut être nécessaire au premier téléversement, et Windows peut demander un pilote USB selon la puce de la carte ESP32.

## Build automatique GitHub

Le workflow [`.github/workflows/build-windows.yml`](.github/workflows/build-windows.yml) construit l'application à chaque push sur `main` ou `master` :

1. installation des dépendances avec `npm ci` ;
2. build React / TypeScript avec des chemins compatibles avec l'application installée ;
3. génération de l'installateur Windows `.exe` sans publication automatique parasite ;
4. publication de l'exe comme artefact GitHub Actions.

Quand une GitHub Release est créée, l'installateur est aussi attaché automatiquement à la release.

## Développement local

Prérequis :

- Node.js 24 recommandé, Node.js 22.12 minimum ;
- Windows pour générer l'installateur Windows ;
- une connexion Internet pour installer les dépendances et, au premier téléversement, les outils ESP32.

Commandes utiles :

```powershell
npm install
npm run dev
```

Construire seulement React :

```powershell
npm run build
```

Générer l'installateur Windows :

```powershell
npm run dist:win
```

Ou avec le script pratique :

```powershell
.\build-windows.ps1
```

Le fichier final est créé dans le dossier `release/`.

## Structure du projet

- `src/` : interface React et logique des blocs.
- `electron/` : fenêtre Electron, export de sketch et téléversement ESP32.
- `resources/MinitelESP32/` : bibliothèque C++ utilisée par le projet généré.
- `build/` : icônes utilisées par l'installateur.
- `.github/workflows/` : build automatique de l'exe Windows.
- `release/` : sortie locale de l'installateur, ignorée par Git.

## Licence

Ce projet est distribué sous licence Apache-2.0. Voir [LICENSE](LICENSE).
