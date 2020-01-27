package com.Freshly.VendorApp.Services;

import android.os.Parcel;
import android.os.Parcelable;

public class FoodItemsBarcodeDetails implements Parcelable {
    private int foodItemId;
    private String foodItemName;
    private String scannedBarcode;
    private String generatedBarcode;
    private String receivedBarcode;
    private int sequenceNumber;
    private int foodItemAddedId;
    private int outletId;
    private String outletName;
    private int restaurantId;
    private int plannedQuantity;
    private long scannedQuantity;
    // FOREIGN KEY
    private int foodItemQuanityTable_Id;

    public int getFoodItemQuanityTable_Id() {
        return foodItemQuanityTable_Id;
    }

    public void setFoodItemQuanityTable_Id(int foodItemQuanityTable_Id) {
        this.foodItemQuanityTable_Id = foodItemQuanityTable_Id;
    }

    public String getOutletName() {
        return outletName;
    }

    public void setOutletName(String outletName) {
        this.outletName = outletName;
    }

    public int getPlannedQuantity() {
        return plannedQuantity;
    }

    public void setPlannedQuantity(int plannedQuantity) {
        this.plannedQuantity = plannedQuantity;
    }

    public long getScannedQuantity() {
        return scannedQuantity;
    }

    public void setScannedQuantity(long scannedQuantity) {
        this.scannedQuantity = scannedQuantity;
    }

    public int getOutletId() {
        return outletId;
    }

    public void setOutletId(int outletId) {
        this.outletId = outletId;
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

    public String getScannedBarcode() {
        return scannedBarcode;
    }

    public void setScannedBarcode(String scannedBarcode) {
        this.scannedBarcode = scannedBarcode;
    }

    public String getGeneratedBarcode() {
        return generatedBarcode;
    }

    public void setGeneratedBarcode(String generatedBarcode) {
        this.generatedBarcode = generatedBarcode;
    }

    public int getSequenceNumber() {
        return sequenceNumber;
    }

    public void setSequenceNumber(int sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }

    public int getFoodItemAddedId() {
        return foodItemAddedId;
    }

    public void setFoodItemAddedId(int foodItemAddedId) {
        this.foodItemAddedId = foodItemAddedId;
    }

    public String getReceivedBarcode() {
        return receivedBarcode;
    }

    public void setReceivedBarcode(String receivedBarcode) {
        this.receivedBarcode = receivedBarcode;
    }

    public FoodItemsBarcodeDetails() {
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeInt(this.foodItemId);
        dest.writeString(this.foodItemName);
        dest.writeString(this.scannedBarcode);
        dest.writeString(this.generatedBarcode);
        dest.writeString(this.receivedBarcode);
        dest.writeInt(this.sequenceNumber);
        dest.writeInt(this.foodItemAddedId);
        dest.writeInt(this.outletId);
        dest.writeString(this.outletName);
        dest.writeInt(this.restaurantId);
        dest.writeInt(this.plannedQuantity);
        dest.writeLong(this.scannedQuantity);
        dest.writeInt(this.foodItemQuanityTable_Id);
    }

    protected FoodItemsBarcodeDetails(Parcel in) {
        this.foodItemId = in.readInt();
        this.foodItemName = in.readString();
        this.scannedBarcode = in.readString();
        this.generatedBarcode = in.readString();
        this.receivedBarcode = in.readString();
        this.sequenceNumber = in.readInt();
        this.foodItemAddedId = in.readInt();
        this.outletId = in.readInt();
        this.outletName = in.readString();
        this.restaurantId = in.readInt();
        this.plannedQuantity = in.readInt();
        this.scannedQuantity = in.readLong();
        this.foodItemQuanityTable_Id = in.readInt();
    }

    public static final Creator<FoodItemsBarcodeDetails> CREATOR = new Creator<FoodItemsBarcodeDetails>() {
        @Override
        public FoodItemsBarcodeDetails createFromParcel(Parcel source) {
            return new FoodItemsBarcodeDetails(source);
        }

        @Override
        public FoodItemsBarcodeDetails[] newArray(int size) {
            return new FoodItemsBarcodeDetails[size];
        }
    };
}
