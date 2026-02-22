# GCP → AWS 서버 이전 가이드 (JangB)

GCP에서 쓰던 설정을 AWS EC2에 그대로 옮기는 방법입니다.

---

## 1. GCP에서 쓰던 설정 정리

| 구분 | GCP에서 쓰던 것 | AWS에서 할 일 |
|------|-----------------|----------------|
| **OS** | Ubuntu (가정) | EC2 Ubuntu 22.04 LTS AMI 권장 |
| **사용자/경로** | `pje070163`, `~/JangB-main` | AWS에서 쓸 사용자명 정한 뒤 경로 통일 |
| **Node 서버** | `server.js`, 포트 8080 | 동일 (Node + systemd) |
| **정적 파일** | `/var/www/html/` ← `src/` 복사, Apache | Apache 설치 후 동일 구조 |
| **환경 변수** | `.env` (PORT, GOOGLE_SCRIPT_URL, Supabase 등) | AWS에서 `.env` 다시 만들기 |
| **자동 시작** | systemd `jangb.service` | 같은 유닛 파일 복사 후 등록 |
| **스크립트** | `restart_server.sh`, `update_www_html.sh` | 그대로 복사 후 경로만 확인 |

---

## 2. AWS 준비 (한 번만)

### 2-1. EC2 인스턴스

1. AWS 콘솔 → EC2 → **인스턴스 시작**
2. **이름**: 예) `jangb-server`
3. **AMI**: Ubuntu Server 22.04 LTS
4. **인스턴스 유형**: t3.small 또는 t3.medium (트래픽에 맞게)
5. **키 페어**: 새로 만들거나 기존 키 선택 (SSH 접속용, `.pem` 보관)
6. **스토리지**: 기본 8GB 또는 필요 시 증가

### 2-2. 보안 그룹 (방화벽)

인바운드 규칙 예시:

| 유형   | 포트 | 소스        | 비고        |
|--------|------|-------------|-------------|
| SSH    | 22   | 내 IP 권장  | 서버 접속   |
| HTTP   | 80   | 0.0.0.0/0   | 웹(Apache)  |
| HTTPS  | 443  | 0.0.0.0/0   | HTTPS 사용 시 |
| 사용자 지정 TCP | 8080 | 127.0.0.1 또는 제거 | Node는 보통 Apache 프록시로만 접근 시 8080은 외부 열지 않음 |

(Node를 8080으로 직접 노출하려면 8080을 0.0.0.0/0으로 열면 됨.)

### 2-3. Elastic IP (선택)

- 고정 IP 필요 시: EC2 → Elastic IP 할당 → 이 인스턴스에 연결
- 도메인 A 레코드는 이 IP로 설정

---

## 3. EC2 접속 후 공통 설정

SSH 접속 (키와 인스턴스 IP는 본인 값으로 변경):

```bash
ssh -i "your-key.pem" ubuntu@<EC2-퍼블릭-IP>
```

### 3-1. 시스템 패키지

```bash
sudo apt update
sudo apt install -y nodejs npm git
# Node 18+ 권장 (Ubuntu 22 기본이면 충분)
node -v
```

### 3-2. 프로젝트 배포할 사용자 정하기

- **GCP와 동일하게** `pje070163` 쓰려면:

  ```bash
  sudo adduser pje070163
  sudo usermod -aG sudo pje070163
  sudo su - pje070163
  ```

- **Ubuntu 기본 사용자** `ubuntu` 쓰려면: 아래 경로를 모두 `ubuntu` / `/home/ubuntu/JangB-main` 로 바꿔서 진행.

아래는 **사용자명을 `ubuntu`로** 쓴다고 가정하고 적어 둡니다. `pje070163` 쓰면 `ubuntu` → `pje070163`, `/home/ubuntu` → `/home/pje070163` 로만 바꾸면 됩니다.

```bash
# ubuntu 사용자로 진행하는 경우
cd ~
```

---

## 4. 프로젝트 복사 (GCP → AWS)

### 방법 A: 로컬 PC에서 EC2로 업로드

로컬에 `JangB-main` 이 있고, AWS 키가 있을 때:

```bash
# 로컬 PC에서 실행 (경로·키·IP는 본인 환경에 맞게)
scp -i "your-key.pem" -r ./JangB-main ubuntu@<EC2-IP>:/home/ubuntu/
```

### 방법 B: GCP 서버에서 EC2로 직접 복사

GCP VM에 SSH 접속한 뒤:

```bash
# GCP 서버에서 (AWS 키를 GCP 서버에 미리 복사해 둔 경우)
scp -i aws-key.pem -r ~/JangB-main ubuntu@<EC2-IP>:/home/ubuntu/
```

### 방법 C: Git 사용

EC2에서:

```bash
cd /home/ubuntu
git clone <본인-JangB-저장소-URL> JangB-main
cd JangB-main
```

이후 `.env`는 따로 만들어야 합니다 (아래 5절).

---

## 5. 환경 변수 (.env) — GCP 설정 그대로 옮기기

GCP 서버의 `.env` 내용을 AWS에서 동일하게 만듭니다.

```bash
cd /home/ubuntu/JangB-main
nano .env
```

**필수로 넣을 값 (예시):**

```env
PORT=8080
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/여기본인스크립트ID/exec
SUPABASE_URL=https://rzjvmrkbtnmlgcwhmfif.supabase.co
SUPABASE_SERVICE_ROLE_KEY=여기본인키
```

- `GOOGLE_SCRIPT_URL`: GCP에서 쓰던 구글 Apps Script Web App URL 그대로 복사.
- Supabase: GCP와 동일한 프로젝트를 쓰면 URL/키 그대로 복사.

저장: `Ctrl+O`, `Enter`, `Ctrl+X`.

systemd가 `.env`를 안 읽으면, 서비스 파일에 환경 변수를 직접 넣을 수 있습니다 (아래 7절).

---

## 6. Node 실행 확인

```bash
cd /home/ubuntu/JangB-main
npm install
node server.js
```

브라우저 또는 다른 터미널에서 `http://<EC2-IP>:8080/api/health` 호출 → `{"ok":true,...}` 나오면 성공.  
종료: `Ctrl+C`.

---

## 7. systemd 서비스 (GCP와 동일하게 부팅 시 자동 시작)

### 7-1. 서비스 파일 수정

AWS에서 쓴 **사용자명**과 **경로**에 맞게 수정합니다.

```bash
cd /home/ubuntu/JangB-main
nano jangb.service
```

**수정할 부분 (ubuntu 사용자 기준):**

- `User=pje070163` → `User=ubuntu`
- `/home/pje070163/JangB-main` → `/home/ubuntu/JangB-main` (모든 곳)

**환경 변수**를 systemd에서 주고 싶다면 `[Service]` 안에 추가:

```ini
Environment=PORT=8080
Environment=GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/본인ID/exec
```

또는 `.env`를 쓰려면:

```ini
EnvironmentFile=/home/ubuntu/JangB-main/.env
```

저장 후 설치:

```bash
sudo cp /home/ubuntu/JangB-main/jangb.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable jangb
sudo systemctl start jangb
sudo systemctl status jangb
```

로그: `~/JangB-main/jangb-node.log`

---

## 8. Apache (GCP에서 /var/www/html 쓰던 경우)

GCP에서 정적 파일을 `/var/www/html`에 두고 Apache로 서비스했다면, AWS에서도 동일하게 맞춥니다.

```bash
sudo apt install -y apache2
```

### 8-1. 프록시 설정 (Node 8080 연동)

Node를 8080에서만 돌리고, Apache가 `/api` 등을 8080으로 넘기려면:

```bash
sudo a2enmod proxy proxy_http
sudo nano /etc/apache2/sites-available/000-default.conf
```

`<VirtualHost *:80>` 안에 예시:

```apache
ProxyPreserveHost On
ProxyPass /api http://127.0.0.1:8080/api
ProxyPassReverse /api http://127.0.0.1:8080/api
```

저장 후:

```bash
sudo systemctl restart apache2
```

### 8-2. 정적 파일 배포 (GCP와 동일)

`update_www_html.sh` 는 `~/JangB-main/src/*` → `/var/www/html/` 로 복사합니다.  
AWS에서도 프로젝트 경로가 `~/JangB-main` 이면 그대로 사용 가능:

```bash
cd /home/ubuntu/JangB-main
chmod +x update_www_html.sh
./update_www_html.sh
```

권한은 스크립트가 `www-data`로 설정합니다. GCP와 동일한 동작입니다.

---

## 9. 스크립트 (GCP에서 쓰던 것 그대로)

| 스크립트 | 용도 | AWS에서 |
|----------|------|---------|
| `restart_server.sh` | 8080 프로세스 종료 후 `node server.js` | `cd ~/JangB-main` 이 맞으면 그대로 사용. systemd 쓰면 보통 `sudo systemctl restart jangb` 사용 |
| `update_www_html.sh` | `src/` → `/var/www/html/`, Apache 재시작 | Apache 설치 후 그대로 실행 |

경로가 `~/JangB-main` 이고 사용자가 `ubuntu`면 수정 없이 사용 가능합니다.

```bash
chmod +x /home/ubuntu/JangB-main/restart_server.sh
chmod +x /home/ubuntu/JangB-main/update_www_html.sh
```

---

## 10. 체크리스트 (GCP 설정이 모두 AWS로 옮겨졌는지)

- [ ] EC2 인스턴스 생성 (Ubuntu 22.04)
- [ ] 보안 그룹: 22(SSH), 80(HTTP), 443(HTTPS 필요 시)
- [ ] Node.js 설치, `npm install` 완료
- [ ] 프로젝트 복사 (`JangB-main` 폴더)
- [ ] `.env` 생성 (PORT, GOOGLE_SCRIPT_URL, Supabase 등 GCP와 동일)
- [ ] `jangb.service` 에 User/경로를 AWS 사용자에 맞게 수정 후 설치
- [ ] `sudo systemctl enable jangb && sudo systemctl start jangb` 후 `status` 확인
- [ ] Apache 설치 후 `/var/www/html` 배포 및 필요 시 프록시 설정
- [ ] `./update_www_html.sh` 실행
- [ ] 브라우저에서 `http://<EC2-IP>/` 및 `http://<EC2-IP>/api/health` 확인
- [ ] 도메인 사용 시: A 레코드를 EC2(또는 Elastic IP)로 변경

---

## 11. 요약

- **옮겨야 할 것**: 프로젝트 폴더, `.env` 내용, `jangb.service`(경로/사용자만 수정), `restart_server.sh`, `update_www_html.sh`.
- **AWS에서 새로 할 것**: EC2 + 보안 그룹, Node/Apache 설치, systemd 등록, `.env` 작성.
- **GCP와 동일하게**: 포트 8080, `/var/www/html`, Apache, systemd 자동 시작.

이 순서대로 하면 GCP에서 하던 설정을 AWS에서 그대로 재현할 수 있습니다.
