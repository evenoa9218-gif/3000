---
name: quiz-maker
description: >
  선택형(OX) 퀴즈 앱 MCQ(evenoa9218-gif/MCQ)의 문항 데이터를 만들고 고치고 검수해
  배포하는 스킬. 원본 자료(PDF·hwp·txt)를 보고 5-tuple 문항 데이터를 작성해
  data/{모듈}.json 에 반영한다. 과목을 가리지 않는다 — 민사법·형사법·공법,
  앞으로 추가될 선택법까지 같은 절차를 쓴다.
  핵심 원칙: 원본 내용 100% 보존. 누락 절대 불가. AI 해설 추가는 허용, 원문 누락은 금지.
  "퀴즈 만들어줘", "선택형 문제 추가", "OX 데이터 입력", "문항 검수해줘",
  "모듈 활성화" 같은 요청이나 문제집 파일 업로드가 오면 이 스킬을 쓴다.
  사례형(CASE_Practice)·기록형(RECORD_Practice)·암기장(Core_Notes)은 대상이 아니다.
---

# 선택형(OX) 문항 데이터 제작·검수 스킬

## ★ 최우선 원칙 — 원본 100% 보존

```
원본에 있는 내용은 단 하나도 빠져서는 안 된다.
AI 해설 추가 = 허용
원문 누락    = 절대 금지
```

이 스킬의 모든 절차는 이 원칙 하나를 지키려고 존재한다.

누락이 생기는 길목은 늘 같다.
1. 공통 사실관계를 `§` 없이 개별 지문만 등록
2. 번호 건너뜀 (001 → 003, SS2 누락)
3. 긴 지문을 줄여 쓰기
4. 해설 일부 생략 (판례 요지만 남기고 버리기)
5. `★` / `■보충` 표시 미반영
6. 기출 출처(EXAM_YEAR) 미등록

---

## 1. 이 스킬의 목적과 범위

### 목적
원본 자료에서 **선택형(OX) 문항**을 뽑아 MCQ 앱이 읽는 데이터로 만들고,
누락 없이 들어갔는지 검수한 뒤 배포한다.

### 범위 안
| 하는 일 | 예 |
|---|---|
| 새 모듈 데이터 입력 | 헌법 0문항 → 전 범위 입력 |
| 기존 모듈에 문항 추가 | 새 기출 회차 반영 |
| 기존 문항 수정 | 오탈자·해설 보완·정답 정정 |
| 검수 | 누락·중복·형식 오류 탐지 |
| 모듈 활성화 | `status:"soon"` → `"active"` |
| 메타데이터 갱신 | `STAR_IDS`, `EXAM_YEAR`, `topics` |

**과목을 가리지 않는다.** 민사법·형사법·공법, 앞으로 붙일 선택법(국제법·국제거래법)까지
전부 같은 절차다. 새 과목이면 3절의 대응표에 줄을 추가하면 된다.

### 범위 밖
| 안 하는 일 | 어디서 하나 |
|---|---|
| 사례형 문제·채점 데이터 | `CASE_Practice/pipeline/` (별도 파이프라인) |
| 기록형 문제·쟁점 태깅 | `RECORD_Practice/pipeline/` |
| 암기장 개념·판례 카드 | `Core_Notes` (구조가 다름) |
| 앱 UI·기능 변경 | 이 스킬 밖의 일반 작업 |
| 쟁점 ID 부여 | `CASE_Practice`의 레지스트리가 정본 |

헷갈리면 기준은 하나다 — **"OX로 답하는 문항인가."** 아니면 이 스킬이 아니다.

---

## 2. 데이터가 어디 있나

**문항 본문은 JSON, 부가 정보는 HTML에 있다.** 둘을 헷갈리면 안 된다.

```
MCQ/
├── index.html          민사법 앱     (STAR_IDS·EXAM_YEAR·MODULE_REGISTRY)
├── criminal.html       형사법 앱
├── public-law.html     공법 앱
├── sw.js               서비스워커 (캐시 이름 ox-quiz-vN)
└── data/
    ├── 채권총론.json        ← 문항 본문. 5-tuple 배열
    ├── 형법각론.json
    └── …                   모듈 하나당 파일 하나
```

| 무엇 | 어디 | 형식 |
|---|---|---|
| 문항 본문 | `data/{모듈id}.json` | 5-tuple 배열 |
| ★ 목록 | HTML 안 `STAR_IDS_*` | `new Set([...])` |
| 흰 별 | HTML 안 `WHITE_STAR_IDS_*` | 형법총론에만 있음 |
| 기출 출처 | HTML 안 `EXAM_YEAR_*` | `{id: "변25"}` |
| 모듈 정의 | HTML 안 `MODULE_REGISTRY` | id·label·topics·count |

> 예전에는 문항까지 HTML 안 `const 형법각론_RAW = [...]`에 박혀 있었다.
> 지금은 JSON이다. **HTML에서 `_RAW`를 찾으면 안 된다 — 하나도 없다.**

### 앱이 데이터를 읽는 흐름
```
모듈 선택 → ensureModuleData(모듈id) → fetch('data/{모듈id}.json')
         → MODULE_BUILDERS[모듈id](rows) → {변수}_DATA 채움 → 화면
```
허브(모듈 선택) 화면은 데이터를 받지 않는다. `MODULE_REGISTRY`의 `count` 리터럴만 쓴다.
**그래서 문항 수가 바뀌면 `count`도 같이 고쳐야 한다.**

---

## 3. 모듈 대응표

`data/` 파일 이름은 **모듈 `id`**를 따른다. 변수 이름과 다를 수 있다.

| 파일 | 모듈 id | 데이터 변수 | STAR_IDS | EXAM_YEAR | 상태 |
|---|---|---|---|---|---|
| index.html | 채권총론 | `채권총론` | `STAR_IDS` | (렌더 단계) | active |
| index.html | 채권각론 | `채권각론` | `STAR_IDS_각론` | `EXAM_YEAR_각론` | active |
| index.html | 민법총칙 | `민법총칙` | `STAR_IDS_민총` | `EXAM_YEAR_민총` | active |
| index.html | 물권법 | `물권법` | `STAR_IDS_물권` | `EXAM_YEAR_물권` | active |
| index.html | **민사소송법** | **`민소법`** | `STAR_IDS_민소` | `EXAM_YEAR_민소` | active |
| criminal.html | 형법총론 | `형법총론` | `STAR_IDS_형법총론` | `EXAM_YEAR_형법총론` | active |
| criminal.html | 형법각론 | `형법각론` | `STAR_IDS_형법각론` | `EXAM_YEAR_형법각론` | active |
| criminal.html | 형사소송법 | `형사소송법` | `STAR_IDS_형사소송법` | `EXAM_YEAR_형사소송법` | active |
| public-law.html | 헌법 | `헌법` | `STAR_IDS_헌법` | `EXAM_YEAR_헌법` | **soon** |
| public-law.html | 행정법총론 | `행정법총론` | `STAR_IDS_행정법총론` | `EXAM_YEAR_행정법총론` | **soon** |
| public-law.html | 행정법각론 | `행정법각론` | `STAR_IDS_행정법각론` | `EXAM_YEAR_행정법각론` | **soon** |
| index.html | 상법총칙 | `상법총칙` | `STAR_IDS_상법총칙` | `EXAM_YEAR_상법총칙` | **soon**(입력중) |
| index.html | 상행위법 | `상행위법` | `STAR_IDS_상행위법` | `EXAM_YEAR_상행위법` | **soon**(미착수) |
| index.html | 회사법 | `회사법` | `STAR_IDS_회사법` | `EXAM_YEAR_회사법` | **soon**(미착수) |
| index.html | 어음수표법 | `어음수표법` | `STAR_IDS_어음수표법` | `EXAM_YEAR_어음수표법` | **soon**(미착수) |
| index.html | 보험법 | `보험법` | `STAR_IDS_보험법` | `EXAM_YEAR_보험법` | **soon**(미착수) |

> 민사소송법은 **id와 변수 이름이 어긋난다.** 파일은 `data/민사소송법.json`,
> 변수는 `민소법_DATA`다. 이런 어긋남이 또 있을 수 있으니 표를 믿지 말고 확인한다.
>
> **상법 계열 모듈은 id 형식이 다르다.** 원본(『푸에테 로스쿨 상법 기출지문총정리』)이
> 챕터마다 번호를 001로 리셋하므로, id를 `{챕터명}{원번호}` 형태로 쓴다
> (예: `상업사용인009.①`). 4절 ID 규칙 표의 기존 방식과 다른 이 모듈 전용 규칙이며,
> EXAM_YEAR 조회 로직(index.html, `qcard-no` 렌더 부분의 `chapterMatch`)도 이 규칙을
> 전제로 만들어져 있다. 상법 데이터를 만질 때는 이 표기를 그대로 따른다.
> 5개 모듈은 원본 Part 구조(총칙/상행위법/회사법/어음수표법/보험법)를 따라 나눴다.

표는 언제든 코드에서 다시 뽑을 수 있다.

```python
import re, glob
for fn in ['index.html', 'criminal.html', 'public-law.html']:
    s = open(fn, encoding='utf-8').read()
    print(fn)
    for g in re.finditer(r'getData:\s*\(\)\s*=>\s*([\w가-힣$]+)_DATA', s):
        mid = re.findall(r'id:\s*"([^"]+)"', s[:g.start()])[-1]
        used = re.search(
            r'MODULE_BUILDERS\["' + re.escape(mid) + r'"\][^;]{0,500}', s)
        meta = sorted(set(re.findall(
            r'(?:WHITE_)?STAR_IDS[\w가-힣]*|EXAM_YEAR[\w가-힣]*', used.group(0)))) if used else []
        print(f'   id={mid:<10} 변수={g.group(1):<10} {meta}')
```

### 과목을 새로 붙일 때
1. HTML 파일을 하나 만든다(가장 가까운 과목 파일을 복제하는 게 빠르다)
2. `MODULE_REGISTRY`에 `status:"soon"`으로 모듈을 등록
3. `data/{모듈id}.json`에 `[]`를 넣어 둔다
4. 입력이 끝나면 8절대로 활성화
5. 이 표에 줄을 추가한다

---

## 4. 데이터 형식

### 5-tuple
```javascript
// [id, question, answer, explanation, topic]
["001.①", "甲은 …",            true,  "▸ 법리 설명 (2019도12345)", "총칙"]
["SS1.ㄱ", "사실관계§★ 지문",   false, "▸ [AI해설] 설명 (판례)",    "총칙"]
```

### ID 규칙
| 유형 | 형식 | 예 |
|---|---|---|
| 단문(원 번호) | `NNN.①②③④⑤` | `003.②` |
| 선택지 | `NNN.ㄱㄴㄷㄹㅁ` | `017.ㄷ` |
| SS 기출 | `SS{N}.ㄱ…` | `SS4.ㄴ` |
| 기타 | `기타{NN}` | `기타02` |
| 순수 일련번호 | `NNN` | `001` (형사법이 이 방식) |

> **과목마다 id 방식이 다르다.** 민법은 `001.①`, 형사법은 `001`.
> 새로 입력할 때는 **그 모듈이 이미 쓰는 방식을 따른다.** 섞으면 안 된다.

### `§` — 공통 사실관계
```
"[공통 사실관계 전체]§[개별 지문]"
```
같은 번호의 여러 지문이 같은 사실관계를 전제하면 **지문마다** 사실관계를 붙인다.
독립 법리 지문이면 `§` 없이 지문만 쓴다.

### `★` · `■보충`
- `★` → question 맨 앞에 넣고 **`STAR_IDS`에도 등록**
- `■보충` → question 맨 앞에만 넣고 `STAR_IDS`에는 넣지 않는다
- **원본에 있는 대로만.** 없으면 만들지 않는다.

### 해설
```
▸ [법리 내용] (판례번호)           ← 표준. 원본 그대로
▸ [AI해설] [법리 내용] (판례번호)  ← 원본에 해설이 없거나 모자랄 때
```
- 판례번호만 있는 해설 금지 → 반드시 내용을 쓴다
- 다른 지문 참조 금지(`▸ 위 ①해설 참조`) → 각 해설은 홀로 완결
- `[AI해설]`은 판례번호나 법령 조문이 하나 이상 있을 때만

---

## 5. 작업 절차

### Step 0. 저장소 준비
```bash
git clone https://github.com/evenoa9218-gif/MCQ.git repo_check
cd repo_check && git pull
```
> 저장소 이름은 **`MCQ`**다. 옛 이름 `3000`은 리다이렉트만 남아 있다.
> 인증은 이미 설정된 자격증명을 쓴다. **토큰을 이 파일에 적지 않는다.**

확인할 것:
- [ ] 대상 파일과 모듈 id (3절 표)
- [ ] `data/{모듈id}.json`이 있는지
- [ ] `MODULE_REGISTRY`에 모듈이 등록돼 있는지

### Step 1. 원본 형식 파악 (새 자료의 첫 세션에만)
PDF면 앞 10쪽을 이미지로 펼쳐 보고 아래를 적어 둔다.
```
- 문항 번호 형식:
- 지문 번호 형식:  (①②③ / ㄱㄴㄷ)
- 기출 출처 표시 위치:
- ★ 위치:
- ■보충 위치:
- 사실관계 표시:
- SS 문항 여부:
- 해설 형식:      (▸ / → / 기타)
```
기존 모듈과 형식이 다르면 **작업 전에 사용자와 규칙을 정한다.**

### Step 2. 원본 펼치기
```bash
pdftoppm -jpeg -r 100 -f N -l M 원본.pdf out/p    # 범위 특정용
pdftoppm -jpeg -r 150 -f N -l M 원본.pdf out/p    # 작업용
pdftoppm -jpeg -r 250 -f N -l N 원본.pdf out/zoom # 작은 글씨 확대
```
> OCR(`pdftotext`)은 **쪽 번호·위치 찾기 보조용**이다.
> 본문은 반드시 이미지에서 직접 읽는다. OCR은 한자·특수문자를 자주 틀린다.

hwp·txt 원본이면 그대로 읽되, 표·각주가 깨졌는지 확인한다.

### Step 3. 번호 목록 먼저
```
섹션 내 문항 번호: 001, 002, SS1, SS2, 기타01, …
→ 빠진 번호가 없는지 먼저 확인한 뒤 입력을 시작한다
```

### Step 4. 문항별 입력
문항마다 확인한다.
- [ ] id 형식이 그 모듈의 방식과 같은가
- [ ] 사실관계가 있는가 → `§` 필요
- [ ] `★` / `■보충` 표시가 있는가
- [ ] 지문이 통째로 들어갔는가
- [ ] 정답(O/X)이 맞는가
- [ ] 해설이 원문과 같은가
- [ ] 기출 출처가 있는가

### Step 5. 섹션이 끝나면 곧바로 6절 자동 검수 + 6-2절 누락 방지

두 개를 같이 돌린다. 6절은 **넣은 것**만 보고, 6-2절이 **안 넣은 것**을 본다.
한 번에 몰아 넣고 검수를 건너뛰면 단원이 통째로 비어도 모른다 — 실제로 그랬다.

---

## 6. 1차 자동 검수

**섹션마다 반드시 돌린다.** 모든 항목이 "없음"이 될 때까지 고친다.

```python
import json, re
from collections import Counter, defaultdict

MODULE = '형법총론'          # 모듈 id — data 파일 이름과 같다
HTML   = 'criminal.html'     # 그 모듈이 사는 앱 파일
STAR_VAR = 'STAR_IDS_형법총론'   # 3절 표에서 확인. 모듈 이름과 다를 수 있다

data = json.load(open(f'data/{MODULE}.json', encoding='utf-8'))
html = open(HTML, encoding='utf-8').read()
print(f'총 {len(data)}문항')

# ① 중복 id
print('① 중복id:', [k for k,v in Counter(str(x[0]) for x in data).items() if v>1] or '없음')

# ② 판례번호만 있는 해설
p_only = re.compile(r'^▸\s*[\[(][^\])]{3,15}[\])]\s*$')
print('② 판례만해설:', [x[0] for x in data if p_only.match(x[3].strip())] or '없음')

# ③ 해설 없음
print('③ 해설없음:', [x[0] for x in data if not x[3].strip()] or '없음')

# ④ 같은 번호인데 § 유무가 갈리는 그룹
def pfx(q):
    m = re.match(r'^(SS\d+|기타\d+|\d+)', str(q))
    return m.group(1) if m else str(q)
groups = defaultdict(list)
for x in data: groups[pfx(x[0])].append(x)
print('④ §불일치:', [p for p,it in groups.items()
                    if len(it)>1 and 0 < sum('§' in x[1] for x in it) < len(it)] or '없음')

# ⑤ 근거 없는 AI해설
case = re.compile(r'\d{2,4}[가-힣]{1,3}\d{3,7}|\d+조')
print('⑤ 근거없는AI해설:', [x[0] for x in data
                          if 'AI해설' in x[3] and not case.search(x[3])] or '없음')

# ⑥ 다른 지문 참조
ref = re.compile(r'위\s*[①②③④⑤ㄱㄴㄷㄹㅁ]\s*(지문)?\s*(해설)?\s*참조')
print('⑥ 타지문참조:', [x[0] for x in data if ref.search(x[3])] or '없음')

# ⑦ ★인데 STAR_IDS 미등록
m = re.search(rf'const {STAR_VAR} = new Set\((\[.*?\])\)', html, re.S)
reg = set(json.loads(m.group(1))) if m else set()
print('⑦ ★미등록:', sorted({str(x[0]) for x in data if x[1].startswith('★')} - reg) or '없음')

# ⑧ 번호 건너뜀
nums = sorted(int(re.match(r'^(\d+)', str(x[0])).group(1))
              for x in data if re.match(r'^\d+', str(x[0])))
print('⑧ 번호건너뜀:', [f'{a}→{b}' for a,b in zip(nums, nums[1:]) if b-a>1] or '없음')

# ⑨ 지문이 지나치게 짧음
print('⑨ 지문짧음(<10자):', [x[0] for x in data
                           if len(x[1].split('§')[-1].strip())<10] or '없음')

# ⑩ MODULE_REGISTRY의 count와 실제 개수
#    콜론 뒤 공백이 항목마다 다르다(`id:"X"`와 `id: "X"`가 섞여 있다). \s*를 빼면 안 된다.
ENTRY = rf'id:\s*"{re.escape(MODULE)}"'
m = re.search(ENTRY + r'.*?count:\s*(\d+)', html, re.S)
print('⑩ count:', '일치' if m and int(m.group(1))==len(data)
      else f'★불일치★ 선언={m.group(1) if m else "찾지못함"} 실제={len(data)}')

# ⑪ topic이 MODULE_REGISTRY의 topics에 있는가 (한 글자만 달라도 섹션 전체 무표시)
#    `15V`("📝 제15회 변호사시험")는 topic이 아니라 id 접두사로 거르는 특수 키다.
#    문항이 0으로 보이는 게 정상이니 빈 키 목록에서 빼야 한다.
SPECIAL = {'15V'}
blk = re.search(ENTRY + r'.*?topics:\s*\[(.*?)\]', html, re.S)
keys = set(re.findall(r'key:\s*"([^"]+)"', blk.group(1))) if blk else None
if keys is None:
    print('⑪ ★topics를 찾지 못함★')
else:
    used = {x[4] for x in data}
    print('⑪ 미등록topic:', sorted(used - keys) or '없음')
    print('   문항0인key:', sorted(keys - used - SPECIAL) or '없음')

print('\n모두 "없음"·"일치"면 1차 통과.')
```

---

## 6-2. 누락 방지 — 실제로 뚫렸던 구멍들

2026-08 전수 대조에서 민법 5개 모듈과 형사법 3개 모듈을 원본과 맞춰 봤다.
**형사법은 누락 0**, 민법 물권법은 **단원 두 개 30지문이 통째로 비어** 있었다.

차이는 입력 방식이었다. 형사법은 이 스킬대로 섹션마다 검수하고 커밋을 30번
남기며 갔고, 물권법은 한 번에 몰아 넣고 검수를 건너뛰었다. 6절 자동 검수는
**이미 넣은 것**만 본다 — 아예 안 넣은 단원은 잡지 못한다.

아래 세 가지를 섹션 완료 때마다 함께 돌린다.

### ① 번호 연속성 — 단원 통째 누락을 잡는다

```python
nums = sorted({int(m.group(1)) for x in data
               if (m := re.match(r'^(\d+)', str(x[0])))})
gaps = [(a, b) for a, b in zip(nums, nums[1:]) if b - a > 1]
print('빈 번호:', [n for n in range(nums[0], nums[-1]) if n not in nums])
print('큰 구멍(4 이상):', [g for g in gaps if g[1] - g[0] > 3])
```

물권법은 `26 → 38`이 이 검사에 걸려 「선의취득·동산물권의 변동」과
「물권적 청구권」 두 단원이 통째로 빠진 것을 찾았다.

> 주의: 15V·SS 같은 접두사 id는 이 숫자열에 안 잡힌다. 물권법 `003`이
> 빈 번호로 보였지만 실제로는 `15V03.③`으로 들어가 있었다. 빈 번호가
> 나오면 다른 접두사에 있는지 먼저 확인한다.

### ② STAR_IDS 죽은 id — 지문 단위 누락의 흔적

★를 등록해 놓고 지문을 안 넣으면 이렇게 남는다.

```python
reg = set(json.loads(re.search(rf'const {STAR_VAR} = new Set\((\[.*?\])\)',
                               html, re.S).group(1)))
ids = {str(x[0]) for x in data}
print('없는 id에 등록된 ★:', sorted(reg - ids))
```

물권법 `067.③④`, `070.⑤`가 이걸로 걸렸다. 다만 **★가 없는 지문이 빠지면
흔적이 남지 않는다** — `070.④`가 그랬다. 그래서 ③이 필요하다.

### ③ 커버리지 대조 — 흔적 없는 누락까지 잡는다

번호도 ★도 못 잡는 누락은 반대로 접근한다. **원본 쪽에서 데이터에 있는
지문·해설을 지우고, 남는 덩어리를 본다.** 크게 남으면 그 자리에 안 넣은
문항이 있다.

```python
K = 12                      # OCR이 글자를 틀리므로 정확 일치가 아니라 조각으로 센다
known = set()
for x in data:
    n = norm(x[1].replace('§', '')) ; known |= {n[i:i+K] for i in range(len(n)-K+1)}
    n = norm(x[3])            ; known |= {n[i:i+K] for i in range(len(n)-K+1)}
# 원본 쪽마다: 덮이지 않은 구간이 220자 이상이면 보고
```

민법 5권에 돌려 48곳이 나왔고, 그중 실제 누락은 3곳이었다. 나머지는
조문 박스·해설 연장부·다른 편 혼입이었다. **미매칭이 곧 누락은 아니다 —
쪽 이미지로 확인해야 한다.**

### 원본을 확정할 때 믿지 말아야 할 것

- **파일 이름** — `(25.03)`으로 되어 있어도 실제 판본과 다를 수 있다
- **PDF 텍스트 층** — 폰트 인코딩이 깨져 `축졏2홾tf쀺뺫얈`처럼 나오면
  대조가 전부 미매칭으로 뜬다. 책이 틀린 게 아니라 못 읽은 것이다
- **한 파일 = 한 편** — `민총_3000제.pdf` 마지막 1쪽이 물권법 편이었다.
  다른 모듈 데이터와 대조하면 100% 불일치로 잡힌다

확정은 **쪽수·본문 첫 문항·목차**를 직접 맞춰 본다. 형소 OX는 쪽수 382가
인계 문서의 "382페이지"와 맞아떨어진 것이 결정적이었다.

텍스트 층이 깨졌거나 없으면 Windows 내장 OCR로 다시 읽는다. 설치가 필요
없고 한국어 인식기가 이미 있다. 기존 OCR본보다 품질이 낫다.

### 개정판을 받았을 때

**통째로 갈아끼우지 않는다.** 진도가 문항 id로 저장되므로 다시 뽑아 교체하면
사용자의 오답·체크 기록이 전부 끊긴다. 새 판본에서 **기존에 없는 지문만**
골라 뒤에 덧붙이고, 기존 id는 하나도 건드리지 않는다.

---

## 7. 2차 수동 검수 — 원본 직접 대조

자동 검수는 형식만 본다. **누락은 눈으로 대조해야 잡힌다.**

```python
topic = '총칙'
sub = [x for x in data if x[4] == topic]

# 7-1 문항 수: 원본에서 직접 센 숫자와 비교
print(f'데이터 {len(sub)}개 — 원본에서 센 개수와 같은가?')

# 7-2 id 순서를 나열해 원본 번호와 1:1 대조
print([str(x[0]) for x in sub])

# 7-3 사실관계(§) 완전성 — 같은 번호 묶음을 원본과 대조
for p, items in sorted(groups.items()):
    if len(items) < 2: continue
    print(f'[{p}] {len(items)}지문')
    for x in items:
        head = x[1].split('§')[0][:60] if '§' in x[1] else '(사실관계없음)'
        print(f'   {x[0]}: {head}')

# 7-4 해설이 짧은 항목 = 내용 누락 의심
for x in sub:
    if len(x[3].strip()) < 15: print(f'해설짧음 {x[0]}: {x[3]!r}')

# 7-5 ★ 목록 대조 (원본에서 직접 확인한 목록과)
pdf_stars = []   # 원본에서 눈으로 확인한 ★ 목록을 채운다
have = [str(x[0]) for x in sub if x[1].startswith('★')]
print('원본에만:', set(pdf_stars)-set(have), '/ 데이터에만:', set(have)-set(pdf_stars))
```

---

## 8. 반영

### 8-1. 문항 데이터 — JSON을 그냥 쓴다
```python
import json
json.dump(data, open(f'data/{MODULE}.json', 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
```
> 예전에는 HTML에서 괄호 깊이를 세어 배열 경계를 찾아 갈아끼웠다.
> 이제 그럴 필요가 없다. **HTML을 문자열 치환해서 문항을 넣지 않는다.**

### 8-2. STAR_IDS — HTML이라 치환이 필요하다
```python
import re, json
html = open(HTML, encoding='utf-8').read()
m = re.search(rf'const {STAR_VAR} = new Set\((\[.*?\])\)', html, re.S)
merged = sorted(set(json.loads(m.group(1))) | set(new_stars))
html = html.replace(m.group(0),
                    f'const {STAR_VAR} = new Set({json.dumps(merged, ensure_ascii=False)})')
open(HTML, 'w', encoding='utf-8').write(html)
```
> `STAR_IDS`와 `EXAM_YEAR`를 **한 번에 바꾸지 않는다.** 정규식이 서로 물린다.

### 8-3. count 갱신 — 빠뜨리기 쉽다
```python
html = open(HTML, encoding='utf-8').read()
m = re.search(rf'(id:\s*"{re.escape(MODULE)}".*?count:\s*)(\d+)', html, re.S)
assert m, f'{MODULE}의 count를 찾지 못했다 — MODULE_REGISTRY 서식을 직접 확인할 것'
html = html[:m.start(2)] + str(len(data)) + html[m.end(2):]
open(HTML, 'w', encoding='utf-8').write(html)
```
> 허브 화면은 데이터를 받지 않고 이 숫자만 읽는다.
> 안 고치면 "876문제"라 써 놓고 900문제가 나온다.

### 8-4. 모듈 활성화 (입력·검수 완료 후)
```javascript
{ id:"헌법", label:"헌법", subtitle:"헌법 핵심 판례", icon:"⚖",
  count: 1234, status:"active", color:"#c09050",
  topics:[ {key:"기본권총론", label:"기본권 총론"}, … ],
  getData: () => 헌법_DATA }
```
> `topics`의 `key`와 데이터의 topic 문자열이 **정확히** 같아야 한다.
> 한 글자만 달라도 그 섹션이 통째로 안 보인다. 6절 ⑪번이 이걸 잡는다.
>
> 실제로 물권법이 이 상태였다. 데이터는 `지상권·법정지상권`인데 레지스트리는
> `법정지상권`이었고, `공유·합유·총유`는 아예 빠져 있어 **137문항이 주제 선택에
> 나오지 않았다.** 전체 풀이로는 나오니 눈에 잘 안 띈다.
>
> 예외가 하나 있다. `15V`("📝 제15회 변호사시험")는 topic이 아니라
> **id 접두사**(`15V23.ㄱ`)로 거른다. 문항 수가 0으로 보여도 정상이니 지우면 안 된다.

### 8-5. 서비스워커 캐시
문항을 **고쳤을** 때(추가가 아니라 수정) `sw.js`의 `ox-quiz-vN`을 올린다.
데이터는 stale-while-revalidate라 다음 방문에 새 판이 오지만, 즉시 반영하려면 올려야 한다.

---

## 9. 검증과 배포

```bash
# JSON 문법
python -c "import json,glob; [json.load(open(f,encoding='utf-8')) for f in glob.glob('data/*.json')]; print('JSON OK')"

# 앱 스크립트 문법 (JSX가 남아 있으므로 Babel로)
node -e "
const b=require('@babel/core'),fs=require('fs');
const h=fs.readFileSync('criminal.html','utf-8');
const s=h.indexOf('<script type=\"text/babel\"');
const code=h.slice(h.indexOf('>',s)+1,h.indexOf('</script>',s));
b.transformSync(code,{presets:['@babel/preset-react'],filename:'a.jsx'});
console.log('Babel OK');"
```

브라우저로 **실제 동작까지** 확인한다 — 모듈 선택 → 문항 수 → 퀴즈 진행.

```bash
git add data/ *.html sw.js
git commit -m "feat: [모듈명] N문항 추가"
git push
```

배포는 GitHub Pages가 자동으로 한다. 반영에 보통 1~2분 걸린다.

---

## 10. 절대 금지

| 금지 | 이유 |
|---|---|
| OCR 텍스트 그대로 복사 | 한자·특수문자 오류가 잦다 |
| 지문·해설 요약·변형 | 원본 100% 보존 원칙 위반 |
| HTML 문자열 치환으로 문항 수정 | 문항은 JSON에 있다 |
| `STAR_IDS`+`EXAM_YEAR` 동시 치환 | 정규식 충돌 |
| `count` 갱신 누락 | 허브 화면 숫자가 틀어진다 |
| topic key 불일치 | 섹션 전체가 안 보인다 |
| `§` 없이 공유 사실관계 등록 | 사용자에게 불완전한 문제가 보인다 |
| `▸ 위 ①해설 참조` | 해설은 홀로 완결해야 한다 |
| 근거 없는 `[AI해설]` | 신뢰도가 무너진다 |
| 검수 건너뛰고 배포 | 오류가 그대로 서비스된다 |
| 섹션을 몰아 넣고 한 번에 검수 | 단원이 통째로 빠져도 안 잡힌다(물권법 30지문) |
| 개정판으로 데이터 통째 교체 | 진도가 id로 저장돼 오답·체크 기록이 끊긴다 |
| **토큰·비밀번호를 이 파일이나 코드에 적기** | 스킬은 공유·백업된다 |

---

## 11. 인계 문서 (작업 종료 시)

```markdown
# {모듈명} 작업 인계 — {날짜}

## 완료
| 섹션 | topic key | 문항수 | 마지막 id | 검수 |
|---|---|---|---|---|
| 총칙 | 총칙 | 48 | SS3.ㄷ | ✓ |

## 다음 작업
- 시작 위치: p-22
- 남은 섹션: 위법성, 책임, 미수론

## 반영 상태
- data/{모듈}.json: N문항
- 번호 연속성: 빈 번호 없음 / 있으면 목록
- STAR_IDS 죽은 id: 없음 / 있으면 목록
- MODULE_REGISTRY count: N (일치 확인 ✓)
- STAR_IDS: N개
- status: soon / active

## 미해결
- 007.③ 해설 이미지 불선명, 재확인 필요 (p-09)
```
