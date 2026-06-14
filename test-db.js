const { createClient } = require('@supabase/supabase-js');
const config = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from("users")
    .select("*, user_committees(committee_id, role, committees(name))")
    .order("created_at");
  console.log(JSON.stringify(data, null, 2));
}
run();
