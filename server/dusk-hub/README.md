# Dusk 허브

플러그인과 따로 도는 개발자 서버입니다. Node 22 이상만 있으면 되고 `npm install`은 필요 없습니다.

- 익명 사용 통계: 일간·주간·월간 사용자, 애드온별 사용자, 버전 분포
- 버그 신고: 플러그인 설정 → "버그 신고"에서 보낸 신고(버전·애드온·환경·최근 오류 기록 포함)
- 신고 상태 알림(0.3.0): 신고마다 확인 키를 돌려주고, 플러그인은 그 키로 상태·답장만 봅니다(`POST /api/report-status`, 내용 제외). 관리 화면 신고 상세의 **답장** 칸(한 줄, Enter 저장)이 플러그인 종 알림에 보입니다. 키가 없는 옛 신고는 사용자에게 보이지 않습니다.
- GitHub 이슈·PR: 웹후크로 바로 받고, 10분마다 API로도 읽어서 놓치지 않습니다. 새 활동은 표시됩니다.
- 디스코드 알림(선택): 새 신고·새 이슈·새 댓글

## 자동 업데이트

서버는 한 시간마다 GitHub main의 `hub.cjs`를 확인합니다. 바뀌었으면 문법 검사를 거쳐 바꿔 끼우고(이전 파일은 `hub.cjs.bak`), 스스로 끝납니다. 그러면 pm2(또는 systemd)가 새 파일로 다시 켭니다.
- 관리 화면 개요 맨 아래에서 상태를 보고 **지금 업데이트**를 누를 수 있습니다.
- 손으로 할 때: `node hub.cjs --update && pm2 restart dusk-hub`
- 끄려면 `hub.config.json`에 `"AUTO_UPDATE": "0"`을 넣습니다.
- 되돌리기: `cp hub.cjs.bak hub.cjs && pm2 restart dusk-hub`

## 앱으로 설치

관리 화면은 웹앱이라 홈 화면이나 PC에 앱처럼 깔 수 있습니다(https 주소에서만).
- 안드로이드·크롬·엣지: 관리 화면 위쪽 **앱으로 설치** 버튼, 또는 브라우저 메뉴의 "앱 설치"
- 아이폰·아이패드: 사파리 공유 버튼 → **홈 화면에 추가**
- 설치한 앱에서도 한 번 로그인하면 그 기기는 다시 묻지 않습니다.

## 관리 화면 비밀번호

```bash
cd ~/dusk-hub && node hub.cjs --set-password && pm2 restart dusk-hub
```
- 비밀번호는 해시로만 `hub-data/auth.json`에 저장됩니다. 다시 실행하면 비밀번호가 바뀌고, 로그인해 있던 기기는 모두 나가집니다.
- 한 번 들어간 기기는 400일 동안 다시 묻지 않습니다(쓸 때마다 늘어남). 관리 화면 오른쪽 위 "로그인한 기기"에서 모르는 기기를 내보낼 수 있습니다.
- `ADMIN_TOKEN`도 비밀번호 자리에 넣으면 들어가집니다(비상용).

## DuckDNS 주소 쓰기

1. https://www.duckdns.org 에 로그인해 하위 도메인(예: `duskhub`)을 만들고, current ip에 오라클 서버 공인 IP를 넣습니다. 주소는 `duskhub.duckdns.org`가 됩니다.
2. IP가 바뀌어도 따라가게 서버에 갱신 작업을 겁니다(오라클에서 예약 IP를 쓰면 생략해도 됩니다).
   ```bash
   mkdir -p ~/duckdns && echo 'curl -s "https://www.duckdns.org/update?domains=duskhub&token=내토큰&ip=" -o ~/duckdns/duck.log' > ~/duckdns/duck.sh && chmod 700 ~/duckdns/duck.sh
   (crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -
   ```
3. 아래 설치 순서에서 `hub.내도메인.com` 자리에 `duskhub.duckdns.org`를 넣으면 됩니다. Caddy가 80번 포트로 인증서를 받으므로 80·443이 둘 다 열려 있어야 합니다.

## 오라클 클라우드에 설치

1. 파일 올리기: `hub.cjs`, `hub.config.example.json`, `dusk-hub.service`, `Caddyfile` 파일을 서버의 `~/dusk-hub/`에 올립니다.
2. 설정: `cp hub.config.example.json hub.config.json` 후 값을 채웁니다. `ADMIN_TOKEN`은 `openssl rand -hex 24`로 만들면 됩니다.
3. 확인: `node hub.cjs --check`
4. 상시 실행: `sudo cp dusk-hub.service /etc/systemd/system/ && sudo systemctl enable --now dusk-hub`
5. 도메인·HTTPS:
   - DNS에서 `hub.내도메인.com`의 A 레코드를 서버 공인 IP로 지정합니다.
   - Caddy를 설치하고(`sudo apt install caddy`) `Caddyfile` 파일을 `/etc/caddy/Caddyfile`에 넣은 뒤 `sudo systemctl reload caddy`를 실행합니다. 인증서는 Caddy가 알아서 받습니다.
   - 오라클은 두 군데를 다 열어야 합니다.
     - VCN 보안 목록(Security List)에서 TCP 80·443 인바운드를 허용합니다.
     - 서버 안 iptables도 엽니다: `sudo iptables -I INPUT 6 -p tcp -m multiport --dports 80,443 -j ACCEPT && sudo netfilter-persistent save`
6. GitHub 웹후크: 저장소 Settings → Webhooks → Add webhook에서 다음과 같이 넣습니다.
   - Payload URL: `https://hub.내도메인.com/api/github`
   - Content type: `application/json`
   - Secret: `GITHUB_WEBHOOK_SECRET`과 같은 값
   - 이벤트: Issues, Issue comments, Pull requests
7. 플러그인 연결: 저장소 main의 `hub.json`을 `{ "url": "https://hub.내도메인.com" }`으로 고칩니다(GitHub 웹에서 고쳐도 됩니다). 본체를 다시 낼 필요는 없고, 사용자 플러그인은 하루 안에 새 주소를 읽습니다.

`GITHUB_TOKEN`은 비워도 됩니다(공개 저장소는 시간당 60회까지 읽을 수 있음). 넣는다면 권한은 Issues 읽기 전용(fine-grained)이면 충분합니다.

데이터는 `hub-data/` 폴더의 JSON 파일에 저장됩니다. 백업할 때는 이 폴더만 복사하면 됩니다. IP는 저장하지 않습니다.
