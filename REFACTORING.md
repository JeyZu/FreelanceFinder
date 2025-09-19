# Refactoring FreelanceFinder — plan directeur

## Audit initial

### Packages / détection
- `packages/detectors/src/freework/detector.ts` concentre toute la logique métier (368+ lignes) :
  - mélange orchestration (boucle d'attente), parsing DOM, normalisation, scoring, constitution des preuves.
  - définitions répétées (regex remote, mots-clés lieux, pile techno) en dur et non réutilisables.
  - aucune séparation claire entre extraction (lecture DOM), normalisation (taux, remote, texte) et utilitaires.
- Typage : `OfferDetectionItem` défini dans `packages/types` mais enrichi/complété localement, pas de contrat « JobOffer » unique partagé avec l'extension.

### Extension (content-script + popup)
- `apps/extension-demo/content-script.js` duplique l'intégralité des heuristiques : listes de technos, mapping contrats, parsing taux/dates/remote.
  - mélange JSON-LD, fallback DOM et formatage UI dans un seul IIFE.
  - aucune mutualisation avec le paquet TypeScript → divergence à terme assurée.
- `apps/extension-demo/popup.js` (≈250 lignes) combine état, orchestration Chrome API, rendu, accessibilité.
  - logique de statut / badge, rendu JSON, gestion du tutoriel imbriqués sans découpage.

### Points de couplage / dette
- Duplication massive des regex heuristiques (remote, taux, stack) entre le paquet TS et l'extension.
- Absence de modules utilitaires partagés (DOM helpers, normalisation texte, URL absolue).
- Pas de gestion centralisée de l'état transitoire (polling deadline, diagnostics) : tout est codé inline.
- Contrat de données divergent entre détecteur et UI (summary adhoc côté popup).

## Plan de refactor

1. **Contrat unifié**
   - Introduire `JobOffer` et `OfferDetectionResult` dans `packages/types/src/offers.ts` comme source de vérité.
   - Fournir alias rétrocompatibles (`OfferDetectionItem`) pour ne pas casser les imports existants.

2. **Modules partagés (packages/detectors)**
   - Créer dossiers :
     - `types/` → glue avec `@freelancefinder/types` (contrats, gardes d'entrée/sortie).
     - `utils/` → helpers DOM (`queryText`, `buildSelector`, `toAbsoluteUrl`), URL, temps (`delay`, `now`), collections.
     - `normalize/` → `text.ts`, `rate.ts`, `remote.ts`, `location.ts` (centralisation regex/keywords).
     - `parsing/` → découpage par responsabilité : `meta.ts` (headings, méta), `technologies.ts`, `description.ts`.
     - `state/` → gestion du polling (deadline/diagnostics), accumulateur de preuves.
   - Extraire toutes les fonctions actuelles de `detector.ts` dans ces modules et ne laisser que l'orchestration (≤120 lignes).

3. **Détecteur FreeWork**
   - Réécrire `freework/detector.ts` pour utiliser les nouveaux modules :
     - validation URL → `utils/url`.
     - boucle d'attente → `state/poller`.
     - extraction detail/list → modules `parsing` + `normalize`.
     - constitution de `OfferEvidence` via `state/evidence-builder`.
   - Assurer invariants (guards sur DOM absent) + messages identiques.

4. **Extension — mutualisation heuristiques**
   - Migrer le content-script vers un module ES (`src/content-script.ts`), transpilation via `tsc` (outDir `dist`).
   - Réutiliser les helpers de `@freelancefinder/detectors` (import direct → bundlé dans le build) pour analyser la page et produire le payload pour la popup.
   - Fournir fallback DOM léger côté content-script pour formatter le résultat (résumé) sans heuristiques dupliquées.
   - Mettre à jour `manifest.json` et `popup.html` pour pointer vers `dist/*.js` générés.

5. **Extension — popup**
   - Déplacer la logique dans `src/popup/` :
     - `state.ts` (état courant + transitions autorisées).
     - `render.ts` (rendu status, summary, evidence).
     - `actions.ts` (handlers Chrome, copy, analyse, tutoriel).
     - `main.ts` orchestrant initialisation.
   - Conserver API utilisateur (mêmes boutons, textes, statuts) + factoriser helpers (`formatStatus`, `toggleSection`).

6. **Tests & validations**
   - Adapter tests Vitest pour les nouveaux modules (tests unitaires sur normalize/rate/location, evidence builder).
   - Couvrir content-script par tests unitaires (si possible via vitest + jsdom) sur formatage résumé.
   - Exécuter `pnpm lint`, `pnpm typecheck`, `pnpm test` (detectors + extension build) à chaque étape.

7. **Documentation & migration**
   - Documenter dans ce fichier les nouveaux points d'entrée (où importer `JobOffer`, comment lancer le build extension).
   - Lister les imports à remplacer (ancien `./freework/detector` → `@freelancefinder/detectors/freework`).

## Étapes d'exécution

1. Mettre en place le contrat `JobOffer` + alias.
2. Créer modules `normalize/`, `utils/`, `parsing/`, `state/` et migrer progressivement les fonctions du détecteur (avec tests après chaque sous-ensemble).
3. Réécrire `detectFreeWorkOffers` pour orchestrer les modules extraits.
4. Installer toolchain TS (tsconfig) pour l'extension, déplacer scripts en `src/`, réutiliser les helpers mutualisés.
5. Refactor popup en modules + orchestrateur `main`.
6. Ajouter/adapter tests unitaires côté detectors et extension.
7. Finaliser documentation (section diff avant/après dans ce fichier).

## Cartographie après extraction

### `packages/detectors`
- `types/` : réexport du contrat unique `JobOffer`, utilisé par le détecteur et l'extension.
- `normalize/` : normalise texte, TJM, remote et lieux (tests unitaires dans `rate.test.ts`, `location.test.ts`, `remote.test.ts`).
- `parsing/` : heuristiques DOM spécialisées (méta-infos, tags, description, techno).
- `state/` : outils transverses (poller, calcul de confiance, construction des preuves).
- `utils/` : helpers purs (URL, temps, collections, sélecteurs CSS).
- `freework/` : orienteur `detector.ts` + extracteurs `detail.ts` / `list.ts` reposant sur les modules partagés.

### `apps/extension-demo`
- `src/lib/` : mappers communs (`result-mapper`, `offer-summary`, `evidence-format`, nouveau `detector-loader`).
- `src/popup/` : séparation stricte entre DOM (`dom.ts`), rendu (`render.ts`), statut (`status.ts`), état (`state.ts`) et actions (`actions.ts`).
- `src/content-script.ts` : mince orchestration qui délègue l'analyse au détecteur mutualisé.
- `tsup.config.ts` : bundling unique des points d'entrée `content-script`, `popup` et `detector`.

## Duplications résolues

- Heuristiques de détection (TJM, remote, stack) : déplacées de l'ancien `content-script.js` et de l'ancien `detector.ts` vers `packages/detectors/src/normalize` & `parsing`.
- Conversion d'URL relatives → absolues : centralisée dans `utils/url.ts` et réutilisée côté liste.
- Construction des preuves et calcul de confiance : désormais dans `state/evidence.ts` et `state/confidence.ts` (partagés détail/liste).
- Gestion du cache d'import dynamique : isolée dans `src/lib/detector-loader.ts` (remplace la duplication de promesse dans le content-script).

## Diff synthétique (avant → après)

| Domaine | Avant | Après |
| --- | --- | --- |
| Détection FreeWork | `detector.ts` monolithique (orchestration + parsing) | `detector.ts` (<120 lignes) + `detail.ts`/`list.ts` découpés avec helpers partagés |
| Normalisation | Regex et conversions dispersées | Modules dédiés (`normalize/`) testés individuellement |
| Extension content-script | Heuristiques dupliquées, import statique | Content-script fin, import dynamique résilient via `lib/detector-loader` |
| Popup | Fichier unique ~250 lignes | Modules spécialisés (`dom`, `render`, `status`, `state`, `actions`) |
| Tests | Couverture limitée au détecteur global | Tests unitaires sur helpers (`normalize/*.test.ts`, `result-mapper.test.ts`, `detector-loader.test.ts`) |

## Migration interne

- Importer les contrats depuis `@freelancefinder/types` (`JobOffer`, `OfferDetectionOutcome`) au lieu de définir des variantes locales.
- Pour charger le détecteur côté navigateur, utiliser `loadDetector()` de `@freelancefinder/extension-demo/src/lib/detector-loader` et gérer l'éventuel rejet (déjà encapsulé dans le content-script).
- Pour ajouter une nouvelle heuristique FreeWork, contribuer aux modules partagés (`normalize/`, `parsing/`) puis consommer via `detail.ts` ou `list.ts`.
- Construire l'extension avec `pnpm --filter @freelancefinder/extension-demo build` (copie automatique de `dist/*.js` vers la racine du package).
