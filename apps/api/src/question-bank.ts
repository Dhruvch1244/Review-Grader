// Reviewer-facing question bank: for every rubric criterion (see
// rubric-seed.ts), a few phrasings of a question to put to an individual
// student, plus a short note on what a strong answer covers so the
// reviewer has something concrete to check the answer against.
export interface QuestionBankEntry {
  questions: string[];
  guidance: string;
}

export const QUESTION_BANK: Record<string, QuestionBankEntry> = {
  // Review 1 - Sprint 3: Trade Database
  "r1-b1": {
    questions: [
      "Walk me through your trades/accounts/positions schema - why did you model the relationships the way you did?",
      "Which constraints or indexes did you add to the trade schema, and what would break if they weren't there?",
    ],
    guidance:
      "Good answer names the actual foreign keys/constraints (not just \"we normalised it\"), explains at least one indexing choice tied to a real query pattern, and can point to why a specific constraint prevents bad data.",
  },
  "r1-b2": {
    questions: [
      "How do historical trades get into the history table, and how would you look up a trade's state as of a past date?",
      "Why keep a separate historical trade table instead of just querying the live trades table?",
    ],
    guidance:
      "Should distinguish current vs. historical state clearly and explain the append-only/versioning approach used, not just that \"a history table exists\".",
  },
  "r1-s1": {
    questions: [
      "Show me a query in your code that takes user input - how do you stop someone injecting SQL through it?",
      "What's the difference between a parameterised query and string-concatenating a query, and where did you apply that?",
    ],
    guidance:
      "Should correctly explain why concatenation is unsafe and point to actual prepared-statement/parameter-binding usage in their own code, not a textbook definition alone.",
  },
  "r1-s2": {
    questions: [
      "What database role does your application connect as, and what could it NOT do even if compromised?",
      "Where do your DB credentials live, and how do you know they're not sitting in your repo?",
    ],
    guidance:
      "Expects a specific least-privilege role (not superuser/root) and a real answer about secrets handling (env vars, secret manager, .gitignore) - not \"we didn't commit them, I think\".",
  },
  "r1-b3": {
    questions: [
      "Walk me through how your dashboard actually pulls data - what's the call chain from the chart to the data source?",
      "If the data source were unavailable, what would your dashboard do?",
    ],
    guidance:
      "Should trace the real path (API/connection -> pandas -> plot) rather than a vague \"it connects to the database\", and have thought about the failure case even briefly.",
  },
  "r1-b4": {
    questions: [
      "What's the actual difference in how you use Postgres versus Snowflake in this platform?",
      "Why does an analytics warehouse exist separately from the operational database at all?",
    ],
    guidance:
      "Should articulate OLTP vs OLAP in their own words with a concrete example from their platform, not just repeat the acronym.",
  },
  "r1-s3": {
    questions: [
      "What happens in your pipeline if a row of trade data is missing a required field or has an impossible value?",
      "Show me one data-quality check you actually wrote - what does it catch?",
    ],
    guidance:
      "Wants a specific validation example (range check, null check, type check) and what happens on failure (rejected, logged, quarantined) - not \"we validate the data\" with no detail.",
  },
  "r1-s4": {
    questions: [
      "What does one of your pytest tests actually assert, and what bad data was it written to catch?",
      "Which fields in this data would you consider sensitive, and did that change how you handled them?",
    ],
    guidance:
      "Should name a real test and the specific bad-data scenario it guards against, plus at least basic awareness of which fields are sensitive (account numbers, PII).",
  },

  // Review 2 - Sprint 5: Core Business Logic
  "r2-b1": {
    questions: [
      "Pick one class in your trading engine - which SOLID principle does it follow, and how would you break that if you rewrote it carelessly?",
      "Walk me through a unit test for your trade calculation logic - what edge case does it cover?",
    ],
    guidance:
      "Should name a concrete class/principle pairing (not generic SOLID recitation) and describe a real edge case (zero quantity, negative price, rounding) their tests actually cover.",
  },
  "r2-b2": {
    questions: [
      "Why did you design the domain model standalone, with no DB or API dependency at this stage?",
      "Show me the UML relationship between two of your core domain classes - what does it represent?",
    ],
    guidance:
      "Should explain the benefit of isolating business logic (testability, no infrastructure coupling) and correctly read their own UML diagram, not just describe classes in isolation.",
  },
  "r2-s1": {
    questions: [
      "Where exactly does your domain model reject an invalid order, and what happens to it?",
      "What's an input your trade calculation must never accept, and how is that enforced in code?",
    ],
    guidance:
      "Wants a specific rejection path (exception, validation result) tied to a real invalid input, not a general \"we validate everything\" claim.",
  },
  "r2-b3": {
    questions: [
      "Trace a POST /trades request through your Spring Boot service, layer by layer, down to Postgres.",
      "Why is the service layered the way it is - what would go wrong if the controller talked to MyBatis directly?",
    ],
    guidance:
      "Should correctly name each layer (controller -> service -> mapper/repository -> DB) in order and articulate a real reason for separation, not just recite layer names.",
  },
  "r2-b4": {
    questions: [
      "Show me your OpenAPI spec for one endpoint - what does a 200 response actually look like?",
      "How is this service Dockerised, and what's in the image beyond the jar?",
    ],
    guidance:
      "Should be able to navigate their own spec confidently and describe the Dockerfile's real contents (base image, build steps), not just \"yes it's Dockerised\".",
  },
  "r2-s2": {
    questions: [
      "What happens when a malformed DTO hits your API - what does the caller actually see back?",
      "Show me a validation annotation on one of your DTOs - what does it prevent?",
    ],
    guidance:
      "A strong answer shows a clean 4xx response with no stack trace and names a real Bean Validation annotation (@NotNull, @Size, etc.) tied to a real field.",
  },
  "r2-s3": {
    questions: [
      "Where is JWT validation currently stubbed in your API, and what will change once the real auth service lands?",
      "What happens right now if someone calls a protected endpoint with no token at all?",
    ],
    guidance:
      "Should clearly describe the current stub behaviour versus the intended real behaviour, showing they understand it's temporary and why access control matters here.",
  },
  "r2-b5": {
    questions: [
      "Walk me through what happens from a trade being placed to a Kafka consumer picking it up.",
      "What's in a trade event message, and why did you choose that shape?",
    ],
    guidance:
      "Should trace producer -> topic -> consumer accurately and justify the message schema, not just say \"we publish an event\".",
  },
  "r2-b6": {
    questions: [
      "How does batch data get from source into Snowflake, and what checks run before it lands?",
      "What would happen if a batch load contained a corrupt row - does the whole batch fail or just that row?",
    ],
    guidance:
      "Wants a real answer about failure isolation (row-level vs batch-level) and at least one concrete data-quality check in the batch path.",
  },
  "r2-s4": {
    questions: [
      "What does your CI pipeline actually check before code can merge - name the gates.",
      "Show me a finding your SAST or dependency scan caught (or would catch) - what would you do about it?",
    ],
    guidance:
      "Should name real gates configured in their CI (SAST tool, dependency scan, secret detection, SonarQube quality gate) rather than describing them abstractly.",
  },

  // Review 3 - Sprint 8: Auth Service
  "r3-b1": {
    questions: [
      "Walk me through what happens, step by step, when a user registers through your auth service.",
      "Show me your login endpoint's OpenAPI spec - what's returned on success versus failure?",
    ],
    guidance:
      "Should trace request -> hashing -> persistence -> token issuance accurately, and know the real success/failure response shapes from their own spec.",
  },
  "r3-s1": {
    questions: [
      "Why hash passwords with bcrypt/argon2 instead of storing them plainly or with plain SHA-256?",
      "What's actually inside the JWT your service issues, and why those claims?",
    ],
    guidance:
      "Should explain salting/slow-hashing in their own words (not just \"it's more secure\") and correctly describe their own token's claims and expiry.",
  },
  "r3-s2": {
    questions: [
      "If someone stole a valid JWT, what could they do with it, and for how long?",
      "How does your service avoid leaking timing information about whether a username exists?",
    ],
    guidance:
      "A strong answer discusses token lifetime/refresh strategy and shows awareness of timing/enumeration attacks, even if mitigations are partial - the key is they understand the risk.",
  },
  "r3-b2": {
    questions: [
      "Which Spring Boot route is now protected by a real token end-to-end - show me the request failing without one.",
      "What changed in the Trade API once real JWTs replaced the stub?",
    ],
    guidance:
      "Should be able to demonstrate (or precisely describe) a real 401/403 on a missing/invalid token, not just claim it's protected.",
  },
  "r3-b3": {
    questions: [
      "Walk me through the login flow in the Angular app - what happens to the token after a successful login?",
      "Which view required the most integration work with the backend, and why?",
    ],
    guidance:
      "Should describe token storage and how subsequent requests use it, plus a specific, credible account of one view's integration challenge.",
  },
  "r3-b4": {
    questions: [
      "How does your frontend know the shape of the API responses it's consuming?",
      "What happens in the UI if the Trade API returns an error - show me that path.",
    ],
    guidance:
      "Should reference the OpenAPI-generated client concretely and demonstrate (or describe) real error handling in the UI, not a silent failure.",
  },
  "r3-s3": {
    questions: [
      "How does a request from Angular actually get the bearer token attached - which piece of code does that?",
      "What happens if you navigate directly to a protected route while logged out?",
    ],
    guidance:
      "Should name the interceptor mechanism specifically and demonstrate the route guard actually redirecting/blocking, not just describe it in theory.",
  },
  "r3-s4": {
    questions: [
      "If a trade note contained a `<script>` tag, what would Angular actually render, and why?",
      "Show me one Playwright or unit test - what user behaviour does it verify?",
    ],
    guidance:
      "Should correctly explain Angular's default output encoding (or where they had to be careful with it) and describe a real test's assertion, not just that tests \"exist\".",
  },

  // Review 4 - Sprint 10: Extension Microservice
  "r4-b1": {
    questions: [
      "Walk me through one full request/event through your extension service, start to finish.",
      "Why did your team choose this extension over the other options?",
    ],
    guidance:
      "Should trace a real end-to-end path (Kafka event or API call in, processing, output) and give a genuine rationale for the choice, not a generic \"it seemed useful\".",
  },
  "r4-b2": {
    questions: [
      "What can this extension do that the core platform couldn't do without it?",
      "If you removed this service entirely, what would a user actually lose?",
    ],
    guidance:
      "Wants a concrete capability gap the extension fills, evidence it's more than a pass-through stub.",
  },
  "r4-s1": {
    questions: [
      "What stops one user from viewing another user's data through this new service?",
      "How does this service validate what it receives from Kafka or the Trade API before acting on it?",
    ],
    guidance:
      "Should describe a real authorisation check tied to the user/session and a real input validation step, not just \"we trust the upstream service\".",
  },
  "r4-s2": {
    questions: [
      "What did your security review of this extension actually find, and what did you do about it?",
      "What's the riskiest part of this new service from a security standpoint?",
    ],
    guidance:
      "Should recall a specific finding and remediation (even a small one) rather than saying the review was just a formality.",
  },
  "r4-b3": {
    questions: [
      "Walk me through what happens from `git push` to the new build actually appearing on the live site.",
      "Why S3 + CloudFront instead of just serving straight from S3?",
    ],
    guidance:
      "Should trace the real build -> upload -> invalidate pipeline steps and explain CloudFront's role (CDN, HTTPS, cache) correctly.",
  },
  "r4-s3": {
    questions: [
      "If I typed your S3 bucket's direct URL into a browser, what would happen?",
      "What IAM permissions does your deployment pipeline actually have, and could it do more than it needs to?",
    ],
    guidance:
      "Strong answer confirms the bucket isn't publicly reachable directly (OAC/CloudFront-only) and can describe real IAM scoping, not \"IAM is set up\".",
  },
  "r4-s4": {
    questions: [
      "Where do your AWS/deployment secrets live right now, and who/what can read them?",
      "Is there any path to your site that isn't HTTPS - how do you know?",
    ],
    guidance:
      "Should point to a real secrets mechanism (not hardcoded in a repo or Dockerfile) and a specific answer about HTTPS enforcement (redirect rule, CloudFront viewer policy).",
  },
  "r4-b4": {
    questions: [
      "Open the live URL right now and show me one real feature working end-to-end.",
      "What's still missing between what's deployed and what you'd call \"done\"?",
    ],
    guidance:
      "The platform should actually work when opened live, not just \"work locally\" - and the student should be candid about real gaps rather than claiming completeness.",
  },
};
