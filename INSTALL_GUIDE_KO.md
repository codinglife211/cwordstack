# CWordStack 설치 및 GitHub Pages 배포

1. ZIP 압축을 풉니다.
2. ZIP 내부 파일과 폴더를 새 GitHub 저장소의 루트에 업로드합니다.
3. `.github/workflows/deploy-pages.yml`과 `.nojekyll`이 반드시 포함되어야 합니다.
4. GitHub 저장소 → Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택합니다.
5. Actions에서 `Deploy CWordStack to GitHub Pages`가 성공하는지 확인합니다.
6. Android Chrome에서 Pages 주소를 연 뒤 `앱 설치` 또는 `홈 화면에 추가`를 선택합니다.

기존 WordStack과 별도의 저장소(예: cwordstack)를 사용하는 것을 권장합니다.
