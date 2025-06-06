import express from "express";
import bodyParser from "body-parser";

const port = 3000;
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/quest", (req, res) => {
  res.render("quest.ejs");
});

app.get("/guild", (req, res) => {
  res.render("guild.ejs");
});

app.get("/blog", (req, res) => {
  res.render("blog.ejs");
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
