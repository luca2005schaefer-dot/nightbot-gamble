const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ================= SUPABASE =================
const supabase = createClient(
  "https://alsfjqaktutcowybibfu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsc2ZqcWFrdHV0Y293eWJpYmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTIyNzEsImV4cCI6MjA5Mzg4ODI3MX0.4e_9x4ymuIvWXiYXzQD2u8hjZS1XYpjyYxG_NF28Jtk"
);

const norm = (u) => (u || "").toLowerCase();

// ================= REGISTER =================
app.get("/api/register", async (req, res) => {
  const user = norm(req.query.user);

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  if (data) return res.send(`@${user} already registered`);

  const { error } = await supabase.from("users").insert([
    {
      username: user,
      balance: 100,
      last_daily: 0
    }
  ]);

  if (error) return res.send("register failed: " + error.message);

  res.send(`@${user} registered 🎉`);
});

// ================= BALANCE =================
app.get("/api/balance", async (req, res) => {
  const user = norm(req.query.user);

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  if (!data) return res.send(`@${user} not registered`);

  res.send(`@${user} has ${data.balance} coins 💰`);
});

// ================= DAILY (24H COOLDOWN) =================
app.get("/api/daily", async (req, res) => {
  const user = norm(req.query.user);
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  if (!data) return res.send(`@${user} not registered`);

  if (now - data.last_daily < DAY) {
    const left = DAY - (now - data.last_daily);
    const hours = Math.ceil(left / 3600000);
    return res.send(`⏳ try again in ${hours}h`);
  }

  const reward = 200;

  await supabase
    .from("users")
    .update({
      balance: data.balance + reward,
      last_daily: now
    })
    .eq("username", user);

  res.send(`🎁 @${user} got +${reward}`);
});

// ================= GAMBLE =================
app.get("/api/blackjack", async (req, res) => {
  const user = req.query.user?.toLowerCase();
  const bet = parseInt(req.query.amount);

  if (!bet || bet <= 0) return res.send("❌ !blackjack <amount>");

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  if (!data) return res.send(`@${user} not registered`);
  if (data.balance < bet) return res.send("💀 not enough coins");

  // 🃏 helper
  const draw = () => Math.floor(Math.random() * 11) + 1;

  // PLAYER HAND
  let player = draw() + draw();

  // SIMPLE AI DECISION (auto hit under 16)
  while (player < 16) {
    player += draw();
  }

  // DEALER HAND
  let dealer = draw() + draw();
  while (dealer < 17) {
    dealer += draw();
  }

  let result;
  let change;

  if (player > 21) {
    result = "bust";
    change = -bet;
  } else if (dealer > 21 || player > dealer) {
    result = "win";
    change = bet;
  } else if (player === dealer) {
    result = "draw";
    change = 0;
  } else {
    result = "lose";
    change = -bet;
  }

  await supabase
    .from("users")
    .update({ balance: data.balance + change })
    .eq("username", user);

  res.send(
    `🃏 ${user} | You: ${player} vs Dealer: ${dealer} → ${result.toUpperCase()} ${change > 0 ? "+" + change : change}`
  );
});

// ================= GIVE =================
app.get("/api/give", async (req, res) => {
  const from = norm(req.query.user);
  const to = norm(req.query.to);
  const amount = parseInt(req.query.amount);

  if (!to || !amount) return res.send("usage: !give user amount");

  const { data: sender } = await supabase
    .from("users")
    .select("*")
    .eq("username", from)
    .maybeSingle();

  const { data: receiver } = await supabase
    .from("users")
    .select("*")
    .eq("username", to)
    .maybeSingle();

  if (!sender || !receiver) return res.send("user not found");
  if (sender.balance < amount) return res.send("not enough coins");

  await supabase.from("users")
    .update({ balance: sender.balance - amount })
    .eq("username", from);

  await supabase.from("users")
    .update({ balance: receiver.balance + amount })
    .eq("username", to);

  res.send(`💸 ${from} gave ${amount} to ${to}`);
});

// ================= LEADERBOARD =================
app.get("/api/leaderboard", async (req, res) => {
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("balance", { ascending: false })
    .limit(5);

  if (!data?.length) return res.send("no players");

  const msg = data
    .map((u, i) => `${i + 1}. ${u.username} - ${u.balance}`)
    .join(" | ");

  res.send("🏆 " + msg);
});

// ================= HELP =================
app.get("/api/help", (req, res) => {
  res.send(
`🎰 GAMBLE BOT HELP ┃ 👤 !register ┃ 💰 !balance ┃ 🎁 !daily ┃ 🎲 !gamble <amount> [safe/balanced/greedy] ┃ 🃏 !blackjack <amount> ┃ 💸 !give <user> <amount> ┃ 🏆 !leaderboard`
  );
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));

