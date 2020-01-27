package com.Freshly.VendorApp;

import android.app.Dialog;
import android.app.DialogFragment;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.Freshly.VendorApp.Services.FoodItemDetails;
import com.Freshly.VendorApp.Services.FoodItemsDetails;
import com.Freshly.VendorApp.Services.Outlet;
import com.Freshly.VendorApp.Services.Restaurant;
import com.Freshly.VendorApp.Services.SettingWebservices;

import java.util.ArrayList;
import java.util.List;

import static com.Freshly.VendorApp.MainActivity.HQURL;
import static com.Freshly.VendorApp.MainActivity.OUTLET_ID;
import static com.Freshly.VendorApp.MainActivity.OUTLET_NAME;
import static com.Freshly.VendorApp.MainActivity.RESTAURANT_ID;
import static com.Freshly.VendorApp.MainActivity.RESTAURANT_NAME;

public class SettingsDialog extends DialogFragment {

    private EditText hqlinkET;
    private Spinner restaurantSpinner;
    private Spinner outletSpinner;
    private Button saveBT;
    private View view;
    private LinearLayout passwordLL;
    private LinearLayout hqDetailsLL;
    private Button savePasswordBT;
    private EditText passwordET;
    private Context context;
    private SettingWebservices settingWebservices;
    private SQLAdapter sqlAdapter;
    private SharedPreferences sharedPreferences;
    private List<Restaurant> restaurantList;
    private List<Outlet> outletList;
    private String restaurantName;
    private int restaurantId;
    private FoodItemsCommunicator communicator;
    private int outletId;
    private String outletName;
    private List<FoodItemsDetails> foodItemsList;
    private String hqUrl;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        view = inflater.inflate(R.layout.settings_dialog, container, false);
        getDialog().getWindow().requestFeature(Window.FEATURE_NO_TITLE);
        getDialog().setCanceledOnTouchOutside(false);
        getDialog().onBackPressed();
        return view;
    }

    @Override
    public void onActivityCreated(@Nullable Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);

        context = getActivity();
        restaurantSpinner = view.findViewById(R.id.settingsDialog_RestaurantSP);
        outletSpinner = view.findViewById(R.id.settingsDialog_OutletSP);
        Button syncBT = view.findViewById(R.id.settingsDialog_SyncBT);
        hqlinkET = view.findViewById(R.id.settingsDialog_HQlinkET);
        ImageView closeIV = view.findViewById(R.id.settingsDialog_CloseIV);
        saveBT = view.findViewById(R.id.settingsDialog_SaveBT);
        passwordLL = view.findViewById(R.id.settingsDialog_PasswordLL);
        hqDetailsLL = view.findViewById(R.id.settingsDialog_HQDetailsLL);
        savePasswordBT = view.findViewById(R.id.settingsDialog_SavePasswordBT);
        passwordET = view.findViewById(R.id.settingsDialog_PasswordET);

        restaurantList = new ArrayList<>();
        outletList = new ArrayList<>();
        foodItemsList = new ArrayList<>();

        settingWebservices = new SettingWebservices(context);
        sqlAdapter = SQLAdapter.getInstance(context);
        sharedPreferences = context.getSharedPreferences("com.atchayam.vendorapp", Context.MODE_PRIVATE);

        ProgressDialog progressDialog = new ProgressDialog(context);
        progressDialog.setIndeterminate(true);
        progressDialog.setCancelable(false);

        hqUrl = sharedPreferences.getString(HQURL, "http://192.168.0.114:8008/");
        hqlinkET.setText(hqUrl);
        hqlinkET.setSelection(hqlinkET.getText().length());

        restaurantId = sharedPreferences.getInt(RESTAURANT_ID, 0);
        restaurantName = sharedPreferences.getString(RESTAURANT_NAME, "");
        outletId = sharedPreferences.getInt(OUTLET_ID, 0);
        outletName = sharedPreferences.getString(OUTLET_NAME, "");

        restaurantList = sqlAdapter.getRestaurants();

        if (restaurantList.size() > 0) {
            Restaurant res = new Restaurant();
            res.setRestaurantName(getResources().getString(R.string.SelectRestaurant));
            res.setRestaurantId("0");
            restaurantList.add(0, res);
            setRestaurant(restaurantList);
        }

        savePasswordBT.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String password = passwordET.getText().toString().trim();

                if (!password.isEmpty()) {
                    if (password.equals("1234")) {
                        hqDetailsLL.setVisibility(View.VISIBLE);
                        saveBT.setVisibility(View.VISIBLE);
                        passwordLL.setVisibility(View.GONE);
                        savePasswordBT.setVisibility(View.GONE);
                        CommonMethods.hideSoftKeyboard(getActivity(), hqlinkET);
                    } else {
                        hqDetailsLL.setVisibility(View.GONE);
                        saveBT.setVisibility(View.GONE);
                        Toast.makeText(context, "Password Wrong", Toast.LENGTH_SHORT).show();
                    }
                } else {
                    hqDetailsLL.setVisibility(View.GONE);
                    saveBT.setVisibility(View.GONE);
                    Toast.makeText(context, "Fill the password", Toast.LENGTH_SHORT).show();
                }
            }
        });

        syncBT.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                clearAllData();

                if (!hqlinkET.getText().toString().trim().isEmpty()) {
                    hqUrl = hqlinkET.getText().toString().trim();
                    sharedPreferences.edit().putString(HQURL, hqUrl).apply();

                    if (CommonMethods.haveNetworkConnection(context)) {
                        settingWebservices.getRestaurants(getResources().getString(R.string.MsgLoadingRestaurant),
                                new SettingWebservices.SettingCommunicator() {
                                    @Override
                                    public void restaurantSave(boolean isSaved) {
                                        if (isSaved) {
                                            restaurantList = sqlAdapter.getRestaurants();
                                            if (restaurantList.size() > 0) {
                                                Restaurant temp = new Restaurant();
                                                temp.setRestaurantName(getResources().getString(R.string.SelectRestaurant));
                                                temp.setRestaurantId("0");
                                                restaurantList.set(0, temp);
                                                restaurantSpinner.setClickable(true);
                                                setRestaurant(restaurantList);
                                            } else {
                                                clearAllData();
                                                Toast.makeText(context, "Restaurant not available", Toast.LENGTH_SHORT).show();
                                            }
                                        } else {
                                            clearAllData();
                                            Toast.makeText(context, "Restaurant not Fetched. Check URL", Toast.LENGTH_SHORT).show();
                                        }
                                    }

                                    @Override
                                    public void outletSave(boolean isSaved) {

                                    }

                                    @Override
                                    public void foodItemSave(List<FoodItemDetails> foodItemDetailsList) {

                                    }

                                    @Override
                                    public void uploadData(boolean isSaved, String message) {

                                    }
                                });
                    } else {
                        Toast.makeText(context, "Check Internet Connection", Toast.LENGTH_LONG).show();
                    }
                } else {
                    hqlinkET.requestFocus();
                    Toast.makeText(context, getResources().getString(R.string.msg_HQ_Required), Toast.LENGTH_SHORT).show();
                }
            }
        });

        restaurantSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                final Restaurant temp = restaurantList.get(position);

                restaurantName = temp.getRestaurantName();
                restaurantId = Integer.parseInt(temp.getRestaurantId());

                loadOutlet(restaurantId);
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {

            }
        });

        outletSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                final Outlet outlet = outletList.get(position);

                outletId = Integer.parseInt(outlet.getOutletId());
                outletName = outlet.getOutletName();

                if (outletId > 0) {
                    List<FoodItemsDetails> foodItemsDetails = sqlAdapter.getFoodItems(restaurantId, outletId);
                    if (foodItemsDetails.size() > 0) {
//                        FoodItemsDetails foodItem = new FoodItemsDetails();
//                        foodItem.setFoodItemId(0);
//                        foodItem.setFoodItemName(getResources().getString(R.string.SelectFoodItem));
//                        foodItemsList.add(0, foodItem);
//                        foodItemsSpinner.setClickable(true);
//                        setFoodItemsSpinner(foodItemsList);
//                        setFoodItemsRecyclerView(sqlAdapter.getFoodItemsQuantity(restaurantId, outletId));
                    } else {
//                        loadFoodItems(Integer.parseInt(outlet.getRestaurantId()), outletId);
                    }
                } else {
                    foodItemsList.clear();
//                    setFoodItemsSpinner(foodItemsList);
//                    confirmBT.setVisibility(View.GONE);
//                    quantityET.setText("");
//                    setFoodItemsRecyclerView(new ArrayList<FoodItemAddedDetails>());
                }

            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {

            }
        });

        closeIV.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (sharedPreferences.getInt(RESTAURANT_ID, 0) > 0
                        && sharedPreferences.getInt(OUTLET_ID, 0) > 0) {
                    communicator.closed();
                    dismiss();
                } else {
                    Toast.makeText(context, "Please configure and proceed", Toast.LENGTH_SHORT).show();
                }
            }
        });

        saveBT.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (restaurantName.isEmpty() || restaurantName.equals(getResources().getString(R.string.SelectRestaurant))
                        || outletName.isEmpty() || outletName.equals(getResources().getString(R.string.SelectOutlet))) {
                    Toast.makeText(context, "Please fill the required details", Toast.LENGTH_SHORT).show();
                } else {
                    sharedPreferences.edit().putInt(RESTAURANT_ID, restaurantId).apply();
                    sharedPreferences.edit().putString(RESTAURANT_NAME, restaurantName).apply();
                    sharedPreferences.edit().putInt(OUTLET_ID, outletId).apply();
                    sharedPreferences.edit().putString(OUTLET_NAME, outletName).apply();

                    communicator.fetchRestaurantId(restaurantId, outletId);
                    dismiss();
                }
            }
        });
    }

    public void setRestaurant(List<Restaurant> restaurants) {
        ArrayAdapter<Restaurant> restaurantArrayAdapter = new ArrayAdapter<Restaurant>(getActivity(), R.layout.simple_dropdown, restaurants);
        restaurantArrayAdapter.setDropDownViewResource(R.layout.spinner_dropdown_layout);
        restaurantSpinner.setAdapter(restaurantArrayAdapter);

        for (int i = 0; i < restaurantList.size(); i++) {
            Restaurant restaurant = restaurantList.get(i);

            if (Integer.parseInt(restaurant.getRestaurantId()) == restaurantId) {
                restaurantSpinner.setSelection(i);
                break;
            }
        }
    }

    public void setOutlet(List<Outlet> outlets) {
        outletList = outlets;
        ArrayAdapter<Outlet> outletArrayAdapter = new ArrayAdapter<Outlet>(context, R.layout.simple_dropdown, outlets);
        outletArrayAdapter.setDropDownViewResource(R.layout.spinner_dropdown_layout);
        outletSpinner.setAdapter(outletArrayAdapter);

        for (int i = 0; i < outletList.size(); i++) {
            Outlet outlet = outletList.get(i);

            if (Integer.parseInt(outlet.getOutletId()) == outletId) {
                outletSpinner.setSelection(i);
                break;
            }
        }
    }

    public void loadOutlet(final int restaurant_Id) {
        if (restaurant_Id != 0) {
            outletList = sqlAdapter.getOutlet(String.valueOf(restaurant_Id));

            if (outletList.size() > 0) {
                Outlet out = new Outlet();

                out.setOutletName(getResources().getString(R.string.SelectOutlet));
                out.setOutletId("0");
                outletList.add(0, out);
                setOutlet(outletList);
            } else {
                if (CommonMethods.haveNetworkConnection(context)) {
                    settingWebservices.getOutlet(getResources().getString(R.string.MsgLoadingOutlet), String.valueOf(restaurant_Id), new SettingWebservices.SettingCommunicator() {
                        @Override
                        public void restaurantSave(boolean isSaved) {

                        }

                        @Override
                        public void outletSave(boolean isSaved) {
                            if (isSaved) {
                                outletList = sqlAdapter.getOutlet(String.valueOf(restaurant_Id));

                                if (outletList.size() > 0) {
                                    Outlet selectAdd = new Outlet();

                                    selectAdd.setOutletId("0");
                                    selectAdd.setRestaurantId("0");
                                    selectAdd.setOutletName(getResources().getString(R.string.SelectOutlet));
                                    outletList.add(0, selectAdd);
                                    setOutlet(outletList);
                                } else {
                                    outletList.clear();
                                    setOutlet(outletList);

                                    outletId = 0;
                                    Toast.makeText(context, "Outlet not available", Toast.LENGTH_SHORT).show();
                                }
                            } else {
                                outletList.clear();
                                setOutlet(outletList);
                                outletId = 0;

                                Toast.makeText(context, "Outlet not Fetched. Check URL", Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void foodItemSave(List<FoodItemDetails> foodItemDetailsList) {

                        }

                        @Override
                        public void uploadData(boolean isSaved, String message) {

                        }
                    });
                } else {
                    Toast.makeText(context, "Check Internet Connection", Toast.LENGTH_LONG).show();
                }
            }
        }
    }

    public void clearAllData() {
        restaurantId = 0;
        restaurantName = "";
        restaurantList.clear();
        setRestaurant(restaurantList);

        outletId = 0;
        outletName = "";
        outletList.clear();
        setOutlet(outletList);
    }

    public void setCallback(FoodItemsCommunicator foodItemsCommunicator) {
        communicator = foodItemsCommunicator;
    }

    @NonNull
    @Override
    public Dialog onCreateDialog(@Nullable Bundle savedInstanceState) {
        return new Dialog(getActivity(), getTheme()) {
            @Override
            public void onBackPressed() {
                getDialog().setCancelable(false);
            }
        };
    }

    @Override
    public void onStart() {

//        DisplayMetrics dm = new DisplayMetrics();
//        ((Activity) context).getWindowManager().getDefaultDisplay().getMetrics(dm);
//
//        int width = dm.widthPixels;
//        int height = dm.heightPixels;

//        getDialog().getWindow().setLayout(width - 200, ViewGroup.LayoutParams.WRAP_CONTENT);
        getDialog().getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        super.onStart();
    }

    public interface FoodItemsCommunicator {
        void fetchRestaurantId(int restaurantId, int outletId);

        void closed();
    }
}