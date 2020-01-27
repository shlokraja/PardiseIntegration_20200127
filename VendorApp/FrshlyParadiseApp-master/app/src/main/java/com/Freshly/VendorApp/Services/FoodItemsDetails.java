package com.Freshly.VendorApp.Services;

import android.os.Parcel;
import android.os.Parcelable;

public class FoodItemsDetails implements Parcelable {
    private int foodItemId;
    private String foodItemName;
    private int outletId;
    private int restaurantId;
    private String barcode;

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    @Override
    public String toString() {
        return foodItemName.toString();
    }

    public int getRestaurantId() {
        return restaurantId;
    }

    public void setRestaurantId(int restaurantId) {
        this.restaurantId = restaurantId;
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

    public int getOutletId() {
        return outletId;
    }

    public void setOutletId(int outletId) {
        this.outletId = outletId;
    }

    public FoodItemsDetails() {
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeInt(this.foodItemId);
        dest.writeString(this.foodItemName);
        dest.writeInt(this.outletId);
        dest.writeInt(this.restaurantId);
        dest.writeString(this.barcode);
    }

    protected FoodItemsDetails(Parcel in) {
        this.foodItemId = in.readInt();
        this.foodItemName = in.readString();
        this.outletId = in.readInt();
        this.restaurantId = in.readInt();
        this.barcode = in.readString();
    }

    public static final Creator<FoodItemsDetails> CREATOR = new Creator<FoodItemsDetails>() {
        @Override
        public FoodItemsDetails createFromParcel(Parcel source) {
            return new FoodItemsDetails(source);
        }

        @Override
        public FoodItemsDetails[] newArray(int size) {
            return new FoodItemsDetails[size];
        }
    };
}
