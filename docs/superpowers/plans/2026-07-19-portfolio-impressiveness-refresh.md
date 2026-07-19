# Portfolio Impressiveness Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LocalForge and Agentic Systems Lab, then reorder the complete project showcase by the approved impressiveness ranking without regressing links, the digest, or production deployment.

**Architecture:** Preserve the current static HTML/CSS/vanilla-JavaScript site and Vercel serverless digest functions. Add one focused Node validation script that treats project order and card-link requirements as a contract, then update only the project markup and supporting README before building and deploying the existing Vercel project.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, Node.js 24, Vercel CLI, Vercel Functions, Git/GitHub CLI

## Global Constraints

- Preserve the static HTML, CSS, vanilla JavaScript, and Vercel serverless-function architecture.
- Preserve the existing hero, profile, approach, experience, digest, toolkit, education, and contact sections.
- Do not modify digest generation, storage, email delivery, or scheduling behavior.
- Every project card must include exactly one public `https://github.com/RoUchiha/...` link.
- Add a Live action only after an unauthenticated request confirms the target is publicly reachable.
- Keep NBA God Squad and NFL God Squad; remove the generic/legacy FB Vehicle Search card from the approved showcase.
- Do not add dependencies, authentication, persistence, new client state, or generated imagery.
- Use `RoUchiha <79603710+RoUchiha@users.noreply.github.com>` for every commit.
- Continue on `agent/update-applied-ai-portfolio` and update the existing draft pull request.

## File Structure

- Create `scripts/validate-portfolio.cjs`: dependency-free structural contract for project order, GitHub links, external-link safety, duplicate IDs, and local assets.
- Modify `package.json`: expose the validator as `npm run test:portfolio`.
- Modify `index.html`: add LocalForge and Agentic Systems Lab, reorder cards, remove FB Vehicle Search, and update project-group copy.
- Modify `README.md`: describe the new impressiveness-first flagship order.
- Do not modify `styles.css`, `script.js`, `assets/js/digest.js`, or `api/**` unless verification finds a real regression.

---

### Task 1: Add a portfolio structure regression gate

**Files:**
- Create: `scripts/validate-portfolio.cjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: repository-root `index.html` and local asset paths referenced by its anchors.
- Produces: `npm run test:portfolio`, exiting `0` only when the approved project order and link contract pass.

- [ ] **Step 1: Add the failing dependency-free validator**

Create `scripts/validate-portfolio.cjs` with this complete content:

```javascript
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
  if (/private-repo|private repository|GitHub · private/i.test(card)) {
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
```

- [ ] **Step 2: Add the package script**

Add this entry inside `package.json` → `scripts`, keeping the existing scripts unchanged:

```json
"test:portfolio": "node scripts/validate-portfolio.cjs"
```

- [ ] **Step 3: Run the validator and confirm the expected failure**

Run:

```powershell
npm.cmd run test:portfolio
```

Expected: exit `1`; the output starts with `Project order mismatch` because LocalForge and Agentic Systems Lab are not yet in `index.html`.

- [ ] **Step 4: Commit the regression gate**

```powershell
git add -- package.json scripts/validate-portfolio.cjs
git commit -m "Add portfolio project contract"
```

Expected: a commit authored by `RoUchiha` containing only the validator and package script.

---

### Task 2: Add the two new flagship cards

**Files:**
- Modify: `index.html:177-300`

**Interfaces:**
- Consumes: the existing `.project-grid`, `.project-card`, `.project-links`, `.tags`, and `.live` CSS contracts.
- Produces: two new cards named exactly `LocalForge` and `Agentic Systems Lab`, which Task 1's validator recognizes.

- [ ] **Step 1: Preflight the LocalForge product-tour URL**

Run an unauthenticated request:

```powershell
$response = Invoke-WebRequest -Uri 'https://localforge-studio.rosingh95.chatgpt.site' -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 30
$response.StatusCode
```

Expected: `200` or a public `3xx` resolved to `200`. If the response is `401`, `403`, or another error, omit the Live anchor from the LocalForge markup below and keep only GitHub.

- [ ] **Step 2: Replace the primary group heading**

Change the first `.project-group-heading` content to:

```html
<div class="project-group-heading" data-reveal>
  <p class="section-kicker">Flagship systems</p>
  <h3>Applied AI products and platforms</h3>
</div>
```

- [ ] **Step 3: Insert the LocalForge featured card first**

Insert this card immediately after the primary group heading. Include the Live anchor only if Step 1 passed publicly.

```html
<article class="project-card featured" data-reveal>
  <div class="project-topline">
    <span>Local model lifecycle</span>
    <div class="project-links">
      <a href="https://localforge-studio.rosingh95.chatgpt.site" target="_blank" rel="noreferrer" aria-label="Open LocalForge live product tour">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 9-14 9V3z" /></svg>
      </a>
      <a href="https://github.com/RoUchiha/localforge" target="_blank" rel="noreferrer" aria-label="Open LocalForge repository on GitHub">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg>
      </a>
    </div>
  </div>
  <h3>LocalForge</h3>
  <p>A local-first model workshop that turns a natural-language goal into a typed training plan, audits private datasets, creates LoRA or QLoRA recipes, runs tracked tuning jobs, enforces evaluation gates, and packages reproducible releases for Ollama, vLLM, GGUF, or adapter deployment.</p>
  <div class="tags"><span class="live">Product tour</span><span>local-first</span><span>LoRA / QLoRA</span><span>evaluation gates</span><span>reproducible releases</span></div>
</article>
```

If the Live anchor is omitted, also remove `<span class="live">Product tour</span>` from the tag list.

- [ ] **Step 4: Insert Agentic Systems Lab second**

Insert this card immediately after LocalForge:

```html
<article class="project-card" data-reveal>
  <div class="project-topline">
    <span>Enterprise agent engineering</span>
    <div class="project-links">
      <a href="https://github.com/RoUchiha/agentic-ai-engineering-lab" target="_blank" rel="noreferrer" aria-label="Open Agentic Systems Lab repository on GitHub">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg>
      </a>
    </div>
  </div>
  <h3>Agentic Systems Lab</h3>
  <p>An inspectable enterprise agent system with three bounded workflows, RAG, executable policy gates, human approvals, golden-case evaluations, a typed Next.js runtime, a FastAPI reference service, and three provisioned Grafana observability projects.</p>
  <div class="tags"><span>bounded agents</span><span>RAG + policy</span><span>human approval</span><span>Grafana SLOs</span><span>TypeScript + Python</span></div>
</article>
```

- [ ] **Step 5: Run the validator and confirm it still fails on ordering**

Run:

```powershell
npm.cmd run test:portfolio
```

Expected: exit `1`; LocalForge and Agentic Systems Lab appear first, but the remaining cards are not yet in the complete approved order.

---

### Task 3: Reorder the existing showcase and remove the legacy card

**Files:**
- Modify: `index.html:177-520`

**Interfaces:**
- Consumes: the two cards added in Task 2 and all existing complete project `<article>` blocks.
- Produces: the exact 21-card order declared in `expectedProjectOrder` inside `scripts/validate-portfolio.cjs`.

- [ ] **Step 1: Arrange the primary showcase cards**

Move existing complete `<article class="project-card...">...</article>` blocks without changing their links or descriptions so the first group has exactly this heading sequence:

```text
LocalForge
Agentic Systems Lab
Hallucination Guard
NEXUS AI Project Manager
Gate Guide
MotoBox
SilverStay CareHub
Twist.e
NBA God Squad
NFL God Squad
AuditLens
```

Move NEXUS AI Project Manager, NBA God Squad, and NFL God Squad out of the lower group. Delete the complete FB Vehicle Search article; it is not part of the approved showcase.

- [ ] **Step 2: Update and arrange the lower group**

Replace the lower group heading with:

```html
<div class="project-group-heading secondary" data-reveal>
  <p class="section-kicker">Engineering depth</p>
  <h3>AI reliability and infrastructure</h3>
</div>
```

Arrange the remaining complete cards in exactly this order:

```text
Agent Orchestration
Text-to-SQL Guardrails
RAG with Citations
LLM Cost Router
Multi-Agent Critique
Semantic Cache
LLM Red-Teaming Harness
Prompt Regression Testing
RAG Evaluation Framework
G-Eval Judge
```

- [ ] **Step 3: Run the structural contract**

Run:

```powershell
npm.cmd run test:portfolio
```

Expected: exit `0` with `Portfolio contract passed: 21 ordered project cards, each with one GitHub link.`

- [ ] **Step 4: Run syntax and diff checks**

Run:

```powershell
node --check script.js
node --check assets/js/digest.js
node --check api/digests/index.js
node --check api/digests/generate.js
git diff --check
```

Expected: every command exits `0` and `git diff --check` prints no errors.

- [ ] **Step 5: Commit the reordered showcase**

```powershell
git add -- index.html
git commit -m "Rank portfolio projects by impressiveness"
```

Expected: the commit contains `index.html` only and is authored by `RoUchiha`.

---

### Task 4: Align repository documentation

**Files:**
- Modify: `README.md:34-43`

**Interfaces:**
- Consumes: the final approved project order from Task 3.
- Produces: repository documentation that accurately describes the live portfolio's leading projects.

- [ ] **Step 1: Replace the Featured projects paragraph**

Use this exact content under `## Featured projects`:

```markdown
Projects are ordered by overall product quality, technical depth, real-world usefulness,
security and validation discipline, and demo value. The showcase leads with LocalForge,
Agentic Systems Lab, Hallucination Guard, NEXUS AI Project Manager, Gate Guide, MotoBox,
SilverStay CareHub, Twist.e, NBA God Squad, NFL God Squad, and AuditLens. Focused AI
reliability and infrastructure projects follow in a separate engineering-depth group.
Every project card links to its public RoUchiha repository, with a separate Live action
when an unauthenticated public demo is available.
```

- [ ] **Step 2: Re-run the portfolio contract and diff check**

```powershell
npm.cmd run test:portfolio
git diff --check
```

Expected: the contract passes with 21 cards and the diff check prints no errors.

- [ ] **Step 3: Commit the documentation update**

```powershell
git add -- README.md
git commit -m "Document flagship portfolio order"
```

Expected: the commit contains `README.md` only.

---

### Task 5: Verify, publish, and validate production

**Files:**
- Verify only: `index.html`, `styles.css`, `script.js`, `assets/js/digest.js`, `api/**`, `.vercel/output/**`
- Modify only if a real verification failure requires a targeted correction.

**Interfaces:**
- Consumes: the completed 21-card static portfolio and existing linked Vercel project.
- Produces: updated draft PR branch and a READY production deployment aliased to `https://portfolio-nine-swart-38.vercel.app`.

- [ ] **Step 1: Verify GitHub URLs exist and are public**

Run:

```powershell
$json = gh repo list RoUchiha --limit 100 --json name,url,isPrivate
$repos = ConvertFrom-Json -InputObject ($json -join "`n")
$required = @('localforge','agentic-ai-engineering-lab','hallucination-guard','nexus-pm','gate-guide','motobox','silverstay-carehub','Twist.e','god-squad-nba','nfl-god-squad','kaggle-5day-ai-agents','agent-orchestration','txt2sql-guardrails','rag-citations','cost-router','multiagent-critique','semantic-cache','llm-red-teaming','prompt-regression','rag-eval-framework','geval-judge')
$missing = $required | Where-Object { $_ -notin $repos.name }
$private = $repos | Where-Object { $_.name -in $required -and $_.isPrivate }
[PSCustomObject]@{Missing=($missing -join ', ');Private=(($private.name) -join ', ')} | Format-List
```

Expected: both `Missing` and `Private` are blank.

- [ ] **Step 2: Verify every displayed live project action**

Verify every displayed non-GitHub project action is publicly reachable:

```powershell
$html = Get-Content -Raw index.html
$cards = [regex]::Matches($html,'<article class="project-card[^"]*"[\s\S]*?</article>')
$liveUrls = @($cards | ForEach-Object { [regex]::Matches($_.Value,'href="(https://[^"]+)"') } | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '^https://github.com/' } | Sort-Object -Unique)
$results = foreach ($url in $liveUrls) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 30
    [PSCustomObject]@{Url=$url;Status=$response.StatusCode}
  } catch {
    [PSCustomObject]@{Url=$url;Status=$_.Exception.Response.StatusCode.value__}
  }
}
$results | Format-Table -AutoSize
$failed = @($results | Where-Object { $_.Status -lt 200 -or $_.Status -ge 400 })
if ($failed.Count) { throw "One or more live project actions are not publicly reachable." }
```

Expected: every URL reports a status from `200` through `399`; the command does not throw.

- [ ] **Step 3: Run local release gates**

```powershell
npm.cmd run test:portfolio
node --check script.js
node --check assets/js/digest.js
node --check api/digests/index.js
node --check api/digests/generate.js
npm.cmd audit --omit=dev
git diff --check
git status -sb
```

Expected: structural and syntax checks pass, the production dependency audit reports zero vulnerabilities, the diff check is clean, and no unintended files are modified.

- [ ] **Step 4: Build production-equivalent output**

```powershell
npx.cmd vercel build --prod --scope rouchihas-projects
```

Expected: JSON includes `"status": "ok"` and `"message": "Build completed successfully."`.

- [ ] **Step 5: Confirm the built artifact contains the new order**

```powershell
npm.cmd run test:portfolio
$built = Get-Content -Raw .vercel/output/static/index.html
$built.IndexOf('<h3>LocalForge</h3>')
$built.IndexOf('<h3>Agentic Systems Lab</h3>')
$built.IndexOf('<h3>Hallucination Guard</h3>')
```

Expected: all three indices are non-negative and increase in the displayed order.

- [ ] **Step 6: Push the implementation commits**

```powershell
git push origin agent/update-applied-ai-portfolio
```

Expected: the remote branch advances and existing draft PR `RoUchiha/portfolio#1` updates.

- [ ] **Step 7: Deploy the exact prebuilt output**

```powershell
npx.cmd vercel deploy --prebuilt --prod --scope rouchihas-projects
```

Expected: deployment state is `READY`, target is `production`, and Vercel aliases the deployment to `https://portfolio-nine-swart-38.vercel.app`.

- [ ] **Step 8: Verify the live homepage and digest**

```powershell
$page = Invoke-WebRequest -Uri 'https://portfolio-nine-swart-38.vercel.app' -UseBasicParsing -TimeoutSec 30
$digest = Invoke-WebRequest -Uri 'https://portfolio-nine-swart-38.vercel.app/api/digests?limit=1' -UseBasicParsing -TimeoutSec 30
$cards = [regex]::Matches($page.Content,'<article class="project-card[^"]*"[\s\S]*?</article>')
$headings = @($cards | ForEach-Object { [regex]::Match($_.Value,'<h3>([^<]+)</h3>').Groups[1].Value })
[PSCustomObject]@{
  HomeStatus=$page.StatusCode
  DigestStatus=$digest.StatusCode
  ProjectCount=$cards.Count
  First=$headings[0]
  Second=$headings[1]
  Third=$headings[2]
  NbaPresent=$headings.Contains('NBA God Squad')
  NflPresent=$headings.Contains('NFL God Squad')
} | Format-List
```

Expected: homepage and digest return `200`; `ProjectCount` is `21`; first three are `LocalForge`, `Agentic Systems Lab`, and `Hallucination Guard`; both God Squad checks are `True`.

- [ ] **Step 9: Confirm source-control handoff**

```powershell
git status -sb
git log -5 --oneline --decorate
gh pr view 1 --json url,isDraft,state,headRefName,baseRefName,mergeStateStatus,commits
```

Expected: the worktree is clean, the branch tracks its remote, PR #1 is open and cleanly mergeable, and its latest commit matches local `HEAD`.
