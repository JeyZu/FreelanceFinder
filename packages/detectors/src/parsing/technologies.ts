const TECHNOLOGY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Node.js", pattern: /node\.?js/i },
  { label: "React", pattern: /react/i },
  { label: "TypeScript", pattern: /typescript|ts\b/i },
  { label: "JavaScript", pattern: /javascript/i },
  { label: "AWS", pattern: /\baws\b/i },
  { label: "Azure", pattern: /azure/i },
  { label: "GCP", pattern: /\bgoogle cloud|\bgcp\b/i },
  { label: "Kubernetes", pattern: /kubernetes|k8s/i },
  { label: "Docker", pattern: /docker/i },
  { label: "Terraform", pattern: /terraform/i },
  { label: "Java", pattern: /\bjava\b/i },
  { label: "Spring", pattern: /spring\b/i },
  { label: "Python", pattern: /python/i },
  { label: "Django", pattern: /django/i },
  { label: "Flask", pattern: /flask/i },
  { label: "PHP", pattern: /\bphp\b/i },
  { label: "Symfony", pattern: /symfony/i },
  { label: "Laravel", pattern: /laravel/i },
  { label: "Go", pattern: /\bgo\b|golang/i },
  { label: "Rust", pattern: /rust/i },
  { label: "C#", pattern: /c#/i },
  { label: "C++", pattern: /c\+\+/i },
  { label: "Ruby", pattern: /ruby/i },
  { label: "Rails", pattern: /rails/i },
  { label: "Scala", pattern: /scala/i },
  { label: "Swift", pattern: /swift/i },
  { label: "Kotlin", pattern: /kotlin/i },
  { label: "Android", pattern: /android/i },
  { label: "iOS", pattern: /\bios\b/i },
  { label: "Angular", pattern: /angular/i },
  { label: "Vue", pattern: /vue\.js|vuejs|\bvue\b/i },
  { label: "Svelte", pattern: /svelte/i },
  { label: "GraphQL", pattern: /graphql/i },
  { label: "PostgreSQL", pattern: /postgresql|postgres/i },
  { label: "MySQL", pattern: /mysql/i },
  { label: "MongoDB", pattern: /mongodb/i },
  { label: "Redis", pattern: /redis/i },
  { label: "Kafka", pattern: /kafka/i },
  { label: "Spark", pattern: /spark/i },
  { label: "Hadoop", pattern: /hadoop/i },
  { label: "Elasticsearch", pattern: /elasticsearch|elastic/i },
];

export function detectTechnologiesFromTexts(texts: string[], stack: Set<string>): void {
  for (const text of texts) {
    if (!text) continue;
    for (const tech of TECHNOLOGY_PATTERNS) {
      if (tech.pattern.test(text)) {
        stack.add(tech.label);
      }
    }
  }
}
