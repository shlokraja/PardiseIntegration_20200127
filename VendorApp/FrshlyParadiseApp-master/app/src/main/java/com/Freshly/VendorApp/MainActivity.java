package com.Freshly.VendorApp;

import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.ResultPoint;
import com.google.zxing.client.android.BeepManager;
import com.journeyapps.barcodescanner.BarcodeCallback;
import com.journeyapps.barcodescanner.BarcodeResult;
import com.journeyapps.barcodescanner.CaptureManager;
import com.journeyapps.barcodescanner.DecoratedBarcodeView;
import com.journeyapps.barcodescanner.DefaultDecoderFactory;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    public static String HQURL = "HQURL";
    public static String RESTAURANT_ID = "RestaurantId";
    public static String RESTAURANT_NAME = "RestaurantName";
    public static String OUTLET_ID = "OutletId";
    public static String OUTLET_NAME = "OutletName";
    public static String BARCODE = "BARCODE";

    private Context context;
    private CaptureManager capture;
    private BeepManager beepManager;
    private String lastText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // BASIC INIT
        context = getApplicationContext();
        Toolbar toolbar = findViewById(R.id.mainActivity_Toolbar);
        beepManager = new BeepManager(this);
        DecoratedBarcodeView barcodeScannerView = findViewById(R.id.mainActivity_BarcodeScanner);
        SharedPreferences sharedPreferences = getSharedPreferences("com.atchayam.vendorapp", MODE_PRIVATE);

        // INIT TOOLBAR
        toolbar.setTitle("Frshly");
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayHomeAsUpEnabled(false);

        lastText = "";
        int restaurantId = sharedPreferences.getInt(RESTAURANT_ID, 0);
        int outletId = sharedPreferences.getInt(OUTLET_ID, 0);

        // INIT QRCODE SCANNER
        capture = new CaptureManager(this, barcodeScannerView);
        capture.initializeFromIntent(getIntent(), savedInstanceState);
        capture.decode();

        // ADD CALLBACK METHOD FOR GET BARCODE IN SAME ACTIVITY
        Collection<BarcodeFormat> formats = Arrays.asList(BarcodeFormat.QR_CODE);
        barcodeScannerView.getBarcodeView().setDecoderFactory(new DefaultDecoderFactory(formats, null, null));
        barcodeScannerView.decodeContinuous(callback);

        if (restaurantId == 0 || outletId == 0) {
            openSettingsDialog();
        }
    }

    private void openSettingsDialog() {

        capture.onPause();

        SettingsDialog settingsDialog = new SettingsDialog();
        settingsDialog.show(getFragmentManager(), "SettingsDialog");

        settingsDialog.setCallback(new SettingsDialog.FoodItemsCommunicator() {
            @Override
            public void fetchRestaurantId(int restaurantId, int outletId) {
                capture.onResume();
            }

            @Override
            public void closed() {
                capture.onResume();
            }
        });
    }

    private BarcodeCallback callback = new BarcodeCallback() {
        @Override
        public void barcodeResult(BarcodeResult result) {
            if (CommonMethods.haveNetworkConnection(context)) {
                if (result.getText() == null || result.getText().equals(lastText)) {
                    // Prevent duplicate scans
                    return;
                }

                beepManager.playBeepSound();
                lastText = result.getText();

                if (result.getText().length() == 34) {
                    Intent intent = new Intent(context, FoodItemListActivity.class);
                    intent.putExtra(BARCODE, result.getText());

                    startActivityForResult(intent, 101);
                } else {
                    capture.onPause();

                    new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Invalid QR Code")
                            .setMessage("Please scan valid QR code")
                            .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                                @Override
                                public void onClick(DialogInterface dialog, int which) {
                                    lastText = "";
                                    capture.onResume();
                                }
                            })
                            .setCancelable(false)
                            .show();
                }
            } else {
                Toast.makeText(context, "Check Internet Connection", Toast.LENGTH_SHORT).show();
            }
        }

        @Override
        public void possibleResultPoints(List<ResultPoint> resultPoints) {
        }
    };

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        lastText = "";
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater menuInflater = getMenuInflater();
        menuInflater.inflate(R.menu.main_menu, menu);

        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.menuSettings:
                openSettingsDialog();
        }

        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void onResume() {
        super.onResume();
        capture.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        capture.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        capture.onDestroy();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        capture.onSaveInstanceState(outState);
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}
