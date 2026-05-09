const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const db = new sqlite3.Database("./gamble.db");

db.run(`
CREATE TABLE IF NOT EXISTS users (
 username TEXT PRIMARY KEY,
 balance INTEGER DEFAULT 100
)
`);

app.get("/api/register", (req, res) => {
 const user = req.query.user;

 db.get("SELECT * FROM users WHERE username=?", [user], (err,row)=>{
   if(row){
     return res.send(`@${user} already registered`);
   }

   db.run(
     "INSERT INTO users(username,balance) VALUES(?,?)",
     [user,100],
     ()=>{
       res.send(`@${user} registered with 100 coins`);
     }
   );
 });
});

app.get("/api/balance", (req,res)=>{
 const user = req.query.user;

 db.get(
   "SELECT balance FROM users WHERE username=?",
   [user],
   (err,row)=>{
     if(!row){
       return res.send(`@${user} not registered`);
     }

     res.send(`@${user} has ${row.balance} coins`);
   }
 );
});

app.listen(3000, ()=>{
 console.log("Server running on port 3000");
});


const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "YOUR_SUPABASE_URL",
  "YOUR_SUPABASE_ANON_KEY"
);