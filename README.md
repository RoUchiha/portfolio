# Roshaan Singh — Portfolio

Personal portfolio site for Roshaan Singh, an applied AI problem solver and
product-minded software engineer. The site focuses on using AI to solve operational
problems, automate BAU work, ship usable internal and external applications, improve
and review code, and validate systems for quality and security.

**Live:** https://portfolio-rouchihas-projects.vercel.app

## Stack

Static site — plain HTML, CSS, and vanilla JS, plus Vercel serverless functions for
the daily AI digest.

- `index.html` — page markup and content
- `styles.css` — styling
- `script.js` — scroll-reveal and animated signal-network canvas background
- `api/` — digest API and generation pipeline
- `assets/` — hero image and digest client
- `Roshaan_Singh_Resume_2026.pdf` — downloadable resume

## Develop locally

Run the Vercel-compatible local preview:

```bash
npm install
npm run local-preview
```

## Deploy

Hosted on Vercel. Pushing to `main` triggers a production deploy.

## Featured projects

The projects section leads with recent applied-AI and product work: Hallucination
Guard, Gate Guide, SilverStay CareHub, MotoBox, AuditLens, and Twist.e. It also
showcases production-shaped LLM infrastructure including Agent Orchestration,
Text-to-SQL Guardrails, LLM Cost Router, RAG with Citations, Semantic Cache, and
Multi-Agent Critique. Most ship with live demos. See the
[AI/ML portfolio monorepo](https://github.com/RoUchiha/ai-ml-portfolio).
