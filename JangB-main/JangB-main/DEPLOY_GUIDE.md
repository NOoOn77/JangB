# 서버 배포 가이드

## 문제: 파일을 찾을 수 없음

SSH에서 `node server.js`를 실행했을 때 파일을 찾을 수 없다는 에러가 발생하는 경우:

### 1단계: 프로젝트 디렉토리 찾기

```bash
# server.js 파일 찾기
find ~ -name "server.js" -type f 2>/dev/null

# 또는 package.json 찾기
find ~ -name "package.json" -type f 2>/dev/null

# 일반적인 웹 디렉토리 확인
ls -la ~/public_html/
ls -la ~/www/
ls -la ~/html/
ls -la /var/www/html/
```

### 2단계: 프로젝트 디렉토리로 이동

```bash
# 찾은 경로로 이동 (예시)
cd ~/public_html/JangB-main
# 또는
cd /var/www/html/JangB-main

# 파일 확인
ls -la
```

### 3단계: 파일이 없는 경우 - 다시 업로드

로컬에서 서버로 파일을 업로드해야 합니다.

#### 방법 1: SCP 사용 (Windows PowerShell)

```powershell
# 프로젝트 디렉토리로 이동
cd C:\Users\CKIRUser\Downloads\JangB-main\JangB-main

# 전체 프로젝트 업로드
scp -r * pje070163@서버IP:/home/pje070163/public_html/JangB-main/
# 또는
scp -r * pje070163@서버IP:~/JangB-main/
```

#### 방법 2: SFTP 사용

```bash
# SFTP 접속
sftp pje070163@서버IP

# 업로드
put -r * /home/pje070163/public_html/JangB-main/
```

#### 방법 3: Git 사용 (권장)

```bash
# 서버에서
cd ~/public_html
git clone https://github.com/your-repo/JangB.git
cd JangB
npm install
```

### 4단계: 서버 실행

```bash
# 프로젝트 디렉토리로 이동
cd /프로젝트/경로

# 의존성 설치
npm install

# 서버 실행
node server.js

# 또는 PM2 사용 (백그라운드 실행)
pm2 start server.js
pm2 save
```

## 파일 구조 확인

서버에 다음 파일들이 있어야 합니다:

```
프로젝트디렉토리/
├── server.js
├── package.json
└── src/
    ├── index.html
    ├── script.js
    └── style.css
```

## Apache 설정 확인

Apache가 Node.js 서버(8080 포트)로 프록시하도록 설정되어 있는지 확인:

```bash
# Apache 설정 파일 확인
sudo cat /etc/apache2/sites-available/000-default.conf

# ProxyPass 설정이 있어야 함:
# ProxyPass /api http://localhost:8080/api
# ProxyPassReverse /api http://localhost:8080/api
```

## 포트 충돌 해결 (EADDRINUSE 에러)

8080 포트가 이미 사용 중일 때:

```bash
# 1. 8080 포트를 사용하는 프로세스 찾기
sudo lsof -i :8080
# 또는
sudo netstat -tulpn | grep 8080

# 2. 프로세스 종료 (PID 확인 후)
kill -9 <PID>
# 또는 모든 node 프로세스 종료
pkill -f node

# 3. 확인
sudo lsof -i :8080  # 아무것도 나오지 않아야 함

# 4. 프로세스가 실행 중인 디렉토리 확인 (중요!)
ps aux | grep node
# 출력에서 CWD(현재 작업 디렉토리) 확인

# 5. 다른 디렉토리에서 실행 중인 경우, 해당 디렉토리 확인
# 예: /home/pje070163/old-project/server.js 가 실행 중일 수 있음
```

## 빠른 해결 체크리스트

- [ ] `find ~ -name "server.js"`로 파일 위치 확인
- [ ] 프로젝트 디렉토리로 이동 (`cd`)
- [ ] `ls -la`로 파일 확인
- [ ] 파일이 없으면 로컬에서 업로드
- [ ] `npm install`로 의존성 설치
- [ ] **`sudo lsof -i :8080`로 기존 프로세스 확인 및 종료**
- [ ] `node server.js`로 서버 실행
- [ ] Apache 재시작 (`sudo systemctl restart apache2`)
- [ ] 브라우저 캐시 삭제 (`Ctrl + Shift + Delete`)
