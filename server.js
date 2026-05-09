const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// Supabase setup
const supabase = createClient(
  "sb_publishable_EC2EpGymtogKN58a2i1r7A_MbUSeZia",
  "sb_secret__4H-BeuRwCY7t_z8kyprHA_uFtyZHiC"
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