package com.netsammy.alienbasedefense;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BillingPlugin")
public class BillingPlugin extends Plugin {

    private static final String PREFS_NAME = "AlienBaseDefenseBilling";
    private static final String KEY_NO_ADS = "purchased_no_ads";

    @PluginMethod
    public void initialize(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean purchased = prefs.getBoolean(KEY_NO_ADS, false);

        JSObject result = new JSObject();
        result.put("initialized", true);
        result.put("purchasedNoAds", purchased);
        call.resolve(result);
    }

    @PluginMethod
    public void launchBillingFlow(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || !productId.equals("starter_pack_no_ads")) {
            call.reject("Invalid productId");
            return;
        }

        // Persist purchase locally
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_NO_ADS, true).apply();

        JSObject result = new JSObject();
        result.put("success", true);
        result.put("productId", productId);
        call.resolve(result);
    }

    @PluginMethod
    public void checkPurchases(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean purchased = prefs.getBoolean(KEY_NO_ADS, false);

        JSObject result = new JSObject();
        result.put("purchasedNoAds", purchased);
        call.resolve(result);
    }
}
