// 새 로그 시트(시트2) 핸들 가져오기
function getLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // 새로 만든 로그 시트 이름이 정확히 '시트2'라면 이렇게 둡니다.
  var logSheet = ss.getSheetByName('시트2');
  if (!logSheet) {
    // 없으면 생성 + 헤더 한 줄 세팅
    logSheet = ss.insertSheet('시트2');
    logSheet.appendRow([
      'timestamp',     // A
      'action',        // B
      'name',          // C
      'equipmentType', // D
      'equipmentItem', // E
      'rentalDate',    // F
      'returnDate'     // G
    ]);
  }
  return logSheet;
}

// 날짜를 YYYY-MM-DD 형식의 문자열로 변환
function formatDateToYMD_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone() || "Asia/Seoul",
      "yyyy-MM-dd"
    );
  }
  if (typeof value === "string" && value.length >= 10) {
    // "YYYY-MM-DD..." 형태라면 앞의 10글자만 사용
    return value.slice(0, 10);
  }
  return String(value || "");
}

function doPost(e) {
  try {
    // 시트1을 명시적으로 가져오기
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0]; // 첫 번째 시트 (시트1)
    const data = JSON.parse(e.postData.contents || "{}");
    const action = data.action || "createRental";

    // 공통: 기종 한글 ⇄ 코드 변환
    const equipmentTypeMap = {
      scope: "스코프",
      tripod: "삼각대",
      binoculars: "쌍안경"
    };
    const reverseEquipmentTypeMap = {
      "스코프": "scope",
      "삼각대": "tripod",
      "쌍안경": "binoculars"
    };

    // ---------------------------
    // 1) 이름으로 대여 내역 조회
    // ---------------------------
    if (action === "previewReturn") {
      // 시트1을 명시적으로 가져오기
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheets()[0]; // 첫 번째 시트 (시트1)
      
      const name = (data.name || "").trim();
      const values = sheet.getDataRange().getValues();
      const header = values[0];
      const rows = values.slice(1);

      const matched = rows
        .map(function (row, idx) {
          return {
            rowIndex: idx + 2, // 시트상의 실제 행 번호 (1-based, 헤더 제외)
            name: row[0],
            rentalDate: formatDateToYMD_(row[1]),
            returnDate: formatDateToYMD_(row[2]),
            equipmentType: row[3],
            equipmentItem: row[4],
            timestamp: row[5]
          };
        })
        .filter(function (r) {
          return r.name === name;
        });

      return ContentService.createTextOutput(
        JSON.stringify({ success: true, rows: matched })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------
    // 2) 반납 확정 (이름·학번 검증 후 선택된 항목만 행 삭제 + 로그 시트 기록)
    // ---------------------------
    if (action === "confirmReturn") {
      const name = (data.name || "").trim();
      const studentId = String(data.studentId || "").trim();
      const selectedItems = data.selectedItems || [];

      // 세 번째 시트(회원 정보: A=이름, B=학번)에서 이름·학번 일치 여부 확인
      var allSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
      if (allSheets.length < 3) {
        return ContentService.createTextOutput(
          JSON.stringify({
            success: false,
            message: "회원 정보 시트(세 번째 시트)가 없습니다. 관리자에게 문의하세요."
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      var memberSheet = allSheets[2]; // 세 번째 시트 (인덱스 2)
      var memberValues = memberSheet.getDataRange().getValues();
      var memberRows = memberValues.length > 1 ? memberValues.slice(1) : []; // 헤더 제외
      var nameMatch = false;
      for (var i = 0; i < memberRows.length; i++) {
        var rowName = String(memberRows[i][0] || "").trim();
        var rowStudentId = String(memberRows[i][1] || "").trim();
        if (rowName === name && rowStudentId === studentId) {
          nameMatch = true;
          break;
        }
      }
      if (!nameMatch) {
        return ContentService.createTextOutput(
          JSON.stringify({
            success: false,
            message: "이름과 학번이 등록된 정보와 일치하지 않습니다. 반납할 수 없습니다."
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      if (!selectedItems || selectedItems.length === 0) {
        return ContentService.createTextOutput(
          JSON.stringify({ 
            success: false, 
            message: "반납할 장비를 최소 하나 이상 선택해주세요." 
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      // 선택된 항목에서 행 인덱스(rowIndex)를 수집
      var rowIndexes = [];
      selectedItems.forEach(function(item) {
        var idx = Number(item.rowIndex || item.row || 0);
        if (idx && !isNaN(idx)) {
          rowIndexes.push(idx);
        }
      });

      if (rowIndexes.length === 0) {
        return ContentService.createTextOutput(
          JSON.stringify({
            success: false,
            message: "선택된 항목의 행 정보를 찾을 수 없습니다. 다시 시도해주세요."
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      // 시트1을 명시적으로 가져오기
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheets()[0]; // 첫 번째 시트 (시트1)

      var deletedCount = 0;
      const logSheet = getLogSheet_();

      // 행 번호가 바뀌지 않도록 큰 번호부터 정렬해서 삭제
      rowIndexes.sort(function(a, b) {
        return b - a;
      });

      rowIndexes.forEach(function(rowIndex) {
        // 현재 시트 범위를 벗어나는 행은 무시
        if (rowIndex < 2 || rowIndex > sheet.getLastRow()) {
          return;
        }

        // 해당 행의 값 읽기
        var rowValues = sheet.getRange(rowIndex, 1, 1, 6).getValues()[0];
        // 시트1 구조 기준:
        // A: name, B: rentalDate, C: returnDate,
        // D: equipmentType(한글), E: equipmentItem, F: timestamp
        var rowName = String(rowValues[0] || "").trim();
        var rentalDate = formatDateToYMD_(rowValues[1]);
        var returnDate = formatDateToYMD_(rowValues[2]);
        var equipmentTypeKorean = String(rowValues[3] || "").trim();
        var equipmentItem = String(rowValues[4] || "").trim();

        // 이름이 다르면 (다른 사람의 행이면) 방어적으로 스킵
        if (rowName !== name) {
          return;
        }

        // 로그 시트에는 코드값 사용 (없으면 한글 그대로)
        var equipmentTypeCode =
          reverseEquipmentTypeMap[equipmentTypeKorean] || equipmentTypeKorean;

        // 시트2(로그 시트)에 "return" 기록 추가
        logSheet.appendRow([
          new Date().toISOString(), // timestamp
          "return",                 // action
          rowName,                  // name
          equipmentTypeCode,        // equipmentType (scope/tripod/binoculars 등)
          equipmentItem,            // equipmentItem
          rentalDate,               // rentalDate
          returnDate                // returnDate
        ]);

        // 시트1에서 해당 행 삭제
        sheet.deleteRow(rowIndex);
        deletedCount++;
      });

      return ContentService.createTextOutput(
        JSON.stringify({ 
          success: true, 
          deletedCount: deletedCount,
          message: deletedCount > 0 
            ? deletedCount + "개의 장비가 반납되었습니다." 
            : "반납할 항목이 없습니다." 
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ---------------------------
    // 3) 기본: 대여 생성 (시트1 + 시트2 모두 기록)
    // 각 장비마다 별도의 행으로 저장
    // ---------------------------
    const equipmentTypeKoreanForSheet =
      equipmentTypeMap[data.equipmentType] || data.equipmentType;

    const nowIso = new Date().toISOString();
    const timestamp = data.timestamp || nowIso;

    // 시트1을 명시적으로 가져오기
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0]; // 첫 번째 시트 (시트1)
    const logSheet = getLogSheet_();

    // equipmentItem이 있는 경우 (단일 항목)
    if (data.equipmentItem) {
      // 기존 시트1(현재 대여 현황)에 한글 기종으로 기록
      sheet.appendRow([
        data.name,
        data.rentalDate,
        data.returnDate,
        equipmentTypeKoreanForSheet,
        data.equipmentItem,
        timestamp
      ]);

      // 새 로그 시트(시트2)에 코드값으로 추가 기록
      logSheet.appendRow([
        timestamp,            // A: 기록 시각
        "rental",             // B: action
        data.name,            // C: name
        data.equipmentType,   // D: equipmentType (scope/tripod/binoculars)
        data.equipmentItem,   // E: equipmentItem
        data.rentalDate,      // F: rentalDate
        data.returnDate       // G: returnDate
      ]);
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "데이터가 성공적으로 저장되었습니다."
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // 시트1을 명시적으로 가져오기
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0]; // 첫 번째 시트 (시트1)
  const values = sheet.getDataRange().getValues(); // [ [헤더...], [row1...], ... ]

  if (!values || values.length <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, rows: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const [header, ...rows] = values;

  const data = rows.map(function (r) {
    return {
      name: r[0],                          // 이름
      rentalDate: formatDateToYMD_(r[1]),  // 대여일자 (YYYY-MM-DD)
      returnDate: formatDateToYMD_(r[2]),  // 반납일자 (YYYY-MM-DD)
      equipmentType: r[3],                 // 기종
      equipmentItem: r[4],                 // 장비
      timestamp: r[5]                      // 신청일시
    };
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, rows: data }))
    .setMimeType(ContentService.MimeType.JSON);
}
