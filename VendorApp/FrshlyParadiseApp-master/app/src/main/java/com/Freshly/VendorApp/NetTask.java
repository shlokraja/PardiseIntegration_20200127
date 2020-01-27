package com.Freshly.VendorApp;

import android.os.AsyncTask;

import java.io.IOException;

public class NetTask extends AsyncTask<String, Integer, String>
{
    @Override
    protected String doInBackground(String... params)
    {
        int exitValue = -1;
        Runtime runtime = Runtime.getRuntime();
        try {
            Process ipProcess = runtime.exec("/system/bin/ping -c 1 8.8.8.8");
             exitValue = ipProcess.waitFor();

        } catch (IOException e){
            e.printStackTrace();
        } catch (InterruptedException e){
            e.printStackTrace();
        }

        return String.valueOf(exitValue);

    }
}