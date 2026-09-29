import "dotenv/config";
import mongoose from "mongoose";

async function deleteExistingServices() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  await mongoose.connect(mongoUri);

  console.log("========================================");
  console.log("Delete Existing Services");
  console.log("========================================");
  console.log();
  console.log("Connected to MongoDB.");
  console.log();

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB database connection is not available.");
  }

  const servicesCollection = db.collection("services");

  const services = await servicesCollection.find({}).toArray();

  if (services.length === 0) {
    console.log("No services found.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${services.length} service(s):`);
  console.log();

  for (const service of services) {
    console.log(
      `- ${service.name ?? "Unnamed service"} (${service.slug ?? "no slug"})`,
    );
  }

  console.log();

  const result = await servicesCollection.deleteMany({});

  console.log(`Deleted ${result.deletedCount} service(s).`);
  console.log();
  console.log("Service deletion completed successfully.");

  await mongoose.disconnect();
}

deleteExistingServices().catch(async (error) => {
  console.error();
  console.error("Failed to delete services.");
  console.error();
  console.error(
    error instanceof Error ? error.message : error,
  );

  await mongoose.disconnect();
  process.exit(1);
});