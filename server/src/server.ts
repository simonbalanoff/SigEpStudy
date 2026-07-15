import "dotenv/config";

import { createServer } from "node:http";

import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

const server = createServer(app);
let shuttingDown = false;

async function start(): Promise<void> {
    await connectDatabase();
    server.listen(env.PORT, () => {
        console.log(`API listening on http://localhost:${env.PORT}`);
    });
}

async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received. Shutting down.`);

    server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
    });

    setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

start().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
