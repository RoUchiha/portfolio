# Portfolio Impressiveness Refresh Design

Date: 2026-07-19
Status: Approved for implementation planning

## Objective

Refresh the existing portfolio so projects are ordered by overall impressiveness rather than commit date. The first projects should demonstrate the strongest combination of usable product design, technical depth, real-world relevance, security and quality discipline, and a clear reviewer story.

The refresh must preserve the current applied-AI positioning, daily digest, responsive visual system, public GitHub links, and working Vercel deployment.

## Audience and Success Criteria

The primary audience is hiring managers, technical interviewers, engineering leaders, and collaborators evaluating Roshaan's ability to use AI and software to solve meaningful problems.

The update succeeds when:

- LocalForge and Agentic Systems Lab are incorporated as the two leading projects.
- The main project sequence follows the approved impressiveness ranking.
- Each project card clearly communicates the problem, distinguishing capability, and evidence of delivery.
- Every project retains a valid public GitHub link; live links appear only when publicly reachable.
- Narrower AI reliability utilities remain available without overwhelming the product-focused first impression.
- The static homepage, daily digest client, serverless digest API, and responsive layout continue to work.

## Approved Project Order

### Primary showcase

1. LocalForge
2. Agentic Systems Lab
3. Hallucination Guard
4. NEXUS AI Project Manager
5. Gate Guide
6. MotoBox
7. SilverStay CareHub
8. Twist.e
9. NBA God Squad
10. NFL God Squad
11. AuditLens

### AI reliability and infrastructure

1. Agent Orchestration
2. Text-to-SQL Guardrails
3. RAG with Citations
4. LLM Cost Router
5. Multi-Agent Critique
6. Semantic Cache
7. LLM Red-Teaming Harness
8. Prompt Regression Testing
9. RAG Evaluation Framework
10. G-Eval Judge

## Page Design

The existing hero, profile, approach, experience, digest, toolkit, education, and contact sections remain structurally unchanged. The project section is reorganized into two explicit groups.

### Primary showcase group

The group heading will emphasize complete applied-AI products and systems. LocalForge receives the leading featured-card treatment because it combines a guided product experience with a real local engine spanning dataset inspection, typed planning, tuning recipes, evaluation gates, and reproducible packaging.

Agentic Systems Lab follows as the enterprise engineering centerpiece. Its card will emphasize bounded orchestration, RAG, approvals, evaluations, observability, TypeScript and Python implementations, and deterministic workflows.

The remaining product cards follow the approved order. Existing project descriptions may be tightened so each card leads with the operational problem and then names the strongest proof of execution.

### Reliability and infrastructure group

Focused libraries and evaluation tools remain in a separate group below the product showcase. Their order favors systems with the clearest production contract and broadest engineering evidence. This preserves technical depth while preventing smaller utilities from competing with the strongest products in the first viewport of project content.

## Link Behavior

- Every project card includes a visible GitHub action linked to its public RoUchiha repository.
- Publicly reachable demos receive a separate visible Live action.
- A hosted product tour may be linked only after an unauthenticated request confirms it is publicly reachable.
- Projects without a public demo remain GitHub-only; the portfolio must not label simulated or authentication-gated pages as public live demos.
- External links open in a new tab with `rel="noreferrer"` and descriptive accessible labels.

## Content Sources

Project claims will be grounded in the current repository README and verified project configuration.

- LocalForge: `RoUchiha/localforge`
- Agentic Systems Lab: `RoUchiha/agentic-ai-engineering-lab`
- Existing project cards: current portfolio source plus their linked repositories

No private employer data, unsupported production claims, or invented metrics will be added.

## Implementation Boundaries

- Preserve the static HTML, CSS, vanilla JavaScript, and Vercel serverless-function architecture.
- Prefer editing `index.html`, with CSS changes only when the new featured ordering requires a small presentation adjustment.
- Do not introduce a framework migration, new persistence, authentication, or new client state.
- Do not modify digest generation, storage, email delivery, or scheduling behavior.
- Do not add new generated imagery for this content-focused refresh.

## Failure Handling

- If a demo returns an authentication or error response, omit the Live action and retain the GitHub link.
- If a repository URL cannot be verified, do not publish the card until the current RoUchiha repository is resolved.
- If the portfolio build or digest endpoint fails, stop deployment and correct the regression before publication.

## Verification

Before publication:

1. Confirm every project card has exactly one public GitHub repository link.
2. Confirm every displayed Live action returns a public success response or an expected public redirect.
3. Check HTML anchors, duplicate IDs, local asset paths, external-link safety attributes, and JavaScript syntax.
4. Run the Vercel production-equivalent build.
5. Deploy the prebuilt output to the existing `rouchihas-projects/portfolio` production project.
6. Verify the production alias returns HTTP 200, contains LocalForge and Agentic Systems Lab in the first two positions, retains NBA and NFL God Squad, and serves the digest endpoint successfully.

## Source-Control Handoff

Implementation will continue on `agent/update-applied-ai-portfolio`, update the existing draft pull request, and use the RoUchiha commit identity. Production deployment may proceed from the tested branch build; merging the pull request remains the step that makes the source change canonical on `main`.
