const { createClient } = require('@supabase/supabase-js');
const config = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, committees(name), created_user:users!created_by(first_name), assigned_user:users!assigned_to(first_name)")
    .order("created_at", { ascending: false });
  console.log(error || data);
}
run();
