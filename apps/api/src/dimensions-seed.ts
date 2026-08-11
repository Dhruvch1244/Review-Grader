import type { DimensionDef } from "./types";

// The 4 fixed dimensions individual Q&A is graded against. Weights are
// editable by an Admin from the Dimensions page (must sum to 100) - these
// are just the seeded defaults for a fresh install.
export const DEFAULT_DIMENSIONS: Omit<DimensionDef, "id">[] = [
  { key: "code_ownership", label: "Code Ownership", weightPercent: 25, order: 1 },
  { key: "conceptual_depth", label: "Conceptual Depth", weightPercent: 25, order: 2 },
  { key: "problem_solving", label: "Problem Solving", weightPercent: 25, order: 3 },
  { key: "copilot_literacy", label: "Copilot Literacy", weightPercent: 25, order: 4 },
];
