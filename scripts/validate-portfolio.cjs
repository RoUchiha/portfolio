const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const expectedProjectOrder = [
  'LocalForge',
  'Agentic Systems Lab',
  'Hallucination Guard',
  'NEXUS AI Project Manager',
  'Gate Guide',
  'MotoBox',
  'SilverStay CareHub',
  'Twist.e',
  'NBA God Squad',
  'NFL God Squad',
  'AuditLens',
  'Agent Orchestration',
  'Text-to-SQL Guardrails',
  'RAG with Citations',
  'LLM Cost Router',
  'Multi-Agent Critique',
  'Semantic Cache',
  'LLM Red-Teaming Harness',
  'Prompt Regression Testing',
  'RAG Evaluation Framework',
  'G-Eval Judge',
];

const cardMatches = [...html.matchAll(/<article class="project-card[^"]*"[\s\S]*?<\/article>/g)];
const cards = cardMatches.map((match) => match[0]);
const projectOrder = cards.map((card) => {
  const heading = card.match(/<h3>([^<]+)<\/h3>/);
  if (!heading) throw new Error('Project card missing h3');
  return heading[1];
});

const failures = [];

if (JSON.stringify(projectOrder) !== JSON.stringify(expectedProjectOrder)) {
  failures.push(`Project order mismatch.\nExpected: ${expectedProjectOrder.join(' > ')}\nActual:   ${projectOrder.join(' > ')}`);
}

for (const [index, card] of cards.entries()) {
  const project = projectOrder[index];
  const githubLinks = [...card.matchAll(/href="(https:\/\/github\.com\/RoUchiha\/[^"]+)"/g)];
  if (githubLinks.length !== 1) {
    failures.push(`${project} must have exactly one RoUchiha GitHub link; found ${githubLinks.length}`);
  }
  if (/private-repo|private repository|GitHub Â· private/i.test(card)) {
    failures.push(`${project} contains stale private-repository wording`);
  }
}

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) failures.push(`Duplicate IDs: ${[...new Set(duplicateIds)].join(', ')}`);

const anchors = [...html.matchAll(/<a\b([^>]*)>/g)].map((match) => match[1]);
for (const attributes of anchors) {
  const href = attributes.match(/href="([^"]+)"/)?.[1];
  if (!href) continue;
  if (href.startsWith('#') && !ids.includes(href.slice(1))) {
    failures.push(`Anchor points to missing ID: ${href}`);
  }
  if (/target="_blank"/.test(attributes) && !/rel="[^"]*noreferrer[^"]*"/.test(attributes)) {
    failures.push(`External target missing rel=noreferrer: ${href}`);
  }
  if (!/^(#|https?:|mailto:|tel:)/.test(href)) {
    const localPath = path.resolve(root, href.split('#')[0]);
    if (!fs.existsSync(localPath)) failures.push(`Missing local file: ${href}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}

console.log(`Portfolio contract passed: ${cards.length} ordered project cards, each with one GitHub link.`);
