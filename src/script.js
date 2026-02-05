const form = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const userInfoSection = document.getElementById("user-info");
const displayUsername = document.getElementById("display-username");
const displayInfo = document.getElementById("display-info");
const loginView = document.getElementById("login-view");
const logoutBtn = document.getElementById("logout-btn");
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");

function showLoginView() {
  if (pageTitle) pageTitle.textContent = "로그인";
  if (pageSubtitle)
    pageSubtitle.textContent =
      "대여 장비(쌍안경/망원경) 안내 문구를 확인하려면 로그인하세요.";

  loginView?.classList.remove("hidden");
  userInfoSection.classList.add("hidden");
  form.classList.remove("hidden");
}

function showMainView({ username, info }) {
  displayUsername.textContent = username || "";
  displayInfo.textContent = info || "";

  if (pageTitle) pageTitle.textContent = "대여 안내";
  if (pageSubtitle)
    pageSubtitle.textContent =
      "관리자가 입력한 안내 문구(예: 장비 비밀번호)를 확인할 수 있습니다.";

  loginView?.classList.add("hidden");
  form.classList.add("hidden");
  userInfoSection.classList.remove("hidden");
}

function clearLoginInputs() {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  if (usernameInput) usernameInput.value = "";
  if (passwordInput) passwordInput.value = "";
}

// 새로고침해도 메인 화면 유지(선택 기능)
try {
  const saved = sessionStorage.getItem("loginUserInfo");
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && (parsed.username || parsed.info)) {
      showMainView(parsed);
    } else {
      showLoginView();
    }
  } else {
    showLoginView();
  }
} catch {
  showLoginView();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  errorMessage.textContent = "";

  try {
    // 같은 호스트(34.64.141.205)의 /api/login 으로만 보내고,
    // Apache가 내부에서 8080 포트의 Node 서버로 프록시하게 만든다.
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "로그인에 실패했습니다.");
    }

    const data = await res.json();
    sessionStorage.setItem(
      "loginUserInfo",
      JSON.stringify({ username: data.username, info: data.info })
    );
    showMainView({ username: data.username, info: data.info });
  } catch (err) {
    console.error(err);
    errorMessage.textContent = err.message || "알 수 없는 오류가 발생했습니다.";
    showLoginView();
  }
});

logoutBtn?.addEventListener("click", () => {
  sessionStorage.removeItem("loginUserInfo");
  errorMessage.textContent = "";
  clearLoginInputs();
  showLoginView();
});

