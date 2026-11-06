package com.ahmetbayrak19.borctakip;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleDriveAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
