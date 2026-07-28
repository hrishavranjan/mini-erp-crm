/**
 * Seed script: creates one demo user per role.
 * Run with: npm run seed
 * (Make sure schema.sql has already been run in Supabase, and .env is filled in)
 */
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase";
import { UserRole } from "../types";

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

async function run() {
  const users: SeedUser[] = [
    {
      name: "Admin User",
      email: process.env.SEED_ADMIN_EMAIL || "admin@erp.com",
      password: process.env.SEED_ADMIN_PASSWORD || "Password@123",
      role: "admin",
    },
    {
      name: "Sales User",
      email: process.env.SEED_SALES_EMAIL || "sales@erp.com",
      password: process.env.SEED_SALES_PASSWORD || "Password@123",
      role: "sales",
    },
    {
      name: "Warehouse User",
      email: process.env.SEED_WAREHOUSE_EMAIL || "warehouse@erp.com",
      password: process.env.SEED_WAREHOUSE_PASSWORD || "Password@123",
      role: "warehouse",
    },
    {
      name: "Accounts User",
      email: process.env.SEED_ACCOUNTS_EMAIL || "accounts@erp.com",
      password: process.env.SEED_ACCOUNTS_PASSWORD || "Password@123",
      role: "accounts",
    },
  ];

  for (const u of users) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", u.email)
      .maybeSingle();

    if (existing) {
      console.log(`[skip] ${u.email} already exists`);
      continue;
    }

    const password_hash = await bcrypt.hash(u.password, 10);
    const { error } = await supabase.from("users").insert({
      name: u.name,
      email: u.email,
      password_hash,
      role: u.role,
    });

    if (error) {
      console.error(`[error] failed to seed ${u.email}:`, error.message);
    } else {
      console.log(`[ok] seeded ${u.role} -> ${u.email} / ${u.password}`);
    }
  }

  console.log("\nSeeding complete. Use these credentials to log in.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
