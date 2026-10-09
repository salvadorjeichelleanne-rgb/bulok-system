require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!supabaseUrl) {
    console.error("Error: SUPABASE_URL missing from environment variables.");
    process.exit(1);
  }

  if (!supabaseServiceRoleKey) {
    console.error("Error: SUPABASE_SERVICE_ROLE_KEY missing from environment variables.");
    process.exit(1);
  }

  if (!username) {
    console.error("Error: ADMIN_USERNAME missing from environment variables.");
    process.exit(1);
  }

  if (!password) {
    console.error("Error: ADMIN_PASSWORD missing from environment variables.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from("admins")
      .insert([
        {
          username: username,
          password_hash: passwordHash
        }
      ])
      .select("id, username, created_at");

    if (error) {
      if (error.code === "23505") {
        console.error(`Error: Admin user "${username}" already exists in database.`);
      } else {
        console.error("Failed to create admin:", error.message);
      }
      process.exit(1);
    }

    console.log(`Success: Admin user "${data[0].username}" has been created.`);
    process.exit(0);
  } catch (err) {
    console.error("Unexpected error:", err.message);
    process.exit(1);
  }
}

main();