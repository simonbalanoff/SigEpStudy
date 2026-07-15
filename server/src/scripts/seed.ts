import "dotenv/config";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { hashPassword } from "../modules/auth/auth.service.js";
import { User } from "../modules/auth/user.model.js";
import { normalizeEmail } from "../utils/normalize.js";

async function seed(): Promise<void> {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be configured.");
  await connectDatabase();
  const email = normalizeEmail(env.SEED_ADMIN_EMAIL);
  let admin = await User.findOne({ email }).select("+passwordHash");
  if (!admin) {
    admin = await User.create({
      firstName: env.SEED_ADMIN_FIRST_NAME ?? "Chapter",
      lastName: env.SEED_ADMIN_LAST_NAME ?? "Admin",
      email,
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
      role: "admin",
      status: "active"
    });
  } else {
    admin.role = "admin";
    admin.status = "active";
    admin.passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
    await admin.save();
  }
  console.log(JSON.stringify({ adminId: String(admin._id), email: admin.email }, null, 2));
  await disconnectDatabase();
}

seed().catch(async (error: unknown) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
