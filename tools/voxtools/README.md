# 복셀 제작 도구 (voxtools)

픽셀아트를 복셀 모델로 바꾸고, 복셀을 코드로 빚고, `.vox` 파일을 읽고 쓰는 범용 도구 모음이에요. Node 18 이상만 있으면 되고, 추가 설치는 필요 없어요.

## 파일

| 파일 | 하는 일 |
|---|---|
| `pixel2vox.mjs` | 앞·옆·위 픽셀아트 PNG → 복셀(`.vox`) + 표시점(`.json`) |
| `png.mjs` | PNG 읽기·쓰기(의존성 없음) |
| `vox.mjs` | MagicaVoxel `.vox` 읽기·쓰기, 색 255개로 줄이기 |
| `voxsculpt.mjs` | 코드로 복셀 빚기: 타원체, 캡슐, 가시, 삼각 판, 결정 셀 색, 좌우 대칭 |
| `mesh.mjs` | 복셀 → 면 합치기 메시(three.js용 배열) |
| `viewer.html` | `.vox` 미리보기(브라우저, three.js는 CDN에서 불러옴) |
| `sample/` | 시험용 그림(단순 도끼 모양) |

## 1. 픽셀아트 → 복셀

```bash
node pixel2vox.mjs --front 앞.png --side 옆.png --markers 표시점.png --out 내모델
```

결과로 `내모델.vox`(MagicaVoxel에서 열기·다듬기 가능)와 `내모델.json`(크기, 복셀 수, 표시점 좌표)이 생겨요.

### 그림 규칙
- **앞 그림**: 가로 = 오른쪽(x), 세로 = 위(y)
- **옆 그림**: 가로 = 앞뒤(z, 왼쪽이 뒤, 오른쪽이 앞), 세로 = 위(y). **앞 그림과 높이가 같아야 해요.**
- **위 그림**(선택): 가로 = x, 세로 = z(위쪽이 뒤). **앞 그림과 너비가 같아야 해요.**
- 투명한 픽셀(알파 128 미만)은 빈칸이에요.
- PNG는 8비트, 인터레이스 없음(그림판, Aseprite, 포토샵 기본 저장이면 돼요).
- 한 변 최대 256픽셀(MagicaVoxel 한계)이에요.

### 만드는 방식
- 앞·옆·위 실루엣이 모두 칠해진 칸만 남겨요(실루엣 깎기).
- 색은 그 칸이 드러난 면에 맞는 그림에서 가져와요. 앞뒤 면은 앞 그림, 옆면은 옆 그림, 윗면은 위 그림이에요.

### 옆 그림 없이 한 장으로
```bash
node pixel2vox.mjs --front 앞.png --depth 8 --round 1 --out 내모델
```
- `--depth`: 최대 두께(칸)
- `--round`: 0이면 납작한 판, 1이면 가장자리로 갈수록 둥글게 얇아져요(칼날, 깃 같은 모양에 좋아요).

### 표시점 그림
앞 그림과 같은 크기의 PNG에 정해진 색 점을 찍으면 이름 붙은 좌표가 `.json`에 들어가요. 좌표의 깊이(z)는 그 칸 두께의 가운데예요.

| 색 (RGB) | 이름 | 쓰임 |
|---|---|---|
| 255,0,0 (빨강) | grip | 오른손(주 손잡이) |
| 0,255,0 (초록) | off | 왼손 |
| 0,0,255 (파랑) | back | 등에 거는 점 |
| 255,255,0 (노랑) | tip | 칼끝 |
| 255,0,255 (자홍) | joint | 관절 |
| 0,255,255 (청록) | extra | 기타 |

다른 색표를 쓰려면 `--marks 색표.json`(예: `{"255,128,0": "hook"}`)을 넘기면 돼요.

## 2. 코드로 복셀 빚기

```js
import { sculpt } from "./voxsculpt.mjs"; import { writeVox } from "./vox.mjs"; import { writeFileSync } from "node:fs";
const K = sculpt(.02);                          // 한 칸 = 0.02
K.cap([0, 0, 0], [0, 1, 0], .05, .04, 0x6a4a36); // 자루
K.ell([.1, 1, 0], [.15, .1, .03], 0x9aa0ac);    // 머리
K.mirror(0);                                    // 좌우 대칭 복제
writeFileSync("out.vox", writeVox(K.list()));
```

## 3. 미리보기
`viewer.html`을 브라우저로 열고 `.vox` 파일을 고르면 돼요. 같은 폴더에서 로컬 서버로 열면 `viewer.html?f=내모델.vox`로 바로 볼 수도 있어요.

## 시험
```bash
cd sample
node ../pixel2vox.mjs --front front.png --side side.png --markers markers.png --out axe
node ../pixel2vox.mjs --front front.png --depth 8 --round 1 --out axe_round
```
