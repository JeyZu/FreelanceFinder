import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import {
  detectFreeWorkOffers,
  OfferDetectionItem,
  OfferDetectionOutcome,
} from "./detector";

const detailUrl = "https://www.free-work.com/fr/tech-it/job/developpeur-fullstack-node-react";
const listUrl = "https://www.free-work.com/fr/tech-it/job";

const createDom = (html: string, url: string) =>
  new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url }).window.document;

const averageConfidence = (offers: OfferDetectionItem[]) =>
  offers.reduce((acc, offer) => acc + offer.confidence, 0) / (offers.length || 1);

describe("detectFreeWorkOffers", () => {
  it("returns out_of_scope when url is not a FreeWork page", async () => {
    const doc = createDom(`<h1>External Offer</h1>`, "https://example.com/job/123");

    const result = await detectFreeWorkOffers(doc, {
      url: "https://example.com/job/123",
    });

    expect(result.status).toBe("out_of_scope");
    expect(result.offers).toHaveLength(0);
    expect(result.message).toMatch(/hors périmètre FreeWork/i);
  });

  it("detects a FreeWork detail page with high confidence and rich fields", async () => {
    const html = `
      <main>
        <header>
          <h1>Développeur Fullstack Node.js / React</h1>
          <div class="meta">
            <span class="rate">TJM 600 € / jour</span>
            <span class="contract">Freelance</span>
            <span class="location">Paris 75009</span>
            <span class="remote">3 jours remote</span>
            <span class="start">Démarrage : 01/06/2024</span>
            <span class="duration">Durée : 6 mois renouvelable</span>
            <span class="experience">Expérience : Senior 5 ans</span>
            <span class="posted">Publié il y a 3 jours</span>
          </div>
        </header>
        <section class="company">
          <h2>Société</h2>
          <p>FreeTech Consulting</p>
        </section>
        <section class="tags">
          <span class="tag">Node.js</span>
          <span class="tag">React</span>
          <span class="tag">AWS</span>
          <span class="tag">TypeScript</span>
        </section>
        <article class="description">
          <p>
            Dans le cadre du renforcement de l'équipe digitale, nous recherchons un développeur fullstack pour intervenir sur la
            refonte d'une application e-commerce. Vous participerez aux ateliers techniques, mettrez en place les meilleures
            pratiques DevOps et accompagnerez l'équipe produit.
          </p>
          <p>
            Votre mission consiste à développer des micro-services Node.js, optimiser le front React et contribuer à la migration
            vers AWS.
          </p>
        </article>
      </main>
    `;

    const doc = createDom(html, detailUrl);

    const result = await detectFreeWorkOffers(doc, {
      url: detailUrl,
    });

    expect(result.status).toBe("ok");
    expect(result.pageType).toBe("detail");
    expect(result.offers).toHaveLength(1);

    const offer = result.offers[0];
    expect(offer.source).toBe("FreeWork");
    expect(offer.url).toBe(detailUrl);
    expect(offer.title).toBe("Développeur Fullstack Node.js / React");
    expect(offer.contractType).toBe("Freelance");
    expect(offer.location).toContain("Paris");
    expect(offer.isRemote).toBe(true);
    expect(offer.rate?.value).toBe(600);
    expect(offer.rate?.currency).toBe("EUR");
    expect(offer.rate?.period).toBe("day");
    expect(offer.rate?.raw).toContain("600 € / jour");
    expect(offer.startDate).toContain("01/06/2024");
    expect(offer.duration).toContain("6 mois");
    expect(offer.experienceLevel).toMatch(/Senior/i);
    expect(offer.stack).toEqual(["Node.js", "React", "AWS", "TypeScript"]);
    expect(offer.description?.length ?? 0).toBeGreaterThan(100);
    expect(offer.description?.length ?? 0).toBeLessThanOrEqual(1000);
    expect(offer.postedAt).toMatch(/il y a 3 jours/i);
    expect(offer.evidence.length).toBeGreaterThanOrEqual(3);
    expect(offer.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("detects all visible offers on a FreeWork list page", async () => {
    const html = `
      <section class="offers">
        <article class="offer-card">
          <a href="/fr/tech-it/job/dev-back-nodejs-1">
            <h3>Développeur Back-end Node.js</h3>
            <p class="meta">Lyon • 550 € / jour</p>
          </a>
        </article>
        <article class="offer-card">
          <a href="/fr/tech-it/job/lead-react-2">
            <h3>Lead Front React</h3>
            <p class="meta">Télétravail total • 650 € / jour</p>
          </a>
        </article>
        <article class="offer-card">
          <a href="/fr/tech-it/job/devops-aws-3">
            <h3>Ingénieur DevOps AWS</h3>
            <p class="meta">Nantes</p>
          </a>
        </article>
      </section>
    `;

    const doc = createDom(html, listUrl);

    const result = await detectFreeWorkOffers(doc, {
      url: listUrl,
    });

    expect(result.status).toBe("ok");
    expect(result.pageType).toBe("list");
    expect(result.offers).toHaveLength(3);
    expect(result.message).toMatch(/Liste détectée : 3 offres/);

    const absoluteUrls = result.offers.map((offer) => offer.url);
    for (const href of absoluteUrls) {
      expect(href.startsWith("https://www.free-work.com")).toBe(true);
    }

    const coverage = result.offers.filter((offer) => offer.location || offer.rate);
    expect(coverage.length).toBeGreaterThanOrEqual(2);

    expect(averageConfidence(result.offers)).toBeGreaterThanOrEqual(0.6);
  });

  it("waits briefly for delayed content before concluding", async () => {
    const doc = createDom(`<div id="app"></div>`, detailUrl);

    const delayedHtml = `
      <article class="job-detail">
        <h1>Développeur Cloud</h1>
        <div class="meta">
          <span>Tarif : 700 € / jour</span>
          <span>Remote</span>
        </div>
        <article class="description">
          <p>
            Mission longue durée visant à accompagner la migration d'un système d'information vers le cloud public. Vous
            interviendrez sur la mise en place d'une plateforme sécurisée et automatisée.
          </p>
          <p>
            L'équipe attend un profil autonome capable de définir les bonnes pratiques d'infrastructure as code et de piloter
            l'industrialisation des pipelines CI/CD.
          </p>
        </article>
      </article>
    `;

    setTimeout(() => {
      const container = doc.querySelector("#app");
      if (container) {
        container.innerHTML = delayedHtml;
      }
    }, 30);

    const result = await detectFreeWorkOffers(doc, {
      url: detailUrl,
      maxWaitMs: 120,
      pollIntervalMs: 20,
    });

    expect(result.status).toBe("ok");
    expect(result.offers).toHaveLength(1);
    expect(result.offers[0].title).toContain("Développeur Cloud");
  });

  it("returns no_offers with a clear reason when nothing is detectable", async () => {
    const doc = createDom(`<div class="page">Contenu marketing</div>`, detailUrl);

    const result: OfferDetectionOutcome = await detectFreeWorkOffers(doc, {
      url: detailUrl,
      maxWaitMs: 60,
      pollIntervalMs: 20,
    });

    expect(result.status).toBe("no_offers");
    expect(result.offers).toHaveLength(0);
    expect(result.message).toMatch(/Aucune offre détectable/i);
    expect(result.diagnostics?.reason).toBeDefined();
  });

  it("reports content_delayed when structure is still loading", async () => {
    const doc = createDom(`<div class="placeholder">Chargement…</div>`, detailUrl);

    const result = await detectFreeWorkOffers(doc, {
      url: detailUrl,
      maxWaitMs: 20,
      pollIntervalMs: 10,
    });

    expect(result.status).toBe("content_delayed");
    expect(result.message).toMatch(/contenu tardif/i);
    expect(result.diagnostics?.reason).toBe("contenu tardif");
  });
});
