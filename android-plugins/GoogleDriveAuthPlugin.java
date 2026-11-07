package com.ahmetbayrak19.borctakip;

import android.accounts.Account;
import android.app.Activity;
import android.content.Intent;
import android.widget.Toast;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "GoogleDriveAuth")
public class GoogleDriveAuthPlugin extends Plugin {
    private static final String DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private void rejectVisible(PluginCall call, String message, Exception error) {
        getActivity().runOnUiThread(() -> {
            Toast.makeText(getContext(), message, Toast.LENGTH_LONG).show();
            if (error == null) call.reject(message);
            else call.reject(message, error);
        });
    }

    private GoogleSignInClient client() {
        GoogleSignInOptions options = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestScopes(new Scope(DRIVE_SCOPE))
            .build();
        return GoogleSignIn.getClient(getContext(), options);
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        startActivityForResult(call, client().getSignInIntent(), "signInResult");
    }

    @ActivityCallback
    private void signInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getData() == null) {
            rejectVisible(call, "Google girişi tamamlanamadı (Android sonuç kodu: " + result.getResultCode() + ")", null);
            return;
        }
        try {
            GoogleSignInAccount account = GoogleSignIn.getSignedInAccountFromIntent(result.getData()).getResult(ApiException.class);
            resolveToken(call, account);
        } catch (ApiException error) {
            String detail = error.getStatusMessage();
            rejectVisible(call, "Google girişi başarısız (Google kodu: " + error.getStatusCode() +
                (detail == null || detail.isEmpty() ? "" : ", " + detail) + ")", error);
        }
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        GoogleSignInAccount account = GoogleSignIn.getLastSignedInAccount(getContext());
        if (account == null || account.getAccount() == null) {
            call.reject("Google hesabı bağlı değil");
            return;
        }
        resolveToken(call, account);
    }

    private void resolveToken(PluginCall call, GoogleSignInAccount signInAccount) {
        Account account = signInAccount.getAccount();
        if (account == null) { call.reject("Google hesabı alınamadı"); return; }
        executor.execute(() -> {
            try {
                String token = GoogleAuthUtil.getToken(getContext(), account, "oauth2:" + DRIVE_SCOPE);
                JSObject result = new JSObject();
                result.put("accessToken", token);
                result.put("email", signInAccount.getEmail());
                getActivity().runOnUiThread(() -> call.resolve(result));
            } catch (IOException | GoogleAuthException error) {
                String detail = error.getMessage();
                String message = "Google erişim anahtarı alınamadı (" + error.getClass().getSimpleName() +
                    (detail == null || detail.isEmpty() ? "" : ": " + detail) + ")";
                rejectVisible(call, message, error);
            }
        });
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        client().signOut().addOnCompleteListener(task -> call.resolve());
    }
}
