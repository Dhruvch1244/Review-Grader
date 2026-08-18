import type { ReviewDef, ReviewSectionDef } from "./types";

// The 4 reviews map onto the Trading System capstone's checkpoints. Section
// marks are exactly as specified by the program's evaluation sheet: Review 1
// splits into Technical (70) + Non-Technical (30) = 100; Reviews 2-4 are a
// single technical pool, each totaling 50. Most sections are 'team' scope
// (one shared score for the whole team); Component Knowledge, Project
// Knowledge, and Presentation are 'individual' scope - scored separately
// per student, matching the sheet's "Individual" column headers. Admins can
// edit labels/marks, or add/remove sections entirely, from the Reviews
// admin page.
export const REVIEWS: ReviewDef[] = [
  { id: "r1", number: 1, label: "Data Layer & Analytics", sprintRange: "Review 1" },
  { id: "r2", number: 2, label: "Spring Boot Setup", sprintRange: "Review 2" },
  { id: "r3", number: 3, label: "Middle Tier & UI", sprintRange: "Review 3" },
  { id: "r4", number: 4, label: "Integration & Extra Features", sprintRange: "Review 4" },
];

export const REVIEW_SECTIONS: ReviewSectionDef[] = [
  // Review 1 - Technical (70)
  { id: "r1-t1", reviewId: "r1", key: "db_design", label: "Database Design and Modeling (SQL Related)", category: "technical", scope: "team", maxMarks: 10, order: 1 },
  { id: "r1-t2", reviewId: "r1", key: "data_ingestion", label: "Data Ingestion & Query Performance", category: "technical", scope: "team", maxMarks: 15, order: 2 },
  { id: "r1-t3", reviewId: "r1", key: "java", label: "Java", category: "technical", scope: "team", maxMarks: 10, order: 3 },
  { id: "r1-t4", reviewId: "r1", key: "testing", label: "Testing", category: "technical", scope: "team", maxMarks: 5, order: 4 },
  { id: "r1-t5", reviewId: "r1", key: "analytics_python", label: "Analytics (Python)", category: "technical", scope: "team", maxMarks: 10, order: 5 },
  { id: "r1-t6", reviewId: "r1", key: "component_knowledge", label: "Component Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 6 },
  { id: "r1-t7", reviewId: "r1", key: "project_knowledge", label: "Project Knowledge", category: "technical", scope: "individual", maxMarks: 10, order: 7 },
  // Review 1 - Non-Technical (30)
  { id: "r1-n1", reviewId: "r1", key: "team_collaboration", label: "Team Collaboration and Ownership", category: "non_technical", scope: "team", maxMarks: 10, order: 8 },
  { id: "r1-n2", reviewId: "r1", key: "documentation_ai", label: "Project Documentation and AI Tool Usage", category: "non_technical", scope: "team", maxMarks: 10, order: 9 },
  { id: "r1-n3", reviewId: "r1", key: "presentation", label: "Presentation", category: "non_technical", scope: "individual", maxMarks: 10, order: 10 },

  // Review 2 - Spring Boot Setup (50)
  { id: "r2-t1", reviewId: "r2", key: "spring_boot_service", label: "Spring Boot Service", category: "technical", scope: "team", maxMarks: 25, order: 1 },
  { id: "r2-t2", reviewId: "r2", key: "mybatis_integration", label: "MyBatis Integration", category: "technical", scope: "team", maxMarks: 10, order: 2 },
  { id: "r2-t3", reviewId: "r2", key: "kafka_producer", label: "Producer Kafka Integration", category: "technical", scope: "team", maxMarks: 10, order: 3 },
  { id: "r2-t4", reviewId: "r2", key: "junits", label: "JUnits", category: "technical", scope: "team", maxMarks: 5, order: 4 },

  // Review 3 - Middle Tier & UI (50)
  { id: "r3-t1", reviewId: "r3", key: "auth_jwt", label: "Authentication & JWT", category: "technical", scope: "team", maxMarks: 10, order: 1 },
  { id: "r3-t2", reviewId: "r3", key: "kafka_backbone", label: "Kafka Event Backbone", category: "technical", scope: "team", maxMarks: 15, order: 2 },
  { id: "r3-t3", reviewId: "r3", key: "ui_development", label: "UI Development", category: "technical", scope: "team", maxMarks: 15, order: 3 },
  { id: "r3-t4", reviewId: "r3", key: "e2e_testing", label: "Playwright & E2E Testing", category: "technical", scope: "team", maxMarks: 10, order: 4 },

  // Review 4 - Integration and Extra Features (50): 1 Improvements item + 6 features
  { id: "r4-t1", reviewId: "r4", key: "past_improvements", label: "Past Improvements", category: "technical", scope: "team", maxMarks: 5, order: 1 },
  { id: "r4-t2", reviewId: "r4", key: "portfolio_pnl", label: "Portfolio P&L", category: "technical", scope: "team", maxMarks: 7.5, order: 2 },
  { id: "r4-t3", reviewId: "r4", key: "trade_advice_signal", label: "Trade Advice and Signal", category: "technical", scope: "team", maxMarks: 7.5, order: 3 },
  { id: "r4-t4", reviewId: "r4", key: "watchlist_alerts", label: "Watchlist & Price Alert", category: "technical", scope: "team", maxMarks: 7.5, order: 4 },
  { id: "r4-t5", reviewId: "r4", key: "customer_notification", label: "Customer Notification", category: "technical", scope: "team", maxMarks: 7.5, order: 5 },
  { id: "r4-t6", reviewId: "r4", key: "customer_preference", label: "Customer Preference", category: "technical", scope: "team", maxMarks: 7.5, order: 6 },
  { id: "r4-t7", reviewId: "r4", key: "automated_strategy", label: "Automated Strategy and Execution", category: "technical", scope: "team", maxMarks: 7.5, order: 7 },
];
