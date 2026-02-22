// DOM 요소 가져오기
const form = document.getElementById("rental-form");
const messageEl = document.getElementById("message");
const equipmentTypeSelect = document.getElementById("equipment-type");
const equipmentItemGroup = document.getElementById("equipment-item-group");
const equipmentItemCheckboxes = document.getElementById("equipment-item-checkboxes");
const rentalStatusContent = document.getElementById("rental-status-content");
const returnToggleBtn = document.getElementById("return-toggle-btn");
const returnPanel = document.getElementById("return-panel");
const returnNameInput = document.getElementById("return-name");
const returnStudentIdInput = document.getElementById("return-student-id");
const returnLookupBtn = document.getElementById("return-lookup-btn");
const returnResultsEl = document.getElementById("return-results");
const returnConfirmSection = document.getElementById("return-confirm-section");
const returnSubmitBtn = document.getElementById("return-submit-btn");
const returnMessageEl = document.getElementById("return-message");

// 현재 대여 현황 데이터 (구글 스프레드시트에서 가져온 값)
let currentRentals = [];
let currentReturnName = "";
let selectedReturnItems = []; // 선택된 반납 항목들
let selectedRentalItems = []; // 장바구니에 담긴 대여 장비들 (여러 기종 지원)

// 장비 옵션 정의
const equipmentOptions = {
  scope: [
    { value: "산토스", label: "산토스" },
    { value: "개똥이", label: "개똥이" },
    { value: "묠니르", label: "묠니르" },
    { value: "한규선배필드", label: "한규선배필드" }
  ],
  tripod: [
    { value: "삼식이", label: "삼식이" },
    { value: "두팔이", label: "두팔이" },
    { value: "뚜비다리", label: "뚜비다리" },
    { value: "주시노다리", label: "주시노다리" },
    { value: "슬릭", label: "슬릭" },
    { value: "뱅가드", label: "뱅가드" }
  ],
  binoculars: [
    { value: "솔로몬hq", label: "솔로몬hq" },
    { value: "솔로몬bf(식별번호001)", label: "솔로몬bf(식별번호001)" },
    { value: "솔로몬bf(식별번호002)", label: "솔로몬bf(식별번호002)" },
    { value: "sv202(식별번호001)", label: "sv202(식별번호001)" },
    { value: "sv202(식별번호002)", label: "sv202(식별번호002)" },
    { value: "kowa yf", label: "kowa yf" },
    { value: "jyw1811", label: "jyw1811" }
  ]
};

// 날짜 선택기 초기화
function initDateSelectors() {
  const currentYear = new Date().getFullYear();
  const years = [];
  const months = [];
  const days = [];

  // 년도: 현재 년도부터 2년 후까지
  for (let i = currentYear; i <= currentYear + 2; i++) {
    years.push(i);
  }

  // 월: 1-12
  for (let i = 1; i <= 12; i++) {
    months.push(i);
  }

  // 일: 1-31 (실제로는 월에 따라 달라지지만 간단하게 31일까지)
  for (let i = 1; i <= 31; i++) {
    days.push(i);
  }

  // 년도 선택기 채우기
  const yearSelects = document.querySelectorAll("#rental-year, #return-year");
  yearSelects.forEach(select => {
    years.forEach(year => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year + "년";
      select.appendChild(option);
    });
  });

  // 월 선택기 채우기
  const monthSelects = document.querySelectorAll("#rental-month, #return-month");
  monthSelects.forEach(select => {
    months.forEach(month => {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = month + "월";
      select.appendChild(option);
    });
  });

  // 일 선택기 채우기
  const daySelects = document.querySelectorAll("#rental-day, #return-day");
  daySelects.forEach(select => {
    days.forEach(day => {
      const option = document.createElement("option");
      option.value = day;
      option.textContent = day + "일";
      select.appendChild(option);
    });
  });
}

// 장비 기종 한글 라벨 맵
const equipmentTypeLabels = {
  scope: "스코프",
  tripod: "삼각대",
  binoculars: "쌍안경"
};

// 기종 선택에 따라 장비 옵션 업데이트 (체크박스 형식, 장바구니 연동)
equipmentTypeSelect.addEventListener("change", (e) => {
  const selectedType = e.target.value;

  if (selectedType && equipmentOptions[selectedType]) {
    equipmentItemGroup.style.display = "block";
    equipmentItemCheckboxes.innerHTML = "";

    equipmentOptions[selectedType].forEach((item) => {
      const checkboxWrapper = document.createElement("div");
      checkboxWrapper.className = "equipment-checkbox-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `equipment-${selectedType}-${item.value}`;
      checkbox.value = item.value;
      checkbox.name = "equipment-item";

      // 이미 장바구니에 담긴 항목이면 체크 상태 유지
      const alreadySelected = selectedRentalItems.some(
        (it) => it.equipmentType === selectedType && it.equipmentItem === item.value
      );
      checkbox.checked = alreadySelected;

      checkbox.addEventListener("change", () => {
        handleEquipmentCheckboxChange(selectedType, item.value);
      });

      const label = document.createElement("label");
      label.htmlFor = `equipment-${selectedType}-${item.value}`;
      label.textContent = item.label;

      checkboxWrapper.appendChild(checkbox);
      checkboxWrapper.appendChild(label);
      equipmentItemCheckboxes.appendChild(checkboxWrapper);
    });
  } else {
    equipmentItemGroup.style.display = "none";
    equipmentItemCheckboxes.innerHTML = "";
  }
});

// 체크박스 변경 시 장바구니 상태 업데이트
function handleEquipmentCheckboxChange(equipmentType, equipmentItem) {
  const index = selectedRentalItems.findIndex(
    (it) => it.equipmentType === equipmentType && it.equipmentItem === equipmentItem
  );

  if (index >= 0) {
    // 이미 있으면 제거
    selectedRentalItems.splice(index, 1);
  } else {
    // 없으면 추가
    selectedRentalItems.push({ equipmentType, equipmentItem });
  }

  updateRentalCartUI();
}

// 장바구니 UI 렌더링
function updateRentalCartUI() {
  const cartEl = document.getElementById("rental-cart");
  if (!cartEl) return;

  if (!selectedRentalItems.length) {
    cartEl.innerHTML =
      '<p class="rental-cart__empty">선택된 장비가 없습니다. 기종을 선택한 뒤 장비를 체크해주세요.</p>';
    return;
  }

  const rowsHtml = selectedRentalItems
    .map(
      (item, index) => `
      <tr>
        <td>${equipmentTypeLabels[item.equipmentType] || item.equipmentType}</td>
        <td>${item.equipmentItem}</td>
        <td>
          <button 
            type="button" 
            class="rental-cart__remove-btn" 
            data-index="${index}"
          >
            제거
          </button>
        </td>
      </tr>
    `
    )
    .join("");

  cartEl.innerHTML = `
    <table class="rental-cart__table">
      <thead>
        <tr>
          <th>기종</th>
          <th>장비</th>
          <th>제거</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  // 제거 버튼 이벤트 연결
  const removeButtons = cartEl.querySelectorAll(".rental-cart__remove-btn");
  removeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-index"));
      const item = selectedRentalItems[idx];
      if (!item) return;

      // 장바구니에서 제거
      selectedRentalItems.splice(idx, 1);

      // 현재 선택된 기종의 체크박스와 동기화
      const currentType = equipmentTypeSelect.value;
      if (currentType === item.equipmentType) {
        const checkbox = equipmentItemCheckboxes.querySelector(
          `#equipment-${currentType}-${item.equipmentItem}`
        );
        if (checkbox) {
          checkbox.checked = false;
        }
      }

      updateRentalCartUI();
    });
  });
}

// 폼 제출 처리 (여러 기종/여러 항목 선택 지원)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  messageEl.textContent = "";
  messageEl.className = "message";

  // 폼 데이터 수집
  const name = document.getElementById("name").value.trim();
  const studentId = (document.getElementById("student-id") && document.getElementById("student-id").value) ? document.getElementById("student-id").value.trim() : "";
  const rentalYear = document.getElementById("rental-year").value;
  const rentalMonth = document.getElementById("rental-month").value;
  const rentalDay = document.getElementById("rental-day").value;
  const returnYear = document.getElementById("return-year").value;
  const returnMonth = document.getElementById("return-month").value;
  const returnDay = document.getElementById("return-day").value;
  const equipmentType = equipmentTypeSelect.value; // 현재 선택된 기종 (장바구니에는 여러 기종이 있을 수 있음)

  // 유효성 검사
  if (!name || !rentalYear || !rentalMonth || !rentalDay ||
      !returnYear || !returnMonth || !returnDay || !selectedRentalItems.length) {
    showMessage("모든 항목을 입력하고 최소 하나 이상의 장비를 선택해주세요.", "error");
    return;
  }
  if (!studentId) {
    showMessage("학번을 입력해주세요. 등록된 이름과 학번이 일치할 때만 대여할 수 있습니다.", "error");
    return;
  }

  // 날짜 유효성 검사
  const rentalDate = new Date(rentalYear, rentalMonth - 1, rentalDay);
  const returnDate = new Date(returnYear, returnMonth - 1, returnDay);
  
  if (returnDate < rentalDate) {
    showMessage("반납 일자는 대여 일자보다 늦어야 합니다.", "error");
    return;
  }

  // 데이터 포맷팅
  const rentalDateStr = `${rentalYear}-${String(rentalMonth).padStart(2, '0')}-${String(rentalDay).padStart(2, '0')}`;
  const returnDateStr = `${returnYear}-${String(returnMonth).padStart(2, '0')}-${String(returnDay).padStart(2, '0')}`;

  // 각 선택된 장비에 대해 겹침 확인
  for (const item of selectedRentalItems) {
    if (isOverlappingReservation(item.equipmentItem, rentalDate, returnDate)) {
      showMessage(
        `"${item.equipmentItem}"은(는) 이미 해당 기간에 대여 중인 장비입니다. 다른 기간을 선택해주세요.`,
        "error"
      );
      return;
    }
  }

  // 여러 항목을 배열로 전송
  const formData = {
    name: name,
    studentId: studentId,
    rentalDate: rentalDateStr,
    returnDate: returnDateStr,
    // 각 항목마다 자신만의 equipmentType, equipmentItem 을 가짐
    equipmentItems: selectedRentalItems
  };

  try {
    showMessage(`${selectedRentalItems.length}개의 장비 대여를 처리 중...`, "info");
    
    const res = await fetch("/api/rental", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    const rawText = await res.text();
    let data = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!res.ok) {
      // Apache/프록시 에러 페이지(HTML) 등 JSON이 아닐 수 있음
      const fallback =
        rawText && rawText.trim().startsWith("<")
          ? "서버가 JSON 대신 HTML을 응답했습니다. (백엔드/프록시 상태를 확인하세요.)"
          : "대여 신청에 실패했습니다.";
      throw new Error((data && data.message) || fallback);
    }

    showMessage(`${selectedRentalItems.length}개의 장비 대여 신청이 완료되었습니다!`, "success");
    form.reset();
    equipmentItemGroup.style.display = "none";
    equipmentItemCheckboxes.innerHTML = "";
    selectedRentalItems = [];
    updateRentalCartUI();
    // 대여 현황 다시 불러오기
    loadRentalStatus();
    
  } catch (err) {
    console.error(err);
    showMessage(err.message || "알 수 없는 오류가 발생했습니다.", "error");
  }
});

// 메시지 표시 함수
function showMessage(text, type = "info") {
  messageEl.textContent = text;
  messageEl.className = `message message--${type}`;
  
  if (type === "success") {
    setTimeout(() => {
      messageEl.textContent = "";
      messageEl.className = "message";
    }, 5000);
  }
}

// 장비 대여 현황 불러오기
async function loadRentalStatus() {
  if (!rentalStatusContent) return;

  rentalStatusContent.innerHTML = '<p class="rental-status__empty">대여 현황을 불러오는 중입니다...</p>';

  try {
    const res = await fetch("/api/rentals");
    const rawText = await res.text();
    let data = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!res.ok || !data || !data.ok) {
      throw new Error(
        (data && data.message) || "대여 현황을 불러오는 데 실패했습니다."
      );
    }

    const rows = Array.isArray(data.rows) ? data.rows : [];
    currentRentals = rows;
    renderRentalStatus(rows);
  } catch (error) {
    console.error(error);
    rentalStatusContent.innerHTML =
      '<p class="rental-status__empty">대여 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>';
  }
}

// 장비 대여 현황 렌더링
function renderRentalStatus(rows) {
  if (!rentalStatusContent) return;

  if (!rows || rows.length === 0) {
    rentalStatusContent.innerHTML =
      '<p class="rental-status__empty">현재 등록된 대여가 없습니다.</p>';
    return;
  }

  const now = new Date();

  const rowsHtml = rows
    .map((r) => {
      const start = new Date(r.rentalDate);
      const end = new Date(r.returnDate);

      let statusClass = "rental-status__badge--future";
      let statusLabel = "대여 예정";

      if (!isNaN(start) && !isNaN(end)) {
        if (now > end) {
          statusClass = "rental-status__badge--past";
          statusLabel = "대여 완료";
        } else if (now >= start && now <= end) {
          statusClass = "rental-status__badge--ongoing";
          statusLabel = "대여 중";
        }
      }

      const rentalRange = `${formatDateOnly(start, r.rentalDate)} ~ ${formatDateOnly(
        end,
        r.returnDate
      )}`;

      return `
        <tr>
          <td>${r.equipmentItem || "-"}</td>
          <td>${r.equipmentType || "-"}</td>
          <td>${r.name || "-"}</td>
          <td>${rentalRange}</td>
          <td>
            <span class="rental-status__badge ${statusClass}">
              ${statusLabel}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  rentalStatusContent.innerHTML = `
    <table class="rental-status__list">
      <thead>
        <tr>
          <th>장비</th>
          <th>기종</th>
          <th>대여자</th>
          <th>대여 기간</th>
          <th>상태</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// 기간 겹침 여부 확인
function isOverlappingReservation(equipmentItem, startDate, endDate) {
  if (!equipmentItem || !currentRentals || currentRentals.length === 0) {
    return false;
  }

  return currentRentals.some((r) => {
    if (r.equipmentItem !== equipmentItem) return false;

    const existingStart = new Date(r.rentalDate);
    const existingEnd = new Date(r.returnDate);

    if (isNaN(existingStart) || isNaN(existingEnd)) return false;

    // 기간이 하나라도 겹치면 true
    return startDate <= existingEnd && endDate >= existingStart;
  });
}

// 날짜를 MM-DD 형식으로만 보여주기
function formatDateOnly(dateObj, fallback) {
  if (dateObj instanceof Date && !isNaN(dateObj)) {
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${m}-${d}`;
  }
  // dateObj가 유효하지 않으면, 이미 문자열 형태(예: "2026-02-17T...")에서 월-일 부분만 사용
  if (typeof fallback === "string" && fallback.length >= 10) {
    // "YYYY-MM-DD..." → "MM-DD"
    return fallback.slice(5, 10);
  }
  return fallback || "-";
}

// 장비 반납 패널 토글 및 동작
if (returnToggleBtn && returnPanel) {
  returnToggleBtn.addEventListener("click", () => {
    const isHidden = returnPanel.classList.contains("hidden");
    if (isHidden) {
      returnPanel.classList.remove("hidden");
    } else {
      returnPanel.classList.add("hidden");
    }
  });
}

// 이름으로 대여 내역 조회
if (returnLookupBtn) {
  returnLookupBtn.addEventListener("click", async () => {
    const name = (returnNameInput?.value || "").trim();
    returnMessageEl.textContent = "";
    returnConfirmSection.classList.add("hidden");
    returnResultsEl.innerHTML = "";

    if (!name) {
      returnMessageEl.textContent = "이름을 입력해주세요.";
      returnMessageEl.className = "message message--error";
      return;
    }

    try {
      returnMessageEl.textContent = "대여 내역을 불러오는 중입니다...";
      returnMessageEl.className = "message message--info";

      const res = await fetch("/api/returns/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      });

      const rawText = await res.text();
      let data = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      if (!res.ok || !data || !data.ok) {
        throw new Error(
          (data && data.message) || "대여 내역을 불러오는 데 실패했습니다."
        );
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];

      if (rows.length === 0) {
        returnResultsEl.innerHTML =
          '<p class="rental-status__empty">해당 이름으로 등록된 대여가 없습니다.</p>';
        returnMessageEl.textContent = "";
        returnMessageEl.className = "message";
        return;
      }

      currentReturnName = name;
      selectedReturnItems = []; // 선택 항목 초기화

      const rowsHtml = rows
        .map((r, index) => {
          const start = new Date(r.rentalDate);
          const end = new Date(r.returnDate);
          const rentalRange = `${formatDateOnly(start, r.rentalDate)} ~ ${formatDateOnly(
            end,
            r.returnDate
          )}`;
          
          // 고유 식별자 생성 (equipmentItem + rentalDate + returnDate)
          const itemId = `${r.equipmentItem || ""}_${r.rentalDate || ""}_${r.returnDate || ""}_${index}`;

          return `
            <tr>
              <td>
                <input 
                  type="checkbox" 
                  class="return-item-checkbox" 
                  data-item-id="${itemId}"
                  data-equipment-item="${r.equipmentItem || ""}"
                  data-rental-date="${r.rentalDate || ""}"
                  data-return-date="${r.returnDate || ""}"
                  data-row-index="${r.rowIndex || ""}"
                  checked
                />
              </td>
              <td>${r.equipmentItem || "-"}</td>
              <td>${r.equipmentType || "-"}</td>
              <td>${r.name || "-"}</td>
              <td>${rentalRange}</td>
            </tr>
          `;
        })
        .join("");

      returnResultsEl.innerHTML = `
        <div class="return-results__table-wrapper">
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">선택</th>
                <th>장비</th>
                <th>기종</th>
                <th>대여자</th>
                <th>대여 기간</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;

      // 체크박스 변경 이벤트 리스너 추가
      const checkboxes = returnResultsEl.querySelectorAll(".return-item-checkbox");
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener("change", updateSelectedReturnItems);
      });
      
      // 초기 선택 항목 업데이트
      updateSelectedReturnItems();

      returnConfirmSection.classList.remove("hidden");
      returnMessageEl.textContent = "";
      returnMessageEl.className = "message";
    } catch (error) {
      console.error(error);
      returnMessageEl.textContent =
        error.message || "대여 내역을 불러오는 중 오류가 발생했습니다.";
      returnMessageEl.className = "message message--error";
    }
  });
}

// 선택된 반납 항목 업데이트 함수
function updateSelectedReturnItems() {
  const checkboxes = returnResultsEl.querySelectorAll(".return-item-checkbox:checked");
  selectedReturnItems = Array.from(checkboxes).map(checkbox => ({
    equipmentItem: checkbox.getAttribute("data-equipment-item"),
    rentalDate: checkbox.getAttribute("data-rental-date"),
    returnDate: checkbox.getAttribute("data-return-date"),
    rowIndex: checkbox.getAttribute("data-row-index")
  }));
}

// 반납 확정 처리
if (returnSubmitBtn) {
  returnSubmitBtn.addEventListener("click", async () => {
    const name = (returnNameInput?.value || currentReturnName || "").trim();
    const studentId = (returnStudentIdInput?.value || "").trim();

    if (!name) {
      returnMessageEl.textContent = "먼저 이름으로 대여 내역을 조회해주세요.";
      returnMessageEl.className = "message message--error";
      return;
    }

    if (!studentId) {
      returnMessageEl.textContent = "학번을 입력해주세요.";
      returnMessageEl.className = "message message--error";
      return;
    }

    if (selectedReturnItems.length === 0) {
      returnMessageEl.textContent = "반납할 장비를 최소 하나 이상 선택해주세요.";
      returnMessageEl.className = "message message--error";
      return;
    }

    try {
      returnMessageEl.textContent = "반납을 처리하는 중입니다...";
      returnMessageEl.className = "message message--info";

      const res = await fetch("/api/returns/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          name, 
          studentId,
          selectedItems: selectedReturnItems
        })
      });

      const rawText = await res.text();
      let data = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      if (!res.ok || !data || !data.ok) {
        throw new Error(
          (data && data.message) || "반납 처리에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
      }

      returnMessageEl.textContent = "반납이 완료되었습니다.";
      returnMessageEl.className = "message message--success";
      returnResultsEl.innerHTML = "";
      returnConfirmSection.classList.add("hidden");
      currentReturnName = "";
      selectedReturnItems = [];

      // 대여 현황 갱신
      loadRentalStatus();
    } catch (error) {
      console.error(error);
      returnMessageEl.textContent =
        error.message || "반납 처리 중 오류가 발생했습니다.";
      returnMessageEl.className = "message message--error";
    }
  });
}

// 페이지 로드 시 날짜 선택기 초기화 및 대여 현황 불러오기
initDateSelectors();
loadRentalStatus();
