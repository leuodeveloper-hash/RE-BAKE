/**
 * 웹뷰 리치 에디터의 문서(HTML + JS).
 *
 * RN TextInput으로는 글 중간의 링크를 "태그처럼" 보여줄 수 없다.
 * (value가 children을 이겨 부분 색을 못 주고, 겹침 레이어는 정렬이 어긋난다)
 * contentEditable은 링크를 실제 DOM 노드로 두므로 글이 자연스럽게 감싸 흐른다.
 *
 * 문서 소유권은 이 웹뷰에 있다. RN은 마크다운 문자열만 주고받는다.
 */

/** RN ↔ 웹뷰 메시지 — 양쪽이 같은 이름을 쓴다 */
export const EDITOR_MSG = {
  // 웹 → RN
  ready: 'ready',
  change: 'change',
  focus: 'focus',
  blur: 'blur',
  selection: 'selection',
  linkTap: 'linkTap',
  height: 'height',
  // RN → 웹
  setValue: 'setValue',
  setFocus: 'setFocus',
  applyLink: 'applyLink',
  setTheme: 'setTheme',
} as const;

export interface EditorTheme {
  text: string;
  placeholder: string;
  /** 에디터 배경 — 투명 웹뷰(opaque=false)는 iOS에서 컨텐츠가 안 그려져 쓰지 않는다 */
  surface: string;
  /** 링크 태그 배경 */
  linkBg: string;
  /** 링크 글자색 — 상세(RichText)와 동일한 표현 */
  linkColor: string;
  /** 링크 밑줄색 — 상세(RichText)와 동일한 표현 */
  linkUnderline: string;
  caret: string;
  selection: string;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
}

/** 초기값을 마크다운 → HTML로 변환 (문서에 직접 심어 브릿지 없이도 글자가 보이게) */
function initialHtml(src: string): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let out = '', last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out += esc(src.slice(last, m.index));
    out += '<a href="' + escapeAttr(m[2]) + '" data-url="' + escapeAttr(m[2]) + '">' + esc(m[1]) + '</a>';
    last = m.index + m[0].length;
  }
  if (last < src.length) out += esc(src.slice(last));
  return out;
}

export function buildEditorHtml(theme: EditorTheme, placeholder: string, initialValue = ''): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { background: ${theme.surface}; }
  #editor {
    /* RN 폰트명(Pretendard-Regular 등)은 웹뷰에 등록돼 있지 않다. iOS WKWebView는
       없는 폰트를 만나면 글자를 못 그리고 높이도 어긋난다(칸이 빈 채 늘어남).
       반드시 시스템 폰트 폴백을 함께 준다. */
    font-family: '${theme.fontFamily}', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, sans-serif;
    font-size: ${theme.fontSize}px;
    line-height: ${theme.lineHeight}px;
    letter-spacing: -0.25px;
    color: ${theme.text};
    caret-color: ${theme.caret};
    outline: none;
    white-space: pre-wrap;
    word-break: break-word;
    min-height: ${theme.lineHeight}px;
  }
  #editor::selection, #editor *::selection { background: ${theme.selection}; }
  /* 링크 = 글 사이에 섞인 태그. 실제 DOM 노드라 글이 자연스럽게 감싸 흐른다. */
  #editor a {
    background: ${theme.linkBg};
    color: ${theme.linkColor};
    text-decoration: underline;
    text-decoration-color: ${theme.linkUnderline};
    border-radius: 3px;
    padding: 1px 2px;
    cursor: pointer;
  }
  #editor:empty::before {
    content: attr(data-placeholder);
    color: ${theme.placeholder};
    pointer-events: none;
  }
</style>
</head>
<body>
<div id="editor" contenteditable="true" data-placeholder="${escapeAttr(placeholder)}">${initialHtml(initialValue)}</div>
<script>
(function () {
  var el = document.getElementById('editor');
  var M = ${JSON.stringify(EDITOR_MSG)};

  function post(type, payload) {
    var msg = JSON.stringify({type: type, payload: payload});
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
  }

  // ---- 마크다운 [텍스트](url) ↔ DOM ----------------------------------------

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function toHtml(src) {
    var re = /\\[([^\\]]+)\\]\\(([^)\\s]+)\\)/g;
    var out = '', last = 0, m;
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) out += escapeHtml(src.slice(last, m.index));
      out += '<a href="' + escapeHtml(m[2]) + '" data-url="' + escapeHtml(m[2]) + '">'
           + escapeHtml(m[1]) + '</a>';
      last = m.index + m[0].length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
  }

  // DOM을 다시 마크다운으로. 저장값은 항상 마크다운이라 스키마가 그대로다.
  function toSource(node) {
    var out = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) {
        out += n.nodeValue;
      } else if (n.nodeName === 'A') {
        out += '[' + n.textContent + '](' + (n.getAttribute('data-url') || '') + ')';
      } else if (n.nodeName === 'BR') {
        out += '\\n';
      } else {
        out += toSource(n);
      }
    });
    return out;
  }

  // ---- 캐럿 위치 (마크다운 기준이 아니라 "보이는 글자" 기준) -----------------

  function caretOffset() {
    var sel = window.getSelection();
    if (!sel.rangeCount) return {start: 0, end: 0};
    var r = sel.getRangeAt(0);
    var pre = r.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(r.startContainer, r.startOffset);
    var start = pre.toString().length;
    return {start: start, end: start + r.toString().length};
  }

  function setCaret(pos) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var seen = 0, node;
    while ((node = walker.nextNode())) {
      var len = node.nodeValue.length;
      if (seen + len >= pos) {
        var r = document.createRange();
        r.setStart(node, pos - seen);
        r.collapse(true);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        return;
      }
      seen += len;
    }
    // 끝으로
    var r2 = document.createRange();
    r2.selectNodeContents(el);
    r2.collapse(false);
    var s2 = window.getSelection();
    s2.removeAllRanges();
    s2.addRange(r2);
  }

  // ---- 높이 보고 — RN이 웹뷰 크기를 알아야 자동확장이 된다 -------------------

  var lastH = 0;
  function reportHeight() {
    var h = Math.ceil(el.getBoundingClientRect().height);
    if (h !== lastH) { lastH = h; post(M.height, {height: h}); }
  }
  if (window.ResizeObserver) new ResizeObserver(reportHeight).observe(el);

  // ---- 이벤트 --------------------------------------------------------------

  var suppress = false; // RN이 값을 밀어넣는 중엔 change를 되돌려보내지 않는다

  el.addEventListener('input', function () {
    if (suppress) return;
    post(M.change, {value: toSource(el)});
    reportHeight();
  });

  el.addEventListener('focus', function () { post(M.focus, {}); });
  el.addEventListener('blur', function () { post(M.blur, {}); });

  document.addEventListener('selectionchange', function () {
    if (document.activeElement !== el) return;
    post(M.selection, {selection: caretOffset(), value: toSource(el)});
  });

  // 링크 태그를 누르면 RN 다이얼로그로 — 커서 진입 대신 URL 편집
  el.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    var r = document.createRange();
    r.selectNodeContents(el);
    r.setEnd(a, 0);
    var start = r.toString().length;
    post(M.linkTap, {
      url: a.getAttribute('data-url') || '',
      label: a.textContent,
      start: start,
      end: start + a.textContent.length,
    });
  });

  // 엔터는 RN이 "다음 행"으로 쓰므로 줄바꿈을 막고 알린다
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // 문단 중간에서 엔터를 누르면 커서 뒤 글자는 새 항목으로 넘긴다.
      // 좌표로 자르면 안 된다 — caretOffset은 "보이는 글자" 기준인데 toSource는
      // 마크다운([라벨](url))이라 링크가 있으면 위치가 어긋난다. DOM Range로
      // 앞/뒤를 각각 toSource해 마크다운을 보존한 채 나눈다.
      var sel = window.getSelection();
      var before = toSource(el);
      var after = '';
      if (sel && sel.rangeCount) {
        var r = sel.getRangeAt(0);
        // 선택 영역이 있으면 그 부분은 버린다(잘라내기와 같은 통념)
        var head = r.cloneRange();
        head.selectNodeContents(el);
        head.setEnd(r.startContainer, r.startOffset);
        var tail = r.cloneRange();
        tail.selectNodeContents(el);
        tail.setStart(r.endContainer, r.endOffset);
        var headEl = document.createElement('div');
        headEl.appendChild(head.cloneContents());
        var tailEl = document.createElement('div');
        tailEl.appendChild(tail.cloneContents());
        before = toSource(headEl);
        after = toSource(tailEl);
      }
      post(M.change, {value: before, submit: true, rest: after});
      return;
    }
    if (e.key === 'Backspace') {
      var c = caretOffset();
      if (c.start === 0 && c.end === 0) {
        post(M.change, {value: toSource(el), backspaceAtStart: true});
      }
    }
  });

  // ---- RN → 웹 -------------------------------------------------------------

  window.__editorApply = function (raw) {
    var msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (msg.type === M.setValue) {
      if (toSource(el) === msg.payload.value) return; // 되먹임 방지
      suppress = true;
      el.innerHTML = toHtml(msg.payload.value || '');
      suppress = false;
      reportHeight();
    } else if (msg.type === M.setFocus) {
      if (msg.payload.focus === false) { el.blur(); return; }
      el.focus();
      if (msg.payload.caret != null) setCaret(msg.payload.caret);
    } else if (msg.type === M.applyLink) {
      suppress = true;
      el.innerHTML = toHtml(msg.payload.value || '');
      suppress = false;
      post(M.change, {value: toSource(el)});
      reportHeight();
    }
  };

  post(M.ready, {});
  reportHeight();
})();
</script>
</body>
</html>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
