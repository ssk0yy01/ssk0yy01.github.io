---
layout: post
title: "OWASP MASTG Hacking Playground #23: JS INTERFACE"
description: "OWASP MASTG Hacking Playground 23번 문제 분석과 실습 기록"
date: 2026-11-15 00:23:00 +0900
categories: [android]
---

{% raw %}
> 테스트 항목: `OMTG_ENV_005_JS_Interface`

문제 설명 : 이 문제는 JavaScript를 켜고 인터페이스 클래스를 Android라는 이름으로 웹 페이지에 연결하는데, 이것을 확인 하는 문제이다.

```java
package sg.vp.owasp_mobile.OMTG_Android;

import android.content.Context;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

/* JADX INFO: loaded from: classes.dex */
public class OMTG_ENV_005_JS_Interface {
    Context mContext;

    OMTG_ENV_005_JS_Interface(Context c) {
        this.mContext = c;
    }

    public OMTG_ENV_005_JS_Interface() {
    }

    @JavascriptInterface
    public String returnString() {
        return "Secret String";
    }

    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(this.mContext, toast, 0).show();
    }
}
```

확인 하는 방법은 다음과 같다.

```java
myWebView.addJavascriptInterface(jsInterface, "Android");

@JavascriptInterface
public String returnString() {
    return "Secret String";
}
```

핵심 코드를 보면 Remote WebView 실습에서 페이지에 returnString : Secret String이 표시된 결과가 증거이다.

(Notion의 14번에서 Burp 응답을 바꿔 Remote WebView에 returnString: Secret String이 표시됐습니다. 그 결과가 바로 23번 클래스의 returnString()이 호출됐다는 증거)

JavaScript가 앱의 returnString() 함수를 호출한 것이다.

그리고 이 코드에서 반환되는  값은 고정된 문자열이다.

무엇이 문제였냐면 원격 페이지 내용이 바뀌면 그 페이지의 JavaScript도 앱이 노출한 메서드를 호출할 수 있다.
{% endraw %}
