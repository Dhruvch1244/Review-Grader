import { redirect } from "next/navigation";

// Setup is the app's home base - roster management plus quick Score/Stats/
// Export actions per class - so there's nothing distinct left for a
// separate landing page to show.
export default function HomePage() {
  redirect("/setup");
}
