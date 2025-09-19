# Quickstart test local

## Installation en 8 étapes maximum
1. Ouvrez Chrome puis allez sur `chrome://extensions`.
2. Activez « Mode développeur » (coin supérieur droit).
3. Cliquez sur « Charger l'extension non empaquetée ».
4. Sélectionnez le dossier `apps/extension-demo` de ce projet.
5. Ouvrez une page FreeWork (liste ou détail d'offre) dans un onglet.
6. Cliquez sur l'icône **FreelanceFinder Demo** dans la barre d'outils.
7. Pressez « Analyser cette page » et observez le statut + le résumé.
8. Dépliez « Voir le JSON brut », copiez le JSON si besoin, puis utilisez « Réinitialiser » pour retester.

## Dépannage rapide
- **Page hors périmètre FreeWork** : vérifiez que l'URL contient `free-work.com` puis relancez l'analyse.
- **Aucune offre détectable — structure atypique** : la page a changé de structure ; rechargez ou testez une autre offre.
- **Contenu en cours de chargement, réessayez** : attendez une seconde puis cliquez de nouveau sur « Analyser cette page ».

## Rappels
- Traitement 100 % local : aucune donnée n'est envoyée hors de votre navigateur.
- Les boutons « Copier JSON » et « Réinitialiser » permettent de repartir instantanément pour un nouveau test.
