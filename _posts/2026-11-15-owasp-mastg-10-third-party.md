---
layout: post
title: "OWASP MASTG Hacking Playground #10: THIRD-PARTY"
description: "OWASP MASTG Hacking Playground 10번 문제 분석과 실습 기록"
date: 2026-11-15 00:10:00 +0900
categories: [android]
---

{% raw %}
> 테스트 항목: `OMTG_DATAST_004_3rd_Party`

문제 설명 : 이 앱에는 ACRA라는 외부 라이브러리가 있다. 앱이 충돌하면 충돌 정보를 서버로 보낸다. Burp에서 무엇을 볼 수 있는가?

```java
package sg.vp.owasp_mobile.OMTG_Android;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.view.View;
import android.widget.Button;

/* JADX INFO: loaded from: classes.dex */
public class OMTG_DATAST_004_3rd_Party extends AppCompatActivity {
    @Override // android.support.v7.app.AppCompatActivity, android.support.v4.app.FragmentActivity, android.support.v4.app.BaseFragmentActivityDonut, android.app.Activity
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(sg.vp.owasp_mobile.p000omtg_android.R.layout.activity_omtg__datast_004__3rd_party);
        Toolbar toolbar = (Toolbar) findViewById(sg.vp.owasp_mobile.p000omtg_android.R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        Button btnCrash = (Button) findViewById(sg.vp.owasp_mobile.p000omtg_android.R.id.crashButton);
        View.OnClickListener oclbtnCrash = new View.OnClickListener() { // from class: sg.vp.owasp_mobile.OMTG_Android.OMTG_DATAST_004_3rd_Party.1
            @Override // android.view.View.OnClickListener
            public void onClick(View v) {
                OMTG_DATAST_004_3rd_Party.this.CrashApp();
            }
        };
        btnCrash.setOnClickListener(oclbtnCrash);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void CrashApp() {
        throw new RuntimeException("This is a crash");
    }
}
```

문제에서는 ACRA라는 외부 라이브러리가 존재하고 있다고 한다.

![OWASP MASTG 문제 10 실습 화면 1](/assets/images/owasp-mastg-playground/problem-10-01.png)

눌러보면 이렇게 CRASH THE APP이 있고 누르면 화면이 튕긴다.

이 때 ACRA 라이브러리가 충돌 보고서를 만들고 서버로 보내는 것이다.

그리고 이 메시지를 Burp로 확인 해보는 문제이다.

```java
Brup?
- Brup Suite라는 프로그램을 말하며 네트워크 요청을 중간에서 보여주는 도구이다.
- 추가로 웹 공부, 문제를 풀 때 엄청 유용하다
```

burp와 안드로이드를 연결하고 크래시를 누르면 아래 화면과 같이 나온다

![OWASP MASTG 문제 10 실습 화면 2](/assets/images/owasp-mastg-playground/problem-10-02.png)

```java
참고로 그냥 크래시를 누르면 안 나오고 burp에서 인증셔를 뽑은 후 안드로이드에 넣고,
깔아야 작동한다.

안하면 그냥 오류뜸;;;
```

![OWASP MASTG 문제 10 실습 화면 3](/assets/images/owasp-mastg-playground/problem-10-03.png)

```java
POST /acra/_design/acra-storage/_update/report HTTP/2
Host: sushi2k.cloudant.com
Authorization: Basic TW1IWk9xeEFkVDBtV1NtWGRkWUJkTFBEbzpNbUhaT3F4QWRUMG1XU21YZGRZQmRMUERv
User-Agent: Android ACRA 4.9.0
Accept: text/html,application/xml,application/json,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5
Content-Type: application/json
Content-Length: 2810
Connection: Keep-Alive
Accept-Encoding: gzip, deflate, br

{"REPORT_ID":"c40f3dc4-cbe1-45b7-92e0-3be69ce3112e""APP_VERSION_CODE":1,"APP_VERSION_NAME":"1.0","PACKAGE_NAME":"sg.vp.owasp_mobile.omtg_android","ANDROID_VERSION":"6.0","BUILD":{"BOARD":"unknown","BOOTLOADER":"unknown","BRAND":"Android","CPU_ABI":"x86","CPU_ABI2":"","DEVICE":"generic_x86","DISPLAY":"sdk_google_phone_x86-userdebug 6.0 MASTER 6695544 test-keys","FINGERPRINT":"Android\/sdk_google_phone_x86\/generic_x86:6.0\/MASTER\/6695544:userdebug\/test-keys","HARDWARE":"ranchu","HOST":"abfarm-01141","ID":"MASTER","IS_DEBUGGABLE":true,"MANUFACTURER":"unknown","MODEL":"Android SDK built for x86","PRODUCT":"sdk_google_phone_x86","RADIO":"unknown","SERIAL":"EMULATOR37X2X13X0","SUPPORTED_32_BIT_ABIS":"[x86]","SUPPORTED_64_BIT_ABIS":"[]","SUPPORTED_ABIS":"[x86]","TAGS":"test-keys","TIME":1595298178000,"TYPE":"userdebug","UNKNOWN":"unknown","USER":"android-build","VERSION":{"ACTIVE_CODENAMES":"[]","BASE_OS":"","CODENAME":"REL","INCREMENTAL":6695544,"PREVIEW_SDK_INT":0,"RELEASE":"6.0","RESOURCES_SDK_INT":23,"SDK":23,"SDK_INT":23,"SECURITY_PATCH":"2016-09-06"}},"TOTAL_MEM_SIZE":10434699264,"AVAILABLE_MEM_SIZE":10230444032,"STACK_TRACE":"java.lang.RuntimeException: This is a crash\n\tat sg.vp.owasp_mobile.OMTG_Android.OMTG_DATAST_004_3rd_Party.CrashApp(OMTG_DATAST_004_3rd_Party.java:36)\n\tat sg.vp.owasp_mobile.OMTG_Android.OMTG_DATAST_004_3rd_Party.access$000(OMTG_DATAST_004_3rd_Party.java:9)\n\tat sg.vp.owasp_mobile.OMTG_Android.OMTG_DATAST_004_3rd_Party$1.onClick(OMTG_DATAST_004_3rd_Party.java:27)\n\tat android.view.View.performClick(View.java:5198)\n\tat android.view.View$PerformClick.run(View.java:21147)\n\tat android.os.Handler.handleCallback(Handler.java:739)\n\tat android.os.Handler.dispatchMessage(Handler.java:95)\n\tat android.os.Looper.loop(Looper.java:148)\n\tat android.app.ActivityThread.main(ActivityThread.java:5417)\n\tat java.lang.reflect.Method.invoke(Native Method)\n\tat com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:726)\n\tat com.android.internal.os.ZygoteInit.main(ZygoteInit.java:616)\n","DISPLAY":{"0":{"currentSizeRange":{"smallest":"[1080,1008]","largest":"[1794,1704]"},"flags":"FLAG_SUPPORTS_PROTECTED_BUFFERS+FLAG_SECURE","height":1776,"metrics":{"density":"3.0","densityDpi":480,"scaledDensity":"x3.0","widthPixels":1080,"heightPixels":1776,"xdpi":"480.0","ydpi":"480.0"},"name":"Built-in Screen","orientation":0,"pixelFormat":1,"realMetrics":{"density":"3.0","densityDpi":480,"scaledDensity":"x3.0","widthPixels":1080,"heightPixels":1920,"xdpi":"480.0","ydpi":"480.0"},"realSize":"[1080,1920]","rectSize":"[0,0,1080,1776]","refreshRate":60.000004,"rotation":"ROTATION_0","size":"[1080,1776]","width":1080,"isValid":true}},"USER_APP_START_DATE":"2026-11-10T19:28:29.315+00:00","USER_CRASH_DATE":"2026-11-10T19:30:25.988+00:00"}
```

이 부분을 보면 정보들이 충돌 보고 요청에서 핵심적인 부분들을 볼 수 있는데, 노출되는 것은 크게 2가지이다.

1.
서버의 인증 정보가 담긴다

- 실제로 보면 Base64 인코딩 방식으로 데이터가 들어있는 것을 볼 수 있다.

1.
충돌 보고 정보가 담긴다.

- 앱의 android 버전, 에뮬레이터 번호, 통신 등의 정보등이 그대로 노출되고 있다.
{% endraw %}
