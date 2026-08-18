const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const readline = require("readline");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}

function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let email = readArg("email") || process.env.ADMIN_EMAIL || "";
  let password = readArg("password") || process.env.ADMIN_PASSWORD || "";
  let fullName = readArg("name") || process.env.ADMIN_FULL_NAME || "";

  // Interactive mode if credentials not provided
  if (!email || !password) {
    console.log("Admin Account Creation");
    console.log("========================\n");
    
    if (!email) {
      email = await question("Admin email: ");
      email = email.trim().toLowerCase();
    }
    
    if (!password) {
      password = await question("Admin password (min 6 characters): ");
    }
    
    if (!fullName) {
      fullName = await question("Admin full name: ");
      fullName = fullName.trim();
    }
  }

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Please provide a valid email address.");
  }

  console.log("\nCreating admin account...");

  const passwordHash = await bcrypt.hash(password, 10);
  
  const { data, error } = await supabase
    .from("app_users")
    .upsert({
      email,
      password_hash: passwordHash,
      full_name: fullName || "Admin",
      role: "admin",
    }, {
      onConflict: "email"
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create admin: ${error.message}`);
  }

  console.log(`✓ Admin account created successfully!`);
  console.log(`  Email: ${email}`);
  console.log(`  Name: ${data.full_name}`);
  console.log(`  ID: ${data.id}`);
  console.log(`\nYou can now login at /admin/login`);
}

main().catch((error) => {
  console.error("Error:", error.message || error);
  process.exit(1);
});
