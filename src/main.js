// ======================================
// IMPORTS
// ======================================


const {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    dialog

} = require("electron");
// =========================================================
// SVSS CLOUD SYNC COLLECTIONS
// =========================================================

//app.commandLine.appendSwitch("enable-gpu-rasterization");
//app.commandLine.appendSwitch("enable-zero-copy");

const path = require("path");
const fs = require("fs");
const SYNC_COLLECTIONS = [
    "businessSettings",
    "categories",
    "masterProducts",
    "products",
    "customers",
    "bills"
];
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

const {
    db,
    initDB,
    markLocalModified
} = require("./database");
const {
    saveToCloud,
    getFromCloud,
    deleteRecordsFromCloud
} = require("./cloud/cloudSync");
const {
    loginToCloud,
    logoutFromCloud,
    getCloudSession
} = require("./cloud/cloudAuth");


// ======================================
// GLOBALS
// ======================================

let win = null;
// ======================================
// SVSS CLOUD CONNECTIVITY CHECK
// ======================================

// =========================================================
// SVSS CLOUD Ã¢â‚¬â€ INTERNET CONNECTIVITY CHECK
// =========================================================
//
// We check the actual Supabase endpoint instead of relying
// only on DNS resolution.
//
// DNS can fail temporarily even when the internet is working.
// Since SVSS Cloud already uses Supabase, checking the
// Supabase project endpoint is a better connectivity test.
// =========================================================

async function isInternetAvailable() {

    try {

        const response = await fetch(
            "https://mkgjljszzgnncjgyuilp.supabase.co/rest/v1/",
            {
                method: "HEAD"
            }
        );

        // Any HTTP response means the network connection
        // itself is available.
        //
        // 401 / 404 / 405 can still mean the server was reached.
        // We only treat an actual network failure as offline.

        return true;

    } catch (error) {

        return false;

    }

}
// ======================================
// LOGGER
// ======================================

log.initialize();
log.transports.file.level = "debug";

autoUpdater.logger = log;

// ======================================
// DATABASE BACKUP
// ======================================

async function backupDatabase() {

    try {

        const userDataPath = app.getPath("userData");

        const databaseFolder = path.join(userDataPath, "database");

        const databaseFile = path.join(
            databaseFolder,
            "database.json"
        );

        if (!fs.existsSync(databaseFile)) {

            log.info("Database not found. Backup skipped.");

            return;

        }

        const backupFolder = path.join(
            databaseFolder,
            "backups"
        );

        if (!fs.existsSync(backupFolder)) {

            fs.mkdirSync(backupFolder, {
                recursive: true
            });

        }

        const now = new Date();

        const timestamp =
            now.getFullYear() + "-" +
            String(now.getMonth() + 1).padStart(2, "0") + "-" +
            String(now.getDate()).padStart(2, "0") + "_" +
            String(now.getHours()).padStart(2, "0") + "-" +
            String(now.getMinutes()).padStart(2, "0") + "-" +
            String(now.getSeconds()).padStart(2, "0");

        const backupFile = path.join(
            backupFolder,
            `database_backup_${timestamp}.json`
        );

        fs.copyFileSync(databaseFile, backupFile);

        log.info("Database backup created:");
        log.info(backupFile);

    } catch (err) {

        log.error("Database backup failed");
        log.error(err);

    }

}
// ======================================
// SAFE BACKUP BEFORE DATABASE SAVE
// ======================================

async function backupBeforeSave() {

    try {

        await backupDatabase();

    } catch (error) {

        log.error("Backup before save failed:");
        log.error(error);

    }

}

// ======================================
// AUTO UPDATE EVENTS
// ======================================

autoUpdater.on("checking-for-update", () => {

    log.info("Checking for updates...");

    // Silent background check
});

autoUpdater.on("update-available", (info) => {

    log.info("Update available");
    log.info(info);

    if (win && !win.isDestroyed()) {

        dialog.showMessageBox(win, {
            type: "info",
            title: "Update Available",
            message:
                `Version ${info.version} is available.\n\nDownloading now...`
        });

    }

});

autoUpdater.on("update-not-available", (info) => {

    log.info("No update available");
    log.info(info);

});

autoUpdater.on("download-progress", (progress) => {

    const percent = Math.round(progress.percent);

    log.info(`Downloading ${percent}%`);

    if (win && !win.isDestroyed()) {

        win.setProgressBar(percent / 100);

    }

});

autoUpdater.on("update-downloaded", async (info) => {

    log.info("Update downloaded");
    log.info(info);

    if (win && !win.isDestroyed()) {

        win.setProgressBar(-1);

    }

    if (!win || win.isDestroyed()) {

        return;

    }

    const result = await dialog.showMessageBox(win, {

        type: "question",

        buttons: [
            "Restart Now",
            "Later"
        ],

        defaultId: 0,

        cancelId: 1,

        title: "Update Ready",

        message:
            `Version ${info.version} has been downloaded.\n\nRestart now to install it?`

    });

    if (result.response === 0) {

        await backupDatabase();

        autoUpdater.quitAndInstall(false, true);

    }

});

autoUpdater.on("error", (err) => {

    log.error("AUTO UPDATE ERROR");
    log.error(err);

    if (win && !win.isDestroyed()) {

        dialog.showMessageBox(win, {

            type: "error",

            title: "Update Error",

            message: err.message

        });

    }

});

// ======================================
// APP VERSION
// ======================================

ipcMain.handle("get-app-version", () => {

    return app.getVersion();

});
// ======================================
// SUPABASE CLOUD AUTHENTICATION
// ======================================

ipcMain.handle(
    "cloud-login",
    async (event, email, password) => {

        try {

            email = String(email || '').trim();
            password = String(password || '');

            if (!email || !password) {

                throw new Error(
                    "SVSS Cloud: Cloud credentials are not configured."
                );

            }

            const result =
                await loginToCloud(
                    email,
                    password
                );

            log.info(
                "SVSS Cloud: Authentication successful."
            );

            return {
                success: true,
                userId: result.user.id,
                email: result.user.email
            };

        } catch (error) {

            log.warn(
                "SVSS Cloud: Authentication failed."
            );

            log.warn(error.message);

            return {
                success: false,
                error: error.message
            };

        }

    }
);

ipcMain.handle(
    "cloud-logout",
    async () => {

        try {

            await logoutFromCloud();

            log.info(
                "SVSS Cloud: Sign-out successful."
            );

            return {
                success: true
            };

        } catch (error) {

            log.warn(
                "SVSS Cloud: Sign-out failed."
            );

            return {
                success: false,
                error: error.message
            };

        }

    }
);

ipcMain.handle(
    "cloud-session",
    async () => {

        try {

            const session =
                await getCloudSession();

            return {
                authenticated: !!session,
                userId: session?.user?.id || null,
                email: session?.user?.email || null
            };

        } catch (error) {

            return {
                authenticated: false,
                error: error.message
            };

        }

    }
);

// ======================================
// APPLICATION MENU
// ======================================

function createAppMenu() {

    const template = [

        {
            label: "File",
            submenu: [

                {
                    label: "Exit",
                    accelerator: "Alt+F4",

                    click() {

                        app.quit();

                    }

                }

            ]
        },

        {
            label: "Help",
            submenu: [

                {
                    label: "Check for Updates",

                    async click() {

                        if (win && !win.isDestroyed()) {

                            dialog.showMessageBox(win, {

                                type: "info",

                                title: "SVSS Billing Software",

                                message: "Checking for updates..."

                            });

                        }

                        try {

                            setTimeout(async () => {
                            if (app.isPackaged) {
                                await autoUpdater.checkForUpdatesAndNotify();
                            }
                        }, 5000);

                        } catch (err) {

                            if (win && !win.isDestroyed()) {

                                dialog.showMessageBox(win, {

                                    type: "error",

                                    title: "Update Error",

                                    message: err.message

                                });

                            }

                        }

                    }

                },

                {
                    label: "About",

                    click() {

                        dialog.showMessageBox(win, {

                            type: "info",

                            title: "About",

                            message: "SVSS Billing Software",

                            detail:
                                `Version ${app.getVersion()}

Developed By

Sri Venkata Siva Sai Cloth & Matching Centre

Ã‚Â© 2026 SVSS`

                        });

                    }

                }

            ]

        }

    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

}
// ======================================
// CREATE WINDOW
// ======================================

async function createWindow() {

    console.time("Startup");

    win = new BrowserWindow({

        width: 1400,
        height: 900,

        resizable: true,
        maximizable: true,
        minimizable: true,

        frame: true,

        show: false,

        backgroundColor: "#07182f",

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }

    });

    await win.loadFile(
        path.join(__dirname, "../pages/login.html")
    );
    // Open maximized
    win.maximize();

    // Show only after the page is completely ready
    win.once("ready-to-show", () => {

        win.show();
        win.focus();

        console.log("4. Login window shown");

        console.timeEnd("Startup");

    });

}
setTimeout(() => {
    console.log("Resizable:", win.isResizable());
    console.log("Bounds:", win.getBounds());
}, 5000);


// ======================================
// WINDOW CLOSED
// ======================================

app.on("window-all-closed", () => {

    if (process.platform !== "darwin") {

        app.quit();

    }

});
// ======================================
// CLOUD SYNC METADATA
// ======================================

// =========================================================
// UPDATE LOCAL CLOUD SYNC METADATA
// =========================================================
//
// Stores the exact cloud updated_at value locally.
//
// IMPORTANT:
// This function MUST contain the db.write() call.
// Do not move await db.write() outside this function.
// =========================================================

async function updateCloudSyncMetadata(
    collection,
    cloudRecord
) {

    try {

        if (!collection) {

            throw new Error(
                "SVSS Cloud: Collection is required."
            );

        }

        if (!cloudRecord) {

            throw new Error(
                "SVSS Cloud: Cloud record is required."
            );

        }

        await db.read();

        // -------------------------------------------------
        // Make sure syncMeta exists
        // -------------------------------------------------

        if (!db.data.syncMeta) {

            db.data.syncMeta = {};

        }

        // -------------------------------------------------
        // Make sure this collection has metadata
        // -------------------------------------------------

        if (!db.data.syncMeta[collection]) {

            db.data.syncMeta[collection] = {

                lastCloudUpdatedAt: null,

                localUpdatedAt: null,

                pendingSync: false

            };

        }

        // -------------------------------------------------
        // Store the exact cloud version
        // -------------------------------------------------

        db.data.syncMeta[collection]
            .lastCloudUpdatedAt =
                cloudRecord.updated_at || null;

        // -------------------------------------------------
        // Cloud version is now synchronized
        // -------------------------------------------------

        db.data.syncMeta[collection]
            .pendingSync = false;

        // -------------------------------------------------
        // Local modification timestamp is cleared
        // because the local change has now reached cloud.
        // -------------------------------------------------

        db.data.syncMeta[collection]
            .localUpdatedAt = null;

        // -------------------------------------------------
        // SAVE DATABASE
        // -------------------------------------------------

        await db.write();

        log.info(
            `SVSS Cloud: ${collection} sync metadata updated successfully.`
        );

        return true;

    } catch (error) {

        log.error(
            `SVSS Cloud: Failed to update sync metadata for ${collection}.`
        );

        log.error(error);

        throw error;

    }

}
// ======================================
// SVSS CLOUD
// OFFLINE Ã¢â€ â€™ ONLINE SYNC ENGINE
// ======================================

let cloudSyncRunning = false;
// =========================================================
// INDIVIDUAL DELETION DRY-RUN
// =========================================================
//
// READ-ONLY.
// This function only reads the local deletion queue
// and reports what would eventually be deleted.
// It does NOT contact Supabase.
// It does NOT modify the local database.
//
async function reportPendingIndividualDeletions() {

    await db.read();

    const deletionCollections = [
        "customers",
        "products",
        "masterProducts",
        "bills",
        "categories"
    ];

    let foundDeletions = false;

    for (const collectionName of deletionCollections) {

        const syncMeta =
            db.data?.syncMeta?.[collectionName];

        if (!syncMeta?.deletedRecords?.length) {
            continue;
        }

        foundDeletions = true;

        log.info(
            `SVSS Cloud: Pending individual deletions detected for ${collectionName}:`,
            syncMeta.deletedRecords.map(
                record => record.id
            )
        );
    }

    if (!foundDeletions) {

        log.info(
            "SVSS Cloud: No pending individual deletions detected."
        );

    }

}
// =========================================================
// PROCESS PENDING INDIVIDUAL DELETIONS
// =========================================================
//
// MODIFIES DATABASE:
// YES Ã¢â‚¬â€ modifies the Supabase JSON collection.
//
// LOCAL DATABASE:
// Only clears successfully processed deletion queue entries.
//
// IMPORTANT:
// A failed deletion remains queued.
// =========================================================

async function processPendingIndividualDeletions() {

    const deletionCollections = [
        "customers",
        "products",
        "masterProducts",
        "bills",
        "categories"
    ];

    const results = {};

    try {

        await db.read();

        if (!db.data?.syncMeta) {
            return {
                success: true,
                results
            };
        }

        for (const collectionName of deletionCollections) {

            const meta =
                db.data.syncMeta[collectionName];

            if (!meta?.deletedRecords?.length) {
                continue;
            }

            const pendingDeletions =
                Array.isArray(meta.deletedRecords)
                    ? [...meta.deletedRecords]
                    : [];

            const recordIds =
                pendingDeletions
                    .map(record => record?.id)
                    .filter(Boolean);

            if (!recordIds.length) {
                continue;
            }

            log.info(
                `SVSS Cloud: Processing ${recordIds.length} pending deletion(s) for ${collectionName}.`
            );

            try {

                const expectedUpdatedAt =
                    meta.lastCloudUpdatedAt || null;

                const deletionResult =
                    await deleteRecordsFromCloud(
                        collectionName,
                        recordIds,
                        expectedUpdatedAt
                    );

                await db.read();

                const currentMeta =
                    db.data.syncMeta?.[collectionName];

                if (!currentMeta) {
                    continue;
                }

                const deletedIds =
                    new Set(
                        deletionResult.deletedIds || recordIds
                    );

                currentMeta.deletedRecords =
                    (
                        currentMeta.deletedRecords || []
                    ).filter(record =>
                        !deletedIds.has(record?.id)
                    );

                if (deletionResult.updated_at) {

                    currentMeta.lastCloudUpdatedAt =
                        deletionResult.updated_at;
                }

                /*
                 * DO NOT automatically clear pendingSync here.
                 *
                 * There may also be normal local changes
                 * waiting to synchronize.
                 */

                await db.write();

                results[collectionName] = {
                    success: true,
                    deletedCount:
                        deletionResult.deletedCount || 0
                };

                log.info(
                    `SVSS Cloud: Successfully processed ${collectionName} deletions.`
                );

            } catch (error) {

                results[collectionName] = {
                    success: false,
                    error: error.message,
                    code: error.code || null
                };

                /*
                 * IMPORTANT:
                 *
                 * Keep deletedRecords untouched.
                 * It will retry later.
                 */

                log.error(
                    `SVSS Cloud: Failed processing ${collectionName} deletions.`,
                    error
                );
            }
        }

        return {
            success: true,
            results
        };

    } catch (error) {

        log.error(
            "SVSS Cloud: Individual deletion processing failed.",
            error
        );

        return {
            success: false,
            error: error.message
        };
    }
}
async function synchronizePendingCollections() {

    // Prevent two sync processes running simultaneously
    if (cloudSyncRunning) {

    return;

    }

    cloudSyncRunning = true;

    try {

        // ======================================
        // CHECK INTERNET
        // ======================================

        const online = await isInternetAvailable();

        if (!online) {

            log.info(
                "SVSS Cloud: Internet unavailable. Pending synchronization postponed."
            );

            return;

        }

        // ======================================
        // CHECK CLOUD SESSION
        // ======================================

        let session = null;

        try {

            session = await getCloudSession();

        } catch (error) {

            log.warn(
                "SVSS Cloud: Unable to check cloud session."
            );

            log.warn(error.message);

            return;

        }

        // ======================================
        // AUTHENTICATE IF REQUIRED
        // ======================================

        if (!session) {

            log.info(
                "SVSS Cloud: No active session. Attempting cloud login..."
            );

            const email =
                process.env.SVSS_CLOUD_EMAIL;

            const password =
                process.env.SVSS_CLOUD_PASSWORD;

            if (!email || !password) {

                log.warn(
                    "SVSS Cloud: Cloud credentials are not configured."
                );

                return;

            }

            try {

                await loginToCloud(
                    email,
                    password
                );

                log.info(
                    "SVSS Cloud: Re-authentication successful."
                );

            } catch (error) {

                log.warn(
                    "SVSS Cloud: Re-authentication failed."
                );

                log.warn(error.message);

                return;

            }

        }

        // ======================================
        // READ LOCAL DATABASE
        // ======================================

        await db.read();

        if (!db.data) {

            return;

        }

        if (!db.data.syncMeta) {

            return;

        }
       // =========================================================
       // PROCESS INDIVIDUAL DELETIONS FIRST
       // =========================================================
       //
       // IMPORTANT:
       // Deletion processing is intentionally kept separate
       // from normal collection synchronization.
       //
       // DO NOT put the global safety guard before this.
       // =========================================================
       
       const deletionResults =
           await processPendingIndividualDeletions();
       
       log.info(
           "SVSS Cloud: Individual deletion processing completed.",
           deletionResults
       );
       
       // ======================================
       // SAFETY GUARD FOR NORMAL COLLECTION SYNC
       // ======================================
       //
       // During testing, normal cloud synchronization remains
       // disabled unless a specific test collection is selected.
       //
       // Example:
       // SVSS_DISABLE_CLOUD_SYNC_TEST=true
       // SVSS_CLOUD_SYNC_TEST_COLLECTION=customers
       //
       // This allows a controlled single-collection test.
       //
       
       const cloudSyncTestCollection =
           process.env.SVSS_CLOUD_SYNC_TEST_COLLECTION?.trim();
       
       if (
           process.env.SVSS_DISABLE_CLOUD_SYNC_TEST === "true" &&
           !cloudSyncTestCollection
       ) {
       
           log.warn(
               "SVSS Cloud: Normal cloud synchronization disabled for testing."
           );
       
           return;
       }
       
       if (cloudSyncTestCollection) {
       
           log.warn(
               `SVSS Cloud: Controlled sync test enabled for collection: ${cloudSyncTestCollection}`
           );
       
       }
        
        log.info(
            "SVSS Cloud: Individual deletion processing completed.",
            deletionResults
        );
        // ======================================
        // COLLECTION CONFIGURATION
        // ======================================

        const collections = [

            {
                name: "businessSettings",
                cloudId: "SVSS_BUSINESS_SETTINGS",
                dataKey: "settings"
            },

            {
                name: "categories",
                cloudId: "SVSS_CATEGORIES_COLLECTION",
                dataKey: "categories"
            },

            {
                name: "masterProducts",
                cloudId: "SVSS_MASTER_PRODUCTS_COLLECTION",
                dataKey: "masterProducts"
            },

            {
                name: "products",
                cloudId: "SVSS_PRODUCTS_COLLECTION",
                dataKey: "products"
            },

            {
                name: "customers",
                cloudId: "SVSS_CUSTOMERS_COLLECTION",
                dataKey: "customers"
            },

            {
                name: "bills",
                cloudId: "SVSS_BILLS_COLLECTION",
                dataKey: "bills"
            }

        ];

        // ======================================
        // PROCESS PENDING COLLECTIONS
        // ======================================

        for (const collection of collections) {

    // ======================================
    // CONTROLLED SINGLE-COLLECTION TEST
    // ======================================

    if (
        cloudSyncTestCollection &&
        collection.name !== cloudSyncTestCollection
    ) {

        log.info(
            `SVSS Cloud: Skipping ${collection.name} during controlled sync test.`
        );

        continue;
    }

    const meta =
        db.data.syncMeta[collection.name];

            if (!meta) {

                continue;

            }

            if (!meta.pendingSync) {

                continue;

            }

            log.info(
                `SVSS Cloud: Pending ${collection.name} synchronization detected.`
            );

            try {

                await db.read();

                const currentMeta =
                    db.data.syncMeta?.[collection.name];

                if (!currentMeta?.pendingSync) {

                    continue;

                }

                // ======================================
// SKIP COLLECTION IF DELETIONS REMAIN
// ======================================

if (
    collection.name !== "businessSettings" &&
    Array.isArray(currentMeta.deletedRecords) &&
    currentMeta.deletedRecords.length > 0
) {

    log.warn(
        `SVSS Cloud: Skipping normal ${collection.name} sync because deletion queue is not empty.`
    );

    continue;
}

// ======================================
// BUSINESS SETTINGS
// ======================================

if (collection.name === "businessSettings") {

    const localSettings =
        db.data.settings || {};

    const expectedUpdatedAt =
        currentMeta.lastCloudUpdatedAt || null;

    const cloudRecord =
        await saveToCloud(
            collection.name,
            collection.cloudId,
            {
                [collection.dataKey]:
                    localSettings
            },
            expectedUpdatedAt
        );

    await updateCloudSyncMetadata(
        collection.name,
        cloudRecord
    );

    continue;
}

// ======================================
// READ CURRENT CLOUD CONTAINER
// ======================================
//
// READ-ONLY
//

const cloudRows =
    await getFromCloud(
        collection.name,
        collection.cloudId
    );

if (!cloudRows.length) {

    throw new Error(
        `SVSS Cloud: ${collection.name} cloud container not found.`
    );
}

const cloudRow =
    cloudRows[0];

const cloudData =
    cloudRow.data || {};

const cloudCollection =
    Array.isArray(
        cloudData[collection.dataKey]
    )
        ? cloudData[collection.dataKey]
        : [];

// ======================================
// VERIFY CLOUD VERSION
// ======================================
//
// IMPORTANT:
// A changed cloud timestamp does NOT automatically
// mean the records conflict.
//
// We must compare the actual records first.
//

const expectedUpdatedAt =
    currentMeta.lastCloudUpdatedAt || null;

const cloudVersionChanged =
    !!(
        expectedUpdatedAt &&
        cloudRow.updated_at !== expectedUpdatedAt
    );

if (cloudVersionChanged) {

    log.warn(
        `SVSS Cloud: Cloud version changed for ${collection.name}. ` +
        `Previous=${expectedUpdatedAt} ` +
        `Current=${cloudRow.updated_at}`
    );

}

// ======================================
// LOCAL DATA
// ======================================

const localData =
    Array.isArray(
        db.data[collection.name]
    )
        ? db.data[collection.name]
        : [];

// ======================================
// ID FIELD
// ======================================

const idFieldMap = {

    customers: "customerId",

    products: "code",

    bills: "billNo",

    categories: "id",

    masterProducts: "id"

};

const idField =
    idFieldMap[collection.name];

if (!idField) {

    throw new Error(
        `SVSS Cloud: Unknown ID field for ${collection.name}.`
    );
}

// ======================================
// CONFLICT-SAFE MERGE
// ======================================
//
// Rules:
//
// 1. Cloud-only records are preserved.
// 2. Local-only records are added.
// 3. Same ID + identical record = safe.
// 4. Same ID + different record = CONFLICT.
// 5. Conflicting records are NOT overwritten.
//
// This prevents Local from silently replacing
// changed Production records.
//

const mergedMap = new Map();

const conflicts = [];

// --------------------------------------
// First: keep everything currently in Cloud
// --------------------------------------

for (const record of cloudCollection) {

    const id = record?.[idField];

    if (!id) {
        continue;
    }

    mergedMap.set(
        String(id),
        record
    );
}

// --------------------------------------
// Then inspect Local records
// --------------------------------------

for (const record of localData) {

    const id = record?.[idField];

    if (!id) {
        continue;
    }

    const key = String(id);

    const cloudRecord =
        mergedMap.get(key);

    // ----------------------------------
    // LOCAL-ONLY RECORD
    // ----------------------------------

    if (!cloudRecord) {

        mergedMap.set(
            key,
            record
        );

        continue;
    }

    // ----------------------------------
    // CLOUD VERSION DID NOT CHANGE
    // ----------------------------------
    //
    // The cloud is still the version that
    // this local database last synchronized with.
    //
    // Therefore a local modification is allowed.
    //

    if (!cloudVersionChanged) {

        mergedMap.set(
            key,
            record
        );

        continue;
    }

    // ----------------------------------
    // CLOUD VERSION CHANGED
    // ----------------------------------
    //
    // Now we must compare the actual records.
    //

    const cloudJson =
        JSON.stringify(cloudRecord);

    const localJson =
        JSON.stringify(record);

    // Same record Ã¢â€ â€™ safe
    if (cloudJson === localJson) {
        continue;
    }

    // Same ID + different content
    // = REAL RECORD CONFLICT
    conflicts.push({
        id: key,
        cloudRecord,
        localRecord: record
    });
}

// --------------------------------------
// STOP BEFORE PRODUCTION WRITE
// --------------------------------------

if (conflicts.length > 0) {

    log.error(
        `SVSS Cloud: ${collection.name} has ${conflicts.length} record-level conflict(s).`
    );

    for (const conflict of conflicts) {

        log.error(
            `SVSS Cloud: Record conflict in ${collection.name}: ${conflict.id}`
        );
    }

    throw new Error(
        `CLOUD_RECORD_CONFLICT:${collection.name}:${conflicts.length}`
    );
}

const mergedData =
    Array.from(
        mergedMap.values()
    );
    // ======================================
    // SAVE MERGED COLLECTION
    // ======================================
    //
    // MODIFIES PRODUCTION DATABASE
    //
    // This is safe because cloud-only records
    // have already been preserved.
    //
    
    const cloudRecord =
    await saveToCloud(
        collection.name,
        collection.cloudId,
        {
            [collection.dataKey]:
                mergedData
        },
        cloudRow.updated_at
    );

     // ======================================
     // UPDATE LOCAL VERSION
     // ======================================
     
     await updateCloudSyncMetadata(
         collection.name,
         cloudRecord
     );
     
     log.info(
         `SVSS Cloud: Safe merged synchronization completed for ${collection.name}. ` +
         `Cloud before=${cloudCollection.length}, ` +
         `Local=${localData.length}, ` +
         `Merged=${mergedData.length}`
     );


                log.info(
                    `SVSS Cloud: Pending ${collection.name} synchronized successfully.`
                );

            } catch (error) {

                // ======================================
                // CLOUD CONFLICT
                // ======================================

                if (error.code === "CLOUD_CONFLICT") {

                    log.warn(
                        `SVSS Cloud: Conflict detected for ${collection.name}.`
                    );

                    log.warn(
                        error.message
                    );

                    // IMPORTANT:
                    // Keep pendingSync TRUE.
                    // We do NOT overwrite local data.
                    continue;

                }

                // ======================================
                // NETWORK / CLOUD FAILURE
                // ======================================

                log.warn(
                    `SVSS Cloud: Pending ${collection.name} synchronization failed.`
                );

                log.warn(
                    error.message
                );

                // Keep pendingSync TRUE.
                // It will retry later.

            }

        }

    } catch (error) {

        log.error(
            "SVSS Cloud: Pending synchronization engine failed."
        );

        log.error(error);

    } finally {

        cloudSyncRunning = false;

    }

}
// ======================================
// COMPLETE DATABASE
// ======================================

ipcMain.handle("get-database", async () => {

    await db.read();

    return db.data;

});
// ======================================
// CLOUD Ã¢â€ â€™ LOCAL DATABASE SYNC
// ======================================

ipcMain.handle("sync-from-cloud", async () => {

    try {

        log.info("SVSS Cloud: Starting Cloud Ã¢â€ â€™ Local synchronization...");

        // ======================================
        // BACKUP BEFORE CLOUD RESTORE
        // ======================================

        await backupBeforeSave();

        log.info(
            "SVSS Cloud: Local database backup created before restore."
        );

        // ======================================
        // READ CURRENT LOCAL DATABASE
        // ======================================

        await db.read();

        const localDatabase = db.data || {};
        // ======================================
// PROTECT UNSYNCHRONIZED LOCAL CHANGES
// ======================================

const pendingCollections =
    Object.entries(
        localDatabase.syncMeta || {}
    )
    .filter(
        ([collection, meta]) =>
            meta &&
            meta.pendingSync === true
    )
    .map(
        ([collection]) => collection
    );

if (pendingCollections.length > 0) {

    log.warn(
        "SVSS Cloud: Cloud Ã¢â€ â€™ Local synchronization skipped because local changes are pending."
    );

    log.warn(
        "SVSS Cloud: Pending collections:",
        pendingCollections
    );

    return {

        success: false,

        skipped: true,

        reason:
            "LOCAL_CHANGES_PENDING",

        pendingCollections

    };

}
        // ======================================
        // PRESERVE LOCAL LOGIN STATE
        // ======================================
        
        const localLoginState = {
            loggedIn: localDatabase.settings?.loggedIn || false,
            loggedUser: localDatabase.settings?.loggedUser || "",
            username: localDatabase.settings?.username || "",
            password: localDatabase.settings?.password || "",
            rememberMe: localDatabase.settings?.rememberMe || false,
            savedUsername: localDatabase.settings?.savedUsername || "",
            savedPassword: localDatabase.settings?.savedPassword || ""
        };

        // ======================================
        // DOWNLOAD CLOUD DATA
        // ======================================

        const cloudResults = {};

        const collections = [
            {
                name: "businessSettings",
                cloudId: "SVSS_BUSINESS_SETTINGS"
            },
            {
                name: "categories",
                cloudId: "SVSS_CATEGORIES_COLLECTION"
            },
            {
                name: "masterProducts",
                cloudId: "SVSS_MASTER_PRODUCTS_COLLECTION"
            },
            {
                name: "products",
                cloudId: "SVSS_PRODUCTS_COLLECTION"
            },
            {
                name: "customers",
                cloudId: "SVSS_CUSTOMERS_COLLECTION"
            },
            {
                name: "bills",
                cloudId: "SVSS_BILLS_COLLECTION"
            }
        ];

        // ======================================
        // GET EACH COLLECTION
        // ======================================

        for (const collection of collections) {

            try {

                const result = await getFromCloud(
                    collection.name,
                    collection.cloudId
                );

                cloudResults[collection.name] = result;

                log.info(
                    `SVSS Cloud: ${collection.name} downloaded successfully.`
                );

            } catch (error) {

                log.warn(
                    `SVSS Cloud: Failed to download ${collection.name}.`
                );

                log.warn(error.message);

                cloudResults[collection.name] = [];

            }

        }

        // ======================================
        // APPLY CLOUD DATA TO LOCAL DATABASE
        // ======================================

        // Business Settings
        if (
            cloudResults.businessSettings &&
            cloudResults.businessSettings.length > 0
        ) {

            const cloudRecord =
                cloudResults.businessSettings[0];

            if (
                cloudRecord.data &&
                cloudRecord.data.settings
            ) {

                const currentLoginState = {
                 loggedIn: localDatabase.settings?.loggedIn || false,
                 loggedUser: localDatabase.settings?.loggedUser || "",
                 rememberMe: localDatabase.settings?.rememberMe || false,
                 savedUsername: localDatabase.settings?.savedUsername || "",
                 savedPassword: localDatabase.settings?.savedPassword || ""
            };
            
            localDatabase.settings = {
                ...(localDatabase.settings || {}),
                ...cloudRecord.data.settings,
            
                // Preserve local authentication state
                loggedIn: currentLoginState.loggedIn,
                loggedUser: currentLoginState.loggedUser,
                rememberMe: currentLoginState.rememberMe,
                savedUsername: currentLoginState.savedUsername,
                savedPassword: currentLoginState.savedPassword
            };

            }

        }

        // Categories
        if (
            cloudResults.categories &&
            cloudResults.categories.length > 0
        ) {

            const cloudRecord =
                cloudResults.categories[0];

            if (
                cloudRecord.data &&
                Array.isArray(cloudRecord.data.categories)
            ) {

                localDatabase.categories =
                    cloudRecord.data.categories;

            }

        }

        // Master Products
        if (
            cloudResults.masterProducts &&
            cloudResults.masterProducts.length > 0
        ) {

            const cloudRecord =
                cloudResults.masterProducts[0];

            if (
                cloudRecord.data &&
                Array.isArray(cloudRecord.data.masterProducts)
            ) {

                localDatabase.masterProducts =
                    cloudRecord.data.masterProducts;

            }

        }

        // Products
        if (
            cloudResults.products &&
            cloudResults.products.length > 0
        ) {

            const cloudRecord =
                cloudResults.products[0];

            if (
                cloudRecord.data &&
                Array.isArray(cloudRecord.data.products)
            ) {

                localDatabase.products =
                    cloudRecord.data.products;

            }

        }

        // Customers
        if (
            cloudResults.customers &&
            cloudResults.customers.length > 0
        ) {

            const cloudRecord =
                cloudResults.customers[0];

            if (
                cloudRecord.data &&
                Array.isArray(cloudRecord.data.customers)
            ) {

                localDatabase.customers =
                    cloudRecord.data.customers;

            }

        }

        // Bills
        if (
            cloudResults.bills &&
            cloudResults.bills.length > 0
        ) {

            const cloudRecord =
                cloudResults.bills[0];

            if (
                cloudRecord.data &&
                Array.isArray(cloudRecord.data.bills)
            ) {

                localDatabase.bills =
                    cloudRecord.data.bills;

            }

        }
        // ======================================
// UPDATE CLOUD SYNC METADATA
// ======================================
//
// IMPORTANT:
// After downloading data from Supabase,
// remember the exact cloud version locally.
//
// This prevents false conflict errors when
// the user saves the downloaded data later.
// ======================================

if (!localDatabase.syncMeta) {

    localDatabase.syncMeta = {};

}

for (const collection of collections) {

    const cloudRecords =
        cloudResults[collection.name];

    if (
        cloudRecords &&
        cloudRecords.length > 0
    ) {

        const cloudRecord =
            cloudRecords[0];

        if (cloudRecord.updated_at) {

            if (!localDatabase.syncMeta[collection.name]) {

                localDatabase.syncMeta[collection.name] = {};

            }

            localDatabase.syncMeta[
                collection.name
            ].lastCloudUpdatedAt =
                cloudRecord.updated_at;


            // Cloud data has now been restored locally.
            // Clear stale synchronization status.
            localDatabase.syncMeta[
                collection.name
            ].pendingSync = false;

            localDatabase.syncMeta[
                collection.name
            ].localUpdatedAt = null;


            log.info(
                `SVSS Cloud: ${collection.name} cloud version recorded: ${cloudRecord.updated_at}`
            );

        }

    }

}
// ======================================
// PRESERVE LOCAL LOGIN STATE
// ======================================

// Cloud sync must NOT change the local login state.

if (localDatabase.settings) {

    localDatabase.settings.loggedIn =
        localLoginState.loggedIn;

    localDatabase.settings.loggedUser =
        localLoginState.loggedUser;

    localDatabase.settings.username =
        localLoginState.username;

    localDatabase.settings.password =
        localLoginState.password;

    localDatabase.settings.rememberMe =
        localLoginState.rememberMe;

    if (localLoginState.rememberMe === true) {
        localDatabase.settings.savedUsername =
            localLoginState.savedUsername;

        localDatabase.settings.savedPassword =
            localLoginState.savedPassword;
    } else {
        localDatabase.settings.savedUsername = "";
        localDatabase.settings.savedPassword = "";
    }

}
        // ======================================
        // SAVE RESTORED DATABASE LOCALLY
        // ======================================

        db.data = localDatabase;

        await db.write();

        log.info(
            "SVSS Cloud: Cloud Ã¢â€ â€™ Local synchronization completed successfully."
        );

        return {
            success: true,

            counts: {
                categories:
                    localDatabase.categories?.length || 0,

                masterProducts:
                    localDatabase.masterProducts?.length || 0,

                products:
                    localDatabase.products?.length || 0,

                customers:
                    localDatabase.customers?.length || 0,

                bills:
                    localDatabase.bills?.length || 0
            }

        };

    } catch (error) {

        log.error(
            "SVSS Cloud: Cloud Ã¢â€ â€™ Local synchronization failed."
        );

        log.error(error);

        return {
            success: false,
            error: error.message
        };

    }

});
// =========================================================
// SAVE COMPLETE DATABASE Ã¢â‚¬â€ LOCAL FIRST
// WITH DELETION TRACKING
// =========================================================
//
// IMPORTANT:
//
// This handler is used by older parts of the application
// that save the complete database.
//
// We compare the previous local database with the new
// database received from the renderer.
//
// Only records that disappeared are recorded as local
// deletions.
//
// This does NOT directly modify Supabase.
//
// =========================================================

ipcMain.handle(
    "save-database",
    async (event, database) => {

        try {

            if (!database) {

                throw new Error(
                    "SVSS: Database data is missing."
                );

            }

            // =================================================
            // READ CURRENT LOCAL DATABASE
            // =================================================

            await db.read();

            const previousDatabase =
                db.data || {};

            // =================================================
            // MAKE SURE SYNC METADATA EXISTS
            // =================================================

            if (!database.syncMeta) {

                database.syncMeta = {};

            }

            for (
                const collection of SYNC_COLLECTIONS
            ) {

                if (
                    !database.syncMeta[collection]
                ) {

                    database.syncMeta[collection] = {

                        lastCloudUpdatedAt:
                            previousDatabase
                                .syncMeta
                                ?.[
                                    collection
                                ]
                                ?.lastCloudUpdatedAt
                                || null,

                        localUpdatedAt:
                            previousDatabase
                                .syncMeta
                                ?.[
                                    collection
                                ]
                                ?.localUpdatedAt
                                || null,

                        pendingSync:
                            previousDatabase
                                .syncMeta
                                ?.[
                                    collection
                                ]
                                ?.pendingSync
                                || false,

                        deletedRecords: []

                    };

                }

                // Make sure the new deletion array exists.

                if (
                    !Array.isArray(
                        database
                            .syncMeta[
                                collection
                            ]
                            .deletedRecords
                    )
                ) {

                    database
                        .syncMeta[
                            collection
                        ]
                        .deletedRecords = [];

                }

            }

            // =================================================
            // IDENTIFIER FUNCTION
            // =================================================

            function getRecordId(
                collection,
                record
            ) {

                if (
                    !record ||
                    typeof record !== "object"
                ) {

                    return null;

                }

                // Customers
                if (
                    collection === "customers" &&
                    record.customerId
                ) {

                    return String(
                        record.customerId
                    );

                }

                // Products
                if (
                    collection === "products" &&
                    record.code
                ) {

                    return String(
                        record.code
                    );

                }

                // Bills
                if (
                    collection === "bills" &&
                    record.billNo
                ) {

                    return String(
                        record.billNo
                    );

                }

                // Master products
                if (
                    collection === "masterProducts" &&
                    record.id
                ) {

                    return String(
                        record.id
                    );

                }

                // Categories
                if (
                    collection === "categories" &&
                    record.id
                ) {

                    return String(
                        record.id
                    );

                }

                // Generic fallback
                if (record.id) {

                    return String(
                        record.id
                    );

                }

                return null;

            }

            // =================================================
            // DETECT LOCAL DELETIONS
            // =================================================

            const collectionsToCheck = [
                "customers",
                "products",
                "masterProducts",
                "bills",
                "categories"
            ];

            for (
                const collection
                of collectionsToCheck
            ) {

                const oldCollection =
                    Array.isArray(
                        previousDatabase[
                            collection
                        ]
                    )
                        ? previousDatabase[
                            collection
                        ]
                        : [];

                const newCollection =
                    Array.isArray(
                        database[
                            collection
                        ]
                    )
                        ? database[
                            collection
                        ]
                        : [];

                // ---------------------------------------------
                // Build OLD ID set
                // ---------------------------------------------

                const oldIds = new Set();

                for (
                    const record
                    of oldCollection
                ) {

                    const id =
                        getRecordId(
                            collection,
                            record
                        );

                    if (id) {

                        oldIds.add(id);

                    }

                }

                // ---------------------------------------------
                // Build NEW ID set
                // ---------------------------------------------

                const newIds = new Set();

                for (
                    const record
                    of newCollection
                ) {

                    const id =
                        getRecordId(
                            collection,
                            record
                        );

                    if (id) {

                        newIds.add(id);

                    }

                }

                // ---------------------------------------------
                // Find disappeared records
                // ---------------------------------------------

                for (
                    const oldId
                    of oldIds
                ) {

                    if (
                        !newIds.has(oldId)
                    ) {

                        const deletionList =
                            database
                                .syncMeta[
                                    collection
                                ]
                                .deletedRecords;

                        const alreadyTracked =
                            deletionList.some(
                                deletion =>
                                    String(
                                        deletion.id
                                    ) === oldId
                            );

                        if (
                            !alreadyTracked
                        ) {

                            deletionList.push({

                                id: oldId,

                                deletedAt:
                                    new Date()
                                        .toISOString()

                            });

                            log.info(
                                `SVSS Cloud: Local deletion recorded for ${collection}: ${oldId}`
                            );

                        }

                    }

                }

            }

            // =================================================
            // MARK COLLECTIONS THAT CHANGED
            // =================================================

            for (
                const collection
                of SYNC_COLLECTIONS
            ) {

                let previousValue;
                let newValue;

                if (collection === "businessSettings") {

                    const localOnlyAuthFields = [
                        "loggedIn",
                        "loggedUser",
                        "username",
                        "password",
                        "rememberMe",
                        "savedUsername",
                        "savedPassword"
                    ];

                    previousValue = {
                        ...(previousDatabase.settings || {})
                    };

                    newValue = {
                        ...(database.settings || {})
                    };

                    for (const field of localOnlyAuthFields) {
                        delete previousValue[field];
                        delete newValue[field];
                    }

                } else {

                    previousValue =
                        previousDatabase[collection];

                    newValue =
                        database[collection];

                }

                const previousJson =
                    JSON.stringify(
                        previousValue
                    );

                const newJson =
                    JSON.stringify(
                        newValue
                    );

                if (
                    previousJson !==
                    newJson
                ) {

                    database
                        .syncMeta[
                            collection
                        ]
                        .localUpdatedAt =
                            new Date()
                                .toISOString();

                    database
                        .syncMeta[
                            collection
                        ]
                        .pendingSync =
                            true;

                }

            }

            // =================================================
            // SAVE LOCALLY
            // =================================================

            db.data =
                database;

            await db.write();

            log.info(
                "SVSS: Complete local database saved successfully."
            );

            // =================================================
            // IMPORTANT
            //
            // We DO NOT trigger cloud synchronization here.
            //
            // The existing background synchronization engine
            // will handle pending collections.
            // =================================================

            return {

                success: true,

                localSaved: true,

                cloudPending: true

            };

        } catch (error) {

            log.error(
                "SVSS: Complete database save failed."
            );

            log.error(error);

            return {

                success: false,

                localSaved: false,

                error:
                    error.message

            };

        }

    }
);


// ======================================
// LOCAL-FIRST COLLECTION SAVE
// WITH DELETION TRACKING
// ======================================
//
// IMPORTANT:
//
// Local database remains the source of truth for the
// immediate save operation.
//
// Before replacing a collection, we compare the OLD
// collection with the NEW collection.
//
// If a record existed before but no longer exists,
// we record that record as a local deletion.
//
// This allows the future cloud-sync layer to know
// exactly which records were intentionally deleted.
//
// SUPABASE IS NOT MODIFIED BY THIS FUNCTION DIRECTLY.
// ======================================

async function saveCollectionLocalFirst(
    collection,
    data,
    options = {}
) {

    try {

        await db.read();

        const skipDeletionTracking =
            options.skipDeletionTracking === true;

        // ======================================
        // VALIDATE DATA
        // ======================================

        if (
            data === undefined ||
            data === null
        ) {

            throw new Error(
                `SVSS: Cannot save empty data for "${collection}".`
            );

        }

        // ======================================
        // GET OLD LOCAL DATA
        // ======================================

        let oldData;

        if (collection === "businessSettings") {

            oldData =
                db.data.settings || {};

        } else {

            oldData =
                Array.isArray(db.data[collection])
                    ? db.data[collection]
                    : [];

        }

        // ======================================
        // NORMALIZE NEW DATA
        // ======================================

        let newData;

        if (collection === "businessSettings") {

            newData =
                typeof data === "object"
                    ? data
                    : {};

        } else {

            newData =
                Array.isArray(data)
                    ? data
                    : [];

        }

        // ======================================
        // INITIALIZE DELETION TRACKING
        // ======================================

        if (!db.data.syncMeta) {

            db.data.syncMeta = {};

        }

        if (!db.data.syncMeta[collection]) {

            db.data.syncMeta[collection] = {

                lastCloudUpdatedAt: null,

                localUpdatedAt: null,

                pendingSync: false,

                deletedRecords: []

            };

        }

        const meta =
            db.data.syncMeta[collection];

        // ======================================
        // MAKE SURE DELETED RECORDS ARRAY EXISTS
        // ======================================

        if (!Array.isArray(meta.deletedRecords)) {

            meta.deletedRecords = [];

        }

        // ======================================
        // RECORD IDENTIFIER FUNCTION
        // ======================================

        function getRecordId(record) {

            if (!record || typeof record !== "object") {

                return null;

            }

            // Customers normally use customerId.
            if (
                collection === "customers" &&
                record.customerId
            ) {

                return String(record.customerId);

            }

            // Products normally use code.
            if (
                collection === "products" &&
                record.code
            ) {

                return String(record.code);

            }

            // Bills normally use billNo.
            if (
                collection === "bills" &&
                record.billNo
            ) {

                return String(record.billNo);

            }

            // Master products normally use id.
            if (
                collection === "masterProducts" &&
                record.id
            ) {

                return String(record.id);

            }

            // Categories normally use id.
            if (
                collection === "categories" &&
                record.id
            ) {

                return String(record.id);

            }

            // Generic fallback.
            if (record.id) {

                return String(record.id);

            }

            return null;

        }

        // ======================================
        // DETECT DELETED RECORDS
        // ======================================

        if (
             collection !== "businessSettings" &&
             !skipDeletionTracking
         ) {
         
             const oldIds = new Set();

            for (const record of oldData) {

                const recordId =
                    getRecordId(record);

                if (recordId) {

                    oldIds.add(recordId);

                }

            }

            const newIds = new Set();

            for (const record of newData) {

                const recordId =
                    getRecordId(record);

                if (recordId) {

                    newIds.add(recordId);

                }

            }

            // ==================================
            // FIND RECORDS THAT DISAPPEARED
            // ==================================

            for (const oldId of oldIds) {

                if (!newIds.has(oldId)) {

                    // Do not add the same deletion twice.
                    const alreadyTracked =
                        meta.deletedRecords.some(
                            deletion =>
                                String(
                                    deletion.id
                                ) === oldId
                        );

                    if (!alreadyTracked) {

                        meta.deletedRecords.push({

                            id: oldId,

                            deletedAt:
                                new Date().toISOString()

                        });

                        log.info(
                            `SVSS Cloud: Local deletion recorded for ${collection}: ${oldId}`
                        );

                    }

                }

            }

        }

        // ======================================
        // SAVE NEW LOCAL DATA
        // ======================================

        switch (collection) {

            case "products":

                db.data.products =
                    newData;

                break;


            case "customers":

                db.data.customers =
                    newData;

                break;


            case "bills":

                db.data.bills =
                    newData;

                break;


            case "categories":

                db.data.categories =
                    newData;

                break;


            case "masterProducts":

                db.data.masterProducts =
                    newData;

                break;


            case "businessSettings":

                db.data.settings =
                    newData;

                break;


            default:

                throw new Error(
                    `SVSS: Unknown collection "${collection}".`
                );

        }

        // ======================================
        // MARK LOCAL CHANGE
        // ======================================

        meta.localUpdatedAt =
            new Date().toISOString();

        meta.pendingSync =
            true;

        // ======================================
        // WRITE LOCAL DATABASE
        // ======================================

        await db.write();

        log.info(
            `SVSS: ${collection} saved locally.`
        );

        // ======================================
        // TRY CLOUD
        // ======================================

        try {
            
            if (process.env.SVSS_DISABLE_CLOUD_SYNC_TEST === "true") {
                log.warn("SVSS Cloud: Cloud synchronization disabled for local deletion test.");
            } else {
                await synchronizePendingCollections();
            }
        } catch (cloudError) {

            // ==================================
            // IMPORTANT
            //
            // Local save already succeeded.
            // Cloud failure must NOT fail the
            // local operation.
            // ==================================

            log.warn(
                `SVSS Cloud: ${collection} synchronization failed.`
            );

            log.warn(
                cloudError.message
            );

        }

        // ======================================
        // RETURN LOCAL SUCCESS
        // ======================================

        await db.read();

        const pending =
            db.data.syncMeta?.[collection]
                ?.pendingSync ?? true;

        return {

            success: true,

            localSaved: true,

            cloudPending: pending

        };

    } catch (error) {

        log.error(
            `SVSS: Failed to save ${collection}.`
        );

        log.error(error);

        return {

            success: false,

            localSaved: false,

            error:
                error.message

        };

    }

}
// ======================================
// PRODUCTS
// ======================================

ipcMain.handle(
    "save-products",
    async (
        event,
        products
    ) => {

        return await saveCollectionLocalFirst(
            "products",
            products
        );

    }
);


// ======================================
// CUSTOMERS
// ======================================

ipcMain.handle(
    "save-customers",
    async (
        event,
        customers
    ) => {

        return await saveCollectionLocalFirst(
            "customers",
            customers
        );

    }
);


// ======================================
// BILLS
// ======================================

ipcMain.handle(
    "save-bills",
    async (
        event,
        bills
    ) => {

        return await saveCollectionLocalFirst(
            "bills",
            bills
        );

    }
);


// ======================================
// CATEGORIES
// ======================================

ipcMain.handle(
    "save-categories",
    async (
        event,
        categories
    ) => {

        return await saveCollectionLocalFirst(
            "categories",
            categories
        );

    }
);


// ======================================
// MASTER PRODUCTS
// ======================================

ipcMain.handle(
    "save-master-products",
    async (
        event,
        masterProducts
    ) => {

        return await saveCollectionLocalFirst(
            "masterProducts",
            masterProducts
        );

    }
);


// ======================================
// SETTINGS
// ======================================

ipcMain.handle(
    "save-settings",
    async (
        event,
        settings
    ) => {

        return await saveCollectionLocalFirst(
            "businessSettings",
            settings
        );

    }
);


// ======================================
// GET PRODUCTS
// ======================================

ipcMain.handle(
    "get-products",
    async () => {

        await db.read();

        return db.data.products || [];

    }
);


// ======================================
// GET CUSTOMERS
// ======================================

ipcMain.handle(
    "get-customers",
    async () => {

        await db.read();

        return db.data.customers || [];

    }
);


// ======================================
// GET BILLS
// ======================================

ipcMain.handle(
    "get-bills",
    async () => {

        await db.read();

        return db.data.bills || [];

    }
);


// ======================================
// GET CATEGORIES
// ======================================

ipcMain.handle(
    "get-categories",
    async () => {

        await db.read();

        return db.data.categories || [];

    }
);


// ======================================
// GET MASTER PRODUCTS
// ======================================

ipcMain.handle(
    "get-master-products",
    async () => {

        await db.read();

        return db.data.masterProducts || [];

    }
);


// ======================================
// GET SETTINGS
// ======================================

ipcMain.handle(
    "get-settings",
    async () => {

        await db.read();

        return db.data.settings || {};

    }
);
// =========================================================
// PERIODIC CLOUD SYNC RETRY
// =========================================================

let syncRetryTimer = null;

const CLOUD_SYNC_INTERVAL =
    30 * 1000;


// =========================================================
// START CLOUD SYNC RETRY TIMER
// =========================================================

function startCloudSyncRetryTimer() {

    if (syncRetryTimer) {

        clearInterval(
            syncRetryTimer
        );

    }

syncRetryTimer = setInterval(
    async () => {

        log.info(
            "SVSS Cloud: Retry timer triggered."
        );

        try {

           await synchronizePendingCollections();
        } catch (error) {

            log.warn(
                "SVSS Cloud: Background synchronization failed."
            );

            log.warn(
                error.message
            );

        }

    },

    CLOUD_SYNC_INTERVAL
);

log.info(
    `SVSS Cloud: Background synchronization timer started (${CLOUD_SYNC_INTERVAL} ms).`
);

}
// =========================================================
// ELECTRON APPLICATION STARTUP
// =========================================================

app.whenReady().then(async () => {

    try {

        console.log("1. createWindow started");

        await initDB();

        console.log("2. initDB completed");

        await createWindow();

        console.log("3. login.html loaded");
        
        createAppMenu();
        
        // ==============================================
        // BACKGROUND CLOUD SYNC RETRY
        // ==============================================
        
        startCloudSyncRetryTimer();
        
        log.info(
            "Creating startup database backup..."
        );

        await backupDatabase();

        log.info(
            "Startup database backup finished."
        );

        try {

            log.info(
                "Starting update check..."
            );

            if (app.isPackaged) {

                Promise.resolve(
                    autoUpdater.checkForUpdatesAndNotify()
                ).catch((err) => {

                    log.error(
                        "checkForUpdates failed"
                    );

                    log.error(err);

                });

            }

        } catch (err) {

            log.error(
                "checkForUpdates failed"
            );

            log.error(err);

        }

    } catch (error) {

        log.error(
            "Application startup failed."
        );

        log.error(error);

    }

});
// =========================================================
// ALL WINDOWS CLOSED
// =========================================================

app.on(
    "window-all-closed",
    () => {

        if (syncRetryTimer) {

            clearInterval(
                syncRetryTimer
            );

            syncRetryTimer = null;

        }

        if (
            process.platform !== "darwin"
        ) {

            app.quit();

        }

    }
);
// =========================================================
// APPLICATION BEFORE QUIT
// =========================================================

app.on(
    "before-quit",
    () => {

        if (syncRetryTimer) {

            clearInterval(
                syncRetryTimer
            );

            syncRetryTimer = null;

            log.info(
                "SVSS Cloud: Background synchronization timer stopped."
            );

        }

    }
);
// =========================================================
// NETWORK RECOVERY
// =========================================================

function registerNetworkRecovery() {

    if (
        !win ||
        win.isDestroyed()
    ) {

        return;

    }

    win.webContents.on(
        "did-finish-load",
        () => {

            try {

                win.webContents.executeJavaScript(`

                    (() => {

                        if (
                            window.__svssNetworkRecoveryRegistered
                        ) {

                            return;

                        }

                        window.__svssNetworkRecoveryRegistered =
                            true;

                        window.addEventListener(
                            "online",
                            () => {

                                console.log(
                                    "SVSS: Internet connection restored."
                                );

                                window.api
                                    .syncFromCloud()
                                    .catch(error => {

                                        console.warn(
                                            "SVSS Cloud: Recovery synchronization failed.",
                                            error
                                        );

                                    });

                            }
                        );

                    })();

                `);

            } catch (error) {

                log.warn(
                    "SVSS Cloud: Failed to register network recovery."
                );

                log.warn(
                    error.message
                );

            }

        }
    );

}
// ======================================
// END OF MAIN.JS
// ======================================
