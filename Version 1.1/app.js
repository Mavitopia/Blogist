import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Last login
let lastLogin = null;
// In‑memory “DB” for demo purposes
let users = {
  // e.g. "mavito": { email: "mavito@gmail.com", password: "mavito123" }
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("./public"));
app.use(express.static(path.join(__dirname, "/public/uploads")));
app.use("/uploads", express.static(path.join(__dirname, "/public/uploads")));
// 1. Tell Express we’re using EJS
app.set("view engine", "ejs");

// 2. Configure sessions
app.use(
  session({
    secret: "replace_this_with_a_long_random_string!",
    resave: false,
    saveUninitialized: false,
  })
);

// 3. Make session data available in every view via res.locals
app.use((req, res, next) => {
  res.locals.loggedIn = req.session.loggedIn || false;
  res.locals.username = req.session.username || null;
  res.locals.email = req.session.email || null;
  next();
});

// 4. Public GET routes (no need to pass username/loggedIn—locals covers it)
app.get("/", (req, res) => res.render("index.ejs"));
app.get("/quest", (req, res) => res.render("quest.ejs"));
app.get("/guild", (req, res) => {
  res.render("guild.ejs", {
    guilds: Object.values(guilds), // now an Array<guildObject>
  });
});

app.get("/blog", (req, res) => {
  res.render("blog.ejs", {
    blogs: Object.entries(blogs), // convert object to array for looping
  });
});

app.get("/about", (req, res) => res.render("about.ejs"));
app.get("/login", (req, res) => res.render("login.ejs"));
app.get("/forgot", (req, res) => res.render("forgot.ejs"));
app.get("/signup", (req, res) => res.render("signup.ejs"));
app.get("/privacy-info", (req, res) => res.render("privacy.ejs"));

app.get("/guild/create", (req, res) => {
  res.render("make-guild.ejs");
});

app.get("/terms-info", (req, res) => res.render("terms.ejs"));
app.get("/contact-info", (req, res) => res.render("contact.ejs"));

app.get("/make-blog", (req, res) => {
  res.render("make-blog.ejs", {
    isLoggedIn: req.session.loggedIn,
  });
});

app.get("/account", (req, res) => res.render("account.ejs"));
app.get("/account/posts", (req, res) => res.render("my-posts.ejs"));
app.get("/account/edit", (req, res) => res.render("account-edit.ejs"));
app.get("/account/change/password", (req, res) =>
  res.render("account-change-pas.ejs")
);
app.get("/account/change/username", (req, res) =>
  res.render("account-change-usr.ejs")
);



// 5. SIGN UP
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

// 6. LOGIN
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

// 7. LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Handle post requests for changing username and password
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

//Handle post blog
let blogs = {};
// e.g. "blog1": { title: "My First Blog", content: "Hello World!", author: "mavito" }

app.post("/blog/create", (req, res) => {
  const title = req.body.title;
  const category = req.body.category;
  const description = req.body.description;
  const content = req.body.content;
  const showInGuild = req.body.showInGuild === "on"; // If checkbox, convert to boolean
  const allowComments = req.body.allowComments === "on";
  const author = lastLogin; // Or req.session.username if using sessions
  const lengthCategory = req.body.lengthCategory;

  // Now do something with the blog data (e.g., save to DB or array)
  console.log({
    title,
    category,
    description,
    content,
    showInGuild,
    allowComments,
    author,
  });

  blogs[title] = {
    category: category,
    description: description,
    content: content,
    allowComments: allowComments,
    showInGuild: showInGuild,
    author: author,
    date: new Date().toLocaleDateString(), // optional
    lengthCategory: lengthCategory,
  };

  // Redirect or render something
  res.redirect("/blog");
});

// 8. Individual blog read page
app.get("/blog/read/:idx", (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  const entries = Object.entries(blogs);
  // entries[idx] gives you the exact [title, blogData] pair
  const [title, blog] = entries[idx];
  res.render("blog-read.ejs", { title, blog });
});

// MULTER

import multer from "multer";
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, "/public/uploads"));
  },
  filename(req, file, cb) {
    // e.g. prepend a timestamp for uniqueness
    const unique = Date.now() + path.extname(file.originalname);
    cb(null, unique);
  },
});
const upload = multer({ storage });

// HANDLE GUILD REQUESTS
let guilds = {};

app.post("/make-guild/request", upload.single("guildImage"), (req, res) => {
  const filename = req.file.filename;
  const imageUrl = `/uploads/${filename}`;
  console.log(imageUrl);

  const { guildName, guildDescription, guildTags } = req.body;

  guilds[guildName] = {
    name: guildName,
    image: imageUrl,
    description: guildDescription,
    tag: [guildTags],
    members: 1,
    posts: 0,
    created: new Date().toISOString().split("T")[0],
  };

  res.redirect("/guild");
});



// In-memory member tracking
let guildMembers = {}; // { guildName: [username, ...] }

// When creating a guild, store the leader and initialize its member list
app.post(
    "/make-guild/request",
    upload.single('guildImage'),
    (req, res) => {
      const filename = req.file.filename;
      const imageUrl = `/uploads/${filename}`;
      const { guildName, guildDescription, guildTags } = req.body;
      const leader = req.session.username;

      guilds[guildName] = {
        name: guildName,
        image: imageUrl,
        description: guildDescription,
        tags: [guildTags],
        members: 1,
        posts: 0,
        quests: 0,
        leader,
        created: new Date().toISOString().split('T')[0]
      };

      // Initialize membership with the leader
      guildMembers[guildName] = [leader];

      res.redirect(`/guild/${guildName}`);
    }
);


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
