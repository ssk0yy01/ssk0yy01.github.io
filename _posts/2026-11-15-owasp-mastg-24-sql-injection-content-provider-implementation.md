---
layout: post
title: "OWASP MASTG Hacking Playground #24: SQL INJECTION CONTENT PROVIDER IMPLEMENTATION"
description: "OWASP MASTG Hacking Playground 24번 문제 분석과 실습 기록"
date: 2026-11-15 00:24:00 +0900
categories: [android]
---

{% raw %}
> 테스트 항목: `OMTG_CODING_003_SQL_Injection_Content_Provider_Implementation`

문제 설명 : 18번 화면 뒤에서 학생 데이터를 저장하고 검색하는 **Content Provider가 어떻게 동작하는지** 확인하는 문제이다.

```java
package sg.vp.owasp_mobile.OMTG_Android;

import android.content.ContentProvider;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.UriMatcher;
import android.database.Cursor;
import android.database.SQLException;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.database.sqlite.SQLiteQueryBuilder;
import android.net.Uri;
import android.text.TextUtils;
import android.util.Log;
import java.util.HashMap;

/* JADX INFO: loaded from: classes.dex */
public class OMTG_CODING_003_SQL_Injection_Content_Provider_Implementation extends ContentProvider {
    static final String CREATE_DB_TABLE = " CREATE TABLE students (_id INTEGER PRIMARY KEY AUTOINCREMENT,  name TEXT NOT NULL,  grade TEXT NOT NULL);";
    static final String DATABASE_NAME = "College";
    static final int DATABASE_VERSION = 1;
    static final String GRADE = "grade";
    static final String NAME = "name";
    static final String PROVIDER_NAME = "sg.vp.owasp_mobile.provider.College";
    static final int STUDENTS = 1;
    private static HashMap<String, String> STUDENTS_PROJECTION_MAP = null;
    static final String STUDENTS_TABLE_NAME = "students";
    static final int STUDENT_ID = 2;
    static final String _ID = "_id";
    private SQLiteDatabase db;
    static final String URL = "content://sg.vp.owasp_mobile.provider.College/students";
    static final Uri CONTENT_URI = Uri.parse(URL);
    static final UriMatcher uriMatcher = new UriMatcher(-1);

    static {
        uriMatcher.addURI(PROVIDER_NAME, STUDENTS_TABLE_NAME, 1);
        uriMatcher.addURI(PROVIDER_NAME, "students/#", 2);
    }

    private static class DatabaseHelper extends SQLiteOpenHelper {
        DatabaseHelper(Context context) {
            super(context, OMTG_CODING_003_SQL_Injection_Content_Provider_Implementation.DATABASE_NAME, (SQLiteDatabase.CursorFactory) null, 1);
        }

        @Override // android.database.sqlite.SQLiteOpenHelper
        public void onCreate(SQLiteDatabase db) {
            db.execSQL(OMTG_CODING_003_SQL_Injection_Content_Provider_Implementation.CREATE_DB_TABLE);
        }

        @Override // android.database.sqlite.SQLiteOpenHelper
        public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            db.execSQL("DROP TABLE IF EXISTS students");
            onCreate(db);
        }
    }

    @Override // android.content.ContentProvider
    public boolean onCreate() {
        Context context = getContext();
        DatabaseHelper dbHelper = new DatabaseHelper(context);
        this.db = dbHelper.getWritableDatabase();
        return this.db != null;
    }

    @Override // android.content.ContentProvider
    public Uri insert(Uri uri, ContentValues values) {
        long rowID = this.db.insert(STUDENTS_TABLE_NAME, "", values);
        if (rowID > 0) {
            Uri _uri = ContentUris.withAppendedId(CONTENT_URI, rowID);
            getContext().getContentResolver().notifyChange(_uri, null);
            return _uri;
        }
        throw new SQLException("Failed to add a record into " + uri);
    }

    @Override // android.content.ContentProvider
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        SQLiteQueryBuilder qb = new SQLiteQueryBuilder();
        qb.setTables(STUDENTS_TABLE_NAME);
        switch (uriMatcher.match(uri)) {
            case 1:
                qb.setProjectionMap(STUDENTS_PROJECTION_MAP);
                break;
            case 2:
                qb.appendWhere("_id=" + uri.getPathSegments().get(1));
                Log.e("appendWhere", uri.getPathSegments().get(1).toString());
                break;
            default:
                throw new IllegalArgumentException("Unknown URI " + uri);
        }
        if (sortOrder == null || sortOrder == "") {
            sortOrder = NAME;
        }
        Cursor c = qb.query(this.db, projection, selection, selectionArgs, null, null, sortOrder);
        c.setNotificationUri(getContext().getContentResolver(), uri);
        return c;
    }

    @Override // android.content.ContentProvider
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        int count;
        switch (uriMatcher.match(uri)) {
            case 1:
                count = this.db.delete(STUDENTS_TABLE_NAME, selection, selectionArgs);
                break;
            case 2:
                String id = uri.getPathSegments().get(1);
                count = this.db.delete(STUDENTS_TABLE_NAME, "_id = " + id + (!TextUtils.isEmpty(selection) ? " AND (" + selection + ')' : ""), selectionArgs);
                break;
            default:
                throw new IllegalArgumentException("Unknown URI " + uri);
        }
        getContext().getContentResolver().notifyChange(uri, null);
        return count;
    }

    @Override // android.content.ContentProvider
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        int count;
        switch (uriMatcher.match(uri)) {
            case 1:
                count = this.db.update(STUDENTS_TABLE_NAME, values, selection, selectionArgs);
                break;
            case 2:
                count = this.db.update(STUDENTS_TABLE_NAME, values, "_id = " + uri.getPathSegments().get(1) + (!TextUtils.isEmpty(selection) ? " AND (" + selection + ')' : ""), selectionArgs);
                break;
            default:
                throw new IllegalArgumentException("Unknown URI " + uri);
        }
        getContext().getContentResolver().notifyChange(uri, null);
        return count;
    }

    @Override // android.content.ContentProvider
    public String getType(Uri uri) {
        switch (uriMatcher.match(uri)) {
            case 1:
                return "vnd.android.cursor.dir/vnd.example.students";
            case 2:
                return "vnd.android.cursor.item/vnd.example.students";
            default:
                throw new IllegalArgumentException("Unsupported URI: " + uri);
        }
    }
}
```

위에 있는 코드들이 전체 코드이고, 아래 코드가 핵심 코드이다.

```java
static final String CREATE_DB_TABLE =
    "CREATE TABLE students (_id INTEGER PRIMARY KEY AUTOINCREMENT, "
    + "name TEXT NOT NULL, grade TEXT NOT NULL);";

// query() 안
Cursor c = qb.query(
    this.db, projection, selection, selectionArgs,
    null, null, sortOrder);
```

이 부분은 College 데이터베이스의 students 테이블을 만들고, 검색 요청을 받으면 조건을 SQLite 쿼리에 전달하는 부분이다.

```java
WHERE = "name='" + searchPattern.getText().toString() + "'";
Cursor c = managedQuery(students, null, WHERE, null, "name");
```

그리고 이 부분이 SQL 인젝션이 들어오는 경로이다.

검색어를 SQL 조건에 직접 이어 붙여서 SQL Injection이 나오게 만든다.

예시를 들어서 검색어가 ' OR '1'='1이면 조건이 name='' OR '1'='1'이 된다.

뒤쪽 조건이 항상 참이어서, Provider가 실행한 조회에서 test와 test2가 모두 나오게 된다.

문자열을 위험하게 조립한 곳은 18번 화면 코드이고, 24번 Provider는 전달받은 조건을 실행한 곳이다.

증거로는 18번 문제에서 두 학생의 조회 화면의 실행 결과이다.

추가로 에뮬레이터의 College 데이터베이스를 확인하면 아래 두 개의 행이 저장되어 있는 모습을 볼 수 있다.

```java
(1, 'test',  'a')
(2, 'test2', 'b')
```
{% endraw %}
