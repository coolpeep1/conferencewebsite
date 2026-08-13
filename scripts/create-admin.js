const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

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

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const email = (readArg("email") || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = readArg("password") || process.env.ADMIN_PASSWORD || "";
  const fullName = (readArg("name") || process.env.ADMIN_FULL_NAME || "Admin").trim();

  if (!email || !password) {
    throw new Error("Pass --email and --password.");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await client.query(
      `insert into app_users (email, password_hash, full_name, role)
       values ($1, $2, $3, 'admin')
       on conflict (email)
       do update set password_hash = excluded.password_hash,
                     full_name = excluded.full_name,
                     role = 'admin'
       returning id`,
      [email, passwordHash, fullName]
    );

    console.log(`Admin ready: ${email} (${result.rows[0].id})`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
