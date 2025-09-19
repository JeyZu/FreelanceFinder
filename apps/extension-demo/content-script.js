(() => {
  const STACK_KEYWORDS = [
    'javascript',
    'typescript',
    'react',
    'vue',
    'angular',
    'node',
    'java',
    'python',
    'aws',
    'azure',
    'gcp',
    'docker',
    'kubernetes',
    'terraform',
    'sql',
    'devops',
    'php',
    'symfony',
    'laravel',
    'go',
    'rust',
    'scala'
  ];

  const CONTRACT_LABELS = {
    freelance: 'Freelance',
    contractor: 'Freelance',
    cdd: 'CDD',
    cdi: 'CDI',
    permanent: 'CDI',
    full_time: 'Temps plein',
    part_time: 'Temps partiel'
  };

  function isFreeWorkHost(url) {
    try {
      const { hostname } = new URL(url);
      return hostname.endsWith('free-work.com');
    } catch (error) {
      return false;
    }
  }

  function parseJsonLdScripts() {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const nodes = [];

    scripts.forEach((script) => {
      if (!script.textContent) {
        return;
      }

      try {
        const parsed = JSON.parse(script.textContent.trim());
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => nodes.push(item));
        } else {
          nodes.push(parsed);
        }
      } catch (error) {
        // Ignore malformed JSON-LD blocks
      }
    });

    const flattened = [];

    nodes.forEach((node) => {
      if (!node) {
        return;
      }

      if (node['@graph'] && Array.isArray(node['@graph'])) {
        node['@graph'].forEach((child) => flattened.push(child));
      } else {
        flattened.push(node);
      }
    });

    const jobPostings = [];
    const itemLists = [];

    flattened.forEach((item) => {
      const typeValue = item['@type'];
      const types = Array.isArray(typeValue) ? typeValue.map(String) : [String(typeValue || '')];
      const normalized = types.map((type) => type.toLowerCase());

      if (normalized.includes('jobposting')) {
        jobPostings.push(item);
      }

      if (normalized.includes('itemlist')) {
        itemLists.push(item);
      }
    });

    return { jobPostings, itemLists };
  }

  function extractText(value) {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (value && typeof value === 'object' && typeof value.name === 'string') {
      return value.name.trim();
    }

    return '';
  }

  function formatRate(baseSalary) {
    if (!baseSalary) {
      return '';
    }

    const value = baseSalary.value || baseSalary;

    if (!value) {
      return '';
    }

    let amount = '';
    let currency = '';
    let period = '';

  if (typeof value === 'object') {
    if (value.minValue && value.maxValue) {
      amount = `${value.minValue} – ${value.maxValue}`;
    } else if (value.value) {
      amount = String(value.value);
    }

    if (value.currency) {
      currency = value.currency.toUpperCase();
    }

    if (value.unitText) {
      period = value.unitText;
    }
  } else if (typeof value === 'number') {
    amount = value.toString();
  } else if (typeof value === 'string') {
    amount = value.trim();
  }

  if (!amount) {
    return '';
  }

    const currencySymbol = currency === 'EUR' ? '€' : currency;
    const unit = period ? mapUnitText(period) : '';

    return `${amount} ${currencySymbol}${unit ? ` / ${unit}` : ''}`.trim();
  }

  function mapUnitText(unitText) {
    const normalized = String(unitText || '').toLowerCase();

    if (normalized.includes('hour')) {
      return 'heure';
    }

    if (normalized.includes('day')) {
      return 'jour';
    }

    if (normalized.includes('month')) {
      return 'mois';
    }

    if (normalized.includes('year')) {
      return 'an';
    }

    return normalized;
  }

  function deriveLocation(job) {
    const locations = [];
    const jobLocationType = String(job.jobLocationType || '').toLowerCase();

    if (jobLocationType.includes('remote') || jobLocationType.includes('telecommute')) {
      locations.push('Remote');
    }

    const jobLocations = Array.isArray(job.jobLocation) ? job.jobLocation : job.jobLocation ? [job.jobLocation] : [];

    jobLocations.forEach((place) => {
      if (!place) {
        return;
      }

      const address = place.address || {};
      const locality = extractText(address.addressLocality);
      const region = extractText(address.addressRegion);
      const country = extractText(address.addressCountry);
      const composed = [locality, region || country].filter(Boolean).join(', ');

      if (composed) {
        locations.push(composed);
      }
    });

    if (locations.length === 0 && typeof job.jobLocation === 'string') {
      locations.push(job.jobLocation);
    }

    if (locations.length === 0) {
      return '';
    }

    const unique = Array.from(new Set(locations));
    return unique.join(' · ');
  }

  function deriveContract(job) {
    const raw = Array.isArray(job.employmentType) ? job.employmentType : job.employmentType ? [job.employmentType] : [];

    if (raw.length === 0 && job.contractType) {
      raw.push(job.contractType);
    }

    const mapped = raw
      .map((value) => String(value).toLowerCase())
      .map((value) => CONTRACT_LABELS[value] || value.replace(/_/g, ' '))
      .filter(Boolean);

    return Array.from(new Set(mapped)).join(' · ');
  }

  function extractStack(job) {
    const collected = [];
    const containers = [];

    if (Array.isArray(job.skills)) {
      containers.push(...job.skills);
    }

    if (Array.isArray(job.requiredSkills)) {
      containers.push(...job.requiredSkills);
    }

    if (typeof job.skills === 'string') {
      containers.push(job.skills);
    }

    if (typeof job.requiredSkills === 'string') {
      containers.push(job.requiredSkills);
    }

    if (typeof job.description === 'string') {
      containers.push(job.description);
    }

    if (typeof job.keywords === 'string') {
      containers.push(job.keywords);
    }

    const normalizedKeywords = STACK_KEYWORDS.map((keyword) => keyword.toLowerCase());

    containers.forEach((container) => {
      const text = String(container || '').toLowerCase();
      normalizedKeywords.forEach((keyword, index) => {
        if (text.includes(keyword)) {
          const label = STACK_KEYWORDS[index];
          collected.push(label);
        }
      });
    });

    const unique = Array.from(new Set(collected));
    return unique.slice(0, 6);
  }

  function summarizeJob(job) {
    const title = extractText(job.title || job.name);
    const location = deriveLocation(job);
    const contract = deriveContract(job);
    const rate = formatRate(job.baseSalary || job.estimatedSalary);
    const stack = extractStack(job);

    const items = [];

    if (title) {
      items.push({ label: 'Titre', value: title });
    }

    if (location) {
      items.push({ label: 'Lieu / Remote', value: location });
    }

    if (contract) {
      items.push({ label: 'Contrat', value: contract });
    }

    if (rate) {
      items.push({ label: 'Taux', value: rate });
    }

    if (stack.length > 0) {
      items.push({ label: 'Stack', value: stack.join(' · ') });
    }

    return { items, title, location, contract, rate, stack };
  }

  function summarizeList(list) {
    const elements = Array.isArray(list.itemListElement) ? list.itemListElement : [];
    const offers = [];

    elements.forEach((item) => {
      if (!item) {
        return;
      }

      const offer = item.item || item;
      const summary = summarizeJob(offer);
      if (summary.items.length === 0 && offer.name) {
        summary.items.push({ label: 'Titre', value: extractText(offer.name) });
      }
      offers.push({ summary, offer });
    });

    return offers;
  }

  function detectFromDom(evidence) {
    const cards = Array.from(document.querySelectorAll('[data-testid*="job" i], article[class*="job" i], li[class*="job" i]'));

    if (cards.length > 2) {
      const offers = cards.slice(0, 12).map((card) => {
        const titleElement = card.querySelector('h2, h3, a');
        const locationElement = card.querySelector('[class*="location" i], [data-testid*="location" i]');
        const contractElement = card.querySelector('[class*="contrat" i], [class*="contract" i]');
        const rateElement = card.querySelector('[class*="tarif" i], [class*="rate" i], [class*="salaire" i]');
        const stackElements = Array.from(card.querySelectorAll('li, span, a'))
          .map((element) => element.textContent || '')
          .filter((text) => text && text.length <= 40);

        const summary = {
          items: [],
          title: titleElement && titleElement.textContent ? titleElement.textContent.trim() : '',
          location: locationElement && locationElement.textContent ? locationElement.textContent.trim() : '',
          contract: contractElement && contractElement.textContent ? contractElement.textContent.trim() : '',
          rate: rateElement && rateElement.textContent ? rateElement.textContent.trim() : '',
          stack: []
        };

        if (summary.title) {
          summary.items.push({ label: 'Titre', value: summary.title });
        }

        if (summary.location) {
          summary.items.push({ label: 'Lieu / Remote', value: summary.location });
        }

        if (summary.contract) {
          summary.items.push({ label: 'Contrat', value: summary.contract });
        }

        if (summary.rate) {
          summary.items.push({ label: 'Taux', value: summary.rate });
        }

        const normalizedStack = [];
        stackElements.forEach((text) => {
          const trimmed = text.trim().toLowerCase();
          STACK_KEYWORDS.forEach((keyword) => {
            if (trimmed.includes(keyword) && !normalizedStack.includes(keyword)) {
              normalizedStack.push(keyword);
            }
          });
        });

        if (normalizedStack.length > 0) {
          summary.stack = normalizedStack;
          summary.items.push({ label: 'Stack', value: normalizedStack.join(' · ') });
        }

        return {
          summary,
          offer: {
            title: summary.title,
            location: summary.location,
            contract: summary.contract,
            rate: summary.rate,
            stack: summary.stack
          }
        };
      });

      evidence.push(`Lecture directe des cartes listées (${offers.length} indices).`);
      return { kind: 'list', offers };
    }

    const mainTitle = document.querySelector('h1');

    if (mainTitle && mainTitle.textContent) {
      const container = mainTitle.closest('article, main, section') || document.body;
      const locationElement = container.querySelector('[data-testid*="location" i], [class*="location" i]');
      const contractElement = container.querySelector('[data-testid*="contract" i], [class*="contrat" i]');
      const rateElement = container.querySelector('[data-testid*="rate" i], [class*="tarif" i], [class*="salaire" i]');
      const description = container.querySelector('section, div');

      const job = {
        title: mainTitle.textContent.trim(),
        jobLocation: locationElement && locationElement.textContent ? locationElement.textContent.trim() : '',
        employmentType: contractElement && contractElement.textContent ? contractElement.textContent.trim() : '',
        baseSalary: rateElement && rateElement.textContent ? { value: rateElement.textContent.trim() } : undefined,
        description: description && description.textContent ? description.textContent.trim().slice(0, 2400) : ''
      };

      const summary = summarizeJob(job);
      evidence.push('Résumé construit depuis la structure visible (fallback DOM).');
      return { kind: 'detail', offers: [{ summary, offer: job }] };
    }

    return { kind: 'none' };
  }

  function analyzeDocument() {
    const evidence = [];
    const url = window.location.href;

    if (!isFreeWorkHost(url)) {
      evidence.push('Hôte actuel : ' + url);
      return {
        kind: 'out_of_scope',
        evidence
      };
    }

    const { jobPostings, itemLists } = parseJsonLdScripts();

    if (jobPostings.length > 0) {
      const job = jobPostings[0];
      const summary = summarizeJob(job);
      evidence.push('Trouvé JSON-LD JobPosting.');

      const offers = [
        {
          summary,
          offer: job
        }
      ];

      return {
        kind: 'detail',
        offers,
        evidence,
        source: 'json-ld'
      };
    }

    if (itemLists.length > 0) {
      const list = itemLists[0];
      const offers = summarizeList(list);
      const filteredOffers = offers.filter((entry) => entry.summary.items.length > 0);

      if (filteredOffers.length > 0) {
        evidence.push(`Trouvé JSON-LD ItemList avec ${filteredOffers.length} offres.`);
        return {
          kind: 'list',
          offers: filteredOffers,
          evidence,
          source: 'json-ld'
        };
      }
    }

    const fallback = detectFromDom(evidence);

    if (fallback.kind !== 'none') {
      return {
        kind: fallback.kind,
        offers: fallback.offers,
        evidence,
        source: 'dom'
      };
    }

    if (document.readyState !== 'complete') {
      evidence.push('Le document n\'est pas encore complètement chargé.');
      return {
        kind: 'pending',
        reason: 'contenu tardif',
        evidence
      };
    }

    const loadingIndicators = document.querySelector('[data-testid*="skeleton" i], [class*="skeleton" i], [aria-busy="true"]');

    if (loadingIndicators) {
      evidence.push('Présence de composants skeleton ou aria-busy.');
      return {
        kind: 'pending',
        reason: 'contenu tardif',
        evidence
      };
    }

    evidence.push('Structure atypique : aucun schéma JSON-LD ni motif d\'offre identifié.');
    return {
      kind: 'none',
      reason: 'structure atypique',
      evidence
    };
  }

  function buildPayload(result) {
    if (result.kind !== 'detail' && result.kind !== 'list') {
      return result;
    }

    const offers = result.offers.map((entry) => {
      const summary = entry.summary;
      const offer = entry.offer;
      return {
        title: summary.title || extractText(offer.title || offer.name),
        location: summary.location || deriveLocation(offer),
        contract: summary.contract || deriveContract(offer),
        rate: summary.rate || formatRate(offer.baseSalary || offer.estimatedSalary),
        stack: summary.stack && summary.stack.length > 0 ? summary.stack : extractStack(offer)
      };
    });

    const summaryItems = [];

    if (result.kind === 'detail' && offers[0]) {
      const detail = offers[0];
      if (detail.title) {
        summaryItems.push({ label: 'Titre', value: detail.title });
      }
      if (detail.location) {
        summaryItems.push({ label: 'Lieu / Remote', value: detail.location });
      }
      if (detail.contract) {
        summaryItems.push({ label: 'Contrat', value: detail.contract });
      }
      if (detail.rate) {
        summaryItems.push({ label: 'Taux', value: detail.rate });
      }
      if (detail.stack && detail.stack.length > 0) {
        summaryItems.push({ label: 'Stack', value: detail.stack.join(' · ') });
      }
    } else {
      offers.slice(0, 3).forEach((offer, index) => {
        const parts = [offer.title, offer.location, offer.rate].filter(Boolean);
        const label = `${index + 1}.`;
        const value = parts.join(' — ') || 'Offre détectée';
        summaryItems.push({ label, value });
      });
    }

    const rawJson = {
      url: window.location.href,
      detectedAt: new Date().toISOString(),
      pageType: result.kind,
      offers,
      evidence: result.evidence,
      source: result.source || 'dom'
    };

    return {
      kind: result.kind,
      offersCount: offers.length,
      summary: {
        items: summaryItems
      },
      rawJson,
      evidence: result.evidence
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'FREELANCEFINDER_ANALYZE') {
      return;
    }

    try {
      const analysis = analyzeDocument();
      const payload = buildPayload(analysis);
      sendResponse(payload);
    } catch (error) {
      sendResponse({
        kind: 'none',
        reason: 'erreur inattendue',
        evidence: ['Une erreur interne a interrompu la détection.']
      });
    }

    return true;
  });
})();
