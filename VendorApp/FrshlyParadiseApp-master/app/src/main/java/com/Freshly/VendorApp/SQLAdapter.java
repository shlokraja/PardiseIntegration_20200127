package com.Freshly.VendorApp;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.DatabaseUtils;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;
import android.widget.Toast;

import com.Freshly.VendorApp.Services.FoodItemAddedDetails;
import com.Freshly.VendorApp.Services.FoodItemsBarcodeDetails;
import com.Freshly.VendorApp.Services.FoodItemsDetails;
import com.Freshly.VendorApp.Services.Outlet;
import com.Freshly.VendorApp.Services.Restaurant;

import java.util.ArrayList;
import java.util.List;

public class SQLAdapter {

    private static SQLAdapter mInstance;
    SqlAdapterDatabaseHelper sqlAdapterDatabaseHelper;
    SQLiteDatabase sqLiteDatabase;
    Context context;

    private SQLAdapter(Context context) {
        this.context = context;
        sqlAdapterDatabaseHelper = new SqlAdapterDatabaseHelper(context, SqlAdapterDatabaseHelper.DATABASE_NAME, null, 1);
        sqLiteDatabase = sqlAdapterDatabaseHelper.getWritableDatabase();
    }

    public static synchronized SQLAdapter getInstance(Context context) {
        if (mInstance == null) {
            Log.i("mInstance", "null");
            mInstance = new SQLAdapter(context);
        }
        Log.i("mInstance", "not null");
        return mInstance;
    }

    // region "Restaurant"
    public long saveRestaurantList(List<Restaurant> restaurantList) {
        long resultKey = 0;
        try {
            for (Restaurant restaurant : restaurantList) {
                ContentValues contentValues = new ContentValues();
                contentValues.put(SqlAdapterDatabaseHelper.RESTAURANT_ID, restaurant.getRestaurantId());
                contentValues.put(SqlAdapterDatabaseHelper.RESTAURANT_NAME, restaurant.getRestaurantName());

                resultKey = sqLiteDatabase.insert(SqlAdapterDatabaseHelper.RESTAURANT_TABLE, null, contentValues);

            }
            return resultKey;

        } catch (Exception ex) {
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return resultKey;
        }
    }

    public List<Restaurant> getRestaurants() {
        List<Restaurant> restaurants = new ArrayList<>();
        Cursor cursor = null;

        try {
            cursor = sqLiteDatabase.query(SqlAdapterDatabaseHelper.RESTAURANT_TABLE, null, null,
                    null, null, null, SqlAdapterDatabaseHelper.RESTAURANT_NAME + " ASC", null);

            while (cursor.moveToNext()) {
                Restaurant res = new Restaurant();
                res.setRestaurantId(String.valueOf(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.RESTAURANT_ID))));
                res.setRestaurantName(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.RESTAURANT_NAME)));
                restaurants.add(res);
            }

            return restaurants;

        } catch (Exception ex) {
            ex.printStackTrace();
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return restaurants;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    public void deleteRestaurantTable() {
        try {
            sqLiteDatabase.delete(sqlAdapterDatabaseHelper.RESTAURANT_TABLE, null, null);
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }
    // endregion

    // region "Outlet"
    public long saveOutletList(List<Outlet> outletList) {
        long resultKey = 0;
        try {
            for (Outlet outlet : outletList) {
                ContentValues contentValues = new ContentValues();
                contentValues.put(SqlAdapterDatabaseHelper.RESTAURANT_ID, outlet.getRestaurantId());
                contentValues.put(SqlAdapterDatabaseHelper.OUTLET_ID, outlet.getOutletId());
                contentValues.put(SqlAdapterDatabaseHelper.OUTLET_NAME, outlet.getOutletName());

                resultKey = sqLiteDatabase.insert(SqlAdapterDatabaseHelper.OUTLET_TABLE, null, contentValues);

            }
            return resultKey;

        } catch (Exception ex) {
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return resultKey;
        }
    }

    public List<Outlet> getOutlet(String restaurantId) {
        List<Outlet> outlets = new ArrayList<>();
        Cursor cursor = null;

        try {
            cursor = sqLiteDatabase.query(SqlAdapterDatabaseHelper.OUTLET_TABLE, null, SqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId,
                    null, null, null, SqlAdapterDatabaseHelper.OUTLET_NAME + " ASC", null);

            while (cursor.moveToNext()) {
                Outlet temp = new Outlet();
                temp.setRestaurantId(String.valueOf(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.RESTAURANT_ID))));
                temp.setOutletId(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.OUTLET_ID)));
                temp.setOutletName(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.OUTLET_NAME)));
                outlets.add(temp);
            }

            return outlets;

        } catch (Exception ex) {
            ex.printStackTrace();
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return outlets;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    public Outlet getOutletDetails(int outletId) {
        Outlet outlet = null;
        Cursor cursor = null;
        try {
            cursor = sqLiteDatabase.query(sqlAdapterDatabaseHelper.OUTLET_TABLE, null, sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId,
                    null, null, null, null, null);

            while (cursor.moveToNext()) {
                outlet = new Outlet();
                outlet.setOutletId(String.valueOf(cursor.getInt(cursor.getColumnIndex(sqlAdapterDatabaseHelper.OUTLET_ID))));
                outlet.setOutletName(cursor.getString(cursor.getColumnIndex(sqlAdapterDatabaseHelper.OUTLET_NAME)));
            }
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, e.getMessage(), Toast.LENGTH_SHORT).show();
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        return outlet;
    }

    public void deleteOutletTable() {
        try {
            sqLiteDatabase.delete(sqlAdapterDatabaseHelper.OUTLET_TABLE, null, null);
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }
    // endregion

    // region Food Item
    public long saveFoodItemList(List<FoodItemsDetails> foodItemsList) {
        long resultKey = 0;
        try {
            for (FoodItemsDetails foodItems : foodItemsList) {
                ContentValues contentValues = new ContentValues();
                contentValues.put(SqlAdapterDatabaseHelper.RESTAURANT_ID, foodItems.getRestaurantId());
                contentValues.put(SqlAdapterDatabaseHelper.OUTLET_ID, foodItems.getOutletId());
                contentValues.put(SqlAdapterDatabaseHelper.FOODITEM_ID, foodItems.getFoodItemId());
                contentValues.put(SqlAdapterDatabaseHelper.FOODITEM_NAME, foodItems.getFoodItemName());
                contentValues.put(SqlAdapterDatabaseHelper.FOODITEM_BARCODE, foodItems.getBarcode());

                resultKey = sqLiteDatabase.insert(SqlAdapterDatabaseHelper.FOOD_ITEM_TABLE, null, contentValues);

            }
            return resultKey;

        } catch (Exception ex) {
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return resultKey;
        }
    }

    public List<FoodItemsDetails> getFoodItems(int restaurantId, int outletId) {
        List<FoodItemsDetails> foodItems = new ArrayList<>();
        Cursor cursor = null;

        try {
            cursor = sqLiteDatabase.query(SqlAdapterDatabaseHelper.FOOD_ITEM_TABLE, null, SqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId +
                    " AND " + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId, null, null, null, null, null);

            while (cursor.moveToNext()) {
                FoodItemsDetails temp = new FoodItemsDetails();
                temp.setRestaurantId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.RESTAURANT_ID)));
                temp.setOutletId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.OUTLET_ID)));
                temp.setFoodItemId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.FOODITEM_ID)));
                temp.setFoodItemName(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.FOODITEM_NAME)));
                temp.setBarcode(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.FOODITEM_BARCODE)));
                foodItems.add(temp);
            }

            return foodItems;

        } catch (Exception ex) {
            ex.printStackTrace();
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return foodItems;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

    }

    public FoodItemsDetails getFoodItemDetails(int restaurantId, int outletId, int foodItemId) {
        FoodItemsDetails foodItemsDetails = null;
        Cursor cursor = null;
        try {
            cursor = sqLiteDatabase.query(SqlAdapterDatabaseHelper.FOOD_ITEM_TABLE, null, SqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId +
                            " AND " + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId + " AND " + sqlAdapterDatabaseHelper.FOODITEM_ID + " = " + foodItemId,
                    null, null, null, null, null);

            while (cursor.moveToNext()) {
                foodItemsDetails = new FoodItemsDetails();
                foodItemsDetails.setFoodItemId(cursor.getInt(cursor.getColumnIndex(sqlAdapterDatabaseHelper.FOODITEM_ID)));
                foodItemsDetails.setFoodItemName(cursor.getString(cursor.getColumnIndex(sqlAdapterDatabaseHelper.FOODITEM_NAME)));
                foodItemsDetails.setBarcode(cursor.getString(cursor.getColumnIndex(sqlAdapterDatabaseHelper.FOODITEM_BARCODE)));
            }
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, e.getMessage(), Toast.LENGTH_SHORT).show();
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        return foodItemsDetails;
    }

    public void deleteFoodItemTable() {
        try {
            sqLiteDatabase.delete(sqlAdapterDatabaseHelper.FOOD_ITEM_TABLE, null, null);
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }
    // endregion

    // region Food Item Quantity To Be Scanned
    public long saveFoodItemQuantity(FoodItemAddedDetails foodItemsQuantity) {
        long resultKey = 0;
        try {
            ContentValues contentValues = new ContentValues();
            contentValues.put(SqlAdapterDatabaseHelper.RESTAURANT_ID, foodItemsQuantity.getRestaurantId());
            contentValues.put(SqlAdapterDatabaseHelper.OUTLET_ID, foodItemsQuantity.getOutletId());
            contentValues.put(SqlAdapterDatabaseHelper.FOODITEM_ID, foodItemsQuantity.getFoodItemId());
            contentValues.put(SqlAdapterDatabaseHelper.FOODITEM_NAME, foodItemsQuantity.getFoodItemName());
            contentValues.put(SqlAdapterDatabaseHelper.PLANNED_QUANTITY, foodItemsQuantity.getQuantity());
            contentValues.put(SqlAdapterDatabaseHelper.FOODITEM_BARCODE, foodItemsQuantity.getBarcode());

            resultKey = sqLiteDatabase.insert(SqlAdapterDatabaseHelper.FOOD_ITEM_QUANTITY_TABLE, null, contentValues);

            return resultKey;

        } catch (Exception ex) {
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return resultKey;
        }
    }


    public List<FoodItemAddedDetails> getFoodItemsQuantity(int restaurantId, int outletId) {
        List<FoodItemAddedDetails> foodItemsQty = new ArrayList<>();
        Cursor cursor = null;

        try {
            cursor = sqLiteDatabase.query(SqlAdapterDatabaseHelper.FOOD_ITEM_QUANTITY_TABLE, null, SqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId +
                    " AND " + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId, null, null, null, null, null);

            while (cursor.moveToNext()) {
                FoodItemAddedDetails temp = new FoodItemAddedDetails();
                temp.setId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.UID)));
                temp.setRestaurantId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.RESTAURANT_ID)));
                temp.setOutletId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.OUTLET_ID)));
                temp.setFoodItemId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.FOODITEM_ID)));
                temp.setFoodItemName(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.FOODITEM_NAME)));
                temp.setQuantity(cursor.getInt(cursor.getColumnIndex(sqlAdapterDatabaseHelper.PLANNED_QUANTITY)));
                temp.setBarcode(cursor.getString(cursor.getColumnIndex(sqlAdapterDatabaseHelper.FOODITEM_BARCODE)));
                foodItemsQty.add(temp);
            }

        } catch (Exception ex) {
            ex.printStackTrace();
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

        return foodItemsQty;
    }

    public int getPlannedQuantity(int restaurantId, int outletId, int foodItemId) {
        int qty = 0;
        Cursor cursor = null;
        try {
//            String[] columns = {sqlAdapterDatabaseHelper.PLANNED_QUANTITY};
//
//            cursor = sqLiteDatabase.query(sqlAdapterDatabaseHelper.FOOD_ITEM_QUANTITY_TABLE, columns, SqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId +
//                    " AND " + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId + " AND " + sqlAdapterDatabaseHelper.FOODITEM_ID + " = " + foodItemId, null, null, null, null, null);

            cursor = sqLiteDatabase.rawQuery("SELECT SUM(" + sqlAdapterDatabaseHelper.PLANNED_QUANTITY + ") as Total FROM " + sqlAdapterDatabaseHelper.FOOD_ITEM_QUANTITY_TABLE + " WHERE " +
                    SqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId +
                    " AND " + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId + " AND " + sqlAdapterDatabaseHelper.FOODITEM_ID + " = " + foodItemId, null);

            if (cursor.moveToFirst()) {
                qty = cursor.getInt(cursor.getColumnIndex("Total"));
            }

            return qty;

        } catch (Exception ex) {
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return qty;
        }
    }

    public void deleteFoodItemQuantityTable(int outletId) {
        try {
            sqLiteDatabase.delete(sqlAdapterDatabaseHelper.FOOD_ITEM_QUANTITY_TABLE, null, null);
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }
    // endregion

    // region Food Item Barcode Details
    public long saveFoodItemBarcode(FoodItemsBarcodeDetails foodItemsBarcodeDetails) {
        long resultKey = 0;
        try {
            ContentValues contentValues = new ContentValues();
            contentValues.put(SqlAdapterDatabaseHelper.RESTAURANT_ID, foodItemsBarcodeDetails.getRestaurantId());
            contentValues.put(SqlAdapterDatabaseHelper.OUTLET_ID, foodItemsBarcodeDetails.getOutletId());
            contentValues.put(SqlAdapterDatabaseHelper.FOODITEM_ID, foodItemsBarcodeDetails.getFoodItemId());
            contentValues.put(SqlAdapterDatabaseHelper.FOODITEM_NAME, foodItemsBarcodeDetails.getFoodItemName());
            contentValues.put(SqlAdapterDatabaseHelper.SEQUENCE_NUMBER, foodItemsBarcodeDetails.getSequenceNumber());
            contentValues.put(SqlAdapterDatabaseHelper.SCANNED_BARCODE, foodItemsBarcodeDetails.getScannedBarcode());
            contentValues.put(SqlAdapterDatabaseHelper.GENERATED_BARCODE, foodItemsBarcodeDetails.getGeneratedBarcode());
            contentValues.put(SqlAdapterDatabaseHelper.FOOD_ITEM_QUANTITY_ID_FOREIGN_KEY, foodItemsBarcodeDetails.getFoodItemQuanityTable_Id());

            resultKey = sqLiteDatabase.insert(SqlAdapterDatabaseHelper.FOOD_ITEM_BARCODE_TABLE, null, contentValues);

            return resultKey;

        } catch (Exception ex) {
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return resultKey;
        }
    }


    public List<FoodItemsBarcodeDetails> getFoodItemsBarcodeDetails(int restaurantId, int outletId, String outletName) {
        List<FoodItemsBarcodeDetails> foodItemsBarcodeDetails = new ArrayList<>();
        Cursor cursor = null;

        try {
            cursor = sqLiteDatabase.query(SqlAdapterDatabaseHelper.FOOD_ITEM_BARCODE_TABLE, null, SqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId +
                    " AND " + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId, null, SqlAdapterDatabaseHelper.FOODITEM_ID, null, null, null);

            while (cursor.moveToNext()) {
                FoodItemsBarcodeDetails temp = new FoodItemsBarcodeDetails();
                temp.setRestaurantId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.RESTAURANT_ID)));
                temp.setOutletId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.OUTLET_ID)));
                temp.setOutletName(outletName);
                temp.setFoodItemId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.FOODITEM_ID)));
                temp.setFoodItemName(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.FOODITEM_NAME)));
//                temp.setSequenceNumber(cursor.getInt(cursor.getColumnIndex(sqlAdapterDatabaseHelper.SEQUENCE_NUMBER)));
                temp.setScannedQuantity(getPackedQuantityOverAllCount(restaurantId, outletId, temp.getFoodItemId()));
                temp.setPlannedQuantity(getPlannedQuantity(restaurantId, outletId, temp.getFoodItemId()));
                temp.setScannedBarcode(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.SCANNED_BARCODE)));
                temp.setGeneratedBarcode(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.GENERATED_BARCODE)));
                foodItemsBarcodeDetails.add(temp);
            }

        } catch (Exception ex) {
            ex.printStackTrace();
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

        return foodItemsBarcodeDetails;
    }

    public List<FoodItemsBarcodeDetails> getAllFoodItemsBarcodeDetails(int restaurantId, int outletId, String outletName) {
        List<FoodItemsBarcodeDetails> foodItemsBarcodeDetails = new ArrayList<>();
        Cursor cursor = null;

        try {
            cursor = sqLiteDatabase.query(SqlAdapterDatabaseHelper.FOOD_ITEM_BARCODE_TABLE, null, SqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId +
                    " AND " + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId, null, null, null, null, null);

            while (cursor.moveToNext()) {
                FoodItemsBarcodeDetails temp = new FoodItemsBarcodeDetails();
                temp.setRestaurantId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.RESTAURANT_ID)));
                temp.setOutletId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.OUTLET_ID)));
                temp.setOutletName(outletName);
                temp.setFoodItemId(cursor.getInt(cursor.getColumnIndex(SqlAdapterDatabaseHelper.FOODITEM_ID)));
                temp.setFoodItemName(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.FOODITEM_NAME)));
//                temp.setSequenceNumber(cursor.getInt(cursor.getColumnIndex(sqlAdapterDatabaseHelper.SEQUENCE_NUMBER)));
                temp.setScannedQuantity(getPackedQuantityOverAllCount(restaurantId, outletId, temp.getFoodItemId()));
                temp.setPlannedQuantity(getPlannedQuantity(restaurantId, outletId, temp.getFoodItemId()));
                temp.setScannedBarcode(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.SCANNED_BARCODE)));
                temp.setGeneratedBarcode(cursor.getString(cursor.getColumnIndex(SqlAdapterDatabaseHelper.GENERATED_BARCODE)));
                foodItemsBarcodeDetails.add(temp);
            }

        } catch (Exception ex) {
            ex.printStackTrace();
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

        return foodItemsBarcodeDetails;
    }

    public long getPackedQuantityCount(int restaurantId, int outletId, int foodItemId, int id) {

        return DatabaseUtils.queryNumEntries(sqLiteDatabase, sqlAdapterDatabaseHelper.FOOD_ITEM_BARCODE_TABLE, sqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId + " AND "
                + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId + " AND " + sqlAdapterDatabaseHelper.FOODITEM_ID + " = " + foodItemId
                + " AND " + sqlAdapterDatabaseHelper.FOOD_ITEM_QUANTITY_ID_FOREIGN_KEY + " = " + id, null);

    }

    public long getPackedQuantityOverAllCount(int restaurantId, int outletId, int foodItemId) {

        return DatabaseUtils.queryNumEntries(sqLiteDatabase, sqlAdapterDatabaseHelper.FOOD_ITEM_BARCODE_TABLE, sqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId + " AND "
                + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId + " AND " + sqlAdapterDatabaseHelper.FOODITEM_ID + " = " + foodItemId, null);

    }

    public int getSequenceNumber(int restaurantId, int outletId, int foodItemId, int quantityTableId) {
        int sequenceNumber = 0;
        Cursor cursor = null;
        try {
            String[] columns = {sqlAdapterDatabaseHelper.SEQUENCE_NUMBER};
            cursor = sqLiteDatabase.query(sqlAdapterDatabaseHelper.FOOD_ITEM_BARCODE_TABLE, columns, sqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId + " AND "
                            + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId + " AND " + sqlAdapterDatabaseHelper.FOODITEM_ID + " = " + foodItemId
                            + " AND " + sqlAdapterDatabaseHelper.FOOD_ITEM_QUANTITY_ID_FOREIGN_KEY + " = " + quantityTableId
                    , null, null, null, sqlAdapterDatabaseHelper.SEQUENCE_NUMBER + " ASC ", null);

            while (cursor.moveToNext()) {
                sequenceNumber = cursor.getInt(cursor.getColumnIndex(sqlAdapterDatabaseHelper.SEQUENCE_NUMBER));
            }

            return sequenceNumber;

        } catch (Exception ex) {
            Toast.makeText(context, ex.getMessage(), Toast.LENGTH_SHORT).show();
            return sequenceNumber;
        }
    }

    public long checkbarcodeAvailable(int restaurantId, int outletId, String barcode) {

        return DatabaseUtils.queryNumEntries(sqLiteDatabase, sqlAdapterDatabaseHelper.FOOD_ITEM_BARCODE_TABLE, sqlAdapterDatabaseHelper.RESTAURANT_ID + " = " + restaurantId + " AND "
                + sqlAdapterDatabaseHelper.OUTLET_ID + " = " + outletId + " AND " + sqlAdapterDatabaseHelper.SCANNED_BARCODE + " = '" + barcode + "'", null);

    }

    public void deleteFoodItemBarcodeTable(int outletId) {
        try {
            sqLiteDatabase.delete(sqlAdapterDatabaseHelper.FOOD_ITEM_BARCODE_TABLE, null, null);
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    // endregion


    private class SqlAdapterDatabaseHelper extends SQLiteOpenHelper {

        Context context;
        private final static String DATABASE_NAME = "AtchayamDB";
        private final static String UID = "_id";
        private final static int DATABASE_VERSION = 1;

        public SqlAdapterDatabaseHelper(Context context, String name, SQLiteDatabase.CursorFactory factory, int version) {
            super(context, name, factory, version);
            this.context = context;
        }

        // RESTAURANT TABLE
        private final static String RESTAURANT_TABLE = "Restaurant_Table";
        private final static String RESTAURANT_ID = "Restaurant_Id";
        private final static String RESTAURANT_NAME = "Restaurant_Name";

        private final static String CREATE_RESTAURANT_TABLE = "Create TABLE " + RESTAURANT_TABLE + " (" + UID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                RESTAURANT_ID + " INTEGER, " + RESTAURANT_NAME + " TEXT);";

        private final static String DROP_RESTAURANT_TABLE = "DROP TABLE IF EXISTS " + RESTAURANT_TABLE;


        // OUTLET TABLE
        private final static String OUTLET_TABLE = "Outlet_Table";
        private final static String OUTLET_ID = "Outlet_Id";
        private final static String OUTLET_NAME = "Outlet_Name";

        private final static String CREATE_OUTLET_TABLE = "Create TABLE " + OUTLET_TABLE + " (" + UID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                OUTLET_ID + " INTEGER, " + OUTLET_NAME + " TEXT, " + RESTAURANT_ID + " TEXT);";

        private final static String DROP_OUTLET_TABLE = "DROP TABLE IF EXISTS " + OUTLET_TABLE;

        // FOOD ITEM TABLE
        private final static String FOOD_ITEM_TABLE = "FoodItem_Table";
        private final static String FOODITEM_ID = "FoodItem_Id";
        private final static String FOODITEM_NAME = "FoodItem_Name";
        private final static String FOODITEM_BARCODE = "FoodItem_Barcode";

        private final static String CREATE_FOOD_ITEM_TABLE = "Create TABLE " + FOOD_ITEM_TABLE + " (" + UID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                FOODITEM_ID + " INTEGER, " + FOODITEM_NAME + " TEXT, " + RESTAURANT_ID + " INTEGER, " + OUTLET_ID + " INTEGER, " + FOODITEM_BARCODE + " TEXT);";

        private final static String DROP_FOOD_ITEM_TABLE = "DROP TABLE IF EXISTS " + FOOD_ITEM_TABLE;

        // FOOD ITEM ADDED DETAILS TABLE
        private final static String FOOD_ITEM_QUANTITY_TABLE = "FoodItemQuantity_Table";
        private final static String PLANNED_QUANTITY = "PlannedQuantity";

        private final static String CREATE_FOOD_ITEM_QUANTITY_TABLE = "CREATE TABLE " + FOOD_ITEM_QUANTITY_TABLE + " ( " + UID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                FOODITEM_ID + " INTEGER, " + FOODITEM_NAME + " TEXT, " + RESTAURANT_ID + " INTEGER, " + OUTLET_ID + " INTEGER, " + PLANNED_QUANTITY + " INTEGER, " + FOODITEM_BARCODE + " TEXT);";

        private final static String DROP_FOOD_ITEM_QUANTITY_TABLE = "DROP TABLE IF EXISTS " + FOOD_ITEM_QUANTITY_TABLE;

        // FOOD ITEM BARCODE DETAILS TABLE
        private final static String FOOD_ITEM_BARCODE_TABLE = "FoodItemBarcode_Table";
        private final static String SCANNED_BARCODE = "ScannedBarcode";
        private final static String GENERATED_BARCODE = "GeneratedBarcode";
        private final static String SEQUENCE_NUMBER = "SequenceNumber";
        private final static String FOOD_ITEM_QUANTITY_ID_FOREIGN_KEY = "Food_Item_Quantity_Id";

        private final static String CREATE_FOOD_ITEM_BARCODE_TABLE = "CREATE TABLE " + FOOD_ITEM_BARCODE_TABLE + " ( " + UID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                FOODITEM_ID + " INTEGER, " + FOODITEM_NAME + " TEXT, " + RESTAURANT_ID + " INTEGER, " + OUTLET_ID + " INTEGER, " + SCANNED_BARCODE + " TEXT, " +
                GENERATED_BARCODE + " TEXT, " + SEQUENCE_NUMBER + " INTEGER, " + FOOD_ITEM_QUANTITY_ID_FOREIGN_KEY + " INTEGER);";

        private final static String DROP_FOOD_ITEM_BARCODE_TABLE = "DROP TABLE IF EXISTS " + FOOD_ITEM_BARCODE_TABLE;

        @Override
        public void onCreate(SQLiteDatabase db) {
            db.execSQL(CREATE_RESTAURANT_TABLE);
            db.execSQL(CREATE_OUTLET_TABLE);
            db.execSQL(CREATE_FOOD_ITEM_TABLE);
            db.execSQL(CREATE_FOOD_ITEM_QUANTITY_TABLE);
            db.execSQL(CREATE_FOOD_ITEM_BARCODE_TABLE);
        }

        @Override
        public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            db.execSQL(DROP_RESTAURANT_TABLE);
            db.execSQL(DROP_OUTLET_TABLE);
            db.execSQL(DROP_FOOD_ITEM_TABLE);
            db.execSQL(DROP_FOOD_ITEM_TABLE);
            db.execSQL(DROP_FOOD_ITEM_QUANTITY_TABLE);
            db.execSQL(DROP_FOOD_ITEM_BARCODE_TABLE);
        }
    }
}
