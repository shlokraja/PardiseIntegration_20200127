package com.Freshly.VendorApp;

import android.content.Context;
import android.graphics.drawable.Drawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.RecyclerView;

import com.Freshly.VendorApp.Services.FoodItemDetails;
import com.bumptech.glide.Glide;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.target.Target;

import java.util.List;

public class FoodItemListRecyclerAdapter extends RecyclerView.Adapter<FoodItemListRecyclerAdapter.FoodItemListViewHolder> {
    // PRIVATE VARIABLES
    private LayoutInflater inflater;
    private List<FoodItemDetails> foodItemDetailsList;
    Context context;
    ProgressBar progressBar;

    public FoodItemListRecyclerAdapter(Context context, List<FoodItemDetails> foodItemDetailsList) {
        inflater = LayoutInflater.from(context);
        this.foodItemDetailsList = foodItemDetailsList;
        this.context = context;
    }

    @NonNull
    @Override
    public FoodItemListViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = inflater.inflate(R.layout.food_item_list_row, parent, false);

        return new FoodItemListViewHolder(view);
    }


    @Override
    public void onBindViewHolder(@NonNull final FoodItemListViewHolder holder, int position) {
        FoodItemDetails foodItemDetails = foodItemDetailsList.get(position);

        holder.orderedTV.setText(String.valueOf(foodItemDetails.getActualQuantity()));
        holder.scannedTV.setText(String.valueOf(foodItemDetails.getScannedQuantity()));
        holder.itemNameTV.setText(foodItemDetails.getFoodItemName());
//        holder.progressBar.setVisibility(View.VISIBLE);

//        Glide.with(context).load("https://2.wlimg.com/product_images/bc-full/dir_126/3751763/south-indian-food-1495910817-2204324.jpeg").into(holder.foodItemIV);
        String url = foodItemDetails.getImageURL();
        Glide.with(context).load(url)
                .listener(new RequestListener<Drawable>() {
                    @Override
                    public boolean onLoadFailed(@Nullable GlideException e, Object model, Target<Drawable> target, boolean isFirstResource) {
                        holder.foodItemIV.setBackground(context.getResources().getDrawable(R.drawable.no_image_found));
                        holder.foodItemIV.setVisibility(View.VISIBLE);
                        holder.progressBar.setVisibility(View.GONE);
                        return false;
                    }

                    @Override
                    public boolean onResourceReady(Drawable resource, Object model, Target<Drawable> target, DataSource dataSource, boolean isFirstResource) {
                        holder.foodItemIV.setVisibility(View.VISIBLE);
                        holder.progressBar.setVisibility(View.GONE);
                        return false;
                    }
                })
                .into(holder.foodItemIV);
    }

    @Override
    public int getItemCount() {
        return foodItemDetailsList.size();
    }

    public class FoodItemListViewHolder extends RecyclerView.ViewHolder {
        ImageView foodItemIV;
        TextView orderedTV;
        TextView scannedTV;
        LinearLayout mapItLL;
        ProgressBar progressBar;
        TextView itemNameTV;

        public FoodItemListViewHolder(View itemView) {
            super(itemView);

            foodItemIV = itemView.findViewById(R.id.foodItemListRow_ImageIV);
            orderedTV = itemView.findViewById(R.id.foodItemListRow_OrderedTV);
            scannedTV = itemView.findViewById(R.id.foodItemListRow_ScannedTV);
            mapItLL = itemView.findViewById(R.id.foodItemListRow_MapItLayoutLL);
            progressBar = itemView.findViewById(R.id.foodItemListRow_ProgressPB);
            itemNameTV = itemView.findViewById(R.id.foodItemListRow_ItemNameLabelTV);
        }
    }
}