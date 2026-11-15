---
layout: post
title: "OWASP MASTG Hacking Playground #22: SSL PINNING CERTIFICATE"
description: "OWASP MASTG Hacking Playground 22번 문제 분석과 실습 기록"
date: 2026-11-15 00:22:00 +0900
categories: [android]
---

{% raw %}
> 테스트 항목: `OMTG_NETW_004_SSL_Pinning_Certificate`

문제 설명 : 앱에 포함된 인증서 파일을 신뢰 저장소에 넣고, 그 저장소로 https://example.com에 접속합니다. Burp가 제시하는 인증서가 이 검사에서 받아들여지는지 확인하는 실습

```java
package sg.vp.owasp_mobile.OMTG_Android;

import android.os.Bundle;
import android.support.design.widget.FloatingActionButton;
import android.support.design.widget.Snackbar;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.view.View;
import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.util.Enumeration;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import org.acra.ACRAConstants;

/* JADX INFO: loaded from: classes.dex */
public class OMTG_NETW_004_SSL_Pinning_Certificate extends AppCompatActivity {
    @Override // android.support.v7.app.AppCompatActivity, android.support.v4.app.FragmentActivity, android.support.v4.app.BaseFragmentActivityDonut, android.app.Activity
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(sg.vp.owasp_mobile.p000omtg_android.R.layout.activity_omtg__netw_004__ssl__pinning__certificate);
        Toolbar toolbar = (Toolbar) findViewById(sg.vp.owasp_mobile.p000omtg_android.R.id.toolbar);
        setSupportActionBar(toolbar);
        FloatingActionButton fab = (FloatingActionButton) findViewById(sg.vp.owasp_mobile.p000omtg_android.R.id.fab);
        fab.setOnClickListener(new View.OnClickListener() { // from class: sg.vp.owasp_mobile.OMTG_Android.OMTG_NETW_004_SSL_Pinning_Certificate.1
            @Override // android.view.View.OnClickListener
            public void onClick(View view) {
                Snackbar.make(view, "Replace with your own action", 0).setAction("Action", (View.OnClickListener) null).show();
            }
        });
        try {
            HTTPSssLPinning();
        } catch (MalformedURLException e) {
            e.printStackTrace();
        } catch (IOException e2) {
            e2.printStackTrace();
        } catch (KeyManagementException e3) {
            e3.printStackTrace();
        } catch (KeyStoreException e4) {
            e4.printStackTrace();
        } catch (NoSuchAlgorithmException e5) {
            e5.printStackTrace();
        } catch (CertificateException e6) {
            e6.printStackTrace();
        }
    }

    private void HTTPSssLPinning() throws NoSuchAlgorithmException, IOException, CertificateException, KeyStoreException, KeyManagementException {
        CertificateFactory cf = CertificateFactory.getInstance(ACRAConstants.DEFAULT_CERTIFICATE_TYPE);
        InputStream caInput = new BufferedInputStream(getResources().openRawResource(sg.vp.owasp_mobile.p000omtg_android.R.raw.certificate));
        Certificate ca = cf.generateCertificate(caInput);
        caInput.close();
        String keyStoreType = KeyStore.getDefaultType();
        KeyStore keyStore = KeyStore.getInstance(keyStoreType);
        keyStore.load(null, null);
        keyStore.setCertificateEntry("ca", ca);
        Enumeration<String> enumerationAliases = keyStore.aliases();
        while (enumerationAliases.hasMoreElements()) {
            System.out.println("KeyStore: " + enumerationAliases.nextElement().toString());
        }
        String tmfAlgorithm = TrustManagerFactory.getDefaultAlgorithm();
        TrustManagerFactory tmf = TrustManagerFactory.getInstance(tmfAlgorithm);
        tmf.init(keyStore);
        final SSLContext context = SSLContext.getInstance("TLS");
        context.init(null, tmf.getTrustManagers(), null);
        Thread thread = new Thread(new Runnable() { // from class: sg.vp.owasp_mobile.OMTG_Android.OMTG_NETW_004_SSL_Pinning_Certificate.2
            @Override // java.lang.Runnable
            public void run() {
                InputStream in;
                BufferedReader br;
                URL url = null;
                try {
                    try {
                        URL url2 = new URL("https://example.com");
                        url = url2;
                        while (true) {
                            String inputLine = br.readLine();
                            if (inputLine != null) {
                                System.out.println(inputLine);
                            } else {
                                in.close();
                                return;
                            }
                        }
                    } catch (MalformedURLException e) {
                        e.printStackTrace();
                    }
                    HttpsURLConnection urlConnection = (HttpsURLConnection) url.openConnection();
                    urlConnection.setSSLSocketFactory(context.getSocketFactory());
                    in = urlConnection.getInputStream();
                    InputStreamReader isr = new InputStreamReader(in);
                    br = new BufferedReader(isr);
                } catch (IOException e2) {
                    e2.printStackTrace();
                }
            }
        });
        thread.start();
    }
}
```

21번 실습은 인증서의 발급자 이름을 검사했고 Burp 통신을 읽을 수 있었다. 하지만 이번 22번은 앱에 포함된 인증서 파일을 신뢰 저장소에 넣고, 사이트에 접속 한다.

우리는 이 행위를 Burp로 보면서 인증서가 검사에서 보이는가?를 검사하면 된다.

```java
// 앱에 포함된 인증서 읽기
Certificate ca = cf.generateCertificate(
    getResources().openRawResource(R.raw.certificate));

// 그 인증서만 넣은 신뢰 저장소 만들기
keyStore.setCertificateEntry("ca", ca);
tmf.init(keyStore);

// 이 신뢰 설정을 HTTPS 연결에 사용
context.init(null, tmf.getTrustManagers(), null);
urlConnection.setSSLSocketFactory(context.getSocketFactory());
```

핵심 코드는 위와 같다.

여기서 읽는 파일은 certificate.pem이다.

(하지만 찾아본 결과 이 인증서는 2018년 11월 28일에 만료되어서 연결 실패 하나로 단정하면 안된다)

![OWASP MASTG 문제 22 실습 화면 1](/assets/images/owasp-mastg-playground/problem-22-01.png)

처음엔 이렇게 HTTP history에 들어가도 아무것도 안 떠서 조금 찾아보니 원래 안 뜨는게 정상 이라고 한다.

앱이 Burp 인증서를 거부해서 HTTPS 연결이 요청을 보내기 전에 끝났다고 한다.

이걸 보이게 하려면 피닝 우회라는 기법이 존재하긴 하는데 이걸 하는 게 맞나? 싶어서 문제를 푸는 다른 사람들의 방식을 좀 찾아봤는데, 총 3가지 방법을 확인 한다고 하였다.

1. 앱이 내장 인증서만 넣은 신뢰 저장소로 https://example.com에 연결을 시도한다.
2. Burp에서는 21번과 달리 읽을 수 있는 GET 요청·응답이 나오지 않는다.
3. Logcat에 SSLHandshakeException과 Trust anchor for certification path not found가 나온다.

그래서 결과적으로 1,2번은 했으니 powershell 명령을 해서 Logcat에서 오류 부분만 잡으면 된다.

![OWASP MASTG 문제 22 실습 화면 2](/assets/images/owasp-mastg-playground/problem-22-02.png)

명령어를 사용하면 대충 이렇게 나온다. 핵심 부분만 추려보면 다음과 같이 나온다.

핵심은 첫 줄의 SSLHandshakeException과 Trust anchor for certification path not found이다.

앱이 HTTPS 인증서를 신뢰하지 않아 연결이 실패했고, 그래서 Burp에 읽을 수 있는 GET 요청·응답이 없었던 것이다.

아래의 OMTG\_NETW\_004\_SSL\_Pinning\_Certificate.java:113은 오류가 22번 화면의 연결 코드에서 발생했음을 보여주게 된다.
{% endraw %}
