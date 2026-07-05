const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.urlencoded({ extended: true }));

// 🗄️ دیتابیس
const db = new sqlite3.Database("./lab.db");

// 🧱 جدول‌ها
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            password TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            content TEXT
        )
    `);
});

// 🏠 صفحه اصلی
app.get("/", (req, res) => {
    res.send(`
        <h1>🧪 Security Lab</h1>

        <h2>Register</h2>
        <form method="POST" action="/register">
            <input name="username" placeholder="username">
            <input name="password" placeholder="password">
            <button>Register</button>
        </form>

        <hr>

        <h2>Login (SQLi Vulnerable)</h2>
        <form method="POST" action="/login">
            <input name="username">
            <input name="password">
            <button>Login</button>
        </form>

        <hr>

        <h2>Post Comment (XSS Vulnerable)</h2>
        <form method="POST" action="/post">
            <input name="user_id" placeholder="user id">
            <input name="content" placeholder="message">
            <button>Send</button>
        </form>
    `);
});


// 🧑 REGISTER (safe-ish)
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, password],
        () => {
            res.send("Registered ✅");
        }
    );
});


// 💣 SQL INJECTION LAB (intentionally vulnerable)
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const query = `
        SELECT * FROM users 
        WHERE username = '${username}' 
        AND password = '${password}'
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.log("DB error:", err);
            return res.send("Database error ❌");
        }

        if (!rows || rows.length === 0) {
            return res.send("Login failed ❌");
        }

        res.send("Login success 🔓 (SQLi possible)");
    });
});


// 💥 XSS LAB
app.post("/post", (req, res) => {
    const { user_id, content } = req.body;

    db.run(
        "INSERT INTO posts (user_id, content) VALUES (?, ?)",
        [user_id, content],
        () => res.send("Posted ✅")
    );
});


// 📄 View posts (XSS trigger point)
app.get("/posts", (req, res) => {
    db.all("SELECT * FROM posts", (err, rows) => {

        let html = "<h1>Posts</h1>";

        rows.forEach(p => {
            // ❌ XSS vulnerability (no escaping)
            html += `<p>User ${p.user_id}: ${p.content}</p>`;
        });

        res.send(html);
    });
});


// 🚨 IDOR LAB
app.get("/profile/:id", (req, res) => {
    const id = req.params.id;

    db.get(
        "SELECT * FROM users WHERE id = " + id, // ❌ IDOR + SQL injection risk
        (err, user) => {
            if (user) {
                res.send(`
                    <h1>Profile</h1>
                    <p>ID: ${user.id}</p>
                    <p>User: ${user.username}</p>
                `);
            } else {
                res.send("Not found ❌");
            }
        }
    );
});


// 🚀 start
app.listen(3000, () => {
    console.log("🧪 Lab running on http://localhost:3000");
});