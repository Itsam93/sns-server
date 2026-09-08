import "dotenv/config";

import app from "./app.js";
import { connectDatabase } from "./utils/db.js";

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`SnS API running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});