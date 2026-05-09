const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ================= SUPABASE =================
const supabase = createClient(
  "https://alsfjqaktutcowybibfu.supabase.co",
  "https://sb_secret_lZkQkxrTT_Q-GfiNB2_Fwg_Zi_PqAph.supabase.co"
);

// ================= REGISTER =================
app.get("/api/register", async (req, res) => {
  const user = req.query.user;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .single();

  if (data) return res.send(`@${user} already registered`);

  await supabase.from("users").insert({
    username: user,
    balance: 100
  });

  res.send(`@${user} registered with 100 coins 🎉`);
});

// ================= BALANCE =================
app.get("/api/balance", async (req, res) => {
  const user = req.query.user;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .single();

  if (!data) return res.send(`@${user} not registered`);

  res.send(`@${user} has ${data.balance} coins 💰`);
});

// ================= DAILY =================
app.get("/api/daily", async (req, res) => {
  const user = req.query.user;
  const reward = 200;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .single();

  if (!data) return res.send(`@${user} not registered`);

  await supabase
    .from("users")
    .update({ balance: data.balance + reward })
    .eq("username", user);

  res.send(`@${user} claimed daily +${reward} coins 🎁`);
});

// ================= GAMBLE =================
app.get("/api/gamble", async (req, res) => {
  const user = req.query.user;
  const amount = parseInt(req.query.amount);

  if (!amount || amount <= 0) {
    return res.send("Invalid amount");
  }

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .single();

  if (!data) return res.send(`@${user} not registered`);

  if (data.balance < amount) {
    return res.send(`@${user} not enough coins`);
  }

  const win = Math.random() < 0.5;

  if (win) {
    const newBalance = data.balance + amount;
    await supabase
      .from("users")
      .update({ balance: newBalance })
      .eq("username", user);

    return res.send(`🎉 @${user} WON +${amount} coins!`);
  } else {
    const newBalance = data.balance - amount;
    await supabase
      .from("users")
      .update({ balance: newBalance })
      .eq("username", user);

    return res.send(`💀 @${user} LOST -${amount} coins`);
  }
});

// ================= GIVE =================
app.get("/api/give", async (req, res) => {
  const from = req.query.user;
  const to = req.query.to;
  const amount = parseInt(req.query.amount);

  if (!to || !amount || amount <= 0) {
    return res.send("Usage: !give <user> <amount>");
  }

  const { data: sender } = await supabase
    .from("users")
    .select("*")
    .eq("username", from)
    .single();

  if (!sender) return res.send(`@${from} not registered`);

  if (sender.balance < amount) {
    return res.send(`@${from} not enough coins`);
  }

  const { data: receiver } = await supabase
    .from("users")
    .select("*")
    .eq("username", to)
    .single();

  if (!receiver) return res.send(`@${to} not registered`);

  await supabase
    .from("users")
    .update({ balance: sender.balance - amount })
    .eq("username", from);

  await supabase
    .from("users")
    .update({ balance: receiver.balance + amount })
    .eq("username", to);

  res.send(`💸 @${from} gave ${amount} coins to @${to}`);
});

// ================= LEADERBOARD =================
app.get("/api/leaderboard", async (req, res) => {
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("balance", { ascending: false })
    .limit(5);

  if (!data || data.length === 0) {
    return res.send("No players yet");
  }

  const text = data
    .map((u, i) => `${i + 1}. ${u.username} - ${u.balance}`)
    .join(" | ");

  res.send("🏆 Top Players: " + text);
});

// ================= HELP =================
app.get("/api/help", (req, res) => {
  res.send(
`🎰 COMMANDS:
!register → start account
!balance → check coins
!daily → free coins
!gamble <amount> → gamble coins
!give <user> <amount> → send coins
!leaderboard → top players`
  );
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});


