package com.Freshly.VendorApp.Services;

import android.app.ProgressDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.Toast;

import com.Freshly.VendorApp.CommonMethods;
import com.Freshly.VendorApp.MainActivity;
import com.Freshly.VendorApp.SQLAdapter;
import com.Freshly.VendorApp.VolleySingleton;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.RetryPolicy;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class SettingWebservices {
    Context context;
    RequestQueue requestQueue;
    SQLAdapter sqlAdapter;
    String hqURL;
    SharedPreferences sharedPreferences;
    ProgressDialog progressDialog;

    public SettingWebservices(Context context) {
        this.context = context;
        requestQueue = VolleySingleton.getInstance(context).getRequestQueue();
        sqlAdapter = SQLAdapter.getInstance(context);
        sharedPreferences = context.getSharedPreferences("com.atchayam.vendorapp", Context.MODE_PRIVATE);
        progressDialog = new ProgressDialog(context);
        progressDialog.setCancelable(false);
        progressDialog.setProgressStyle(ProgressDialog.STYLE_SPINNER);
    }

    public void getRestaurants(String progressMsg, final SettingCommunicator communicator) {
        String hqUrl = sharedPreferences.getString(MainActivity.HQURL, "");

        String url = hqUrl.concat("fv_Preprinted/getRestaurant_data/");

        progressDialog.setMessage(progressMsg);
        progressDialog.show();

        StringRequest restaurantStringRequest = new StringRequest(Request.Method.GET, url, new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {

                try {
                    List<Restaurant> restaurantList = new ArrayList<>();
                    JSONObject jsonObject = new JSONObject(response);
                    boolean error = jsonObject.getBoolean("error");
                    String result = jsonObject.getString("result");
                    if (result.trim().equalsIgnoreCase("ok")) {
                        JSONArray restaurantJsonArray = jsonObject.getJSONArray("data");

                        for (int i = 0; i < restaurantJsonArray.length(); i++) {
                            JSONObject restaurant = (JSONObject) restaurantJsonArray.get(i);
                            Restaurant temp = new Restaurant();
                            temp.setRestaurantId(restaurant.get("id").toString().trim());
                            temp.setRestaurantName(restaurant.get("name").toString().trim());
                            restaurantList.add(temp);
                        }

                        if (restaurantList.size() > 0) {
                            sqlAdapter.deleteRestaurantTable();
                            sqlAdapter.deleteOutletTable();
                            sqlAdapter.saveRestaurantList(restaurantList);
                            progressDialog.cancel();
                            communicator.restaurantSave(true);
                        } else {
                            progressDialog.cancel();
                            communicator.restaurantSave(false);
                        }
                    } else {
                        progressDialog.cancel();
                        communicator.restaurantSave(false);
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    progressDialog.cancel();
                    communicator.restaurantSave(false);
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                progressDialog.cancel();

                if (CommonMethods.haveNetworkConnection(context)) {
                    Toast.makeText(context, "Error : " + error.getMessage(), Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(context, "Check Internet Connection", Toast.LENGTH_SHORT).show();
                }
            }
        });

        RetryPolicy retryPolicy = new DefaultRetryPolicy(8000, 2, DefaultRetryPolicy.DEFAULT_BACKOFF_MULT);
        restaurantStringRequest.setRetryPolicy(retryPolicy);
        requestQueue.add(restaurantStringRequest);
    }

    public void getOutlet(String progressMsg, final String restaurantId, final SettingCommunicator communicator) {
        String hqUrl = sharedPreferences.getString(MainActivity.HQURL, "");

        String url = hqUrl.concat("fv_Preprinted/getOutlet_data/" + restaurantId);

        progressDialog.setMessage(progressMsg);
        progressDialog.show();
        StringRequest outletStringRequest = new StringRequest(Request.Method.GET, url, new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {
                List<Outlet> outletList = new ArrayList<>();

                try {
                    JSONObject jsonObject = new JSONObject(response);

                    boolean error = jsonObject.getBoolean("error");
                    String result = jsonObject.getString("result");

                    if (result.trim().equalsIgnoreCase("ok")) {
                        JSONArray outletJsonArray = jsonObject.getJSONArray("data");

                        for (int i = 0; i < outletJsonArray.length(); i++) {
                            JSONObject outlet = (JSONObject) outletJsonArray.get(i);
                            Outlet temp = new Outlet();
                            temp.setRestaurantId(restaurantId);
                            temp.setOutletId(outlet.get("id").toString().trim());
                            temp.setOutletName(outlet.get("name").toString().trim());
                            outletList.add(temp);
                        }

                        if (outletList.size() > 0) {
                            sqlAdapter.deleteOutletTable();
                            sqlAdapter.saveOutletList(outletList);
                            progressDialog.cancel();
                            communicator.outletSave(true);
                        } else {
                            progressDialog.cancel();
                            communicator.outletSave(false);
                        }

                    } else {
                        progressDialog.cancel();
                        communicator.outletSave(false);
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    Toast.makeText(context, "JSON Exception Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    progressDialog.cancel();
                    communicator.outletSave(false);
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                progressDialog.cancel();

                if (CommonMethods.haveNetworkConnection(context)) {
                    Toast.makeText(context, "Error : " + error.getMessage(), Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(context, "Check Internet Connection", Toast.LENGTH_SHORT).show();
                }
            }
        });

        RetryPolicy retryPolicy = new DefaultRetryPolicy(8000, 2, DefaultRetryPolicy.DEFAULT_BACKOFF_MULT);
        outletStringRequest.setRetryPolicy(retryPolicy);
        requestQueue.add(outletStringRequest);
    }

    public void uploadData(String progressMsg, FoodItemsBarcodeDetails barcodeDetails, final SettingWebservices.SettingCommunicator communicator) {
        String hqUrl = sharedPreferences.getString(MainActivity.HQURL, "");
        String url = hqUrl.concat("fv_Preprinted/new_preprint_batch/");
        Log.i("URL Check", url);

        progressDialog.setMessage(progressMsg);
        progressDialog.show();

        JSONObject objectToSend = new JSONObject();
        final JSONArray barcodeListArray = new JSONArray();
        try {
            JSONObject executionJSONObject = new JSONObject();
            executionJSONObject.put("barcode", barcodeDetails.getGeneratedBarcode());
            executionJSONObject.put("quantity", "1");
            executionJSONObject.put("matrix_code", barcodeDetails.getScannedBarcode());
            barcodeListArray.put(executionJSONObject);
            objectToSend.put("data", barcodeListArray);
        } catch (JSONException e) {
            e.printStackTrace();
        }

        JsonObjectRequest uploadJsonObjectRequest = new JsonObjectRequest(Request.Method.POST, url, objectToSend, new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {
                try {
                    JSONObject jsonObject = new JSONObject(response.toString());

                    String result = jsonObject.getString("result");
                    String error_msg = jsonObject.getString("error_msg");
                    boolean isError = jsonObject.getBoolean("error");

                    if (result.equalsIgnoreCase("success") && !isError) {
                        communicator.uploadData(true, "");
                        progressDialog.cancel();
                    } else if(result.equalsIgnoreCase("success") && isError) {
                        progressDialog.cancel();
                        communicator.uploadData(true, error_msg);
                    } else {
                        progressDialog.cancel();
                        communicator.uploadData(false, error_msg);
                    }


                } catch (JSONException e) {
                    progressDialog.cancel();
                    e.printStackTrace();
                    communicator.uploadData(false, e.getMessage());
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                progressDialog.cancel();

                if (CommonMethods.haveNetworkConnection(context)) {
                    communicator.uploadData(false, "Error : " + error.getMessage());
                } else {
                    communicator.uploadData(false, "Check Internet Connection");
                }
            }
        });

        RetryPolicy retryPolicy = new DefaultRetryPolicy(8000, 2, DefaultRetryPolicy.DEFAULT_BACKOFF_MULT);
        uploadJsonObjectRequest.setRetryPolicy(retryPolicy);
        requestQueue.add(uploadJsonObjectRequest);

    }

    public void getFoodItems(final int restaurantId, final int outletId, String progressMsg, final SettingCommunicator communicator) {
        progressDialog.setMessage(progressMsg);
        progressDialog.show();

        String hqUrl = sharedPreferences.getString(MainActivity.HQURL, "");
        String url = hqUrl.concat("food_vendor/po_data/paradise/" + restaurantId);
        Log.i("URL", url);

        StringRequest outletStringRequest = new StringRequest(Request.Method.GET, url, new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {
                Log.i("Paradise Response", response);
                List<FoodItemDetails> foodItemsList = new ArrayList<>();

                try {
                    JSONObject jsonObject = new JSONObject(response);


                    String result = jsonObject.getString("result");
                    if (result.trim().equalsIgnoreCase("ok")) {
                        JSONArray foodItemJsonArray = jsonObject.getJSONArray("data");
                        for (int i = 0; i < foodItemJsonArray.length(); i++) {
                            JSONObject foodItemJsonObject = (JSONObject) foodItemJsonArray.get(i);
                            FoodItemDetails temp = new FoodItemDetails();
                            temp.setFoodItemId(foodItemJsonObject.getInt("food_item_id"));
                            temp.setFoodItemName(foodItemJsonObject.getString("item_name"));
                            temp.setPurchaseOrderId(foodItemJsonObject.getInt("purchase_orderId"));
                            temp.setActualQuantity(foodItemJsonObject.getInt("total_qty"));
                            temp.setScannedQuantity(foodItemJsonObject.getInt("packed_qty"));
                            temp.setReceivedBarcode(foodItemJsonObject.getString("barcode"));

                            temp.setRestaurantId(restaurantId);
                            temp.setOutletId(foodItemJsonObject.getInt("outlet_id"));
                            temp.setOutletName(foodItemJsonObject.getString("outlet_name"));
                            temp.setImageURL(foodItemJsonObject.getString("image_url"));
//                            temp.setFoodItemId(foodItemJsonObject.getInt("id"));
//                            temp.setFoodItemName(foodItemJsonObject.getString("name").toString().trim());
//                            temp.setBarcode(foodItemJsonObject.getString("barcode").trim());
                            foodItemsList.add(temp);
                        }

                        if (foodItemsList.size() > 0) {
//                            sqlAdapter.deleteFoodItemTable();
//                            sqlAdapter.saveFoodItemList(foodItemsList);
                            progressDialog.cancel();
                            communicator.foodItemSave(foodItemsList);
                        } else {
                            progressDialog.cancel();
                            communicator.foodItemSave(foodItemsList);
                        }

                    } else {
//                        progressDialog.cancel();
                        communicator.foodItemSave(new ArrayList<FoodItemDetails>());
                    }

                } catch (JSONException e) {
                    progressDialog.cancel();
                    e.printStackTrace();
                    Toast.makeText(context, "JSON Exception: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }


            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                progressDialog.cancel();

                if (CommonMethods.haveNetworkConnection(context)) {
                    Toast.makeText(context, "Error : " + error.getMessage(), Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(context, "Check Internet Connection", Toast.LENGTH_SHORT).show();
                }
            }
        });

        RetryPolicy retryPolicy = new DefaultRetryPolicy(8000, 2, DefaultRetryPolicy.DEFAULT_BACKOFF_MULT);
        outletStringRequest.setRetryPolicy(retryPolicy);
        requestQueue.add(outletStringRequest);
    }


    public interface SettingCommunicator {
        public void restaurantSave(boolean isSaved);

        public void outletSave(boolean isSaved);

        public void foodItemSave(List<FoodItemDetails> foodItemDetailsList);

        public void uploadData(boolean isSaved, String message);
    }
}
