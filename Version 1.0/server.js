import express from "express";
import path from "path";
import {fileURLToPath} from "url";

const users = [];
let loginUserName = '';
let loginUsername = '';
let loginUserEmail = '';
let loginUserPass = '';
let isLoggedIn = false;
let blogs = [];

let userBlogPostList = [];

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateRandomNumber() {
    // Generate a random number between 10000 and 99999 (5-digit number)
    return Math.floor(10000 + Math.random() * 90000);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("index", { isLoggedIn, loginUserName });
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup/submit", (req, res) => {
    const { name, email, username, password, confirmPassword } = req.body;

    console.log('Form Data Submitted:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Confirm Password:', confirmPassword);

    const userExists = users.some(user => user.username === username);

    if (confirmPassword !== password) {
        return res.render('signup', { alertM: "Passwords do not match." });
    }
    if (userExists) {
        return res.render('signup', { alertM: "Username already exists." });
    }

    users.push({ username, name, email, pass: password });
    console.log(users);

    return res.redirect("/login"); // Redirect to login page after successful signup
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login/submit", (req, res) => {
    const { username, password } = req.body;
    const user = users.find(user => user.username === username && user.pass === password);

    if (user) {
        isLoggedIn = true;
        loginUserName = user.name;
        loginUserEmail = user.email;
        loginUsername = user.username;
        loginUserPass = user.pass;

        return res.redirect("/"); // Redirect to home page after successful login
    } else {
        return res.render("login", { alertM: "Failed to login, make sure the username or password is correct!" });
    }
});

app.get("/profile/setting/logout", (req,res) => {
    isLoggedIn = false;
    res.redirect("/");
})

app.get("/blogs", (req, res) => {
    let userBlogPostList = [];
    blogs.forEach(blog => {
        userBlogPostList.push([blog.blog_title, blog.blog_content, blog.username]);
    });

    // Render the list of blogs
    res.render("blog", { blogList: userBlogPostList });
});

app.get("/blog/:title", (req, res) => {
    const blogTitle = req.params.title;
    const blog = blogs.find(b => b.blog_title === blogTitle);

    if (blog) {
        res.render("blog-single", { username:blog.user, blogTitle:blog.blog_title, blogContent:blog.blog_content });
    } else {
        res.status(404).send("Blog not found");
    }
});


app.get("/profile", (req,res) => {
    userBlogPostList = [];
    blogs.forEach(blog => {
        if(blog.user === loginUsername) { userBlogPostList.push([blog.blog_title,blog.blog_content]) }
    });
    res.render("profile", {username: loginUsername, blogPostList: userBlogPostList, blogNumber:userBlogPostList.length});
})

app.get("/upload",(req,res) => {
   res.render("post", {username:loginUsername})
})

app.get("/profile/setting", (req,res) => {
    res.render("usersettings", {userName:loginUserName, email:loginUserEmail, username:loginUsername});
})

app.get("/profile/setting/change", (req,res) =>{
    res.render("edit-profile", {userName:loginUserName, email:loginUserEmail, username:loginUsername});
})

app.post("/profile/setting/change/submit", (req,res) => {
    const { newName, newPass ,newEmail, confirmPassword } = req.body;
    if(confirmPassword === loginUserPass) {
        const userI = users.findIndex(user => user.username === loginUsername);
        if (newEmail.length > 0) users[userI].email = newEmail;
        if (newName.length > 0) users[userI].name = newName;
        if (newPass.length > 0) users[userI].pass = newPass;
        isLoggedIn = false;
        res.redirect("/login");
    }
})

app.post("/upload/publish", (req,res) => {
    const { blogTitle , blogContent } = req.body;
    if(isLoggedIn) {
        blogs.push({
            user: loginUsername,
            blog_title: blogTitle,
            blog_content: blogContent
        });
        res.redirect("/profile");
    } else {
        res.redirect("/");
    }
})

app.get("/forget/password", (req, res) => {
    res.render("forgot");
});



app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
})
