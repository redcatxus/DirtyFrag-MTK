package df.root;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.graphics.Color;
import android.graphics.Typeface;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.viewpager.widget.PagerAdapter;
import androidx.viewpager.widget.ViewPager;

import com.google.android.material.color.DynamicColors;
import com.google.android.material.color.MaterialColors;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.TextView;

import df.root.databinding.ActivityMainBinding;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends AppCompatActivity implements IReporter {

    private static final String TAG = "dfroot";
    private static final int REQUEST_SELECT_KSUD = 4108;
    private static final int REQUEST_SELECT_KO = 4109;
    private static final int REQUEST_SAVE_LOG = 4110;
    private static final long MAX_PAYLOAD_BYTES = 64L * 1024L * 1024L;
    private static final Pattern KMI_PATTERN = Pattern.compile("^(\\d+)\\.(\\d+).*?(android\\d+)");
    private static final Pattern KERNEL_VERSION_PATTERN = Pattern.compile("^(\\d+)\\.(\\d+)");
    private static final Pattern KMI_VERSION_PATTERN = Pattern.compile("^android\\d+-(\\d+\\.\\d+)$");
    private static final String PREF_SELECTED_KO = ExploitRunner.PREF_SELECTED_BUNDLED_KO_KMI;
    private static final String AUTO_KO = ExploitRunner.AUTO_BUNDLED_KO;
    private static final String[] BUNDLED_KMIS = {
            "android12-5.10", "android13-5.10", "android13-5.15", "android14-5.15",
            "android14-6.1", "android15-6.6", "android16-6.12", "android17-6.18"
    };

    private ActivityMainBinding binding;
    private final Handler mMain = new Handler(Looper.getMainLooper());
    private final Executor mExec = Executors.newSingleThreadExecutor();

    @Override
    public void report(String msg) {
        Log.i(TAG, msg.trim());
        mMain.post(() -> {
            boolean followTail = !binding.outputScroll.canScrollVertically(1);
            binding.outputView.append(msg);
            if (followTail) {
                binding.outputScroll.post(() -> binding.outputScroll.fullScroll(View.FOCUS_DOWN));
            }
        });
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Theme initialization (Light, Dark, and pure-black AMOLED with Material You)
        SharedPreferences themePrefs = getSharedPreferences("theme_prefs", MODE_PRIVATE);
        String themeMode = themePrefs.getString("theme_mode", null);
        boolean amoled = themePrefs.getBoolean("theme_amoled", false);

        if ("light".equals(themeMode)) {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        } else if ("dark".equals(themeMode)) {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
        }

        // Always apply DynamicColors (Material You) on Android 12+ so dynamic tokens are active
        DynamicColors.applyToActivityIfAvailable(this);

        int currentNightMode = getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
        boolean isNight = (currentNightMode == android.content.res.Configuration.UI_MODE_NIGHT_YES);

        if (isNight && amoled) {
            getTheme().applyStyle(R.style.ThemeOverlay_DirtyFrag_Amoled, true);
        }

        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        setSupportActionBar(binding.toolbar);

        if (isNight && amoled) {
            binding.getRoot().setBackgroundColor(Color.BLACK);
            binding.appBarLayout.setBackgroundColor(Color.BLACK);
            binding.toolbar.setBackgroundColor(Color.BLACK);
            getWindow().getDecorView().setBackgroundColor(Color.BLACK);
        }

        // Configure theme toggle button on top right next to label
        binding.btnThemeToggle.setIconResource(isNight ? R.drawable.ic_dark_mode_24 : R.drawable.ic_light_mode_24);
        binding.btnThemeToggle.setOnClickListener(v -> showThemeDialog());

        // Keep long-press selection enabled for copying log lines. LogScrollView
        // separates a real vertical drag from a long press so the outer page
        // does not steal the gesture.
        binding.outputScroll.setNestedScrollingEnabled(false);

        // Make both screens (Home and Settings) scrollable / swipeable between one another
        binding.viewPager.setAdapter(new PagerAdapter() {
            @Override
            public int getCount() {
                return 2;
            }

            @Override
            public boolean isViewFromObject(@NonNull View view, @NonNull Object object) {
                return view == object;
            }

            @NonNull
            @Override
            public Object instantiateItem(@NonNull ViewGroup container, int position) {
                return position == 0 ? binding.homeScroll : binding.settingsScroll;
            }

            @Override
            public void destroyItem(@NonNull ViewGroup container, int position, @NonNull Object object) {
                // Persistent views: do not destroy or remove
            }
        });

        // Measure initial natural text widths for exact 1:1 scroll synchronization
        ensureTextWidths();

        // Sync ViewPager swipe gestures in real time with the floating pill tabs
        binding.viewPager.addOnPageChangeListener(new ViewPager.OnPageChangeListener() {
            @Override
            public void onPageScrolled(int position, float positionOffset, int positionOffsetPixels) {
                updateNavTabScroll(position, positionOffset);
            }

            @Override
            public void onPageSelected(int position) {
                // Do not update tab scroll here: onPageSelected is called at 50% midpoint
                // during swipes and at the start of setCurrentItem, which breaks the fluid animation.
                // The visual sync is driven continuously by onPageScrolled and finalized on SCROLL_STATE_IDLE.
            }

            @Override
            public void onPageScrollStateChanged(int state) {
                if (state == ViewPager.SCROLL_STATE_IDLE) {
                    updateNavTabScroll(binding.viewPager.getCurrentItem(), 0f);
                }
            }
        });

        // Tab click listeners drive smooth page scroll, which naturally drives the landing animation
        binding.tabHomePill.setOnClickListener(v -> binding.viewPager.setCurrentItem(0, true));
        binding.tabSettingsPill.setOnClickListener(v -> binding.viewPager.setCurrentItem(1, true));

        // Initial landing state
        updateNavTabScroll(0, 0f);

        // Run log action buttons (Copy, Share, Save as file, Clear)
        binding.btnCopyLogs.setOnClickListener(v -> copyLogsToClipboard());
        binding.btnShareLogs.setOnClickListener(v -> shareLogs());
        binding.btnSaveLogs.setOnClickListener(v -> saveLogsAsFile());
        binding.btnClearLogs.setOnClickListener(v -> clearLogs());

        updateDeviceProfile();
        updateKsudMode();
        updateKoMode();
        updateVendorTargetsUi();
        binding.btnSelectKsud.setOnClickListener(v -> selectPayload(REQUEST_SELECT_KSUD));
        binding.btnUseManagerKsud.setOnClickListener(v -> useManagerKsud());
        binding.btnSelectKo.setOnClickListener(v -> selectPayload(REQUEST_SELECT_KO));
        binding.btnUseBundledKo.setOnClickListener(v -> useBundledKo());
        binding.btnSaveVendorTargets.setOnClickListener(v -> saveVendorTargets());
        binding.btnResetVendorTargets.setOnClickListener(v -> resetVendorTargets());
        binding.btnOpenKoDialog.setOnClickListener(v -> showKoSelectionDialog());
        binding.githubLink.setOnClickListener(v -> openGithub());

        binding.btnRun.setOnClickListener(v -> {
            binding.btnRun.setEnabled(false);
            binding.outputView.setText("");
            mExec.execute(this::runExploit);
        });
    }

    private int mHomeTextWidth = -1;
    private int mSettingsTextWidth = -1;
    private final android.animation.ArgbEvaluator mArgbEvaluator = new android.animation.ArgbEvaluator();

    private void ensureTextWidths() {
        if (binding == null) return;
        float density = getResources().getDisplayMetrics().density;
        if (mHomeTextWidth <= 0 && binding.tabHomeText != null) {
            float textWidth = binding.tabHomeText.getPaint().measureText(binding.tabHomeText.getText().toString());
            mHomeTextWidth = Math.round(textWidth + 2 * density);
        }
        if (mSettingsTextWidth <= 0 && binding.tabSettingsText != null) {
            float textWidth = binding.tabSettingsText.getPaint().measureText(binding.tabSettingsText.getText().toString());
            mSettingsTextWidth = Math.round(textWidth + 2 * density);
        }
    }

    private void updateNavTabScroll(int position, float positionOffset) {
        ensureTextWidths();

        // Calculate smooth fraction between 0.0 (Home) and 1.0 (Settings)
        float fraction = position + positionOffset;
        fraction = Math.max(0f, Math.min(1f, fraction));

        float homeProgress = 1f - fraction;
        float settingsProgress = fraction;

        int activeContainer = MaterialColors.getColor(this,
                com.google.android.material.R.attr.colorSecondaryContainer, Color.DKGRAY);
        int onActiveContainer = MaterialColors.getColor(this,
                com.google.android.material.R.attr.colorOnSecondaryContainer, Color.WHITE);
        int onSurfaceVariant = MaterialColors.getColor(this,
                com.google.android.material.R.attr.colorOnSurfaceVariant, Color.LTGRAY);

        // Interpolate background colors
        int homeBg = (Integer) mArgbEvaluator.evaluate(homeProgress, Color.TRANSPARENT, activeContainer);
        binding.tabHomePill.setCardBackgroundColor(homeBg);

        int settingsBg = (Integer) mArgbEvaluator.evaluate(settingsProgress, Color.TRANSPARENT, activeContainer);
        binding.tabSettingsPill.setCardBackgroundColor(settingsBg);

        // Interpolate foreground (icon and text) colors
        int homeFg = (Integer) mArgbEvaluator.evaluate(homeProgress, onSurfaceVariant, onActiveContainer);
        binding.tabHomeIcon.setColorFilter(homeFg);
        binding.tabHomeText.setTextColor(homeFg);

        int settingsFg = (Integer) mArgbEvaluator.evaluate(settingsProgress, onSurfaceVariant, onActiveContainer);
        binding.tabSettingsIcon.setColorFilter(settingsFg);
        binding.tabSettingsText.setTextColor(settingsFg);

        // Interpolate text widths and left margins in exact synchronization with page movement
        float density = getResources().getDisplayMetrics().density;
        int maxMargin = Math.round(8 * density);

        if (mHomeTextWidth > 0) {
            int homeWidth = Math.round(mHomeTextWidth * homeProgress);
            int homeMargin = Math.round(maxMargin * homeProgress);
            LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) binding.tabHomeText.getLayoutParams();
            if (lp.width != homeWidth || lp.leftMargin != homeMargin) {
                lp.width = homeWidth;
                lp.leftMargin = homeMargin;
                lp.setMarginStart(homeMargin);
                binding.tabHomeText.setLayoutParams(lp);
            }
            float homeAlpha = Math.max(0f, Math.min(1f, (homeProgress - 0.15f) / 0.85f));
            binding.tabHomeText.setAlpha(homeAlpha);
            binding.tabHomeText.setVisibility(homeProgress > 0.01f ? View.VISIBLE : View.GONE);
        }

        if (mSettingsTextWidth > 0) {
            int settingsWidth = Math.round(mSettingsTextWidth * settingsProgress);
            int settingsMargin = Math.round(maxMargin * settingsProgress);
            LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) binding.tabSettingsText.getLayoutParams();
            if (lp.width != settingsWidth || lp.leftMargin != settingsMargin) {
                lp.width = settingsWidth;
                lp.leftMargin = settingsMargin;
                lp.setMarginStart(settingsMargin);
                binding.tabSettingsText.setLayoutParams(lp);
            }
            float settingsAlpha = Math.max(0f, Math.min(1f, (settingsProgress - 0.15f) / 0.85f));
            binding.tabSettingsText.setAlpha(settingsAlpha);
            binding.tabSettingsText.setVisibility(settingsProgress > 0.01f ? View.VISIBLE : View.GONE);
        }
    }

    private void copyLogsToClipboard() {
        CharSequence text = binding.outputView.getText();
        if (text == null || text.length() == 0) {
            Toast.makeText(this, "Log is empty", Toast.LENGTH_SHORT).show();
            return;
        }
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) {
            cm.setPrimaryClip(ClipData.newPlainText("DirtyFrag Run Log", text));
            Toast.makeText(this, "Log copied to clipboard", Toast.LENGTH_SHORT).show();
        }
    }

    private void shareLogs() {
        CharSequence text = binding.outputView.getText();
        if (text == null || text.length() == 0) {
            Toast.makeText(this, "Log is empty", Toast.LENGTH_SHORT).show();
            return;
        }
        Intent shareIntent = new Intent(Intent.ACTION_SEND);
        shareIntent.setType("text/plain");
        shareIntent.putExtra(Intent.EXTRA_SUBJECT, "DirtyFrag Run Log");
        shareIntent.putExtra(Intent.EXTRA_TEXT, text.toString());
        startActivity(Intent.createChooser(shareIntent, "Share Run Log"));
    }

    private void saveLogsAsFile() {
        CharSequence text = binding.outputView.getText();
        if (text == null || text.length() == 0) {
            Toast.makeText(this, "Log is empty", Toast.LENGTH_SHORT).show();
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TITLE, "dirtyfrag-log.txt");
        try {
            startActivityForResult(intent, REQUEST_SAVE_LOG);
        } catch (Exception e) {
            // Fallback: save to app external files dir
            try {
                File logDir = getExternalFilesDir(null);
                if (logDir == null) logDir = getFilesDir();
                File logFile = new File(logDir, "dirtyfrag-log.txt");
                try (FileOutputStream fos = new FileOutputStream(logFile)) {
                    fos.write(text.toString().getBytes(StandardCharsets.UTF_8));
                }
                Toast.makeText(this, "Saved to " + logFile.getAbsolutePath(), Toast.LENGTH_LONG).show();
            } catch (Exception ex) {
                Toast.makeText(this, "Could not save log file", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void writeLogToUri(Uri uri) {
        CharSequence text = binding.outputView.getText();
        String content = text != null ? text.toString() : "";
        try (OutputStream os = getContentResolver().openOutputStream(uri)) {
            if (os != null) {
                os.write(content.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this, "Log saved successfully", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Log.e(TAG, "failed to save log", e);
            Toast.makeText(this, "Failed to save log: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void clearLogs() {
        binding.outputView.setText("");
        Toast.makeText(this, "Log cleared", Toast.LENGTH_SHORT).show();
    }

    private void selectPayload(int requestCode) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        try {
            startActivityForResult(intent, requestCode);
        } catch (Exception e) {
            Toast.makeText(this, "No file picker is available", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) return;

        if (requestCode == REQUEST_SAVE_LOG) {
            writeLogToUri(data.getData());
            return;
        }

        if (requestCode != REQUEST_SELECT_KSUD && requestCode != REQUEST_SELECT_KO) return;

        try {
            if (requestCode == REQUEST_SELECT_KSUD) importCustomKsud(data.getData());
            else importCustomKo(data.getData());
        } catch (Exception e) {
            Log.e(TAG, "payload import failed", e);
            Toast.makeText(this, "Could not use that file", Toast.LENGTH_LONG).show();
            report("payload import failed: " + e + "\n");
        }
    }

    private long copyToTemp(Uri source, File temp) throws IOException {
        long copied = 0;
        try (InputStream in = getContentResolver().openInputStream(source);
             FileOutputStream out = new FileOutputStream(temp)) {
            if (in == null) throw new IOException("file provider returned no data");
            byte[] buffer = new byte[8192];
            for (int n; (n = in.read(buffer)) != -1; ) {
                copied += n;
                if (copied > MAX_PAYLOAD_BYTES) throw new IOException("file is over 64 MiB");
                out.write(buffer, 0, n);
            }
        } catch (IOException e) {
            temp.delete();
            throw e;
        }
        if (copied == 0) {
            temp.delete();
            throw new IOException("selected file is empty");
        }
        return copied;
    }

    private static void replaceFile(File temp, File destination) throws IOException {
        if (destination.exists() && !destination.delete()) {
            temp.delete();
            throw new IOException("could not replace the previous file");
        }
        if (!temp.renameTo(destination)) {
            temp.delete();
            throw new IOException("could not stage selected file");
        }
    }

    private void importCustomKsud(Uri source) throws IOException {
        File dataDir = appDataDir();
        if (!dataDir.isDirectory() && !dataDir.mkdirs())
            throw new IOException("could not create app data directory");

        File customKsud = new File(dataDir, "ksud.custom");
        File tempKsud = new File(dataDir, "ksud.custom.tmp");
        copyToTemp(source, tempKsud);
        if (!isArm64Executable(tempKsud)) {
            tempKsud.delete();
            throw new IOException("choose an arm64 Android ksud executable or shell wrapper");
        }
        if (!tempKsud.setExecutable(true, false)) {
            tempKsud.delete();
            throw new IOException("could not mark ksud executable");
        }
        replaceFile(tempKsud, customKsud);

        String label = source.getLastPathSegment();
        if (label == null || label.isEmpty()) label = "custom file";
        getSharedPreferences("dfroot", MODE_PRIVATE)
                .edit().putString("custom_ksud_label", label).apply();
        updateKsudMode();
        report("custom ksud selected: " + label + "\n");
    }

    private void importCustomKo(Uri source) throws IOException {
        File dataDir = appDataDir();
        if (!dataDir.isDirectory() && !dataDir.mkdirs())
            throw new IOException("could not create app data directory");

        File customKo = ExploitRunner.customKoFile(this);
        File tempKo = new File(dataDir, "dirtyfrag.custom.ko.tmp");
        copyToTemp(source, tempKo);
        String label = displayName(source);
        if (!isDfRootKo(tempKo)) {
            tempKo.delete();
            throw new IOException("choose an arm64 DFRoot dirtyfrag.ko for kernel " + currentKmiLabel()
                    + " with matching kernel vermagic");
        }
        replaceFile(tempKo, customKo);

        getSharedPreferences("dfroot", MODE_PRIVATE)
                .edit().putString("custom_ko_label", label)
                .putString(PREF_SELECTED_KO, "custom").apply();
        updateKoMode();
        report("manual DFRoot module selected: " + label + " (kernel " + currentKmiLabel() + ")\n");
    }

    private static boolean isArm64Executable(File file) throws IOException {
        byte[] header = readHeader(file, 20);
        boolean arm64Elf = (header[0] & 0xff) == 0x7f
                && header[1] == 'E' && header[2] == 'L' && header[3] == 'F'
                && header[4] == 2 && header[5] == 1
                && (header[18] & 0xff) == 0xb7 && header[19] == 0;
        return arm64Elf || (header[0] == '#' && header[1] == '!');
    }

    private boolean isDfRootKo(File file) throws IOException {
        byte[] header = readHeader(file, 20);
        boolean arm64Relocatable = (header[0] & 0xff) == 0x7f
                && header[1] == 'E' && header[2] == 'L' && header[3] == 'F'
                && header[4] == 2 && header[5] == 1
                && header[16] == 1 && header[17] == 0
                && (header[18] & 0xff) == 0xb7 && header[19] == 0;
        String kernelVersion = currentKernelVersion();
        String kernelVermagicPrefix = kernelVersion == null
                ? null : "vermagic=" + kernelVersion + ".";
        return arm64Relocatable
                && containsAscii(file, "name=dirtyfrag")
                && containsAscii(file, "description=DFRoot LKM")
                && kernelVermagicPrefix != null
                && containsAscii(file, kernelVermagicPrefix);
    }

    private String displayName(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri,
                new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (column >= 0) {
                    String value = cursor.getString(column);
                    if (value != null && !value.isEmpty()) return value;
                }
            }
        } catch (Exception ignored) { }
        String fallback = uri.getLastPathSegment();
        return fallback == null || fallback.isEmpty() ? "custom module" : fallback;
    }

    private static byte[] readHeader(File file, int length) throws IOException {
        byte[] header = new byte[length];
        try (InputStream in = new FileInputStream(file)) {
            int offset = 0;
            while (offset < header.length) {
                int count = in.read(header, offset, header.length - offset);
                if (count < 0) throw new IOException("file is too short");
                offset += count;
            }
        }
        return header;
    }

    private static boolean containsAscii(File file, String text) throws IOException {
        byte[] needle = text.getBytes(StandardCharsets.US_ASCII);
        byte[] buffer = new byte[8192 + needle.length];
        int carry = 0;
        try (InputStream in = new FileInputStream(file)) {
            for (int read; (read = in.read(buffer, carry, 8192)) != -1; ) {
                int length = carry + read;
                for (int i = 0; i <= length - needle.length; i++) {
                    int j = 0;
                    while (j < needle.length && buffer[i + j] == needle[j]) j++;
                    if (j == needle.length) return true;
                }
                carry = Math.min(needle.length - 1, length);
                System.arraycopy(buffer, length - carry, buffer, 0, carry);
            }
        }
        return false;
    }

    private void useManagerKsud() {
        File customKsud = new File(appDataDir(), "ksud.custom");
        if (customKsud.exists() && !customKsud.delete()) {
            Toast.makeText(this, "Could not remove the custom ksud file", Toast.LENGTH_LONG).show();
            return;
        }
        getSharedPreferences("dfroot", MODE_PRIVATE).edit().remove("custom_ksud_label").apply();
        updateKsudMode();
        report("using automatic manager ksud selection (default)\n");
    }

    private void useBundledKo() {
        File customKo = ExploitRunner.customKoFile(this);
        if (customKo.exists() && !customKo.delete()) {
            Toast.makeText(this, "Could not remove the selected module", Toast.LENGTH_LONG).show();
            return;
        }
        getSharedPreferences("dfroot", MODE_PRIVATE).edit()
                .remove("custom_ko_label").putString(PREF_SELECTED_KO, AUTO_KO).apply();
        updateKoMode();
        report("using bundled DirtyFrag module selected by KMI (default)\n");
    }

    private void onKoSelection(int position) {
        File customKo = ExploitRunner.customKoFile(this);
        int customPosition = BUNDLED_KMIS.length + 1;
        if (customKo.isFile() && position == customPosition) return;

        String selectedKmi = position == 0 ? AUTO_KO : BUNDLED_KMIS[position - 1];
        if (!AUTO_KO.equals(selectedKmi) && !sameKernelVersion(selectedKmi, currentKmi())) {
            Toast.makeText(this, "That module targets a different kernel version. Selection unchanged.",
                    Toast.LENGTH_LONG).show();
            updateKoMode();
            return;
        }

        if (customKo.exists() && !customKo.delete()) {
            Toast.makeText(this, "Could not remove the selected custom module", Toast.LENGTH_LONG).show();
            updateKoMode();
            return;
        }
        getSharedPreferences("dfroot", MODE_PRIVATE).edit()
                .remove("custom_ko_label").putString(PREF_SELECTED_KO, selectedKmi).apply();
        updateKoMode();
        String actualKmi = AUTO_KO.equals(selectedKmi) ? resolvedAutoKmi() : selectedKmi;
        report(actualKmi == null
                ? "bundled module selection: no match for current kernel KMI " + currentKmiLabel() + "\n"
                : "bundled module selection: dirtyfrag-" + actualKmi + ".ko\n");
    }

    private void updateKsudMode() {
        File customKsud = new File(appDataDir(), "ksud.custom");
        String label = getSharedPreferences("dfroot", MODE_PRIVATE)
                .getString("custom_ksud_label", "custom file");
        binding.ksudMode.setText(customKsud.isFile()
                ? "Loader: custom ksud (" + label + ")"
                : "Loader: auto (KernelSU Manager → ReSukiSU Manager → system ksud)");
    }

    private void updateVendorTargetsUi() {
        String targets = ExploitRunner.getVendorTargets(this);
        binding.vendorTargetsInput.setText(targets);
        int count = targets.isEmpty() ? 0 : targets.split("\\R").length;
        binding.vendorTargetsStatus.setText(count + " target(s) configured; tried from top to bottom.");
    }

    private void saveVendorTargets() {
        String raw = binding.vendorTargetsInput.getText() == null
                ? "" : binding.vendorTargetsInput.getText().toString();
        String error = ExploitRunner.validateVendorTargets(raw);
        if (error != null) {
            binding.vendorTargetsLayout.setError(error);
            return;
        }
        String normalized = ExploitRunner.normalizeVendorTargets(raw);
        getSharedPreferences("dfroot", MODE_PRIVATE).edit()
                .putString(ExploitRunner.PREF_VENDOR_TARGETS, normalized).apply();
        binding.vendorTargetsLayout.setError(null);
        updateVendorTargetsUi();
        report("vendor target profile saved; it will be used on the next run\n");
        Toast.makeText(this, "Vendor target profile saved", Toast.LENGTH_SHORT).show();
    }

    private void resetVendorTargets() {
        getSharedPreferences("dfroot", MODE_PRIVATE).edit()
                .remove(ExploitRunner.PREF_VENDOR_TARGETS).apply();
        binding.vendorTargetsLayout.setError(null);
        updateVendorTargetsUi();
        report("vendor target profile reset to defaults\n");
        Toast.makeText(this, "Default vendor targets restored", Toast.LENGTH_SHORT).show();
    }

    private void updateKoMode() {
        File customKo = ExploitRunner.customKoFile(this);
        String label = getSharedPreferences("dfroot", MODE_PRIVATE)
                .getString("custom_ko_label", "custom module");
        if (customKo.isFile()) {
            binding.koMode.setText("Selected: custom DFRoot helper · " + label);
            binding.koGuidance.setText("Using your selected helper. For another kernel, build a DFRoot dirtyfrag.ko for that device's KMI, then select the file here.");
        } else {
            String selection = normalizedKoSelection();
            boolean automatic = AUTO_KO.equals(selection);
            String actualKmi = automatic ? resolvedAutoKmi() : selection;
            if (actualKmi == null) {
                binding.koMode.setText("No automatic bundle for KMI " + currentKmiLabel());
                binding.koGuidance.setText("This kernel does not expose an Android KMI in uname. Choose a matching arm64 DFRoot .ko manually, or build one for this kernel.");
            } else if (automatic && !actualKmi.equals(currentKmi())) {
                binding.koMode.setText("Selected: dirtyfrag-" + actualKmi + ".ko · fallback for " + currentKmiLabel());
                binding.koGuidance.setText("There is no exact bundled KMI match. Automatic mode uses this same-major/minor fallback; compatibility is unverified. Build an exact-KMI DFRoot helper and select it if needed.");
            } else {
                binding.koMode.setText("Selected: dirtyfrag-" + actualKmi + ".ko"
                        + (automatic ? " · automatic for " + currentKmi() : " · manual KMI " + actualKmi));
                binding.koGuidance.setText("Automatic mode uses the detected KMI. You can choose another bundled variant with the same kernel major/minor, or build and select a custom DFRoot helper. KMI alone does not prove full compatibility.");
            }
        }
        updateKoSelector();
        updateRunAvailability();
    }

    private void updateKoSelector() {
        File customKo = ExploitRunner.customKoFile(this);
        String autoKmi = resolvedAutoKmi();
        String selected = normalizedKoSelection();

        if (customKo.isFile()) {
            String label = getSharedPreferences("dfroot", MODE_PRIVATE)
                    .getString("custom_ko_label", "custom module");
            binding.koSelectedTitle.setText("Custom file · " + label);
        } else if (AUTO_KO.equals(selected)) {
            binding.koSelectedTitle.setText(autoKmi == null
                    ? "Automatic · no Android KMI match"
                    : "Automatic · dirtyfrag-" + autoKmi + ".ko"
                    + (autoKmi.equals(currentKmi()) ? "" : " (fallback)"));
        } else {
            binding.koSelectedTitle.setText("dirtyfrag-" + selected + ".ko");
        }
    }

    private void showKoSelectionDialog() {
        File customKo = ExploitRunner.customKoFile(this);
        String autoKmi = resolvedAutoKmi();
        String selected = normalizedKoSelection();

        View dialogView = getLayoutInflater().inflate(R.layout.dialog_ko_selection, null);
        LinearLayout listContainer = dialogView.findViewById(R.id.koOptionsList);

        int totalOptions = BUNDLED_KMIS.length + 1 + (customKo.isFile() ? 1 : 0);
        int currentPos = 0;
        if (customKo.isFile()) {
            currentPos = totalOptions - 1;
        } else if (!AUTO_KO.equals(selected)) {
            for (int i = 0; i < BUNDLED_KMIS.length; i++) {
                if (BUNDLED_KMIS[i].equals(selected)) {
                    currentPos = i + 1;
                    break;
                }
            }
        }

        final int[] selectedIndex = {currentPos};
        final RadioButton[] radioButtons = new RadioButton[totalOptions];

        int colorPrimary = MaterialColors.getColor(this, androidx.appcompat.R.attr.colorPrimary, Color.BLUE);
        int colorError = MaterialColors.getColor(this, androidx.appcompat.R.attr.colorError, Color.RED);
        int colorOnSurfaceVariant = MaterialColors.getColor(this, com.google.android.material.R.attr.colorOnSurfaceVariant, Color.GRAY);

        for (int i = 0; i < totalOptions; i++) {
            final int pos = i;
            View row = getLayoutInflater().inflate(R.layout.item_ko_option, listContainer, false);
            RadioButton radio = row.findViewById(R.id.itemRadio);
            TextView title = row.findViewById(R.id.itemTitle);
            TextView subtitle = row.findViewById(R.id.itemSubtitle);
            ImageView indicator = row.findViewById(R.id.itemIndicator);

            radioButtons[i] = radio;
            radio.setChecked(i == currentPos);

            if (i == 0) {
                // Automatic option
                title.setText(autoKmi == null
                        ? "Automatic · no match"
                        : "Automatic · dirtyfrag-" + autoKmi + ".ko");
                if (autoKmi == null) {
                    subtitle.setText("No Android KMI match found in uname");
                    subtitle.setTextColor(colorError);
                    indicator.setImageResource(R.drawable.ic_error_outline_24);
                    indicator.setColorFilter(colorError);
                } else if (autoKmi.equals(currentKmi())) {
                    subtitle.setText("Exact KMI match for kernel (" + autoKmi + ")");
                    subtitle.setTextColor(colorOnSurfaceVariant);
                    indicator.setImageResource(R.drawable.ic_check_circle_24);
                    indicator.setColorFilter(colorPrimary);
                } else {
                    boolean fallbackCompatible = sameKernelVersion(autoKmi, currentKmi());
                    if (fallbackCompatible) {
                        subtitle.setText("Fallback variant for " + currentKmiLabel());
                        subtitle.setTextColor(colorOnSurfaceVariant);
                        indicator.setImageResource(R.drawable.ic_check_circle_24);
                        indicator.setColorFilter(colorPrimary);
                    } else {
                        String modKernel = kernelVersion(autoKmi);
                        String devKernel = currentKernelVersion() != null ? currentKernelVersion() : "unknown";
                        subtitle.setText("Kernel mismatch (" + modKernel + " vs " + devKernel + ")");
                        subtitle.setTextColor(colorError);
                        indicator.setImageResource(R.drawable.ic_error_outline_24);
                        indicator.setColorFilter(colorError);
                    }
                }
            } else if (customKo.isFile() && i == totalOptions - 1) {
                // Custom file option
                String label = getSharedPreferences("dfroot", MODE_PRIVATE)
                        .getString("custom_ko_label", "custom module");
                title.setText("Custom file · " + label);
                subtitle.setText("Manual DFRoot helper loaded from storage");
                subtitle.setTextColor(colorOnSurfaceVariant);
                indicator.setImageResource(R.drawable.ic_check_circle_24);
                indicator.setColorFilter(colorPrimary);
            } else {
                // Bundled KMI option
                String kmi = BUNDLED_KMIS[i - 1];
                boolean compatible = sameKernelVersion(kmi, currentKmi());
                title.setText("dirtyfrag-" + kmi + ".ko");
                if (compatible) {
                    subtitle.setText("Matches kernel version (" + kernelVersion(kmi) + ")");
                    subtitle.setTextColor(colorOnSurfaceVariant);
                    indicator.setImageResource(R.drawable.ic_check_circle_24);
                    indicator.setColorFilter(colorPrimary);
                } else {
                    String modKernel = kernelVersion(kmi);
                    String devKernel = currentKernelVersion() != null ? currentKernelVersion() : "unknown";
                    subtitle.setText("Kernel mismatch (" + modKernel + " vs " + devKernel + ")");
                    subtitle.setTextColor(colorError);
                    // Exclamation mark indicating incompatibility
                    indicator.setImageResource(R.drawable.ic_error_outline_24);
                    indicator.setColorFilter(colorError);
                }
            }

            row.setOnClickListener(v -> {
                selectedIndex[0] = pos;
                for (int r = 0; r < totalOptions; r++) {
                    if (radioButtons[r] != null) radioButtons[r].setChecked(r == pos);
                }
            });

            listContainer.addView(row);
        }

        new MaterialAlertDialogBuilder(this)
                .setView(dialogView)
                .setNegativeButton("Cancel", (d, w) -> d.dismiss())
                .setPositiveButton("OK", (d, w) -> onKoSelection(selectedIndex[0]))
                .show();
    }

    private String normalizedKoSelection() {
        String selected = getSharedPreferences("dfroot", MODE_PRIVATE)
                .getString(PREF_SELECTED_KO, AUTO_KO);
        if (ExploitRunner.customKoFile(this).isFile() || AUTO_KO.equals(selected)) return selected;

        boolean known = false;
        for (String kmi : BUNDLED_KMIS) if (kmi.equals(selected)) known = true;
        if (known && sameKernelVersion(selected, currentKmi())) return selected;

        getSharedPreferences("dfroot", MODE_PRIVATE).edit()
                .putString(PREF_SELECTED_KO, AUTO_KO).apply();
        return AUTO_KO;
    }

    private String resolvedAutoKmi() {
        String deviceKmi = currentKmi();
        if (deviceKmi == null) return null;
        for (String kmi : BUNDLED_KMIS) if (kmi.equals(deviceKmi)) return kmi;
        String version = kernelVersion(deviceKmi);
        if (version == null) return null;
        for (String kmi : BUNDLED_KMIS) {
            if (version.equals(kernelVersion(kmi))) return kmi;
        }
        return null;
    }

    private static String kernelVersion(String kmi) {
        if (kmi == null) return null;
        Matcher matcher = KMI_VERSION_PATTERN.matcher(kmi);
        return matcher.matches() ? matcher.group(1) : null;
    }

    private static boolean sameKernelVersion(String firstKmi, String secondKmi) {
        String firstVersion = kernelVersion(firstKmi);
        String secondVersion = secondKmi == null ? currentKernelVersion() : kernelVersion(secondKmi);
        return firstVersion != null && firstVersion.equals(secondVersion);
    }

    private void updateRunAvailability() {
        String selected = normalizedKoSelection();
        boolean manualBundle = !AUTO_KO.equals(selected) && sameKernelVersion(selected, null);
        boolean hasModule = ExploitRunner.customKoFile(this).isFile()
                || resolvedAutoKmi() != null || manualBundle;
        binding.btnRun.setEnabled(hasModule && !new File("/dev/df").exists());
    }

    private void updateDeviceProfile() {
        String kernel = System.getProperty("os.version", "Unknown");
        String kmi = currentKmi();
        String soc = Build.SOC_MODEL;
        if (soc == null || soc.isEmpty() || "unknown".equalsIgnoreCase(soc)) soc = "Unknown";
        String kmiLabel = kmi == null
                ? "unrecognized (kernel " + currentKernelVersion() + ")"
                : kmi;
        binding.deviceDetails.setText("Brand: " + Build.MANUFACTURER + "\n"
                + "Model / device: " + Build.MODEL + " / " + Build.DEVICE + "\n"
                + "SoC: " + soc + "\n"
                + "Android: " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")\n"
                + "Security patch: " + Build.VERSION.SECURITY_PATCH + "\n"
                + "Kernel: " + kernel + "\n"
                + "KMI: " + kmiLabel);
    }

    private static String currentKmi() {
        String release = System.getProperty("os.version", "");
        Matcher matcher = KMI_PATTERN.matcher(release);
        if (!matcher.find()) return null;
        return matcher.group(3) + "-" + matcher.group(1) + "." + matcher.group(2);
    }

    private static String currentKernelVersion() {
        Matcher matcher = KERNEL_VERSION_PATTERN.matcher(System.getProperty("os.version", ""));
        return matcher.find() ? matcher.group(1) + "." + matcher.group(2) : null;
    }

    private static String currentKmiLabel() {
        String kmi = currentKmi();
        if (kmi != null) return kmi;
        String version = currentKernelVersion();
        return version == null ? "unknown" : "unknown-" + version;
    }

    private void showThemeDialog() {
        SharedPreferences themePrefs = getSharedPreferences("theme_prefs", MODE_PRIVATE);
        int uiNight = getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
        boolean isCurrentlyNight = (uiNight == android.content.res.Configuration.UI_MODE_NIGHT_YES);
        boolean currentAmoled = themePrefs.getBoolean("theme_amoled", false);

        View dialogView = getLayoutInflater().inflate(R.layout.dialog_theme_selection, null);
        AlertDialog dialog = new MaterialAlertDialogBuilder(this)
                .setView(dialogView)
                .create();
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        com.google.android.material.card.MaterialCardView cardLight = dialogView.findViewById(R.id.cardThemeLight);
        com.google.android.material.card.MaterialCardView cardDark = dialogView.findViewById(R.id.cardThemeDark);
        com.google.android.material.card.MaterialCardView cardAmoled = dialogView.findViewById(R.id.cardAmoledToggle);
        com.google.android.material.materialswitch.MaterialSwitch switchAmoled = dialogView.findViewById(R.id.switchAmoled);
        android.widget.Button btnConfirm = dialogView.findViewById(R.id.btnConfirmTheme);
        android.widget.Button btnCancel = dialogView.findViewById(R.id.btnCancelTheme);

        // Pending state: do NOT apply until user taps Confirm
        final boolean[] pendingIsDark = {isCurrentlyNight};
        final boolean[] pendingAmoled = {currentAmoled};

        Runnable updateDialogCards = () -> {
            int primary = MaterialColors.getColor(this, androidx.appcompat.R.attr.colorPrimary, Color.BLUE);
            int outlineVariant = MaterialColors.getColor(this, com.google.android.material.R.attr.colorOutlineVariant, Color.GRAY);
            int secondaryContainer = MaterialColors.getColor(this, com.google.android.material.R.attr.colorSecondaryContainer, Color.LTGRAY);
            int surfaceContainerHigh = MaterialColors.getColor(this, com.google.android.material.R.attr.colorSurfaceContainerHigh, Color.DKGRAY);
            int surfaceContainer = MaterialColors.getColor(this, com.google.android.material.R.attr.colorSurfaceContainer, Color.DKGRAY);
            int onSecondaryContainer = MaterialColors.getColor(this, com.google.android.material.R.attr.colorOnSecondaryContainer, Color.BLACK);
            int onSurfaceVariant = MaterialColors.getColor(this, com.google.android.material.R.attr.colorOnSurfaceVariant, Color.LTGRAY);

            float density = getResources().getDisplayMetrics().density;
            int activeStroke = Math.round(2 * density);
            int inactiveStroke = Math.round(1 * density);

            // Light Card
            if (!pendingIsDark[0]) {
                cardLight.setStrokeColor(primary);
                cardLight.setStrokeWidth(activeStroke);
                cardLight.setCardBackgroundColor(secondaryContainer);
                ((ImageView) dialogView.findViewById(R.id.iconThemeLight)).setColorFilter(onSecondaryContainer);
                ((TextView) dialogView.findViewById(R.id.textThemeLight)).setTextColor(onSecondaryContainer);
            } else {
                cardLight.setStrokeColor(outlineVariant);
                cardLight.setStrokeWidth(inactiveStroke);
                cardLight.setCardBackgroundColor(surfaceContainerHigh);
                ((ImageView) dialogView.findViewById(R.id.iconThemeLight)).setColorFilter(onSurfaceVariant);
                ((TextView) dialogView.findViewById(R.id.textThemeLight)).setTextColor(onSurfaceVariant);
            }

            // Dark Card
            if (pendingIsDark[0]) {
                cardDark.setStrokeColor(primary);
                cardDark.setStrokeWidth(activeStroke);
                cardDark.setCardBackgroundColor(secondaryContainer);
                ((ImageView) dialogView.findViewById(R.id.iconThemeDark)).setColorFilter(onSecondaryContainer);
                ((TextView) dialogView.findViewById(R.id.textThemeDark)).setTextColor(onSecondaryContainer);
            } else {
                cardDark.setStrokeColor(outlineVariant);
                cardDark.setStrokeWidth(inactiveStroke);
                cardDark.setCardBackgroundColor(surfaceContainerHigh);
                ((ImageView) dialogView.findViewById(R.id.iconThemeDark)).setColorFilter(onSurfaceVariant);
                ((TextView) dialogView.findViewById(R.id.textThemeDark)).setTextColor(onSurfaceVariant);
            }

            // AMOLED Card & Switch
            switchAmoled.setChecked(pendingAmoled[0]);
            if (pendingAmoled[0]) {
                cardAmoled.setStrokeColor(primary);
                cardAmoled.setStrokeWidth(activeStroke);
                cardAmoled.setCardBackgroundColor(surfaceContainer);
            } else {
                cardAmoled.setStrokeColor(outlineVariant);
                cardAmoled.setStrokeWidth(inactiveStroke);
                cardAmoled.setCardBackgroundColor(surfaceContainer);
            }
        };

        updateDialogCards.run();

        // Clicking options updates pending preview only
        cardLight.setOnClickListener(v -> {
            pendingIsDark[0] = false;
            pendingAmoled[0] = false;
            updateDialogCards.run();
        });

        cardDark.setOnClickListener(v -> {
            pendingIsDark[0] = true;
            updateDialogCards.run();
        });

        cardAmoled.setOnClickListener(v -> {
            boolean newState = !pendingAmoled[0];
            pendingAmoled[0] = newState;
            if (newState) {
                pendingIsDark[0] = true;
            }
            updateDialogCards.run();
        });

        if (btnCancel != null) {
            btnCancel.setOnClickListener(v -> dialog.dismiss());
        }

        // Only apply changes when the user taps Confirm
        if (btnConfirm != null) {
            btnConfirm.setOnClickListener(v -> {
                dialog.dismiss();
                applyThemeChoice(pendingIsDark[0], pendingAmoled[0]);
            });
        }

        dialog.show();
    }

    private void applyThemeChoice(boolean isDark, boolean isAmoled) {
        SharedPreferences themePrefs = getSharedPreferences("theme_prefs", MODE_PRIVATE);
        themePrefs.edit()
                .putString("theme_mode", isDark ? "dark" : "light")
                .putBoolean("theme_amoled", isAmoled)
                .apply();

        int targetMode = isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO;
        if (AppCompatDelegate.getDefaultNightMode() != targetMode) {
            AppCompatDelegate.setDefaultNightMode(targetMode);
        } else {
            recreate();
        }
    }

    private void openGithub() {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/redcatxus/DirtyFrag-MTK")));
        } catch (Exception e) {
            Toast.makeText(this, "No browser is available", Toast.LENGTH_LONG).show();
        }
    }

    private File appDataDir() {
        return createDeviceProtectedStorageContext().getFilesDir().getParentFile();
    }

    private void runExploit() {
        try {
            int rc = ExploitRunner.run(this, this);
            String msg = rc == 0 ? "DirtyFrag Android Root: SUCCESS"
                       : rc == 1 ? "FAILED: ksud exited with error"
                       : rc == 2 ? "FAILED: check logs"
                       : "FAILED: failed to patch files";
            mMain.post(() -> Toast.makeText(this, msg, Toast.LENGTH_LONG).show());
        } catch (Exception e) {
            Log.e(TAG, "exploit exception", e);
            report("\nexception: " + e + "\n");
        } finally {
            mMain.post(this::updateRunAvailability);
        }
    }
}
