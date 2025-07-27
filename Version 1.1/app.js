import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

// ===========================================
// SERVER SETUP & CONFIGURATION
// ===========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 3000;

// ===========================================
// DATA STORAGE (In-memory databases)
// ===========================================

// User management
let users = {
  // e.g. "mavito": { email: "mavito@gmail.com", password: "mavito123" }
};
let lastLogin = null;

// Blog management
let blogs = {};
// e.g. "blog1": { title: "My First Blog", content: "Hello World!", author: "mavito" }

// Quest management
let quests = [];
let userActiveQuest = {};
let userCompletedQuests = {};

// Guild management
let guilds = {};
let guildMembers = {}; // { guildName: [username, ...] }

// Global quest tracking
if (!global.questCompletions) global.questCompletions = [];

// ===========================================
// MIDDLEWARE CONFIGURATION
// ===========================================

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("./public"));
app.use(express.static(path.join(__dirname, "/public/uploads")));
app.use("/uploads", express.static(path.join(__dirname, "/public/uploads")));

// Template engine setup
app.set("view engine", "ejs");

// Session configuration
app.use(
  session({
    secret: "replace_this_with_a_long_random_string!",
    resave: false,
    saveUninitialized: false,
  })
);

// Make session data available in every view via res.locals
app.use((req, res, next) => {
  res.locals.loggedIn = req.session.loggedIn || false;
  res.locals.username = req.session.username || null;
  res.locals.email = req.session.email || null;
  next();
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, "/public/uploads"));
  },
  filename(req, file, cb) {
    const unique = Date.now() + path.extname(file.originalname);
    cb(null, unique);
  },
});
const upload = multer({ storage });

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

// Helper: time ago string
function timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const seconds = Math.floor((now - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}



// Helper: get quest statistics
function getQuestStats(filteredQuests, userActiveQuest, userCompletedQuests) {
  const allQuestIds = filteredQuests.map(q => q.id);
  let completedSet = new Set();
  Object.values(userCompletedQuests).forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(id => completedSet.add(id));
  });
  const totalCompleted = completedSet.size;
  const activeCount = Object.values(userActiveQuest).filter(Boolean).length;
  const acceptedSet = new Set(Object.values(userActiveQuest).filter(Boolean));
  const available = allQuestIds.filter(id => !completedSet.has(id) && !acceptedSet.has(id)).length;
  return { available, completed: totalCompleted, active: activeCount };
}

// ===========================================
// PUBLIC ROUTES (No authentication required)
// ===========================================

// Homepage
app.get("/", (req, res) => {
  // Latest blog post (most recent by date)
  let latestBlog = null;
  let latestBlogIdx = null;
  const blogEntries = Object.entries(blogs);
  if (blogEntries.length > 0) {
    const sorted = blogEntries
      .map(([title, data], idx) => ({ title, ...data, idx }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    latestBlog = sorted[0];
    latestBlogIdx = sorted[0].idx;
  }
  
  // Latest 3 quests (by id/date)
  let latestQuests = quests.slice(-3).reverse();

  // Guild stats for user's joined guild only
  let activePlayers = 0;
  let totalPosts = 0;
  let campaigns = 0;
  let adventures = quests.length;
  let userGuild = null;
  if (req.session && req.session.username) {
    for (const [guildName, members] of Object.entries(guildMembers)) {
      if (members.includes(req.session.username)) {
        userGuild = guilds[guildName];
        break;
      }
    }
    if (userGuild) {
      activePlayers = userGuild.members || 0;
      totalPosts = userGuild.posts || 0;
      campaigns = 1;
    }
  }

  // Categories (from blogs)
  const categoryCounts = {};
  Object.values(blogs).forEach(b => {
    if (b.category) categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
  });
  const categories = Object.keys(categoryCounts).map(cat => ({ name: cat, count: categoryCounts[cat] }));

  // Random quote
  const quotes = [
    "The best adventures aren't found in books - they're created around the table with friends.",
    "Write your legend, one post at a time.",
    "Every quest begins with a single step.",
    "Share your story, inspire a guild.",
    "A hero is made by the path they choose."
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  res.render("index.ejs", {
    latestBlog,
    latestBlogIdx,
    latestQuests,
    activePlayers,
    campaigns,
    totalPosts,
    adventures,
    categories,
    quote
  });
});

// Static pages
app.get("/about", (req, res) => res.render("about.ejs"));
app.get("/privacy-info", (req, res) => res.render("privacy.ejs"));
app.get("/terms-info", (req, res) => res.render("terms.ejs"));
app.get("/contact-info", (req, res) => res.render("contact.ejs"));

// ===========================================
// AUTHENTICATION ROUTES
// ===========================================

// Login page
app.get("/login", (req, res) => res.render("login.ejs"));

// Signup page
app.get("/signup", (req, res) => res.render("signup.ejs"));

// Forgot password page
app.get("/forgot", (req, res) => res.render("forgot.ejs"));

// Sign up handler
app.post("/signup", (req, res) => {
  const { username, email, password, confirm } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send("All fields are required.");
  }
  if (password !== confirm) {
    return res.status(400).send("Passwords do not match.");
  }
  if (users[username]) {
    return res.status(400).send("Username already taken.");
  }

  // Save user
  users[username] = { email, password };
  // Auto‑login
  req.session.loggedIn = true;
  req.session.username = username;
  req.session.email = email;
  // Update last login username
  lastLogin = username;

  console.log("User signed up:", username);
  res.redirect("/");
});

// Login handler
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Find matching user
  const entry = Object.entries(users).find(
    ([uname, data]) => data.email === email && data.password === password
  );

  if (!entry) {
    return res.status(401).send("Invalid email or password.");
  }

  const [foundUsername] = entry;
  req.session.loggedIn = true;
  req.session.username = foundUsername;
  req.session.email = users[foundUsername].email;

  console.log("Login successful:", foundUsername);
  res.redirect("/");
});

// Logout handler
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// ===========================================
// BLOG ROUTES
// ===========================================

// Blog listing page
app.get("/blog", (req, res) => {
  res.render("blog.ejs", {
    blogs: Object.entries(blogs), // convert object to array for looping
  });
});

// Individual blog read page
app.get("/blog/read/:idx", (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  const entries = Object.entries(blogs);
  const [title, blog] = entries[idx];
  res.render("blog-read.ejs", { title, blog });
});

// Create blog page
app.get("/make-blog", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const username = req.session.username;
  const activeQuestId = userActiveQuest[username];
  const activeQuest = activeQuestId
    ? quests.find((q) => q.id === activeQuestId)
    : null;

  const hasGuild = Object.values(guildMembers).some((members) =>
    members.includes(username)
  );

  res.render("make-blog", {
    isLoggedIn: true,
    hasGuild,
    activeQuest,
  });
});

// Create blog handler
app.post("/blog/create", (req, res) => {
  const {
    title,
    category,
    description,
    content,
    showInGuild,
    allowComments,
    lengthCategory,
    questId,
  } = req.body;

  const author = req.session.username;
  if (!author) {
    return res.status(401).send("You must be logged in to create a blog.");
  }

  if (!title || !content) {
    return res.status(400).send("Title and content are required.");
  }

  if (blogs[title]) {
    return res.status(400).send("A blog with that title already exists.");
  }

  // Save blog
  blogs[title] = {
    category,
    description,
    content,
    allowComments: allowComments === "on",
    showInGuild: showInGuild === "on",
    author,
    date: new Date().toLocaleDateString(),
    lengthCategory,
  };

  // Update guild post count
  if (showInGuild === "on") {
    for (const [guildName, members] of Object.entries(guildMembers)) {
      if (members.includes(author)) {
        guilds[guildName].posts = (guilds[guildName].posts || 0) + 1;
        break;
      }
    }
  }

  // Auto-complete quest if questId matches user's active quest
  const activeQuestId = userActiveQuest[author];
  if (questId && activeQuestId && Number(questId) === activeQuestId) {
    delete userActiveQuest[author];
    if (!userCompletedQuests[author]) userCompletedQuests[author] = [];
    if (!userCompletedQuests[author].includes(activeQuestId)) {
      userCompletedQuests[author].push(activeQuestId);
      // Track completion for recent/completed/masters
      if (!global.questCompletions) global.questCompletions = [];
      global.questCompletions.push({
        user: author,
        questId: activeQuestId,
        title: quests.find(q => q.id === activeQuestId)?.title || '',
        time: new Date()
      });
      console.log(
        `Quest ${activeQuestId} completed automatically for user ${author}`
      );
    }
  }

  res.redirect("/blog");
});

// ===========================================
// QUEST ROUTES
// ===========================================

// Quest listing page
app.get("/quest", (req, res) => {
  const username = req.session.username;
  const activeQuestId = username ? userActiveQuest[username] : null;
  const completedQuestIds = username ? (userCompletedQuests[username] || []) : [];

  // Only show quests that are not accepted or completed by anyone else
  const acceptedSet = new Set(Object.values(userActiveQuest).filter(Boolean));
  let completedSet = new Set();
  Object.values(userCompletedQuests).forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(id => completedSet.add(id));
  });
  
  // Quests to show in showcase: not accepted or completed by anyone, or your own active quest
  let visibleQuests = quests.filter(q => {
    if (activeQuestId && q.id === activeQuestId) return true;
    if (!acceptedSet.has(q.id) && !completedSet.has(q.id)) return true;
    return false;
  });

  // Apply filters
  const currentDifficulty = req.query.difficulty || "All";
  const currentType = req.query.type || "All";
  const currentDuration = req.query.duration || "All";
  visibleQuests = visibleQuests.filter(q => {
    let pass = true;
    if (currentDifficulty !== "All" && q.difficulty !== currentDifficulty) pass = false;
    if (currentType !== "All" && q.category !== currentType) pass = false;
    if (currentDuration !== "All" && q.duration !== currentDuration) pass = false;
    return pass;
  });

  // Recently completed: last 3 completions (user, quest, time)
  let recent = [];
  if (!global.questCompletions) global.questCompletions = [];
  recent = global.questCompletions.slice(-3).reverse().map(entry => ({
    title: quests.find(q => q.id === entry.questId)?.title || entry.title,
    user: entry.user,
    timeAgo: timeAgo(entry.time)
  }));

  // Quest Masters: last 3 users who completed a quest (no duplicates, most recent first)
  let questMasters = [];
  const seen = new Set();
  for (let i = global.questCompletions.length - 1; i >= 0 && questMasters.length < 3; i--) {
    const entry = global.questCompletions[i];
    if (!seen.has(entry.user)) {
      questMasters.push({ name: entry.user, level: 1 });
      seen.add(entry.user);
    }
  }

  // Active Guilds: up to 3 guilds with at least 1 blog post, sorted by most posts
  let activeGuildsArr = Object.values(guilds)
    .filter(g => g.posts && g.posts > 0)
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 3)
    .map(g => ({ name: g.name, members: g.members }));

  const stats = getQuestStats(visibleQuests, userActiveQuest, userCompletedQuests);
  
  res.render("quest.ejs", {
    loggedIn: req.session.loggedIn,
    username: req.session.username,
    currentDifficulty,
    currentType,
    currentDuration,
    stats,
    quests: visibleQuests,
    leaders: questMasters,
    recent,
    activeGuilds: activeGuildsArr,
    activeQuestId,
    completedQuestIds,
  });
});

// Create quest page
app.get("/quest/create", (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login");
  res.render("quest-create");
});

// Create quest handler
app.post("/quest/create", (req, res) => {
  const { title, summary, category, difficulty, duration } = req.body;
  const id = quests.length > 0 ? Math.max(...quests.map(q => q.id)) + 1 : 1;
  const newQuest = {
    id,
    title,
    author: req.session.username,
    date: new Date().toLocaleDateString(),
    category,
    difficulty,
    duration,
    summary,
  };
  quests.push(newQuest);
  res.redirect("/quest");
});

// Quest detail page
app.get("/quest/:id", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const questId = parseInt(req.params.id, 10);
  const quest = quests.find((q) => q.id === questId);

  if (!quest) {
    return res.status(404).send("Quest not found.");
  }

  const username = req.session.username;
  const userQuestId = userActiveQuest[username];
  // Only allow viewing if not accepted by someone else or if it's your active quest
  const acceptedSet = new Set(Object.values(userActiveQuest).filter(Boolean));
  const isActive = userQuestId === questId;
  if (!isActive && acceptedSet.has(questId)) {
    return res.status(403).send("This quest is already accepted by another user.");
  }

  res.render("quest-detail.ejs", {
    quest,
    loggedIn: true,
    username,
    userActiveQuestId: userQuestId || null,
  });
});

// Accept quest handler
app.post("/quest/:id/accept", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const questId = parseInt(req.params.id, 10);
  const quest = quests.find((q) => q.id === questId);
  const username = req.session.username;

  if (!quest) {
    return res.status(404).send("Quest not found.");
  }

  // User can't accept own quest
  if (quest.author === username) {
    return res.status(403).send("You cannot accept your own quest.");
  }

  // User can only have one active quest
  if (userActiveQuest[username]) {
    return res
      .status(403)
      .send(
        "You already have an active quest. Complete it before accepting another."
      );
  }

  // Assign active quest
  userActiveQuest[username] = questId;
  console.log(`${username} accepted quest ${quest.title} (ID: ${questId})`);
  res.redirect(`/quest`);
});

// ===========================================
// GUILD ROUTES
// ===========================================

// Guild listing page
app.get("/guild", (req, res) => {
  const { type = "All", sort = "Related" } = req.query;
  let list = Object.values(guilds);

  // Filtering
  if (type !== "All") {
    list = list.filter((g) => g.tags.includes(type));
  }
  
  // Sorting
  if (sort === "Most Members") {
    list.sort((a, b) => b.members - a.members);
  } else if (sort === "Most Posts") {
    list.sort((a, b) => b.posts - a.posts);
  }

  // Compute totals for showcase
  const totalMembers = list.reduce((sum, g) => sum + (g.members || 0), 0);
  const totalPosts = list.reduce((sum, g) => sum + (g.posts || 0), 0);

  res.render("guild.ejs", {
    guilds: list,
    currentType: type,
    currentSort: sort,
    availableTypes: ["All", "Game", "Movie", "Series", "Social", "Anime"],
    totalMembers,
    totalPosts,
    loggedIn: req.session.loggedIn,
    username: req.session.username,
  });
});

// Create guild page
app.get("/guild/create", (req, res) => {
  res.render("make-guild.ejs", {
    isLoggedIn: req.session.loggedIn,
  });
});

// Create guild handler
app.post(
  "/make-guild/request",
  upload.single("guildImage"),
  (req, res, next) => {
    try {
      if (!req.session.loggedIn) {
        return res.status(401).send("You must be logged in to create a guild.");
      }
      if (!req.file) {
        return res.status(400).send("An image is required.");
      }

      const { guildName, guildDescription, guildTags } = req.body;
      if (!guildName || !guildDescription) {
        return res.status(400).send("Name and description are required.");
      }
      if (guilds[guildName]) {
        return res.status(409).send("A guild with that name already exists.");
      }

      const tag = guildTags;
      const imageUrl = `/uploads/${req.file.filename}`;
      const leader = req.session.username;

      guilds[guildName] = {
        name: guildName,
        image: imageUrl,
        description: guildDescription,
        tags: tag,
        members: 1,
        posts: 0,
        quests: 0,
        leader,
        created: new Date().toISOString().split("T")[0],
      };
      guildMembers[guildName] = [leader];

      console.log("Guild created:", guildName, "by", leader);
      res.redirect(`/guild/${encodeURIComponent(guildName)}`);
    } catch (err) {
      next(err);
    }
  }
);

// Guild detail page
app.get("/guild/:guildName", (req, res) => {
  const { type = "All", sort = "Related" } = req.query;
  const guildName = req.params.guildName;
  const guild = guilds[guildName];
  if (!guild) return res.status(404).send("Guild not found");

  const members = guildMembers[guildName] || [];
  const posts = guild.posts || 0;

  // Turn blogs object into an array of { title, data, idx }
  const indexed = Object.entries(blogs)
    .map(([title, data], idx) => ({ title, data, idx }));

  // Filter only those with showInGuild = true AND whose author is in members
  const guildBlogs = indexed.filter(
    (item) => item.data.showInGuild && members.includes(item.data.author)
  );

  res.render("view-guild", {
    guild,
    members,
    posts,
    tags: guild.tags,
    guildBlogs,
    availableTypes: ["All", "Game", "Movie", "Series", "Social", "Anime"],
    currentType: type,
    currentSort: sort,
    loggedIn: req.session.loggedIn,
    username: req.session.username,
  });
});

// Join guild handler
app.post("/guild/:guildName/join", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(401).send("You must be logged in to join.");
  }

  const guildName = req.params.guildName;
  const user = req.session.username;
  const guild = guilds[guildName];
  const members = guildMembers[guildName] || [];

  if (!guild) {
    return res.status(404).send("Guild not found.");
  }

  // Check if user is already in any guild
  const alreadyInAGuild = Object.values(guildMembers).some((g) =>
    g.includes(user)
  );
  if (alreadyInAGuild) {
    return res.status(403).send("You can only join one guild.");
  }

  // Check if user leads a guild
  const leadsGuild = Object.values(guilds).some((g) => g.leader === user);
  if (leadsGuild) {
    return res
      .status(403)
      .send("You cannot join another guild if you already lead one.");
  }

  members.push(user);
  guildMembers[guildName] = members;
  guild.members = members.length;

  console.log(`${user} joined guild ${guildName}`);
  res.redirect(`/guild/${encodeURIComponent(guildName)}`);
});

// ===========================================
// ACCOUNT MANAGEMENT ROUTES
// ===========================================

// Account dashboard
app.get("/account", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const username = req.session.username;
  const activeId = userActiveQuest[username];
  const activeQuest = activeId ? quests.find((q) => q.id === activeId) : null;

  // Get completed quests IDs for this user
  const completedIds = userCompletedQuests[username] || [];
  const completedQuests = completedIds
    .map((id) => quests.find((q) => q.id === id))
    .filter(Boolean);

  res.render("account.ejs", {
    activeQuest,
    completedQuests,
  });
});

// Account pages
app.get("/account/posts", (req, res) => res.render("my-posts.ejs"));
app.get("/account/edit", (req, res) => res.render("account-edit.ejs"));
app.get("/account/change/password", (req, res) =>
  res.render("account-change-pas.ejs")
);
app.get("/account/change/username", (req, res) =>
  res.render("account-change-usr.ejs")
);

// Change username handler
app.post("/account/change/username", (req, res) => {
  const { currentPassword, newUsername } = req.body;
  const { username } = req.session;
  const user = users[username];
  
  if (!user || user.password !== currentPassword) {
    return res.status(401).send("Invalid current password.");
  }
  if (users[newUsername]) {
    return res.status(400).send("Username already taken.");
  }
  
  // Update username
  users[newUsername] = { ...user, password: user.password };
  delete users[username];
  req.session.username = newUsername;
  console.log("Username changed:", newUsername);
  res.redirect("/account/edit");
});

// Change password handler
app.post("/account/change/password", (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const { username } = req.session;
  const user = users[username];
  
  if (!user || user.password !== currentPassword) {
    return res.status(401).send("Invalid current password.");
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).send("New passwords do not match.");
  }
  
  // Update password
  user.password = newPassword;
  console.log("Password changed for:", username);
  res.redirect("/account/edit");
});

// ===========================================
// SERVER STARTUP
// ===========================================

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
