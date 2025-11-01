// === Discord Economy Bot v4 ===
// Restore admin and missing commands, add more earning & utility commands.
import { Client, GatewayIntentBits, Partials } from "discord.js";
import Database from "easy-json-database";
import dotenv from "dotenv";
dotenv.config();

const db = new Database("./data.json");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message]
});

const prefixKey = "bot_prefix";
if (!db.get(prefixKey)) db.set(prefixKey, "$");
const getPrefix = () => db.get(prefixKey) || "$";

const cooldowns = {}; // { userId: { cmd: timestamp } }
const getBal = (id) => db.get(`balance_${id}`) || 0;
const setBal = (id, amount) => db.set(`balance_${id}`, Math.max(0, Math.floor(amount)));

// Admins by user ID
const adminUsers = db.get("admin_users") || []; // can be managed with commands

// --- Helper utilities ---
function canRunAdmin(userId) {
  return adminUsers.includes(userId);
}

function cooldownCheck(userId, cmd, ms) {
  const now = Date.now();
  cooldowns[userId] = cooldowns[userId] || {};
  if (cooldowns[userId][cmd] && now - cooldowns[userId][cmd] < ms) {
    return Math.ceil((ms - (now - cooldowns[userId][cmd])) / 1000);
  }
  cooldowns[userId][cmd] = now;
  return 0;
}

// --- Economy / Earning functions (many) ---
function earnGeneric(userId, min, max, action) {
  const gain = Math.floor(Math.random() * (max - min + 1)) + min;
  setBal(userId, getBal(userId) + gain);
  return { gain, action };
}

// --- Commands ---
const commands = {
  // Info / utility
  prefix: (msg, args) => {
    const p = getPrefix();
    msg.reply(`🔖 Current prefix is \`${p}\`. Use \`${p}setprefix <new>\` (admins) to change.`);
  },
  help: (msg) => {
    const p = getPrefix();
    msg.reply(`🛠️ Commands list (prefix: \`${p}\`):\n` +
      "`balance, work, mine, fish, hunt, cook, explore, farm, minegold, trade, gamble, steal, daily, rob, war, leaderboard, give, slot, coinflip, huntskill, craft`\n" +
      "Admin: `addcoins, setcoins, reset, addadmin, removeadmin, kick, ban, unban, shutdown, clear, setprefix`");
  },

  // Economy
  balance: (msg) => msg.reply(`💰 ${msg.author.username}, you have **${getBal(msg.author.id)} coins**.`),

  work: (msg) => {
    const res = earnGeneric(msg.author.id, 50, 200, "worked");
    msg.reply(`👷 You ${res.action} and earned **${res.gain} coins**.`);
  },

  mine: (msg) => {
    const res = earnGeneric(msg.author.id, 60, 220, "mined ores");
    msg.reply(`⛏️ You ${res.action} and got **${res.gain} coins**.`);
  },

  minegold: (msg) => {
    const res = earnGeneric(msg.author.id, 150, 400, "found gold veins");
    msg.reply(`✨ Lucky strike! You ${res.action} and got **${res.gain} coins**.`);
  },

  fish: (msg) => {
    const res = earnGeneric(msg.author.id, 40, 160, "caught fish");
    msg.reply(`🎣 You ${res.action} and earned **${res.gain} coins**.`);
  },

  hunt: (msg) => {
    const res = earnGeneric(msg.author.id, 70, 250, "hunted beasts");
    msg.reply(`🏹 You ${res.action} and earned **${res.gain} coins**.`);
  },

  cook: (msg) => {
    const res = earnGeneric(msg.author.id, 30, 150, "cooked meals to sell");
    msg.reply(`🍳 You ${res.action} and earned **${res.gain} coins**.`);
  },

  explore: (msg) => {
    const res = earnGeneric(msg.author.id, 100, 300, "explored and looted");
    msg.reply(`🧭 You ${res.action} and earned **${res.gain} coins**.`);
  },

  farm: (msg) => {
    const res = earnGeneric(msg.author.id, 40, 200, "harvested crops");
    msg.reply(`🌾 You ${res.action} and earned **${res.gain} coins**.`);
  },

  trade: (msg) => {
    const res = earnGeneric(msg.author.id, 80, 280, "made profitable trades");
    msg.reply(`💱 You ${res.action} and earned **${res.gain} coins**.`);
  },

  gamble: (msg, args) => {
    const bet = parseInt(args[0]) || Math.floor(Math.random() * 200) + 50;
    if (getBal(msg.author.id) < bet) return msg.reply("❌ Not enough coins to gamble.");
    const win = Math.random() < 0.5;
    const amt = win ? bet : -bet;
    setBal(msg.author.id, getBal(msg.author.id) + amt);
    msg.reply(win ? `🎰 You won **${bet} coins**!` : `🎰 You lost **${bet} coins**.`);
  },

  slot: (msg) => {
    const items = ["🍒","🍋","🍇","🍊","💎"];
    const r = [items[Math.floor(Math.random()*items.length)], items[Math.floor(Math.random()*items.length)], items[Math.floor(Math.random()*items.length)]];
    const win = r[0]===r[1] && r[1]===r[2];
    const change = win ? 300 : -50;
    setBal(msg.author.id, getBal(msg.author.id) + change);
    msg.reply(`🎰 ${r.join(" ")} ${win?`You won ${change} coins!`:`You lost 50 coins.`}`);
  },

  coinflip: (msg) => {
    const res = Math.random() < 0.5 ? "Heads" : "Tails";
    msg.reply(`🪙 ${res}`);
  },

  steal: (msg, args) => {
    const target = msg.mentions.users.first();
    if (!target) return msg.reply("Usage: `steal @user`");
    if (target.bot) return msg.reply("You can't steal from bots.");
    const chance = Math.random();
    const amt = Math.floor(Math.random()*100)+20;
    if (chance < 0.45) {
      setBal(msg.author.id, getBal(msg.author.id)+amt);
      setBal(target.id, getBal(target.id)-amt);
      msg.reply(`😈 You stole **${amt} coins** from ${target.username}!`);
    } else {
      const fine = Math.floor(amt/2);
      setBal(msg.author.id, getBal(msg.author.id)-fine);
      msg.reply(`🚨 You got caught and paid **${fine} coins**!`);
    }
  },

  daily: (msg) => {
    const cd = cooldownCheck(msg.author.id, "daily", 24*60*60*1000);
    if (cd) return msg.reply(`🕒 Try again in ${Math.ceil(cd/3600)} hour(s).`);
    const reward = Math.floor(Math.random()*400)+200;
    setBal(msg.author.id, getBal(msg.author.id)+reward);
    msg.reply(`🎁 Daily claimed: **${reward} coins**.`);
  },

  rob: (msg, args) => {
    const target = msg.mentions.users.first();
    if (!target) return msg.reply("Usage: `rob @user`");
    if (target.bot) return msg.reply("You can't rob bots.");
    const cd = cooldownCheck(msg.author.id, "rob", 5*60*1000);
    if (cd) return msg.reply(`🕒 Wait ${cd} seconds to rob again.`);
    const victimBal = getBal(target.id);
    if (victimBal < 100) return msg.reply("Victim too poor to rob.");
    const success = Math.random() < 0.5;
    const amt = Math.floor(Math.random()*150)+50;
    if (success) {
      setBal(msg.author.id, getBal(msg.author.id)+amt);
      setBal(target.id, victimBal-amt);
      msg.reply(`🦹 You successfully robbed **${amt} coins** from ${target.username}!`);
    } else {
      const fine = Math.floor(amt/2);
      setBal(msg.author.id, getBal(msg.author.id)-fine);
      msg.reply(`🚔 You were caught and fined **${fine} coins**.`);
    }
  },

  war: (msg, args) => {
    const opponent = msg.mentions.users.first();
    if (!opponent) return msg.reply("Usage: `$war @user`");
    if (opponent.bot) return msg.reply("You can't fight bots.");
    const p1 = Math.floor(Math.random()*100)+1;
    const p2 = Math.floor(Math.random()*100)+1;
    if (p1===p2) return msg.reply("🤝 Draw!");
    const winner = p1>p2? msg.author : opponent;
    const loser = p1>p2? opponent : msg.author;
    const reward = Math.floor(Math.random()*250)+100;
    setBal(winner.id, getBal(winner.id)+reward);
    setBal(loser.id, getBal(loser.id)-Math.floor(reward/2));
    msg.channel.send(`⚔️ **WAR**: ${msg.author.username} (${p1}) vs ${opponent.username} (${p2}) → Winner: **${winner.username}** (+${reward})`);
  },

  leaderboard: (msg) => {
    const all = db.all().filter(e=>e.ID.startsWith("balance_")).map(e=>({user:e.ID.replace("balance_",""),coins:e.data})).sort((a,b)=>b.coins-a.coins).slice(0,10);
    if (!all.length) return msg.reply("No data yet.");
    const text = all.map((u,i)=>`#${i+1} <@${u.user}> — **${u.coins}**`).join("\n");
    msg.channel.send(`🏆 Leaderboard:\n${text}`);
  },

  give: (msg, args) => {
    const target = msg.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount)) return msg.reply("Usage: `$give @user <amount>`");
    if (getBal(msg.author.id) < amount) return msg.reply("Not enough coins.");
    setBal(msg.author.id, getBal(msg.author.id)-amount);
    setBal(target.id, getBal(target.id)+amount);
    msg.reply(`✅ Sent ${amount} coins to ${target.username}.`);
  },

  // craft and huntskill are small extras
  huntskill: (msg) => {
    const res = earnGeneric(msg.author.id, 30, 120, "trained hunting skill and sold pelts");
    msg.reply(`🏹 ${res.action}: +${res.gain} coins`);
  },

  craft: (msg) => {
    const res = earnGeneric(msg.author.id, 40, 180, "crafted items and sold them");
    msg.reply(`🔨 ${res.action}: +${res.gain} coins`);
  },

  // --- Admin and moderation ---
  addcoins: (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const user = msg.mentions.users.first();
    const amt = parseInt(args[1]);
    if (!user || isNaN(amt)) return msg.reply("Usage: `$addcoins @user <amount>`");
    setBal(user.id, getBal(user.id)+amt);
    msg.reply(`✅ Added ${amt} coins to ${user.username}.`);
  },

  setcoins: (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const user = msg.mentions.users.first();
    const amt = parseInt(args[1]);
    if (!user || isNaN(amt)) return msg.reply("Usage: `$setcoins @user <amount>`");
    setBal(user.id, amt);
    msg.reply(`⚙️ Set ${user.username}'s coins to ${amt}.`);
  },

  reset: (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const user = msg.mentions.users.first();
    if (!user) return msg.reply("Usage: `$reset @user`");
    setBal(user.id, 0);
    msg.reply(`🔄 Reset ${user.username}'s balance.`);
  },

  addadmin: (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const user = msg.mentions.users.first();
    if (!user) return msg.reply("Usage: `$addadmin @user`");
    const arr = db.get("admin_users") || [];
    if (!arr.includes(user.id)) {
      arr.push(user.id);
      db.set("admin_users", arr);
      msg.reply(`✅ Added ${user.username} as admin.`);
    } else msg.reply("User already admin.");
  },

  removeadmin: (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const user = msg.mentions.users.first();
    if (!user) return msg.reply("Usage: `$removeadmin @user`");
    const arr = db.get("admin_users") || [];
    const idx = arr.indexOf(user.id);
    if (idx>-1) {
      arr.splice(idx,1);
      db.set("admin_users", arr);
      msg.reply(`✅ Removed ${user.username} from admins.`);
    } else msg.reply("User not an admin.");
  },

  kick: async (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const member = msg.mentions.members.first();
    if (!member) return msg.reply("Usage: `$kick @member`");
    try {
      await member.kick();
      msg.reply(`👢 Kicked ${member.user.username}.`);
    } catch (e) {
      msg.reply("Failed to kick (missing perms).");
    }
  },

  ban: async (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const member = msg.mentions.members.first();
    if (!member) return msg.reply("Usage: `$ban @member`");
    try {
      await member.ban();
      msg.reply(`🔨 Banned ${member.user.username}.`);
    } catch (e) {
      msg.reply("Failed to ban (missing perms).");
    }
  },

  unban: async (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("Usage: `$unban userId`");
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const id = args[0];
    try {
      await msg.guild.members.unban(id);
      msg.reply("✅ Unbanned.");
    } catch (e) {
      msg.reply("Failed to unban (invalid id).");
    }
  },

  clear: async (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const n = parseInt(args[0]) || 5;
    try {
      const msgs = await msg.channel.messages.fetch({ limit: n });
      await msg.channel.bulkDelete(msgs);
      msg.reply(`🧹 Cleared ${msgs.size} messages.`);
    } catch (e) {
      msg.reply("Failed to clear messages (too old or missing perms).");
    }
  },

  shutdown: (msg) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    msg.reply("🛑 Shutting down...").then(()=>process.exit());
  },

  setprefix: (msg, args) => {
    if (!canRunAdmin(msg.author.id)) return msg.reply("No permission.");
    const np = args[0];
    if (!np) return msg.reply("Usage: `$setprefix <new>`");
    db.set(prefixKey, np);
    msg.reply(`✅ Prefix set to \`${np}\`.`);
  }
};


client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  const prefix = getPrefix();
  if (!msg.content.startsWith(prefix)) return;
  const [cmd, ...args] = msg.content.slice(prefix.length).trim().split(/\s+/);
  const command = cmd.toLowerCase();
  if (commands[command]) return commands[command](msg, args);
  msg.reply("Unknown command. Use `help`.");
});

client.once("ready", ()=>console.log(`✅ Logged in as ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);
