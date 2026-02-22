# JangB 서버 자동 시작 가이드

VM 재부팅 후에도 서버가 자동으로 올라오게 하려면 **systemd 서비스**를 쓰면 됩니다.  
일회성으로만 올리려면 **스크립트**만 사용하면 됩니다.

---

## 1. 스크립트로 수동 시작/중지

서버 경로가 `~/JangB-main` 이라고 가정합니다.

```bash
cd ~/JangB-main
chmod +x scripts/start-server.sh scripts/stop-server.sh
```

### 시작 (nohup + 헬스체크까지 한 번에)

```bash
./scripts/start-server.sh
```

의존성 설치까지 하고 싶을 때:

```bash
./scripts/start-server.sh --install
```

### 중지

```bash
./scripts/stop-server.sh
```

---

## 2. 부팅 시 자동 시작 (systemd)

한 번만 설정해 두면, VM을 켤 때마다 Node 서버가 자동으로 뜹니다.

### 1) 서비스 파일 위치

- **프로젝트 루트** `~/JangB-main/jangb.service` — 이미 `pje070163` 계정으로 설정됨. 이 파일을 쓰면 수정 없이 복사 가능.
- 또는 `scripts/jangb.service` 가 있으면 그걸 써도 됨. 이때는 안의 `YOUR_USER` 를 실제 사용자명으로 바꾸세요.

### 2) 설치 및 활성화

```bash
cd ~/JangB-main
sudo cp jangb.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable jangb   # 부팅 시 자동 시작
sudo systemctl start jangb   # 지금 바로 시작
```

### 3) 상태 확인

```bash
sudo systemctl status jangb
```

로그는 `~/JangB-main/jangb-node.log` 에 쌓입니다.

### 4) 자주 쓰는 명령

| 명령 | 설명 |
|------|------|
| `sudo systemctl start jangb` | 서비스 시작 |
| `sudo systemctl stop jangb` | 서비스 중지 |
| `sudo systemctl restart jangb` | 재시작 (코드/의존성 변경 후) |
| `sudo systemctl disable jangb` | 부팅 시 자동 시작 해제 |

---

## 3. 의존성 업데이트 후 재시작

`package.json` 이 바뀌었을 때:

```bash
cd ~/JangB-main
npm install
sudo systemctl restart jangb
```

systemd를 쓰지 않고 스크립트만 쓸 때는:

```bash
./scripts/stop-server.sh
./scripts/start-server.sh --install
```

이렇게 하면 매번 수동으로 `nohup` 과 `curl` 헬스체크를 치지 않아도 됩니다.
