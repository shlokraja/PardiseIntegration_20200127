package com.Freshly.VendorApp.Services;

import android.os.Parcel;
import android.os.Parcelable;

public class FoodItemDetails implements Parcelable {
    private int id;
    private int foodItemId;
    private String foodItemName;
    private int restaurantId;
    private String restaurantName;
    private int outletId;
    private String outletName;
    private int scannedQuantity;
    private int actualQuantity;
    private int purchaseOrderId;
    private String purchaseOrderDateTime;
    private String receivedBarcode;
    private String imageURL;

    public String getImageURL() {
        return imageURL;
    }

    public void setImageURL(String imageURL) {
        this.imageURL = imageURL;
    }

    public String getReceivedBarcode() {
        return receivedBarcode;
    }

    public void setReceivedBarcode(String receivedBarcode) {
        this.receivedBarcode = receivedBarcode;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
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

    public String getRestaurantName() {
        return restaurantName;
    }

    public void setRestaurantName(String restaurantName) {
        this.restaurantName = restaurantName;
    }

    public int getOutletId() {
        return outletId;
    }

    public void setOutletId(int outletId) {
        this.outletId = outletId;
    }

    public String getOutletName() {
        return outletName;
    }

    public void setOutletName(String outletName) {
        this.outletName = outletName;
    }

    public int getScannedQuantity() {
        return scannedQuantity;
    }

    public void setScannedQuantity(int scannedQuantity) {
        this.scannedQuantity = scannedQuantity;
    }

    public int getActualQuantity() {
        return actualQuantity;
    }

    public void setActualQuantity(int actualQuantity) {
        this.actualQuantity = actualQuantity;
    }

    public int getPurchaseOrderId() {
        return purchaseOrderId;
    }

    public void setPurchaseOrderId(int purchaseOrderId) {
        this.purchaseOrderId = purchaseOrderId;
    }

    public String getPurchaseOrderDateTime() {
        return purchaseOrderDateTime;
    }

    public void setPurchaseOrderDateTime(String purchaseOrderDateTime) {
        this.purchaseOrderDateTime = purchaseOrderDateTime;
    }

    public FoodItemDetails() {
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeInt(this.id);
        dest.writeInt(this.foodItemId);
        dest.writeString(this.foodItemName);
        dest.writeInt(this.restaurantId);
        dest.writeString(this.restaurantName);
        dest.writeInt(this.outletId);
        dest.writeString(this.outletName);
        dest.writeInt(this.scannedQuantity);
        dest.writeInt(this.actualQuantity);
        dest.writeInt(this.purchaseOrderId);
        dest.writeString(this.purchaseOrderDateTime);
        dest.writeString(this.receivedBarcode);
        dest.writeString(this.imageURL);
    }

    protected FoodItemDetails(Parcel in) {
        this.id = in.readInt();
        this.foodItemId = in.readInt();
        this.foodItemName = in.readString();
        this.restaurantId = in.readInt();
        this.restaurantName = in.readString();
        this.outletId = in.readInt();
        this.outletName = in.readString();
        this.scannedQuantity = in.readInt();
        this.actualQuantity = in.readInt();
        this.purchaseOrderId = in.readInt();
        this.purchaseOrderDateTime = in.readString();
        this.receivedBarcode = in.readString();
        this.imageURL = in.readString();
    }

    public static final Creator<FoodItemDetails> CREATOR = new Creator<FoodItemDetails>() {
        @Override
        public FoodItemDetails createFromParcel(Parcel source) {
            return new FoodItemDetails(source);
        }

        @Override
        public FoodItemDetails[] newArray(int size) {
            return new FoodItemDetails[size];
        }
    };
}
