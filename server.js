const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ================= SUPABASE =================
const supabase = createClient(
  "https://alsfjqaktutcowybibfu.supabase.co",
  "https://eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsc2ZqcWFrdHV0Y293eWJpYmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTIyNzEsImV4cCI6MjA5Mzg4ODI3MX0.4e_9x4ymuIvWXiYXzQD2u8hjZS1XYpjyYxG_NF28Jtk.supabase.co"
);

// helper
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
    { username: user, balance: 100 }
  ]);

  if (error) {
    console.log(error);
    return res.send("❌ register failed");
  }

  res.send(`@${user} registered with 100 coins 🎉`);
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

// ================= DAILY =================
app.get("/api/daily", async (req, res) => {
  const user = norm(req.query.user);

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  if (!data) return res.send(`@${user} not registered`);

  const reward = 200;

  await supabase
    .from("users")
    .update({ balance: data.balance + reward })
    .eq("username", user);

  res.send(`@${user} claimed +${reward} coins 🎁`);
});

// ================= GAMBLE =================
app.get("/api/gamble", async (req, res) => {
  const user = norm(req.query.user);
  const amount = parseInt(req.query.amount);

  if (!amount || amount <= 0) return res.send("invalid amount");

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  if (!data) return res.send(`@${user} not registered`);
  if (data.balance < amount) return res.send(`not enough coins`);

  const win = Math.random() < 0.5;

  const newBal = win
    ? data.balance + amount
    : data.balance - amount;

  await supabase
    .from("users")
    .update({ balance: newBal })
    .eq("username", user);

  res.send(win
    ? `🎉 @${user} WON +${amount}`
    : `💀 @${user} LOST -${amount}`
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

  await supabase.from("users").update({
    balance: sender.balance - amount
  }).eq("username", from);

  await supabase.from("users").update({
    balance: receiver.balance + amount
  }).eq("username", to);

  res.send(`💸 ${from} gave ${amount} to ${to}`);
});

// ================= LEADERBOARD =================
app.get("/api/leaderboard", async (req, res) => {
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("balance", { ascending: false })
    .limit(5);

  if (!data || data.length === 0) return res.send("no players");

  const msg = data
    .map((u, i) => `${i + 1}. ${u.username} - ${u.balance}`)
    .join(" | ");

  res.send("🏆 " + msg);
});

// ================= HELP =================
app.get("/api/help", (req, res) => {
  res.send(
`🎰 COMMANDS:
!register
!balance
!daily
!gamble <amount>
!give <user> <amount>
!leaderboard`
  );
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));