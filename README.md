# Minitel Blocks Studio

Minitel Blocks Studio permet de créer un programme pour un ESP32 qui pilote un Minitel, avec des blocs visuels faciles à assembler. Pas besoin de connaître le code : tu construis ton comportement avec des actions comme afficher du texte, changer les couleurs, réagir aux touches, faire des boucles ou utiliser des variables.

![Minitel Blocks Studio](public/logo.png)

## Installer l'application

1. Télécharge le fichier d'installation Windows dans la page **Releases** du projet.
2. Lance le fichier `Minitel Blocks Studio-Setup-0.1.0.exe`.
3. Suis l'installation.
4. Ouvre **Minitel Blocks Studio** depuis le menu Démarrer ou le raccourci du bureau.

## Créer un programme

L'écran principal est divisé en trois zones :

- à gauche, la liste des blocs disponibles ;
- au centre, l'espace où tu construis ton programme ;
- à droite, la simulation, le code généré et l'envoi vers l'ESP32.

Pour construire un programme, prends un bloc à gauche puis dépose-le dans l'espace central. Les blocs peuvent être empilés, déplacés, supprimés, copiés et imbriqués dans des boucles ou des conditions.

## Tester avec la simulation

L'onglet **Simulation** affiche un Minitel virtuel. Il permet de vérifier ton programme avant de l'envoyer sur l'ESP32.

Tu peux :

- cliquer sur **Lancer** pour faire tourner la simulation ;
- cliquer sur **Pas** pour avancer étape par étape ;
- cliquer sur **Reset** pour repartir de zéro ;
- choisir une touche, puis cliquer sur **Tester** ;
- appuyer directement sur une touche du clavier, par exemple `A`, `B`, `Entrée` ou `Retour`.

Si ton programme contient un bloc du type **quand la touche A**, l'action se déclenche quand tu testes cette touche ou quand tu appuies sur `A` au clavier.

## Envoyer sur l'ESP32

1. Branche ton ESP32 en USB.
2. Ouvre l'onglet **ESP32**.
3. Choisis le modèle de carte si nécessaire.
4. Laisse le port sur **auto**, ou choisis le port si tu le connais.
5. Clique sur **Envoyer à l'ESP32**.

La première fois, l'application peut avoir besoin d'Internet pour préparer les outils d'envoi. Selon ta carte ESP32, Windows peut aussi demander un pilote USB.

## Raccourcis utiles

- `Ctrl+Z` : annuler.
- `Ctrl+Y` : rétablir.
- `Ctrl+Shift+Z` : rétablir aussi.
- Dans la simulation, appuie sur une touche du clavier pour la tester.

## Conseils

- Commence avec le programme exemple pour comprendre le fonctionnement.
- Utilise la simulation avant d'envoyer sur l'ESP32.
- Si l'envoi échoue, vérifie le câble USB, le port choisi et le modèle de carte.
- Si rien ne s'affiche sur le Minitel, vérifie le branchement entre l'ESP32 et le Minitel.

## Licence

Minitel Blocks Studio est distribué sous licence Apache-2.0.
