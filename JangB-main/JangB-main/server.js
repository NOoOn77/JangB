const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("src")); // 정적 파일 (index.html, script.js, style.css)

// 구글 스프레드시트 Web App URL (환경변수 또는 직접 설정)
// 이 URL은 Google Apps Script에서 생성됩니다 (설정 가이드 참조)
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycby8DVwrYb17HasHSN8Xc6GM4XdOJgvYefoS--Ipfvo4XOvugrFyTmwEFiZd7eImCBw/exec";

// 상태 확인 (Apache 프록시/Node 연결 확인용)
app.get("/api/health", (req, res) => {
  return res.json({
    ok: true,
    service: "equipment-rental",
    time: new Date().toISOString()
  });
});

// 장비 대여 신청 API
app.post("/api/rental", async (req, res) => {
  const { name, rentalDate, returnDate, equipmentType, equipmentItem } = req.body;

  // 유효성 검사
  if (!name || !rentalDate || !returnDate || !equipmentType || !equipmentItem) {
    return res.status(400).json({
      ok: false,
      message: "모든 항목을 입력해주세요."
    });
  }

  // 구글 스프레드시트 URL이 설정되지 않은 경우
  if (!GOOGLE_SCRIPT_URL) {
    console.log("대여 신청 데이터:", {
      name,
      rentalDate,
      returnDate,
      equipmentType,
      equipmentItem,
      timestamp: new Date().toISOString()
    });
    
    return res.json({
      ok: true,
      message: "대여 신청이 완료되었습니다. (구글 스프레드시트 연동 전 - 콘솔에 로그 출력)",
      data: { name, rentalDate, returnDate, equipmentType, equipmentItem }
    });
  }

  // 구글 스프레드시트로 데이터 전송  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        name,
        rentalDate,
        returnDate,
        equipmentType,
        equipmentItem,
        timestamp: new Date().toISOString()
      })
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text();
    const bodyPreview = bodyText.slice(0, 700);

    console.log("[GoogleScript] status:", response.status, response.statusText);
    console.log("[GoogleScript] content-type:", contentType);
    console.log("[GoogleScript] body preview:", bodyPreview);

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        message: `구글 스프레드시트(Web App) 응답 오류: ${response.status} ${response.statusText}`,
        details: { contentType, bodyPreview }
      });
    }

    let result = null;
    try {
      result = JSON.parse(bodyText);
    } catch {
      result = null;
    }

    if (!result) {
      // 보통 배포 권한이 제한되어 있으면 HTML 로그인/권한 페이지가 내려옵니다.
      return res.status(502).json({
        ok: false,
        message:
          "구글 스프레드시트(Web App) 응답이 JSON이 아닙니다. Apps Script 배포 설정(액세스: 모든 사용자)과 URL을 확인하세요.",
        details: { contentType, bodyPreview }
      });
    }
    
    return res.json({
      ok: true,
      message: "장비 대여 신청이 완료되었습니다.",
      data: result
    });

  } catch (error) {
    console.error("구글 스프레드시트 연동 오류:", error);
    return res.status(500).json({
      ok: false,
      message: "데이터 저장 중 오류가 발생했습니다.",
      details: {
        error: error?.message || String(error),
        hint:
          "서버 콘솔 로그의 [GoogleScript] 내용을 확인하세요. (권한/URL/리다이렉트/네트워크 문제일 수 있습니다.)"
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (!GOOGLE_SCRIPT_URL) {
    console.log("⚠️  구글 스프레드시트 URL이 설정되지 않았습니다.");
    console.log("   환경변수 GOOGLE_SCRIPT_URL을 설정하거나 server.js를 수정하세요.");
  }
});
