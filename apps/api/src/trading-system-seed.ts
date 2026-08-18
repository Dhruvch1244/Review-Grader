import type { ReviewDef, ReviewSectionDef } from "./types";

// The 4 reviews map onto the Trading System capstone's checkpoints. Every
// review totals 100 marks, split identically across all 4:
//   - Technical, team-based:    50 marks - the review's own topics (varies
//     per review, e.g. R1 is Database Design/Data Ingestion/Java/Testing/
//     Analytics; R2 is Spring Boot/MyBatis/Kafka Producer/JUnits), always
//     summing to 50 regardless of composition.
//   - Technical, individual:    20 marks - Component Knowledge (10) +
//     Project Knowledge (10), common to every review.
//   - Non-technical, team:      20 marks - Team Collaboration and
//     Ownership (10) + Project Documentation and AI Tool Usage (10),
//     common to every review.
//   - Non-technical, individual: 10 marks - Presentation (10), common to
//     every review.
// 'team' scope sections get one shared score for the whole team; 'individual'
// scope sections (Component Knowledge, Project Knowledge, Presentation) are
// scored separately per student, matching the sheet's "Individual" column
// headers. Admins can edit labels/marks, or add/remove sections entirely,
// from the Reviews admin page.
export const REVIEWS: ReviewDef[] = [
  { id: "r1", number: 1, label: "Data Layer & Analytics", sprintRange: "Review 1" },
  { id: "r2", number: 2, label: "Spring Boot Setup", sprintRange: "Review 2" },
  { id: "r3", number: 3, label: "Middle Tier & UI", sprintRange: "Review 3" },
  { id: "r4", number: 4, label: "Integration & Extra Features", sprintRange: "Review 4" },
];

export const REVIEW_SECTIONS: ReviewSectionDef[] = [
  // Review 1 - Data Layer & Analytics - Technical, team-based (50)
  { id: "r1-t1", reviewId: "r1", key: "db_design", label: "Database Design and Modeling (SQL Related)", category: "technical", scope: "team", maxMarks: 10, order: 1 },
  { id: "r1-t2", reviewId: "r1", key: "data_ingestion", label: "Data Ingestion & Query Performance", category: "technical", scope: "team", maxMarks: 15, order: 2 },
  { id: "r1-t3", reviewId: "r1", key: "java", label: "Java", category: "technical", scope: "team", maxMarks: 10, order: 3 },
  { id: "r1-t4", reviewId: "r1", key: "testing", label: "Testing", category: "technical", scope: "team", maxMarks: 5, order: 4 },
  { id: "r1-t5", reviewId: "r1", key: "analytics_python", label: "Analytics (Python)", category: "technical", scope: "team", maxMarks: 10, order: 5 },
  // Review 1 - Technical, individual (20)
  { id: "r1-t6", reviewId: "r1", key: "component_knowledge", label: "Component Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 6 },
  { id: "r1-t7", reviewId: "r1", key: "project_knowledge", label: "Project Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 7 },
  // Review 1 - Non-Technical (30)
  { id: "r1-n1", reviewId: "r1", key: "team_collaboration", label: "Team Collaboration and Ownership", category: "non_technical", scope: "team", maxMarks: 10, order: 8 },
  { id: "r1-n2", reviewId: "r1", key: "documentation_ai", label: "Project Documentation and AI Tool Usage", category: "non_technical", scope: "team", maxMarks: 10, order: 9 },
  { id: "r1-n3", reviewId: "r1", key: "presentation", label: "Presentation", category: "non_technical", scope: "individual", maxMarks: 10, order: 10 },

  // Review 2 - Spring Boot Setup - Technical, team-based (50)
  { id: "r2-t1", reviewId: "r2", key: "spring_boot_service", label: "Spring Boot Service", category: "technical", scope: "team", maxMarks: 25, order: 1 },
  { id: "r2-t2", reviewId: "r2", key: "mybatis_integration", label: "MyBatis Integration", category: "technical", scope: "team", maxMarks: 10, order: 2 },
  { id: "r2-t3", reviewId: "r2", key: "kafka_producer", label: "Producer Kafka Integration", category: "technical", scope: "team", maxMarks: 10, order: 3 },
  { id: "r2-t4", reviewId: "r2", key: "junits", label: "JUnits", category: "technical", scope: "team", maxMarks: 5, order: 4 },
  // Review 2 - Technical, individual (20)
  { id: "r2-t5", reviewId: "r2", key: "component_knowledge", label: "Component Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 5 },
  { id: "r2-t6", reviewId: "r2", key: "project_knowledge", label: "Project Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 6 },
  // Review 2 - Non-Technical (30)
  { id: "r2-n1", reviewId: "r2", key: "team_collaboration", label: "Team Collaboration and Ownership", category: "non_technical", scope: "team", maxMarks: 10, order: 7 },
  { id: "r2-n2", reviewId: "r2", key: "documentation_ai", label: "Project Documentation and AI Tool Usage", category: "non_technical", scope: "team", maxMarks: 10, order: 8 },
  { id: "r2-n3", reviewId: "r2", key: "presentation", label: "Presentation", category: "non_technical", scope: "individual", maxMarks: 10, order: 9 },

  // Review 3 - Middle Tier & UI - Technical, team-based (50)
  { id: "r3-t1", reviewId: "r3", key: "auth_jwt", label: "Authentication & JWT", category: "technical", scope: "team", maxMarks: 10, order: 1 },
  { id: "r3-t2", reviewId: "r3", key: "kafka_backbone", label: "Kafka Event Backbone", category: "technical", scope: "team", maxMarks: 15, order: 2 },
  { id: "r3-t3", reviewId: "r3", key: "ui_development", label: "UI Development", category: "technical", scope: "team", maxMarks: 15, order: 3 },
  { id: "r3-t4", reviewId: "r3", key: "e2e_testing", label: "Playwright & E2E Testing", category: "technical", scope: "team", maxMarks: 10, order: 4 },
  // Review 3 - Technical, individual (20)
  { id: "r3-t5", reviewId: "r3", key: "component_knowledge", label: "Component Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 5 },
  { id: "r3-t6", reviewId: "r3", key: "project_knowledge", label: "Project Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 6 },
  // Review 3 - Non-Technical (30)
  { id: "r3-n1", reviewId: "r3", key: "team_collaboration", label: "Team Collaboration and Ownership", category: "non_technical", scope: "team", maxMarks: 10, order: 7 },
  { id: "r3-n2", reviewId: "r3", key: "documentation_ai", label: "Project Documentation and AI Tool Usage", category: "non_technical", scope: "team", maxMarks: 10, order: 8 },
  { id: "r3-n3", reviewId: "r3", key: "presentation", label: "Presentation", category: "non_technical", scope: "individual", maxMarks: 10, order: 9 },

  // Review 4 - Integration and Extra Features - Technical, team-based (50): 1 Improvements item + 6 features
  { id: "r4-t1", reviewId: "r4", key: "past_improvements", label: "Past Improvements", category: "technical", scope: "team", maxMarks: 5, order: 1 },
  { id: "r4-t2", reviewId: "r4", key: "portfolio_pnl", label: "Portfolio P&L", category: "technical", scope: "team", maxMarks: 7.5, order: 2 },
  { id: "r4-t3", reviewId: "r4", key: "trade_advice_signal", label: "Trade Advice and Signal", category: "technical", scope: "team", maxMarks: 7.5, order: 3 },
  { id: "r4-t4", reviewId: "r4", key: "watchlist_alerts", label: "Watchlist & Price Alert", category: "technical", scope: "team", maxMarks: 7.5, order: 4 },
  { id: "r4-t5", reviewId: "r4", key: "customer_notification", label: "Customer Notification", category: "technical", scope: "team", maxMarks: 7.5, order: 5 },
  { id: "r4-t6", reviewId: "r4", key: "customer_preference", label: "Customer Preference", category: "technical", scope: "team", maxMarks: 7.5, order: 6 },
  { id: "r4-t7", reviewId: "r4", key: "automated_strategy", label: "Automated Strategy and Execution", category: "technical", scope: "team", maxMarks: 7.5, order: 7 },
  // Review 4 - Technical, individual (20)
  { id: "r4-t8", reviewId: "r4", key: "component_knowledge", label: "Component Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 8 },
  { id: "r4-t9", reviewId: "r4", key: "project_knowledge", label: "Project Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 9 },
  // Review 4 - Non-Technical (30)
  { id: "r4-n1", reviewId: "r4", key: "team_collaboration", label: "Team Collaboration and Ownership", category: "non_technical", scope: "team", maxMarks: 10, order: 10 },
  { id: "r4-n2", reviewId: "r4", key: "documentation_ai", label: "Project Documentation and AI Tool Usage", category: "non_technical", scope: "team", maxMarks: 10, order: 11 },
  { id: "r4-n3", reviewId: "r4", key: "presentation", label: "Presentation", category: "non_technical", scope: "individual", maxMarks: 10, order: 12 },
];
