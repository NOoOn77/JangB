const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("src")); // 정적 파일 (index.html, script.js, style.css)

// 실제로는 DB를 써야 하지만, 예제라서 메모리 상에 하드코딩
// 관리자(당신)가 사전에 저장해 둔 사용자 목록
const users = [
  {
    username: "user1",
    password: "pass1",
    info: "user1에 대한 관리자 메모입니다."
  },
  {
    username: "user2",
    password: "pass2",
    info: "user2에 대한 중요 정보입니다."
  }
];

// 로그인 API
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ ok: false, message: "아이디 또는 비밀번호가 올바르지 않습니다." });
  }

  // 실제 서비스라면 여기서 JWT 같은 토큰을 내려주지만,
  // 예제에서는 단순히 info만 내려줍니다.
  return res.json({
    ok: true,
    username: user.username,
    info: user.info
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

