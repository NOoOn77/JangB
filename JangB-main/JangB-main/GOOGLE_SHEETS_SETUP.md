# 구글 스프레드시트 연동 설정 가이드

이 가이드는 장비 대여 신청 데이터를 구글 스프레드시트에 자동으로 저장하는 방법을 설명합니다.

## 방법 1: Google Apps Script 사용 (권장 - 가장 간단)

### 1단계: 구글 스프레드시트 생성

1. [Google Sheets](https://sheets.google.com)에 접속
2. 새 스프레드시트 생성
3. 첫 번째 행에 헤더 추가:
   ```
   A1: 이름
   B1: 대여일자
   C1: 반납일자
   D1: 기종
   E1: 장비
   F1: 신청일시
   ```

### 2단계: Google Apps Script 작성

1. 스프레드시트에서 **확장 프로그램** → **Apps Script** 클릭
2. 다음 코드를 입력:

```javascript
function doPost(e) {
  try {
    // 스프레드시트 열기 (현재 스프레드시트)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // POST 요청에서 데이터 받기
    const data = JSON.parse(e.postData.contents);
    
    // 기종 한글 변환
    const equipmentTypeMap = {
      'scope': '스코프',
      'tripod': '삼각대',
      'binoculars': '쌍안경'
    };
    const equipmentTypeKorean = equipmentTypeMap[data.equipmentType] || data.equipmentType;
    
    // 데이터를 행으로 추가
    sheet.appendRow([
      data.name,                    // 이름
      data.rentalDate,              // 대여일자
      data.returnDate,              // 반납일자
      equipmentTypeKorean,          // 기종
      data.equipmentItem,           // 장비
      data.timestamp                // 신청일시
    ]);
    
    // 성공 응답 반환
    return ContentService.createTextOutput(
      JSON.stringify({ 
        success: true, 
        message: '데이터가 성공적으로 저장되었습니다.' 
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // 오류 응답 반환
    return ContentService.createTextOutput(
      JSON.stringify({ 
        success: false, 
        error: error.toString() 
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. **저장** 클릭 (Ctrl+S)
4. 프로젝트 이름 지정 (예: "장비대여신청")

### 3단계: Web App 배포

1. Apps Script 편집기에서 **배포** → **새 배포** 클릭
2. **유형 선택** 옆의 톱니바퀴 아이콘 클릭 → **웹 앱** 선택
3. 설정:
   - **설명**: "장비 대여 신청 데이터 수집"
   - **실행 대상**: 나
   - **액세스 권한**: 모든 사용자
4. **배포** 클릭
5. **권한 승인** 클릭 (처음 한 번만 필요)
6. **Web App URL** 복사 (예: `https://script.google.com/macros/s/AKfycby.../exec`)

### 4단계: 서버에 URL 설정

#### 방법 A: 환경변수 사용 (권장)

```bash
# .env 파일 생성
echo "GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec" > .env

# 또는 직접 export
export GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
```

#### 방법 B: server.js 직접 수정

`server.js` 파일에서 다음 줄을 수정:

```javascript
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

### 5단계: 서버 재시작

```bash
# Node.js 프로세스 재시작
pkill -f node
cd ~/JangB-main
node server.js
```

## 방법 2: Google Sheets API 직접 사용 (고급)

더 많은 제어가 필요한 경우 Google Sheets API를 직접 사용할 수 있습니다.

### 필요한 패키지 설치

```bash
npm install googleapis
```

### 서비스 계정 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성
3. **API 및 서비스** → **라이브러리** → **Google Sheets API** 활성화
4. **사용자 인증 정보** → **서비스 계정** 생성
5. JSON 키 파일 다운로드
6. 스프레드시트에 서비스 계정 이메일 공유 (편집 권한)

### 코드 예시

```javascript
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'path/to/service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// 데이터 추가
await sheets.spreadsheets.values.append({
  spreadsheetId: 'YOUR_SPREADSHEET_ID',
  range: 'Sheet1!A:F',
  valueInputOption: 'RAW',
  resource: {
    values: [[name, rentalDate, returnDate, equipmentType, equipmentItem, timestamp]]
  }
});
```

## 테스트

1. 웹사이트에서 장비 대여 신청 폼 작성
2. **장비 대여** 버튼 클릭
3. 구글 스프레드시트에서 데이터가 추가되었는지 확인

## 문제 해결

### "권한이 필요합니다" 오류
- Apps Script에서 권한을 다시 승인하세요
- Web App 배포 시 "모든 사용자"로 설정했는지 확인

### 데이터가 저장되지 않음
- Web App URL이 올바른지 확인
- Apps Script의 `doPost` 함수가 올바르게 작성되었는지 확인
- 브라우저 개발자 도구의 Network 탭에서 오류 확인

### CORS 오류
- Google Apps Script는 CORS를 자동으로 처리하므로 문제없어야 합니다
- 만약 문제가 발생하면 Apps Script에서 CORS 헤더를 명시적으로 추가하세요

## 보안 고려사항

- Web App URL을 공개하지 마세요 (악용 방지)
- 필요시 Apps Script에 추가 인증 로직 추가
- 스프레드시트 접근 권한을 적절히 관리하세요
