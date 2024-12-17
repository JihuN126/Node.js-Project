const API_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    // 사용자 등록
    document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("register-email").value;
        const name = document.getElementById("register-name").value;
        const username = document.getElementById("register-username").value;
        const password = document.getElementById("register-password").value;

        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name, username, password }),
        });

        if (response.ok) {
            alert("등록 성공!");
            showHome();
        } else {
            alert("등록 실패: " + (await response.text()));
        }
    });

    // 로그인
    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;

        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            alert("로그인 성공!");
            showBoard();
        } else {
            alert("로그인 실패: " + (await response.text()));
        }
    });

    // 게시글 검색
    document.getElementById("search-button").addEventListener("click", async () => {
        const searchQuery = document.getElementById("search").value;

        const response = await fetch(`${API_URL}/posts?search=${searchQuery}`);
        const posts = await response.json();

        const postList = document.getElementById("post-list");
        postList.innerHTML = "";
        posts.forEach((post) => {
            const li = document.createElement("li");
            li.textContent = `${post.title} by ${post.author}`;
            postList.appendChild(li);
        });
    });
});

// 화면 전환 함수
function showHome() {
    document.getElementById("home").style.display = "block";
    document.getElementById("register").style.display = "none";
    document.getElementById("board").style.display = "none";
}

function showRegister() {
    document.getElementById("home").style.display = "none";
    document.getElementById("register").style.display = "block";
    document.getElementById("board").style.display = "none";
}

function showBoard() {
    document.getElementById("home").style.display = "none";
    document.getElementById("register").style.display = "none";
    document.getElementById("board").style.display = "block";
}
