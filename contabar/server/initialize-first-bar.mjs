import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "ADMIN_USER_EMAIL"];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY.trim();
const adminEmail = process.env.ADMIN_USER_EMAIL.trim().toLowerCase();
const pilotBarKey = "initial-pilot-bar";
const pilotBarName = "Bar Piloto";

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

function throwSafe(label, error) {
  const code = error?.code ? ` (${error.code})` : "";
  const message = error?.message ? `: ${error.message}` : "";
  throw new Error(`${label}${code}${message}`);
}

async function findAuthUserByEmail(email) {
  const perPage = 100;

  for (let page = 1; page <= 1000; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throwSafe("Could not find the existing Auth user", error);

    const user = data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === email,
    );
    if (user) return user;
    if (data.users.length < perPage) return null;
  }

  throw new Error("Auth user search stopped at the safety limit");
}

async function getOrCreatePilotBar() {
  const { data: existing, error: lookupError } = await supabase
    .from("bars")
    .select("id")
    .eq("provisioning_key", pilotBarKey)
    .maybeSingle();

  if (lookupError) throwSafe("Could not check for the pilot bar", lookupError);
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("bars")
    .insert({ name: pilotBarName, provisioning_key: pilotBarKey })
    .select("id")
    .single();

  if (!insertError) return created.id;

  // A second run may have created the same tenant between the lookup and insert.
  if (insertError.code === "23505") {
    const { data: raced, error: racedLookupError } = await supabase
      .from("bars")
      .select("id")
      .eq("provisioning_key", pilotBarKey)
      .maybeSingle();
    if (racedLookupError) throwSafe("Could not confirm the pilot bar", racedLookupError);
    if (raced) return raced.id;
  }

  throwSafe("Could not create the pilot bar", insertError);
}

async function main() {
  const adminUser = await findAuthUserByEmail(adminEmail);
  if (!adminUser) {
    throw new Error(
      "No Auth account matches ADMIN_USER_EMAIL. Create and confirm that account in Supabase Auth first.",
    );
  }

  const barId = await getOrCreatePilotBar();
  const { error: membershipError } = await supabase
    .from("bar_memberships")
    .upsert(
      {
        user_id: adminUser.id,
        bar_id: barId,
        role: "admin",
        revoked_at: null,
      },
      { onConflict: "user_id,bar_id" },
    );

  if (membershipError) throwSafe("Could not provision the pilot admin membership", membershipError);

  console.info("Pilot bar and admin membership are ready.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Initialization failed.");
  process.exitCode = 1;
});
