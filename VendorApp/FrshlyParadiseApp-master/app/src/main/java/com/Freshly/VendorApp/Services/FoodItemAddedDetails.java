package com.Freshly.VendorApp.Services;

import android.os.Parcel;
import android.os.Parcelable;

public class FoodItemAddedDetails implements Parcelable {
    private int no;
    private int foodItemId;
    private String foodItemName;
    private int restaurantId;
    private int outletId;
    private int quantity;
    private String barcode;
    private int id;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public int getNo() {
        return no;
    }

    public void setNo(int no) {
        this.no = no;
    }

    public int getFoodItemId() {
        return foodItemId;
    }

    public void setFoodItemId(int foodItemId) {
        this.foodItemId = foodItemId;
    }

    public String getFoodItemName() {
        return foodItemName;
    }

    public void setFoodItemName(String foodItemName) {
        this.foodItemName = foodItemName;
    }

    public int getRestaurantId() {
        return restaurantId;
    }

    public void setRestaurantId(int restaurantId) {
        this.restaurantId = restaurantId;
    }

    public int getOutletId() {
        return outletId;
    }

    public void setOutletId(int outletId) {
        this.outletId = outletId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public FoodItemAddedDetails() {
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeInt(this.no);
        dest.writeInt(this.foodItemId);
        dest.writeString(this.foodItemName);
        dest.writeInt(this.restaurantId);
        dest.writeInt(this.outletId);
        dest.writeInt(this.quantity);
        dest.writeString(this.barcode);
        dest.writeInt(this.id);
    }

    protected FoodItemAddedDetails(Parcel in) {
        this.no = in.readInt();
        this.foodItemId = in.readInt();
        this.foodItemName = in.readString();
        this.restaurantId = in.readInt();
        this.outletId = in.readInt();
        this.quantity = in.readInt();
        this.barcode = in.readString();
        this.id = in.readInt();
    }

    public static final Creator<FoodItemAddedDetails> CREATOR = new Creator<FoodItemAddedDetails>() {
        @Override
        public FoodItemAddedDetails createFromParcel(Parcel source) {
            return new FoodItemAddedDetails(source);
        }

        @Override
        public FoodItemAddedDetails[] newArray(int size) {
            return new FoodItemAddedDetails[size];
        }
    };
}
