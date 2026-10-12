
import "dotenv/config";
import mongoose from "mongoose";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const collectionsToClean = [
  "payments",
  "paymentevents",
  "paymentattempts",
  "appointments",
  "servicepackages",
  "workshopreservations",
  "workshopregistrations",
];

const execute = process.argv.includes("--execute");

function getDatabaseName(uri) {
  const pathname = new URL(uri).pathname.replace(/^\/+/, "");

  if (!pathname) {
    throw new Error(
      "The MongoDB URI must specify a database name.",
    );
  }

  return decodeURIComponent(pathname.split("/")[0]);
}

async function confirmDeletion(rl, databaseName) {
  const expected =
    `DELETE ALL SNS PAYMENT AND BOOKING DATA FROM ${databaseName}`;

  const answer = await rl.question(
    `\nType exactly:\n${expected}\n> `,
  );

  return answer.trim() === expected;
}

async function inspectDatabase(uri, databaseName) {
  console.log("\n=== SHARED SNS DATABASE ===");
  console.log(`Database: ${databaseName}`);
  console.log("Environment: Development and Production");

  const connection = await mongoose
    .createConnection(uri)
    .asPromise();

  try {
    const db = connection.db;

    if (!db) {
      throw new Error(
        "MongoDB connection has no database.",
      );
    }

    const existingCollections = new Set(
      (
        await db
          .listCollections({}, { nameOnly: true })
          .toArray()
      ).map(({ name }) => name),
    );

    const counts = [];

    for (const name of collectionsToClean) {
      if (!existingCollections.has(name)) {
        console.log(
          `${name}: collection not found; skipped`,
        );
        continue;
      }

      const count = await db
        .collection(name)
        .countDocuments({});

      counts.push({ name, count });

      console.log(`${name}: ${count} document(s)`);
    }

    if (!execute) {
      console.log(
        "\nDRY RUN: no records were deleted.",
      );
      return;
    }

    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
    });

    let confirmed;

    try {
      confirmed = await confirmDeletion(
        rl,
        databaseName,
      );
    } finally {
      rl.close();
    }

    if (!confirmed) {
      console.log(
        "Confirmation did not match. No records were deleted.",
      );
      return;
    }

    console.log("\nStarting cleanup...");

    for (const { name, count } of counts) {
      if (count === 0) {
        continue;
      }

      const result = await db
        .collection(name)
        .deleteMany({});

      console.log(
        `Deleted ${result.deletedCount} document(s) from ${name}.`,
      );
    }

    console.log(
      `\nCleanup completed for ${databaseName}.`,
    );
  } finally {
    await connection.close();
  }
}

async function main() {
  if (!execute) {
    console.log(
      "DRY RUN: showing record counts only. Nothing will be deleted.",
    );
    console.log(
      "Use --execute only after reviewing the database and counts.",
    );
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI in your environment configuration.",
    );
  }

  const databaseName = getDatabaseName(uri);

  await inspectDatabase(uri, databaseName);

  console.log("\nScript finished.");
}

main().catch((error) => {
  console.error("\nCleanup failed:", error.message);
  process.exitCode = 1;
});
