# CWordStack Google Sheets 동기화

## 시트 구조
`Flashcards` 탭의 1행은 아래 9개 열이어야 합니다.

ChineseWord | Pinyin | PartOfSpeech | ChineseExample | KoreanMeaning | KoreanExample | Category | Chapter | Tags

## Google Cloud 설정
1. Google Cloud 프로젝트를 선택/생성합니다.
2. Google Sheets API를 활성화합니다.
3. Google Auth Platform에서 OAuth Client를 `Web application`으로 생성합니다.
4. Authorized JavaScript origins에 GitHub Pages의 origin을 등록합니다. 예: `https://사용자명.github.io`
5. Data Access에는 `https://www.googleapis.com/auth/spreadsheets` 권한을 사용합니다.
6. CWordStack 설정 화면에 OAuth Client ID와 사용할 Google Sheet URL을 저장합니다.
7. `구글동기화` 버튼을 누르고 Google 인증을 완료합니다.

WordStack 영어용 Google Sheet를 그대로 사용하지 말고, CWordStack 전용 시트를 새로 만드는 것을 권장합니다.
