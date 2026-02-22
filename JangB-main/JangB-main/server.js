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
const GOOGLE_SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycby8DVwrYb17HasHSN8Xc6GM4XdOJgvYefoS--Ipfvo4XOvugrFyTmwEFiZd7eImCBw/exec";

// 상태 확인 (Apache 프록시/Node 연결 확인용)
app.get("/api/health", (req, res) => {
  return res.json({
    ok: true,
    service: "equipment-rental",
    time: new Date().toISOString()
  });
});

// 현재 대여 현황 조회 API (구글 스프레드시트 → 읽기)
app.get("/api/rentals", async (req, res) => {
  if (!GOOGLE_SCRIPT_URL) {
    return res.status(500).json({
      ok: false,
      message:
        "구글 스프레드시트 Web App URL이 설정되지 않았습니다. GOOGLE_SCRIPT_URL 환경변수 또는 server.js를 확인해주세요."
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text();
    const bodyPreview = bodyText.slice(0, 700);

    console.log("[GoogleScript][LIST] status:", response.status, response.statusText);
    console.log("[GoogleScript][LIST] content-type:", contentType);
    console.log("[GoogleScript][LIST] body preview:", bodyPreview);

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        message: `구글 스프레드시트(Web App) 목록 조회 오류: ${response.status} ${response.statusText}`,
        details: { contentType, bodyPreview }
      });
    }

    let result = null;
    try {
      result = JSON.parse(bodyText);
    } catch {
      result = null;
    }

    if (!result || (!Array.isArray(result.rows) && !Array.isArray(result.data))) {
      return res.status(502).json({
        ok: false,
        message:
          "구글 스프레드시트(Web App) 응답 형식이 올바르지 않습니다. doGet에서 rows(또는 data) 배열을 JSON으로 반환하도록 수정해주세요.",
        details: { contentType, bodyPreview }
      });
    }

    const rows = Array.isArray(result.rows) ? result.rows : result.data;

    return res.json({
      ok: true,
      rows
    });
  } catch (error) {
    console.error("구글 스프레드시트 대여 목록 조회 오류:", error);
    return res.status(500).json({
      ok: false,
      message: "대여 현황을 불러오는 중 오류가 발생했습니다.",
      details: {
        error: error?.message || String(error)
      }
    });
  }
});

// 장비 대여 신청 API (여러 기종/여러 장비 지원)
app.post("/api/rental", async (req, res) => {
  const { name, studentId, rentalDate, returnDate, equipmentType, equipmentItem, equipmentItems } = req.body;

  // equipmentItems 배열(신규 형식: { equipmentType, equipmentItem }[]) 또는
  // 단일 equipmentItem 문자열(기존 형식)을 모두 지원
  const itemsToRent =
    Array.isArray(equipmentItems) && equipmentItems.length > 0
      ? equipmentItems
      : equipmentItem
      ? [{ equipmentType, equipmentItem }]
      : [];

  // 유효성 검사
  if (!name || !rentalDate || !returnDate || itemsToRent.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "모든 항목을 입력하고 최소 하나 이상의 장비를 선택해주세요."
    });
  }

  // 구글 스프레드시트 연동 시 이름·학번 검증을 위해 학번 필수
  if (GOOGLE_SCRIPT_URL) {
    const sid = typeof studentId === "string" ? studentId.trim() : "";
    if (!sid) {
      return res.status(400).json({
        ok: false,
        message: "학번을 입력해주세요. 등록된 이름과 학번이 일치할 때만 대여할 수 있습니다."
      });
    }
  }

  // 구글 스프레드시트 URL이 설정되지 않은 경우
  if (!GOOGLE_SCRIPT_URL) {
    console.log("대여 신청 데이터:", {
      name,
      rentalDate,
      returnDate,
      items: itemsToRent,
      timestamp: new Date().toISOString()
    });

    return res.json({
      ok: true,
      message:
        "대여 신청이 완료되었습니다. (구글 스프레드시트 연동 전 - 콘솔에 로그 출력)",
      data: { name, rentalDate, returnDate, items: itemsToRent }
    });
  }

  // 각 장비에 대해 순차적으로 처리
  const results = [];
  const errors = [];

  for (const item of itemsToRent) {
    // item이 문자열인 경우(기존 형식)와 객체인 경우(신규 형식) 모두 처리
    const itemName = typeof item === "string" ? item : item.equipmentItem;
    const itemType =
      typeof item === "string"
        ? equipmentType // 기존 형식에서는 공통 equipmentType 사용
        : item.equipmentType;

    if (!itemName || !itemType) {
      errors.push({
        equipmentItem: itemName || item,
        error: "장비 정보가 올바르지 않습니다."
      });
      continue;
    }

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
          studentId: (typeof studentId === "string" ? studentId.trim() : "") || undefined,
          rentalDate,
          returnDate,
          equipmentType: itemType,
          equipmentItem: itemName,
          timestamp: new Date().toISOString()
        })
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      const bodyText = await response.text();
      const bodyPreview = bodyText.slice(0, 700);

      console.log(
        `[GoogleScript][${itemType}/${itemName}] status:`,
        response.status,
        response.statusText
      );
      console.log("[GoogleScript] content-type:", contentType);
      console.log("[GoogleScript] body preview:", bodyPreview);

      if (!response.ok) {
        errors.push({
          equipmentItem: itemName,
          error: `구글 스프레드시트(Web App) 응답 오류: ${response.status} ${response.statusText}`
        });
        continue;
      }

      let result = null;
      try {
        result = JSON.parse(bodyText);
      } catch {
        result = null;
      }

      if (!result) {
        errors.push({
          equipmentItem: itemName,
          error:
            "구글 스프레드시트(Web App) 응답이 JSON이 아닙니다. Apps Script 설정을 확인하세요."
        });
        continue;
      }

      // Apps Script에서 success: false로 내려온 경우
      if (result && result.success === false) {
        errors.push({
          equipmentItem: itemName,
          error:
            result.message ||
            "대여 신청 처리 중 오류가 발생했습니다. (구글 스프레드시트 Web App 응답)"
        });
        continue;
      }

      results.push({ equipmentItem: itemName, equipmentType: itemType, success: true, data: result });
    } catch (error) {
      console.error(`구글 스프레드시트 연동 오류 [${itemType}/${itemName}]:`, error);
      errors.push({
        equipmentItem: itemName,
        error: error?.message || String(error)
      });
    }
  }

  // 일부 실패한 경우
  if (errors.length > 0 && results.length === 0) {
    return res.status(500).json({
      ok: false,
      message: "모든 장비 대여 신청에 실패했습니다.",
      details: { errors }
    });
  }

  // 일부 성공한 경우
  if (errors.length > 0) {
    return res.status(207).json({
      ok: true,
      message: `${results.length}개의 장비는 대여되었지만, ${errors.length}개의 장비 대여에 실패했습니다.`,
      results,
      errors
    });
  }

  // 모두 성공한 경우
  return res.json({
    ok: true,
    message: `${results.length}개의 장비 대여 신청이 완료되었습니다.`,
    results
  });
});

// 장비 반납 – 이름으로 대여 내역 조회
app.post("/api/returns/preview", async (req, res) => {
  const { name } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      ok: false,
      message: "이름을 입력해주세요."
    });
  }

  if (!GOOGLE_SCRIPT_URL) {
    return res.status(500).json({
      ok: false,
      message:
        "구글 스프레드시트 Web App URL이 설정되지 않았습니다. GOOGLE_SCRIPT_URL 환경변수 또는 server.js를 확인해주세요."
    });
  }

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
        action: "previewReturn",
        name: name.trim()
      })
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text();
    const bodyPreview = bodyText.slice(0, 700);

    console.log("[GoogleScript][RETURN_PREVIEW] status:", response.status, response.statusText);
    console.log("[GoogleScript][RETURN_PREVIEW] content-type:", contentType);
    console.log("[GoogleScript][RETURN_PREVIEW] body preview:", bodyPreview);

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        message: `구글 스프레드시트(Web App) 반납 조회 오류: ${response.status} ${response.statusText}`,
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
      return res.status(502).json({
        ok: false,
        message: "구글 스프레드시트(Web App) 응답이 JSON이 아닙니다.",
        details: { contentType, bodyPreview }
      });
    }

    if (result.success === false) {
      return res.status(409).json({
        ok: false,
        message: result.message || "반납 조회 처리 중 오류가 발생했습니다.",
        details: result.error ? { error: result.error } : undefined
      });
    }

    const rows = Array.isArray(result.rows) ? result.rows : result.data || [];

    return res.json({
      ok: true,
      rows
    });
  } catch (error) {
    console.error("구글 스프레드시트 반납 조회 오류:", error);
    return res.status(500).json({
      ok: false,
      message: "반납 조회 중 오류가 발생했습니다.",
      details: {
        error: error?.message || String(error)
      }
    });
  }
});

// 장비 반납 – 실제 삭제 수행 (이름·학번이 세 번째 시트와 일치할 때만 처리)
app.post("/api/returns/confirm", async (req, res) => {
  const { name, studentId, selectedItems } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      ok: false,
      message: "이름이 올바르지 않습니다."
    });
  }

  if (!studentId || typeof studentId !== "string" || !studentId.trim()) {
    return res.status(400).json({
      ok: false,
      message: "학번을 입력해주세요."
    });
  }

  if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "반납할 장비를 최소 하나 이상 선택해주세요."
    });
  }

  if (!GOOGLE_SCRIPT_URL) {
    return res.status(500).json({
      ok: false,
      message:
        "구글 스프레드시트 Web App URL이 설정되지 않았습니다. GOOGLE_SCRIPT_URL 환경변수 또는 server.js를 확인해주세요."
    });
  }

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
        action: "confirmReturn",
        name: name.trim(),
        studentId: studentId.trim(),
        selectedItems: selectedItems
      })
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text();
    const bodyPreview = bodyText.slice(0, 700);

    console.log("[GoogleScript][RETURN_CONFIRM] status:", response.status, response.statusText);
    console.log("[GoogleScript][RETURN_CONFIRM] content-type:", contentType);
    console.log("[GoogleScript][RETURN_CONFIRM] body preview:", bodyPreview);

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        message: `구글 스프레드시트(Web App) 반납 처리 오류: ${response.status} ${response.statusText}`,
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
      return res.status(502).json({
        ok: false,
        message: "구글 스프레드시트(Web App) 응답이 JSON이 아닙니다.",
        details: { contentType, bodyPreview }
      });
    }

    if (result.success === false) {
      return res.status(409).json({
        ok: false,
        message: result.message || "반납 처리 중 오류가 발생했습니다.",
        details: result.error ? { error: result.error } : undefined
      });
    }

    return res.json({
      ok: true,
      deletedCount: result.deletedCount ?? null
    });
  } catch (error) {
    console.error("구글 스프레드시트 반납 처리 오류:", error);
    return res.status(500).json({
      ok: false,
      message: "반납 처리 중 오류가 발생했습니다.",
      details: {
        error: error?.message || String(error)
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
