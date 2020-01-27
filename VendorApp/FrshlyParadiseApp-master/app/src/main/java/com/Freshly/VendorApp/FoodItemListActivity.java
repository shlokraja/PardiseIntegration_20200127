package com.Freshly.VendorApp;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SearchView;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.Freshly.VendorApp.Services.FoodItemDetails;
import com.Freshly.VendorApp.Services.FoodItemsBarcodeDetails;
import com.Freshly.VendorApp.Services.SettingWebservices;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import static com.Freshly.VendorApp.MainActivity.OUTLET_ID;
import static com.Freshly.VendorApp.MainActivity.RESTAURANT_ID;

public class FoodItemListActivity extends AppCompatActivity {
    // PRIVATE VARIABLES
    private Context context;
    private RecyclerView recyclerView;
    private TextView noRecordTV;
    private FoodItemListRecyclerAdapter recyclerAdapter;
    private SettingWebservices settingWebservices;
    private int restaurantId;
    private int outletId;
    private SharedPreferences sharedPreferences;
    private List<FoodItemDetails> foodItemDetailsList = new ArrayList<>();
    private List<FoodItemDetails> recyclerFoodItemList = new ArrayList<>();
    private String barcode;
    private boolean isClicked = false;
    private Handler handler;
    private Runnable runnable;
    private static final int TIME_TO_WAIT = 120 * 1000; // 120 Seconds


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.food_item_list_activity);

        // BASIC INIT
        context = getApplicationContext();
        recyclerView = findViewById(R.id.foodItemListActivity_FoodRV);
        noRecordTV = findViewById(R.id.foodItemListActivity_NoRecordTV);
        recyclerAdapter = new FoodItemListRecyclerAdapter(context, recyclerFoodItemList);
        settingWebservices = new SettingWebservices(FoodItemListActivity.this);
        sharedPreferences = context.getSharedPreferences("com.atchayam.vendorapp", Context.MODE_PRIVATE);

        // INIT TOOLBAR
        Toolbar toolbar = findViewById(R.id.foodItemListActivity_Toolbar);
        toolbar.setTitle("Frshly");
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);

        // SETUP RECYCLER ADAPTER
        recyclerView.setHasFixedSize(true);
        recyclerView.setLayoutManager(new LinearLayoutManager(context));
        recyclerView.setAdapter(recyclerAdapter);

        // CLOSE ACTIVITY AFTER SOME INTERVAL
        handler = new Handler();
        setTimer();

        barcode = getIntent().getStringExtra(MainActivity.BARCODE);
        restaurantId = sharedPreferences.getInt(RESTAURANT_ID, 0);
        outletId = sharedPreferences.getInt(OUTLET_ID, 0);

        recyclerView.addOnItemTouchListener(new RecyclerTouchListener(context, recyclerView, new RecyclerTouchListener.ClickListener() {
            @Override
            public void onClick(View view, final int position) {
                final LinearLayout mapItLayout = view.findViewById(R.id.foodItemListRow_MapItLayoutLL);

                mapItLayout.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        if (!isClicked) {
                            // HANDLE DOUBLE CLICK
                            isClicked = true;

                            FoodItemsBarcodeDetails foodItemsBarcodeDetails = new FoodItemsBarcodeDetails();
                            foodItemsBarcodeDetails.setScannedBarcode(barcode);
                            foodItemsBarcodeDetails.setReceivedBarcode(barcode);
                            foodItemsBarcodeDetails.setGeneratedBarcode(generateBarcode(String.valueOf(recyclerFoodItemList.get(position).getPurchaseOrderId()),
                                    recyclerFoodItemList.get(position).getReceivedBarcode()));

                            if (CommonMethods.haveNetworkConnection(context)) {
                                if (foodItemsBarcodeDetails.getGeneratedBarcode().length() <= 34) {
                                    settingWebservices.uploadData(getResources().getString(R.string.MsgLoadingUploading), foodItemsBarcodeDetails, new SettingWebservices.SettingCommunicator() {
                                        @Override
                                        public void restaurantSave(boolean isSaved) {
                                        }

                                        @Override
                                        public void outletSave(boolean isSaved) {
                                        }

                                        @Override
                                        public void foodItemSave(List<FoodItemDetails> foodItemDetailsList) {
                                        }

                                        @Override
                                        public void uploadData(boolean isSaved, String message) {
                                            if (isSaved && message.equals("")) {
                                                Toast.makeText(context, "Data Uploaded to Server", Toast.LENGTH_LONG).show();
                                                finish();
                                            } else if (isSaved && !message.equals("")) {
                                                isClicked = false;
                                                showAlertDialog(message);
                                            } else {
                                                isClicked = false;
                                                Toast.makeText(context, "Server Error: " + message, Toast.LENGTH_LONG).show();
                                            }
                                        }
                                    });
                                } else {
                                    Toast.makeText(context, "Generated barcode is above 34. Contact administrator", Toast.LENGTH_SHORT).show();
                                    isClicked = false;
                                }
                            } else {
                                Toast.makeText(context, "Check Internet Connection", Toast.LENGTH_LONG).show();
                                isClicked = false;
                            }
                        }
                    }
                });
            }

            @Override
            public void onLongClick(View view, int position) {
            }
        }));

        if (CommonMethods.haveNetworkConnection(context)) {
            settingWebservices.getFoodItems(restaurantId, outletId, "Loading", new SettingWebservices.SettingCommunicator() {
                @Override
                public void restaurantSave(boolean isSaved) {
                }

                @Override
                public void outletSave(boolean isSaved) {
                }

                @Override
                public void foodItemSave(List<FoodItemDetails> foodItemList) {
                    foodItemDetailsList = foodItemList;
                    recyclerFoodItemList.clear();
                    recyclerFoodItemList.addAll(foodItemList);

                    if (foodItemList.size() > 0) {
                        recyclerAdapter.notifyDataSetChanged();
                        recyclerView.setVisibility(View.VISIBLE);
                        noRecordTV.setVisibility(View.GONE);
                    } else {
                        recyclerView.setVisibility(View.GONE);
                        noRecordTV.setVisibility(View.VISIBLE);
                        Toast.makeText(context, "No Purchase Order Exists", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void uploadData(boolean isSaved, String message) {
                }
            });
        } else {
            Toast.makeText(context, "Check Internet Connection", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater menuInflater = getMenuInflater();
        menuInflater.inflate(R.menu.search_menu, menu);

        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                onBackPressed();
                break;
        }

        return super.onOptionsItemSelected(item);
    }

    @Override
    public boolean onPrepareOptionsMenu(Menu menu) {
        super.onPrepareOptionsMenu(menu);
        MenuItem menuItem = menu.findItem(R.id.menuSearch);

        final SearchView searchView = (SearchView) menuItem.getActionView();
        searchView.setIconifiedByDefault(false);
        searchView.setQueryHint(getString(R.string.lbl_TypeToSearch));
        searchView.setMaxWidth(Integer.MAX_VALUE);

        ImageView iconClose = searchView.findViewById(androidx.appcompat.R.id.search_close_btn);
        EditText searchEditText = searchView.findViewById(androidx.appcompat.R.id.search_src_text);

        // CHANGE EDITTEXT STYLE
        searchEditText.setHintTextColor(getResources().getColor(R.color.white));
        searchEditText.setTextSize(16);

        searchView.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
            @Override
            public boolean onQueryTextSubmit(String query) {
                filterRecyclerItems(query);
                return false;
            }

            @Override
            public boolean onQueryTextChange(String newText) {
                if (newText.isEmpty())
                    filterRecyclerItems("");

                return true;
            }
        });

        searchView.setOnQueryTextFocusChangeListener(new View.OnFocusChangeListener() {
            @Override
            public void onFocusChange(View v, boolean hasFocus) {
                if (!hasFocus) {
                    filterRecyclerItems("");
                }
            }
        });

        iconClose.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Manage this event.
                searchView.setQuery("", true);
                filterRecyclerItems("");
            }
        });

        return true;
    }

    private String generateBarcode(String purchaseOrderId, String barcode) {
        String barcodeSubString = barcode.substring(0, 12);
        SimpleDateFormat dateFormat = new SimpleDateFormat("ddMMyyyyHHmmss");
        String currentDateAndTimeFormat = dateFormat.format(new Date());

        Log.i("Barcode", currentDateAndTimeFormat);

        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmm");
        String currentDateAndTime = sdf.format(new Date());

        Log.i("Barcode", currentDateAndTime);


        String generatedBarcode = barcodeSubString + currentDateAndTimeFormat + String.format("%08d", Integer.valueOf(purchaseOrderId));
        return generatedBarcode;
    }

    private void showAlertDialog(String message) {
        AlertDialog.Builder builder1 = new AlertDialog.Builder(this);
        builder1.setMessage(message);
        builder1.setCancelable(true);
        builder1.setTitle("Error");

        builder1.setPositiveButton(
                "OK",
                new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        dialog.dismiss();
                    }
                });

        AlertDialog alert11 = builder1.create();
        alert11.show();

    }

    // FILTER RECYCLER ITEMS BY SEARCH VALUE
    private void filterRecyclerItems(String query) {
        recyclerFoodItemList.clear();

        if (query.isEmpty()) {
            recyclerFoodItemList.addAll(foodItemDetailsList);
        } else {
            for (FoodItemDetails details : foodItemDetailsList) {
                if (details.getFoodItemName().toLowerCase().contains(query.toLowerCase())) {
                    recyclerFoodItemList.add(details);
                }
            }
        }

        if (recyclerFoodItemList.size() > 0) {
            recyclerAdapter.notifyDataSetChanged();
            recyclerView.setVisibility(View.VISIBLE);
            noRecordTV.setVisibility(View.GONE);
        } else {
            recyclerView.setVisibility(View.GONE);
            noRecordTV.setVisibility(View.VISIBLE);
        }
    }

    public void start() {
        handler.postDelayed(runnable, TIME_TO_WAIT);
    }

    public void stop() {
        handler.removeCallbacks(runnable);
    }

    public void restart() {
        handler.removeCallbacks(runnable);
        handler.postDelayed(runnable, TIME_TO_WAIT);
    }


    private void setTimer() {
        runnable = new Runnable() {
            @Override
            public void run() {
                finish();
            }
        };

        start();
    }

    @Override
    public void onUserInteraction() {
        Log.i("OnUser Called", "USER INTERACTION");
        restart();
        super.onUserInteraction();
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.i("OnResume Called", "ONRESUME");

    }

    @Override
    protected void onRestart() {
        super.onRestart();
        Log.i("OnRestart Called", "ONRESTART");
    }
}

