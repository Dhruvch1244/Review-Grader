import type { ReviewDef, CriterionDef } from "./types";

// Reviews map onto the Enterprise Trading Platform capstone's sprint table.
// Each review's criteria are drafted from that sprint range's
// "What the team builds" (Build) and "Security & OWASP" (Security) columns.
export const REVIEWS: ReviewDef[] = [
  { id: "r1", number: 1, label: "Data Layer", sprintRange: "Sprints 3-4" },
  { id: "r2", number: 2, label: "Core Services & Integration", sprintRange: "Sprints 5-7" },
  { id: "r3", number: 3, label: "Security & Full-Stack UI", sprintRange: "Sprints 8-9" },
  { id: "r4", number: 4, label: "Capstone Extension & Deployment", sprintRange: "Sprints 10-11" },
];

export const CRITERIA: CriterionDef[] = [
  // Review 1 - Sprint 3: Trade Database (PostgreSQL)
  { id: "r1-b1", reviewId: "r1", category: "Build", order: 1, text: "Trade schema (trades, accounts, positions, instruments) is normalised with appropriate constraints and indexes" },
  { id: "r1-b2", reviewId: "r1", category: "Build", order: 2, text: "Historical trade tables exist, supporting the platform's transactional source of truth" },
  { id: "r1-s1", reviewId: "r1", category: "Security", order: 3, text: "Parameterised queries / prepared statements used throughout (OWASP A03: Injection)" },
  { id: "r1-s2", reviewId: "r1", category: "Security", order: 4, text: "Least-privilege DB roles configured; no secrets committed in connection config" },
  // Review 1 - Sprint 4: Analytics & Data Access (Python)
  { id: "r1-b3", reviewId: "r1", category: "Build", order: 5, text: "Python dashboard (pandas + matplotlib/plotly) correctly accesses data via APIs / a data-source connection" },
  { id: "r1-b4", reviewId: "r1", category: "Build", order: 6, text: "Clear separation shown between operational (Postgres) and analytical (Snowflake) data stores" },
  { id: "r1-s3", reviewId: "r1", category: "Security", order: 7, text: "Validation & data-quality checks present in the pipeline (OWASP A08: Data Integrity)" },
  { id: "r1-s4", reviewId: "r1", category: "Security", order: 8, text: "Sensitive financial data handled safely; pytest guards against bad data" },

  // Review 2 - Sprint 5: Core Business Logic (Java)
  { id: "r2-b1", reviewId: "r2", category: "Build", order: 1, text: "Trading engine logic (order validation, trade calculations) is clean, SOLID, and unit-tested" },
  { id: "r2-b2", reviewId: "r2", category: "Build", order: 2, text: "Domain model is UML-designed and standalone (no DB/API coupling yet)" },
  { id: "r2-s1", reviewId: "r2", category: "Security", order: 3, text: "Input validation lives in the domain model; defensive coding minimises the vulnerability surface" },
  // Review 2 - Sprint 6: Trade REST API (Spring Boot)
  { id: "r2-b3", reviewId: "r2", category: "Build", order: 4, text: "Sprint 5 logic is wrapped in a layered Spring Boot service with persistence (e.g. MyBatis) to Postgres" },
  { id: "r2-b4", reviewId: "r2", category: "Build", order: 5, text: "REST API matches an OpenAPI 3 spec (e.g. POST /trades, GET /trades, GET /positions); service is Dockerised" },
  { id: "r2-s2", reviewId: "r2", category: "Security", order: 6, text: "Bean validation on DTOs; safe error handling with no stack-trace leakage (OWASP A05)" },
  { id: "r2-s3", reviewId: "r2", category: "Security", order: 7, text: "JWT validation is correctly stubbed/wired ahead of the auth service landing (OWASP A01: Broken Access Control)" },
  // Review 2 - Sprint 7: Events & Pipeline (Kafka/Python)
  { id: "r2-b5", reviewId: "r2", category: "Build", order: 8, text: "Kafka topics/producers/consumers correctly move trade events between services" },
  { id: "r2-b6", reviewId: "r2", category: "Build", order: 9, text: "Batch loading of trade data into Snowflake works, with data-quality checks" },
  { id: "r2-s4", reviewId: "r2", category: "Security", order: 10, text: "CI includes SAST, dependency scanning, secret detection, and quality gates (OWASP A06 & A08)" },

  // Review 3 - Sprint 8: Auth Service (NestJS/JWT)
  { id: "r3-b1", reviewId: "r3", category: "Build", order: 1, text: "Centralised NestJS auth service exposes login/register/refresh REST API to an OpenAPI 3 spec" },
  { id: "r3-s1", reviewId: "r3", category: "Security", order: 2, text: "Credentials are hashed (bcrypt/argon2) in Postgres; JWTs are issued and validated correctly" },
  { id: "r3-s2", reviewId: "r3", category: "Security", order: 3, text: "Service defends against token leakage, replay, and timing attacks (OWASP A07 & A01)" },
  { id: "r3-b2", reviewId: "r3", category: "Build", order: 4, text: "At least one Spring Boot route is protected end-to-end by real tokens (not stubs)" },
  // Review 3 - Sprint 9: Angular UI
  { id: "r3-b3", reviewId: "r3", category: "Build", order: 5, text: "Angular frontend implements authenticated login flow end-to-end plus core views (positions, trades, pricing)" },
  { id: "r3-b4", reviewId: "r3", category: "Build", order: 6, text: "Frontend consumes Trade & Auth REST APIs via OpenAPI-generated typed clients" },
  { id: "r3-s3", reviewId: "r3", category: "Security", order: 7, text: "JWT interceptors attach bearer tokens; route guards protect authenticated routes" },
  { id: "r3-s4", reviewId: "r3", category: "Security", order: 8, text: "Output encoding prevents XSS (OWASP A03); unit + Playwright e2e tests exist" },

  // Review 4 - Sprint 10: Extension Microservice (team's choice)
  { id: "r4-b1", reviewId: "r4", category: "Build", order: 1, text: "Chosen extension (Portfolio/P&L, Trade Advice, Automated Trading, or Notifications) is a real service consuming Kafka events and/or the Trade REST API, integrated end-to-end" },
  { id: "r4-b2", reviewId: "r4", category: "Build", order: 2, text: "Extension demonstrates genuine additional capability beyond the core platform (not just a stub)" },
  { id: "r4-s1", reviewId: "r4", category: "Security", order: 3, text: "Authorisation, input validation, and secure inter-service calls are applied to the new service" },
  { id: "r4-s2", reviewId: "r4", category: "Security", order: 4, text: "A dedicated security review was performed on the extension and issues were addressed" },
  // Review 4 - Sprint 11: Cloud Deployment (AWS)
  { id: "r4-b3", reviewId: "r4", category: "Build", order: 5, text: "Angular build deployed to AWS (S3 + CloudFront) with a working build -> upload -> invalidate pipeline" },
  { id: "r4-s3", reviewId: "r4", category: "Security", order: 6, text: "S3 bucket is private, reachable only via CloudFront with origin access control; IAM least privilege applied" },
  { id: "r4-s4", reviewId: "r4", category: "Security", order: 7, text: "TLS/HTTPS enforced end-to-end; secrets are managed, not hardcoded (OWASP A05)" },
  { id: "r4-b4", reviewId: "r4", category: "Build", order: 8, text: "Platform is genuinely live and demoable end-to-end from the deployed URL" },
];
