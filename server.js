const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// Supabase setup (CORRECT)
const supabase = createClient(
  "https://alsfjqaktutcowybibfu.supabase.co",
  "https://sb_secret_lZkQkxrTT_Q-GfiNB2_Fwg_Zi_PqAph.supabase.co"
);

// ------------------- REGISTER -------------------
app.get("/api/register", async (req, res) => {
  const user = req.query.user;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .single();

  if (data) {
    return res.send(`@${user} already registered`);
  }

  await supabase.from("users").insert({
    username: user,
    balance: 100
  });

  res.send(`@${user} registered with 100 coins`);
});

// ------------------- BALANCE -------------------
app.get("/api/balance", async (req, res) => {
  const user = req.query.user;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .single();

  if (!data) {
    return res.send(`@${user} not registered`);
  }

  res.send(`@${user} has ${data.balance} coins`);
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});