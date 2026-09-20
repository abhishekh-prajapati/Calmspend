package com.pbp.personalfinance;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.pbp.personalfinance.detection.TransactionDetectorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TransactionDetectorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
