package com.Freshly.VendorApp.Services;

import android.os.Parcel;
import android.os.Parcelable;

public class Outlet implements Parcelable {
    private String outletId;
    private String outletName;
    private String restaurantId;

    public String getOutletId() {
        return outletId;
    }

    public void setOutletId(String outletId) {
        this.outletId = outletId;
    }

    public String getOutletName() {
        return outletName;
    }

    public void setOutletName(String outletName) {
        this.outletName = outletName;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public void setRestaurantId(String restaurantId) {
        this.restaurantId = restaurantId;
    }

    @Override
    public String toString() {
        return outletName.toString();
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeString(this.outletId);
        dest.writeString(this.outletName);
        dest.writeString(this.restaurantId);
    }

    public Outlet() {
    }

    protected Outlet(Parcel in) {
        this.outletId = in.readString();
        this.outletName = in.readString();
        this.restaurantId = in.readString();
    }

    public static final Creator<Outlet> CREATOR = new Creator<Outlet>() {
        @Override
        public Outlet createFromParcel(Parcel source) {
            return new Outlet(source);
        }

        @Override
        public Outlet[] newArray(int size) {
            return new Outlet[size];
        }
    };
}
