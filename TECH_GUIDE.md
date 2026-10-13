# CRYPTO GACHA 기술지침 (v6: 랭킹 / 프로필 테두리 / 컬렉션 영구 보존)

기준 파일: `index.html` (단일 정적 파일, 빌드 없음). 호스팅: Vercel, DB/인증: Firebase(Auth + Firestore).

## 1. 변경 요약
| 요청 | 구현 |
|---|---|
| 로그인한 모든 이용자를 랭킹에 표시 | Firestore `leaderboard/{uid}` 문서를 로그인 사용자마다 생성, 랭킹 창에서 전체 조회(최대 100명, 경험치 내림차순) |
| 랭킹에 레벨, 프로필 테두리 표시 | 문서에 `L`(레벨), `eq`(장착 아이템 번호) 저장. 행마다 `fr(eq,38)`로 테두리 렌더 |
| 판매해도 컬렉션 유지 | 상태 변수 `col`(획득 기록) 신설. 뽑기 때 기록, 판매 때 건드리지 않음 |

## 2. 데이터 모델
**클라이언트 상태 (전역 var)**
- `inv{itemId:수량}`, `invV{itemId:평가액합}`: 보관함. 판매하면 감소/삭제.
- `col{itemId:1}`: 한 번이라도 획득한 아이템. 판매해도 유지(신규).
- `eq`: 장착 중인 테두리의 아이템 번호(-1이면 기본).
- `exp`, `opens`, `urN`, `used`, `bal`.

**Firestore**
- `users/{uid}`: `bal, inv, invV, opens, urN, col, used, exp, eq` (본인만 읽기/쓰기)
- `leaderboard/{uid}`: `n`(마스킹 이름 예: `홍길동`→`홍길동***`), `L`(레벨), `exp`, `eq`, `opens`, `t`(저장 시각). 읽기는 공개, 쓰기는 본인만.

## 3. 동작
1. **컬렉션 보존**: `draw()`의 아이템 지급부에서 `inv[x]++` 직후 `col[x]=1`. `rc()`(컬렉션 화면)는 보유 판정과 진행률을 `col`로 계산, `sell()`/`doSellAll()`은 `inv`만 수정. 장착 버튼도 `col` 기준이라 판매 후에도 테두리 장착 가능.
2. **기존 사용자 이전**: 저장본에 `col`이 없으면 로그인 시 현재 `inv`의 키로 `col`을 채움(`Object.assign({}, d.col, inv키)`).
3. **저장**: 2.5초마다 상태 스냅샷을 비교해 변경 시에만 `users/{uid}`와 `leaderboard/{uid}`를 저장. 로그아웃, 탭 숨김, 페이지 종료 때도 저장 시도.
4. **랭킹**: `modal('rank')`가 로딩 표시 후 `loadRank()` 호출 → `leaderboard`를 `exp desc, limit 100`로 조회해 `RANK`에 `{n,L,eq,o,me}` 저장 → `rkr()`가 행 렌더(순위, 테두리, 이름, 뽑기 횟수, Lv). 내 행은 `(나)` 표시와 배경 강조. 이름은 `esc()`로 HTML 이스케이프.
5. **이름 마스킹**: 로그인 시 `ME = displayName 앞 3글자 + '***'`. 이메일은 저장·노출하지 않음.

## 4. Firestore 보안 규칙 (반드시 다시 게시)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid
        && request.resource.data.bal is number
        && request.resource.data.bal >= 0
        && request.resource.data.bal < 10000000;
    }
    match /leaderboard/{uid} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['n','L','exp','eq','opens','t'])
        && request.resource.data.n is string && request.resource.data.n.size() <= 20
        && request.resource.data.L is number
        && request.resource.data.exp is number && request.resource.data.exp >= 0;
    }
  }
}
```

## 5. 배포 절차
1. Firebase 콘솔 → Firestore → 규칙 탭에 위 내용 붙여넣고 **게시**.
2. GitHub 저장소의 `index.html` 교체 후 Commit → Vercel 자동 배포.
3. 여러 계정으로 로그인해 랭킹에 모두 표시되는지, 판매 후에도 컬렉션이 유지되는지 확인.

## 6. 한계 및 주의
- 랭킹 노출은 로그인 후 1회 저장이 일어나야 시작됨(기존 사용자는 로그인 후 몇 초 안에 등록).
- 점수(경험치)는 클라이언트가 계산하므로 조작 가능. 규칙은 값의 형식만 검증함. 엄격히 막으려면 Cloud Functions(Blaze 요금제)로 서버 계산 필요.
- 랭킹은 상위 100명까지 조회. 이용자가 많아지면 페이지 분할 필요.
- 랭킹 조회는 공개(비로그인도 가능). 비공개로 바꾸려면 `allow read: if request.auth != null;`.
- 확인되지 않은 부분: 이 변경은 코드 구문 검사만 했고 실제 브라우저/Firebase 연동 실행은 하지 못함.

## 7. 버그 수정 기록 (v6.1)
**증상 A: 서로 다른 계정이 모두 같은 레벨/뽑기 횟수/테두리로 표시됨**
- 원인: 로그아웃해도 메모리의 게임 상태(`bal, inv, col, exp, opens, eq` 등)가 초기화되지 않았다. 새 계정은 클라우드 문서가 없으면 "현재 상태를 그대로 저장"하는 로직이어서, 직전 계정의 진행도를 복사해 저장했다.
- 수정: ① 로그아웃 시 `location.reload()`로 모든 상태를 초기화. ② 로그인 중 계정이 바뀌거나 다른 탭에서 로그아웃되어도(`cur`와 `uid` 비교) 즉시 새로고침. 그래서 새 계정은 항상 초기 상태(1000 USDT, 빈 보관함)에서 시작한다.
- 이미 오염된 계정 데이터: Firebase 콘솔 → Firestore에서 해당 계정의 `users/{uid}`와 `leaderboard/{uid}` 문서를 삭제하면 다음 로그인 때 새로 시작한다. uid는 Authentication → 사용자 탭에서 확인.

**증상 B: 내가 로그인한 계정만 랭킹에 보이고 다른 이용자가 안 보임**
- 원인: 랭킹용 `leaderboard/{uid}` 문서는 "저장할 변화가 있을 때만" 기록되었다. 랭킹 기능 추가 전에 가입했던 이용자는 로그인해서 기존 데이터를 불러와도 변화가 없다고 판단되어, 뽑기를 한 번 하기 전까지 랭킹 문서가 생성되지 않았다.
- 수정: 로그인 때 저장 데이터를 불러온 직후 `save(true)`로 `users`와 `leaderboard`를 강제 1회 기록. 이제 로그인만 해도 랭킹에 등록된다.
- 참고: 한 번도 새 버전으로 로그인하지 않은 이용자, 로그인하지 않고 체험 모드로만 플레이한 사람은 랭킹에 나타나지 않는다(설계상 로그인 사용자만 표시).
