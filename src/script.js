const form = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const userInfoSection = document.getElementById("user-info");
const displayUsername = document.getElementById("display-username");
const displayInfo = document.getElementById("display-info");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  errorMessage.textContent = "";

  try {
    const res = await fetch("http://34.64.141.205:8080/api/login", {
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
    displayUsername.textContent = data.username;
    displayInfo.textContent = data.info;

    userInfoSection.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    errorMessage.textContent = err.message || "알 수 없는 오류가 발생했습니다.";
    userInfoSection.classList.add("hidden");
  }
});

