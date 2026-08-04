import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 3001;
const HOSTNAME = process.env.HOSTNAME || "localhost";

const app = createApp();
app.listen(PORT, HOSTNAME, () => {
  console.log(`Review Grader API listening on http://${HOSTNAME}:${PORT}`);
});
