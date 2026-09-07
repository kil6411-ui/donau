/**
 * 돈암1동 이웃살핌 — 접수 폼·시트 자동 생성 스크립트
 * 길음종합사회복지관 마을동행팀
 *
 * ── 쓰는 법 ─────────────────────────────────────────────
 * 1. script.google.com 접속 (반드시 기관 구글 계정으로)
 * 2. [새 프로젝트]
 * 3. 왼쪽 코드 창의 내용을 다 지우고 이 파일 전체를 붙여넣기
 * 4. 위쪽 [저장] → [실행] 클릭
 * 5. "권한 검토" 창이 뜨면
 *      계정 선택 → [고급] → [(안전하지 않은 페이지)로 이동] → [허용]
 *      ※ 내가 만든 스크립트라 나오는 경고입니다. 정상입니다.
 * 6. 30초쯤 뒤 아래 [실행 로그]에 결과가 나옵니다
 *
 * 만들어지는 것
 *   · 구글 폼 "돈암1동 이웃살핌 접수"       (질문 9개)
 *   · 구글 시트 "돈암1동 이웃살핌 접수시트"  (처리대장 칸 포함)
 *   · index.html 에 붙여넣을 FORM 설정값
 * ─────────────────────────────────────────────────────── */

var 폼이름   = '돈암1동 이웃살핌 접수';
var 시트이름 = '돈암1동 이웃살핌 접수시트';

/* 질문 순서 — 앱의 입력 순서와 반드시 같아야 합니다 */
var 질문목록 = [
  { key:'name',        제목:'걱정되는 분 성함',   형식:'단답' },
  { key:'addr',        제목:'사시는 곳',          형식:'단답' },
  { key:'tel',         제목:'연락처',             형식:'단답' },
  { key:'age',         제목:'연세',               형식:'단답' },
  { key:'consent',     제목:'본인 연락 동의 여부', 형식:'단답' },
  { key:'reasons',     제목:'추천 이유',          형식:'단답' },
  { key:'detail',      제목:'자세한 내용',        형식:'단락' },
  { key:'reporter',    제목:'추천하신 분 성함',   형식:'단답' },
  { key:'reporterTel',제목:'추천하신 분 연락처', 형식:'단답' }
];

/* 시트에 추가할 처리대장 칸 */
var 처리대장 = ['접수확인', '조치', '조치일', '결과', '추천인 통보', '비고'];


function 이웃살핌_만들기() {
  // 1) 폼 생성
  var form = FormApp.create(폼이름);
  form.setDescription(
    '이 폼은 「돈암1동 이웃살핌」 앱이 자동으로 채웁니다.\n' +
    '직접 작성하지 마시고, 질문 순서와 제목도 바꾸지 마세요.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);

  // 2) 질문 만들기 (전부 텍스트형 — 객관식이면 앱 전송이 거부됩니다)
  var items = 질문목록.map(function (q) {
    var item = (q.형식 === '단락') ? form.addParagraphTextItem() : form.addTextItem();
    item.setTitle(q.제목);
    item.setRequired(false);
    return item;
  });

  // 3) 시트 만들어 연결
  var ss = SpreadsheetApp.create(시트이름);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();

  // 4) 처리대장 칸 붙이기
  try {
    var sheet = SpreadsheetApp.openById(ss.getId()).getSheets()[0];
    var 시작열 = 질문목록.length + 2;               // 타임스탬프 + 질문 9개 다음 칸
    sheet.getRange(1, 시작열, 1, 처리대장.length).setValues([처리대장]);
    sheet.getRange(1, 1, 1, 시작열 + 처리대장.length - 1)
         .setFontWeight('bold').setBackground('#EEF4EF');
    sheet.setFrozenRows(1);
  } catch (e) {
    Logger.log('처리대장 칸은 첫 응답이 들어온 뒤 직접 추가하세요. (' + e + ')');
  }

  // 5) entry 번호 뽑기
  //    각 질문에 서로 다른 표식을 넣은 미리채움 주소를 만들어 역추적합니다
  var resp = form.createResponse();
  items.forEach(function (item, i) {
    // addTextItem() / addParagraphTextItem() 이 돌려준 객체는
    // 이미 해당 형식이라 변환 없이 바로 createResponse 를 부릅니다
    resp = resp.withItemResponse(item.createResponse('##' + i + '##'));
  });

  var 쿼리 = resp.toPrefilledUrl().split('?')[1] || '';
  var 매핑 = {};
  쿼리.split('&').forEach(function (조각) {
    var m = 조각.match(/^(entry\.\d+)=%23%23(\d+)%23%23$/)
         || 조각.match(/^(entry\.\d+)=##(\d+)##$/);
    if (m) 매핑[Number(m[2])] = m[1];
  });

  // 6) 폼 id 뽑기
  var 공개주소 = form.getPublishedUrl();
  var idMatch = 공개주소.match(/\/forms\/d\/e\/([^\/]+)\//);
  var 폼id = idMatch ? idMatch[1] : '(직접 확인 필요)';

  // 7) 앱에 붙여넣을 설정값 만들기
  var 못찾음 = 질문목록.some(function (q, i) { return !매핑[i]; });

  var 줄 = 질문목록.map(function (q, i) {
    var 이름 = (q.key + '           ').slice(0, 11);
    return '    ' + 이름 + ': "' + (매핑[i] || 'entry.찾지못함') + '"';
  }).join(',\n');

  var 설정값 =
    'const FORM = {\n' +
    '  id: "' + 폼id + '",\n' +
    '  fields: {\n' + 줄 + '\n' +
    '  }\n' +
    '};';

  // 8) 결과를 시트 새 탭에도 적어둡니다 (로그는 닫으면 사라지므로)
  try {
    var ss2 = SpreadsheetApp.openById(ss.getId());
    var tab = ss2.insertSheet('앱 설정값');
    tab.getRange('A1').setValue('아래 내용을 index.html 의 FORM 부분에 그대로 붙여넣으세요');
    tab.getRange('A1').setFontWeight('bold');
    tab.getRange('A3').setValue(설정값);
    tab.getRange('A5').setValue('폼 주소: ' + 공개주소);
    tab.getRange('A6').setValue('시트 주소: ' + ss2.getUrl());
    tab.setColumnWidth(1, 620);
    tab.getRange('A3').setWrap(true).setFontFamily('Courier New');
  } catch (e) {}

  // 9) 로그 출력
  Logger.log('───────────── 다 만들었습니다 ─────────────');
  Logger.log('폼   : ' + 공개주소);
  Logger.log('시트 : ' + ss.getUrl());
  Logger.log('');
  Logger.log('아래를 index.html 의 FORM 부분에 그대로 붙여넣으세요.');
  Logger.log('(시트의 "앱 설정값" 탭에도 적어뒀습니다)');
  Logger.log('');
  Logger.log(설정값);
  Logger.log('');
  if (못찾음) {
    Logger.log('※ entry 번호를 일부 찾지 못했습니다.');
    Logger.log('   폼 미리보기 > 페이지 소스 보기에서 entry. 를 검색해 직접 채우세요.');
    Logger.log('');
  }
  Logger.log('── 다음으로 하실 일 ──');
  Logger.log('1. 위 설정값을 index.html 에 붙여넣고 Commit');
  Logger.log('2. sw.js 의 VERSION 숫자를 올리고 Commit');
  Logger.log('3. 폼 [응답] 탭 > 점 세 개 > 이메일 알림 켜기');
  Logger.log('4. 시트 [공유] 를 "제한됨" 으로 두고 담당자만 초대');
  Logger.log('5. 앱에서 "테스트" 로 한 건 넣어 시트에 쌓이는지 확인');
  Logger.log('   ※ 시트는 절대 "웹에 게시" 하지 마세요');
}
