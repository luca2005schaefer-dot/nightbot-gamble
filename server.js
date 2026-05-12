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

  const { data: player } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  if (!player) return res.send("❌ not registered");
  if (player.balance < bet) return res.send("💀 not enough coins");

  const draw = () => Math.floor(Math.random() * 11) + 1;

  const playerHand = [draw(), draw()];
  const dealerHand = [draw(), draw()];

  await supabase.from("blackjack_games").upsert({
    username: user,
    player_hand: playerHand,
    dealer_hand: dealerHand,
    bet,
    status: "active"
  });

  res.send(
    `🃏 YOU: ${playerHand.join(",")} (${playerHand.reduce((a,b)=>a+b)}) | DEALER: ${dealerHand[0]}, ? | !hit or !stand`
  );
});



app.get("/api/hit", async (req, res) => {
  const user = req.query.user?.toLowerCase();

  const draw = () => Math.floor(Math.random() * 11) + 1;

  const { data: game } = await supabase
    .from("blackjack_games")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  if (!game || game.status !== "active") return res.send("no active game");

  game.player_hand.push(draw());

  const sum = game.player_hand.reduce((a,b)=>a+b);

if (sum > 21) {
  const { data: userRow } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  await supabase
    .from("users")
    .update({
      balance: userRow.balance - game.bet
    })
    .eq("username", user);

  await supabase
    .from("blackjack_games")
    .update({
      status: "lost"
    })
    .eq("username", user);

  return res.send(
    `💀 BUST (${sum}) — lost ${game.bet} coins`
  );
}


app.get("/api/stand", async (req, res) => {
  const user = req.query.user?.toLowerCase();

  const draw = () => Math.floor(Math.random() * 11) + 1;

  const { data: game } = await supabase
    .from("blackjack_games")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  if (!game || game.status !== "active") return res.send("no active game");

  let dealer = [...game.dealer_hand];

  while (dealer.reduce((a,b)=>a+b) < 17) {
    dealer.push(draw());
  }

  const playerSum = game.player_hand.reduce((a,b)=>a+b);
  const dealerSum = dealer.reduce((a,b)=>a+b);

  const { data: userRow } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .maybeSingle();

  let result;
  let change = 0;

  if (playerSum > 21) {
    result = "BUST";
    change = -game.bet;
  } else if (dealerSum > 21 || playerSum > dealerSum) {
    result = "WIN";
    change = game.bet; // 💰 COINS WIN BACK
  } else if (playerSum === dealerSum) {
    result = "DRAW";
  } else {
    result = "LOSE";
    change = -game.bet;
  }

  await supabase
    .from("users")
    .update({ balance: userRow.balance + change })
    .eq("username", user);

  await supabase
    .from("blackjack_games")
    .update({ status: "finished" })
    .eq("username", user);

  res.send(
    `🃏 YOU: ${playerSum} | DEALER: ${dealerSum} → ${result} (${change >= 0 ? "+" : ""}${change} coins)`
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
`🎰 GAMBLE BOT HELP ┃ 👤 !register ┃ 💰 !balance ┃ 🎁 !daily ┃ 🃏 !blackjack <amount> ┃ ➕ !hit ┃ 🛑 !stand ┃ 💸 !give <user> <amount> ┃ 🏆 !leaderboard`
  );
});


// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));

