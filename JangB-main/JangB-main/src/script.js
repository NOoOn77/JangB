// DOM 요소 가져오기
const form = document.getElementById("rental-form");
const messageEl = document.getElementById("message");
const equipmentTypeSelect = document.getElementById("equipment-type");
const equipmentItemGroup = document.getElementById("equipment-item-group");
const equipmentItemSelect = document.getElementById("equipment-item");

// 장비 옵션 정의
const equipmentOptions = {
  scope: [
    { value: "스코프1", label: "스코프1" },
    { value: "스코프2", label: "스코프2" }
  ],
  tripod: [
    { value: "삼각대1", label: "삼각대1" },
    { value: "삼각대2", label: "삼각대2" }
  ],
  binoculars: [
    { value: "쌍안경1", label: "쌍안경1" },
    { value: "쌍안경2", label: "쌍안경2" }
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

// 기종 선택에 따라 장비 옵션 업데이트
equipmentTypeSelect.addEventListener("change", (e) => {
  const selectedType = e.target.value;
  
  if (selectedType && equipmentOptions[selectedType]) {
    equipmentItemGroup.style.display = "block";
    equipmentItemSelect.innerHTML = '<option value="">장비를 선택하세요</option>';
    
    equipmentOptions[selectedType].forEach(item => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      equipmentItemSelect.appendChild(option);
    });
    
    equipmentItemSelect.required = true;
  } else {
    equipmentItemGroup.style.display = "none";
    equipmentItemSelect.required = false;
    equipmentItemSelect.innerHTML = '<option value="">장비를 선택하세요</option>';
  }
});

// 폼 제출 처리
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  messageEl.textContent = "";
  messageEl.className = "message";

  // 폼 데이터 수집
  const name = document.getElementById("name").value.trim();
  const rentalYear = document.getElementById("rental-year").value;
  const rentalMonth = document.getElementById("rental-month").value;
  const rentalDay = document.getElementById("rental-day").value;
  const returnYear = document.getElementById("return-year").value;
  const returnMonth = document.getElementById("return-month").value;
  const returnDay = document.getElementById("return-day").value;
  const equipmentType = equipmentTypeSelect.value;
  const equipmentItem = equipmentItemSelect.value;

  // 유효성 검사
  if (!name || !rentalYear || !rentalMonth || !rentalDay || 
      !returnYear || !returnMonth || !returnDay || !equipmentType || !equipmentItem) {
    showMessage("모든 항목을 입력해주세요.", "error");
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

  const formData = {
    name: name,
    rentalDate: rentalDateStr,
    returnDate: returnDateStr,
    equipmentType: equipmentType,
    equipmentItem: equipmentItem
  };

  try {
    showMessage("처리 중...", "info");
    
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

    showMessage("장비 대여 신청이 완료되었습니다!", "success");
    form.reset();
    equipmentItemGroup.style.display = "none";
    equipmentItemSelect.innerHTML = '<option value="">장비를 선택하세요</option>';
    
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

// 페이지 로드 시 날짜 선택기 초기화
initDateSelectors();
