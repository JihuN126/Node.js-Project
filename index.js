const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require('express-session');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "yoo54485788@", 
    database: "user_management",
});

db.connect((err) => {
    if (err) {
        console.error("MySQL 연결 실패:", err);
        process.exit(1);
    }
    console.log("MySQL 연결 성공!");
});

app.get("/api/check-login", (req, res) => {
    if (req.session.userId) {
        return res.json({ loggedIn: true });
    }
    return res.json({ loggedIn: false });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/account", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});


app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/register", async (req, res) => {
    const { email, name, username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (email, name, username, password) VALUES (?, ?, ?, ?)`;

        db.query(query, [email, name, username, hashedPassword], (err) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.send("이미 등록된 사용자입니다.");
                }
                return res.send("회원가입 중 오류가 발생했습니다.");
            }
            res.redirect("/login");
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 로그인 처리
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const query = `SELECT * FROM users WHERE username = ?`;
    db.query(query, [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).send("아이디 또는 비밀번호를 확인하세요.");
        }

        const user = results[0];

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).send("아이디 또는 비밀번호를 확인하세요.");
        }

        // 세션에 userId와 username 저장
        req.session.userId = user.id;
        req.session.username = user.username;  // username도 세션에 저장
        res.redirect("/");
    });
});

// 로그아웃 처리
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("로그아웃 중 오류가 발생했습니다.");
        }
        res.redirect('/');
    });
});

app.get("/board", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "board.html"));
});

app.get("/new", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "new.html"));
});

app.post("/new", upload.single('image'), (req, res) => {
    const { title, content } = req.body;
    const userId = req.session.userId;
    const image = req.file ? req.file.filename : null; 

    if (!userId) {
        return res.status(401).send("로그인 후 글을 작성할 수 있습니다.");
    }

    const query = `SELECT username FROM users WHERE id = ?`;
    db.query(query, [userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).send("사용자 정보를 가져오는 중 오류가 발생했습니다.");
        }

        const author = results[0].username;
        const insertQuery = `INSERT INTO posts (title, content, author, image) VALUES (?, ?, ?, ?)`;

        db.query(insertQuery, [title, content, author, image], (err) => {
            if (err) {
                return res.status(500).send("게시글 작성 중 오류가 발생했습니다.");
            }
            res.redirect("/board");
        });
    });
});

// 게시글 목록 API
app.get("/api/posts", (req, res) => {
    const query = `SELECT * FROM posts`;
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send("게시글 데이터를 불러오는 중 오류가 발생했습니다.");
        }
        res.json(results);
    });
});

// 게시글 검색 API
app.get("/api/search", (req, res) => {
    const searchQuery = req.query.query;
    const query = `SELECT * FROM posts WHERE title LIKE ? OR content LIKE ?`;

    db.query(query, [`%${searchQuery}%`, `%${searchQuery}%`], (err, results) => {
        if (err) {
            return res.status(500).send("검색 중 오류가 발생했습니다.");
        }
        res.json(results);
    });
});

// 게시글 수정 화면 라우트 (ID 기반으로 수정할 수 있도록 경로 수정)
app.get("/edit/:id", (req, res) => {
    const postId = req.params.id; // 게시글 ID
    const username = req.session.username; // 로그인한 사용자의 username

    const query = `SELECT * FROM posts WHERE id = ?`;
    db.query(query, [postId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send("게시글을 찾을 수 없습니다.");
        }

        const post = results[0];
        if (post.author !== username) { // 작성자와 로그인한 사용자의 username 비교
            return res.status(403).send("수정 권한이 없습니다.");
        }

        res.send(`
            <h1>게시글 수정</h1>
            <form action="/edit/${post.id}" method="POST" enctype="multipart/form-data">
                <input type="hidden" name="postId" value="${post.id}">
                <label>제목: <input type="text" name="title" value="${post.title}" required></label><br>
                <label>내용: <textarea name="content" required>${post.content}</textarea></label><br>
                <label>사진: <input type="file" name="image"></label><br>
                ${post.image ? `<img src="/uploads/${post.image}" alt="현재 이미지" width="100" />` : ''}
                <button type="submit">수정</button>
            </form>
            <form action="/delete/${post.id}" method="POST">
                <button type="submit" style="color:red;">삭제</button>
            </form>
        `);
    });
});

// 게시글 수정 처리
app.post("/edit/:id", upload.single('image'), (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    const image = req.file ? req.file.filename : null;

    const query = `UPDATE posts SET title = ?, content = ?, image = ? WHERE id = ?`;
    db.query(query, [title, content, image, postId], (err) => {
        if (err) {
            return res.status(500).send("게시글 수정 중 오류가 발생했습니다.");
        }
        res.redirect("/board");
    });
});
// 게시글 삭제 처리
app.post("/delete/:id", (req, res) => {
    // console.log('Attempting to delete post with ID:', req.params.id);
    const postId = req.params.id;
    const query = `DELETE FROM posts WHERE id = ?`;
    db.query(query, [postId], (err, result) => {
        if (err) {
            console.error('Error during deletion:', err);
            return res.status(500).send("게시글 삭제 중 오류가 발생했습니다.");
        }
        if (result.affectedRows === 0) {
            console.log('No post found with ID:', postId);
            return res.status(404).send("해당 게시글이 존재하지 않습니다.");
        }
        //console.log('Post deleted successfully:', postId);
        res.redirect("/board");
    });
});


// 프로필 화면 라우트
app.get("/profile", (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send("로그인 후 이용할 수 있습니다.");
    }

    const query = `
        SELECT users.username, COUNT(posts.id) AS postCount, GROUP_CONCAT(posts.id) AS postIds, GROUP_CONCAT(posts.title) AS posts
        FROM users
        LEFT JOIN posts ON posts.author = users.username
        WHERE users.id = ?
        GROUP BY users.id
    `;

    db.query(query, [userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).send("사용자 정보를 불러오는 중 오류가 발생했습니다.");
        }

        const user = results[0];
        let postsList = "작성한 게시글이 없습니다.";
        if (user.postIds) {
            const postIds = user.postIds.split(","); // 게시글 ID 목록
            const postTitles = user.posts.split(","); // 게시글 제목 목록

            postsList = "";
            for (let i = 0; i < postIds.length; i++) {
                postsList += `<li><a href="/post/${postIds[i]}">${postTitles[i]}</a></li>`;
            }
        }

        res.send(`
            <h1>${user.username}님의 프로필</h1>
            <p>작성한 게시글 개수: ${user.postCount}</p>
            <ul>${postsList}</ul>
            <a href="/">초기화면으로 이동</a>
            <a href="/logout">로그아웃</a>
        `);
    });
});


// 게시글 세부 정보 화면 라우트
app.get("/post/:id", (req, res) => {
    const postId = req.params.id;

    const query = `SELECT * FROM posts WHERE id = ?`;
    db.query(query, [postId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send("게시글을 찾을 수 없습니다.");
        }

        const post = results[0];
        res.send(`
            <h1>${post.title}</h1>
            <p>${post.content}</p>
            <p>작성자: ${post.author}</p>
            ${post.image ? `<img src="/uploads/${post.image}" alt="이미지">` : ''}
            <a href="/board">게시판으로 돌아가기</a>
        `);
    });
});

// 서버 실행
app.listen(3000, () => {
    console.log("서버 실행 중: http://localhost:3000");
});
