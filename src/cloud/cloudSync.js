// =========================================================
// SVSS BILLING CLOUD
// CLOUD SYNC FOUNDATION
//
// IMPORTANT:
// This module works alongside the existing local database.
// It does NOT replace LowDB.
// It does NOT modify existing SVSS business logic.
// =========================================================

const { supabase } = require("./supabaseClient");

// =========================================================
// CLOUD TABLE MAP
// =========================================================

const CLOUD_TABLES = {
    products: "products",
    customers: "customers",
    bills: "bills",
    categories: "categories",
    masterProducts: "master_products",
    businessSettings: "business_settings"
};

// =========================================================
// AUTH CHECK
// =========================================================

async function ensureCloudSession() {

    const {
        data: {
            session
        },
        error
    } = await supabase.auth.getSession();

    if (error) {
        throw new Error(
            `SVSS Cloud: Unable to check session. ${error.message}`
        );
    }

    if (!session) {
        throw new Error(
            "SVSS Cloud: No authenticated Supabase session."
        );
    }

    return session;
}

// =========================================================
// GENERIC CLOUD SAVE
// WITH OPTIMISTIC CONFLICT PROTECTION
// =========================================================

async function saveToCloud(
    collection,
    recordId,
    recordData,
    expectedUpdatedAt = null
) {

    await ensureCloudSession();

    const table = CLOUD_TABLES[collection];

    if (!table) {
        throw new Error(
            `SVSS Cloud: Unknown collection "${collection}".`
        );
    }

    if (!recordId) {
        throw new Error(
            `SVSS Cloud: Missing record ID for "${collection}".`
        );
    }

    // =====================================================
    // CHECK CURRENT CLOUD VERSION
    // =====================================================

    if (expectedUpdatedAt) {

        const { data: currentRecord, error: readError } =
            await supabase
                .from(table)
                .select("id, updated_at")
                .eq("id", String(recordId))
                .maybeSingle();

        if (readError) {

            throw new Error(
                `SVSS Cloud: Failed to check ${collection} version. ${readError.message}`
            );

        }

        // Record exists in cloud
        if (currentRecord) {

            if (
                currentRecord.updated_at !==
                expectedUpdatedAt
            ) {

                const conflictError = new Error(
                    `SVSS Cloud: Conflict detected for ${collection}. ` +
                    `Cloud version has changed since the last synchronization.`
                );

                conflictError.code =
                    "CLOUD_CONFLICT";

                conflictError.collection =
                    collection;

                conflictError.cloudUpdatedAt =
                    currentRecord.updated_at;

                conflictError.expectedUpdatedAt =
                    expectedUpdatedAt;

                throw conflictError;

            }

        }

    }

    // =====================================================
    // CREATE NEW CLOUD VERSION
    // =====================================================

    const savePayload = {

        id: String(recordId),

        data: recordData,

        updated_at: new Date().toISOString()

    };

    // business_settings does NOT have deleted_at
    if (collection !== "businessSettings") {

        savePayload.deleted_at = null;

    }

    // =====================================================
    // SAVE
    // =====================================================

    const { data, error } =
        await supabase
            .from(table)
            .upsert(savePayload)
            .select()
            .single();

    if (error) {

        throw new Error(
            `SVSS Cloud: Failed to save ${collection}. ${error.message}`
        );

    }

    return data;
}
// =========================================================
// DELETE INDIVIDUAL RECORDS FROM CLOUD COLLECTION
// WITH OPTIMISTIC CONFLICT PROTECTION
// =========================================================

async function deleteRecordsFromCloud(
    collection,
    recordIds,
    expectedUpdatedAt = null
) {
    await ensureCloudSession();

    const table = CLOUD_TABLES[collection];

    if (!table) {
        throw new Error(
            `SVSS Cloud: Unknown collection "${collection}".`
        );
    }

    if (collection === "businessSettings") {
        throw new Error(
            "SVSS Cloud: Individual record deletion is not supported for businessSettings."
        );
    }

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
        return {
            success: true,
            deletedCount: 0,
            updated_at: expectedUpdatedAt
        };
    }

    // =====================================================
    // DETERMINE JSON ARRAY KEY
    // =====================================================

    const dataKeyMap = {
        products: "products",
        customers: "customers",
        bills: "bills",
        categories: "categories",
        masterProducts: "masterProducts"
    };

    const dataKey = dataKeyMap[collection];

    if (!dataKey) {
        throw new Error(
            `SVSS Cloud: No data key configured for "${collection}".`
        );
    }

    // =====================================================
    // DETERMINE APPLICATION RECORD ID FIELD
    // =====================================================

    const recordIdFieldMap = {
        products: "code",
        customers: "customerId",
        bills: "billNo",
        categories: "id",
        masterProducts: "id"
    };

    const recordIdField = recordIdFieldMap[collection];

    // Normalize requested IDs
    const idsToDelete = new Set(
        recordIds
            .filter(id => id !== null && id !== undefined)
            .map(id => String(id))
    );

    if (idsToDelete.size === 0) {
        return {
            success: true,
            deletedCount: 0,
            updated_at: expectedUpdatedAt
        };
    }

    // =====================================================
    // READ CURRENT CLOUD CONTAINER
    // =====================================================

    const {
        data: currentRecord,
        error: readError
    } = await supabase
        .from(table)
        .select("id, data, updated_at")
        .eq("id", String(
            collection === "businessSettings"
                ? "SVSS_BUSINESS_SETTINGS"
                : collection === "masterProducts"
                    ? "SVSS_MASTER_PRODUCTS_COLLECTION"
                    : collection === "products"
                        ? "SVSS_PRODUCTS_COLLECTION"
                        : collection === "customers"
                            ? "SVSS_CUSTOMERS_COLLECTION"
                            : collection === "bills"
                                ? "SVSS_BILLS_COLLECTION"
                                : "SVSS_CATEGORIES_COLLECTION"
        ))
        .maybeSingle();

    if (readError) {
        throw new Error(
            `SVSS Cloud: Failed to read ${collection} before individual deletion. ${readError.message}`
        );
    }

    if (!currentRecord) {
        throw new Error(
            `SVSS Cloud: Container for "${collection}" was not found.`
        );
    }

// =====================================================
// USE THE LATEST CLOUD VERSION FOR DELETION
// =====================================================

// The latest cloud container was already loaded above.
// Continue deleting from that current cloud version.
// This prevents an old pending-deletion timestamp from
// blocking the deletion permanently.
if (
    expectedUpdatedAt &&
    currentRecord.updated_at !== expectedUpdatedAt
) {
    console.warn(
        `SVSS Cloud: ${collection} changed after local deletion was queued. ` +
        `Using the latest cloud version for deletion.`
    );
}

    // =====================================================
    // VALIDATE CLOUD DATA
    // =====================================================

    const cloudData = currentRecord.data || {};
    const cloudRecords = Array.isArray(cloudData[dataKey])
        ? cloudData[dataKey]
        : [];

    // =====================================================
    // REMOVE ONLY REQUESTED RECORDS
    // =====================================================

    const remainingRecords = [];
    let deletedCount = 0;

    for (const record of cloudRecords) {
        if (!record) {
            remainingRecords.push(record);
            continue;
        }

        const recordId = record[recordIdField];

        if (
            recordId !== null &&
            recordId !== undefined &&
            idsToDelete.has(String(recordId))
        ) {
            deletedCount++;
            continue;
        }

        remainingRecords.push(record);
    }

    // =====================================================
    // NOTHING TO DELETE
    // =====================================================

    if (deletedCount === 0) {
        return {
            success: true,
            deletedCount: 0,
            updated_at: currentRecord.updated_at
        };
    }

    // =====================================================
    // BUILD NEW CLOUD DATA
    // =====================================================

    const newCloudData = {
        ...cloudData,
        [dataKey]: remainingRecords
    };

    // =====================================================
    // SAVE NEW CONTAINER VERSION
    // =====================================================

    const saved = await saveToCloud(
        collection,
        currentRecord.id,
        newCloudData,
        currentRecord.updated_at
    );

    return {
        success: true,
        deletedCount,
        updated_at: saved.updated_at,
        deletedIds: recordIds
            .map(id => String(id))
            .filter(id => !cloudRecords.some(
                record =>
                    record &&
                    record[recordIdField] !== null &&
                    record[recordIdField] !== undefined &&
                    String(record[recordIdField]) === id
            ))
    };
}

// =========================================================
// GENERIC CLOUD DELETE
// =========================================================

async function deleteFromCloud(
    collection,
    recordId,
    expectedUpdatedAt = null
) {

    await ensureCloudSession();

    const table = CLOUD_TABLES[collection];

    if (!table) {
        throw new Error(
            `SVSS Cloud: Unknown collection "${collection}".`
        );
    }

    if (!recordId) {
        throw new Error(
            `SVSS Cloud: Missing record ID for "${collection}".`
        );
    }

    // ==============================================
    // CHECK CURRENT CLOUD VERSION BEFORE DELETE
    // ==============================================

    if (expectedUpdatedAt) {

        const {
            data: currentRecord,
            error: readError
        } = await supabase
            .from(table)
            .select("id, updated_at")
            .eq("id", String(recordId))
            .maybeSingle();

        if (readError) {

            throw new Error(
                `SVSS Cloud: Failed to check ${collection} version before delete. ${readError.message}`
            );

        }

        if (currentRecord) {

            if (
                currentRecord.updated_at !==
                expectedUpdatedAt
            ) {

                const conflictError = new Error(
                    `SVSS Cloud: Delete conflict detected for ${collection}. ` +
                    `Cloud version has changed since the last synchronization.`
                );

                conflictError.code =
                    "CLOUD_CONFLICT";

                conflictError.collection =
                    collection;

                conflictError.cloudUpdatedAt =
                    currentRecord.updated_at;

                conflictError.expectedUpdatedAt =
                    expectedUpdatedAt;

                throw conflictError;

            }

        }

    }

    // ==============================================
    // DELETE
    // ==============================================

    const { error } =
        await supabase
            .from(table)
            .delete()
            .eq("id", String(recordId));

    if (error) {

        throw new Error(
            `SVSS Cloud: Failed to delete ${collection}. ${error.message}`
        );

    }

    return true;

}

// =========================================================
// GENERIC CLOUD READ
// =========================================================

async function getFromCloud(
    collection,
    recordId
) {

    await ensureCloudSession();

    const table = CLOUD_TABLES[collection];

    if (!table) {
        throw new Error(
            `SVSS Cloud: Unknown collection "${collection}".`
        );
    }

    let query = supabase
        .from(table)
        .select("*");

    if (recordId) {
        query = query.eq(
            "id",
            String(recordId)
        );
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(
            `SVSS Cloud: Failed to read ${collection}. ${error.message}`
        );
    }

    return data || [];
}
// =========================================================
// LOCAL → CLOUD SYNCHRONIZATION
// =========================================================

async function syncToCloud(db) {

    try {

        await ensureCloudSession();

        if (!db || !db.data) {

            throw new Error(
                "SVSS Cloud: Local database is not available."
            );

        }

        const collections = [
            "businessSettings",
            "categories",
            "masterProducts",
            "products",
            "customers",
            "bills"
        ];

        const results = {};

        for (const collection of collections) {

            const meta =
                db.data.syncMeta?.[collection];

            if (!meta || !meta.pendingSync) {

                continue;

            }

            try {

                let localData;

                // =========================================
                // BUSINESS SETTINGS
                // =========================================

                if (collection === "businessSettings") {

                    localData =
                        db.data.settings || {};

                    const recordId = "business-settings";

                    const expectedUpdatedAt =
                        meta.lastCloudUpdatedAt || null;

                    const saved = await saveToCloud(
                        collection,
                        recordId,
                        localData,
                        expectedUpdatedAt
                    );

                    meta.lastCloudUpdatedAt =
                        saved.updated_at;

                    meta.localUpdatedAt = null;
                    meta.pendingSync = false;

                    results[collection] = {
                        success: true
                    };

                    continue;
                }

                // =========================================
                // NORMAL COLLECTIONS
                // =========================================

                localData =
                    Array.isArray(db.data[collection])
                        ? db.data[collection]
                        : [];

                const expectedUpdatedAt =
                    meta.lastCloudUpdatedAt || null;

            /*
             * For collection-level synchronization,
             * upload the complete collection container.
             */
            
            const collectionContainerIds = {
                products: "SVSS_PRODUCTS_COLLECTION",
                customers: "SVSS_CUSTOMERS_COLLECTION",
                bills: "SVSS_BILLS_COLLECTION",
                categories: "SVSS_CATEGORIES_COLLECTION",
                masterProducts: "SVSS_MASTER_PRODUCTS_COLLECTION"
            };
            
            const containerId =
                collectionContainerIds[collection];
            
            if (!containerId) {
                throw new Error(
                    `SVSS Cloud: Missing container ID for "${collection}".`
                );
            }
            
            await saveToCloud(
                collection,
                containerId,
                {
                    [collection]: localData
                },
                expectedUpdatedAt
            );

                meta.pendingSync = false;
                meta.localUpdatedAt = null;

                results[collection] = {
                    success: true
                };

            } catch (error) {

                /*
                 * IMPORTANT:
                 *
                 * Never clear pendingSync when cloud
                 * synchronization fails.
                 */

                meta.pendingSync = true;

                results[collection] = {
                    success: false,
                    error: error.message,
                    code: error.code || null
                };

                console.error(
                    `SVSS Cloud: ${collection} synchronization failed.`,
                    error
                );

            }

        }

        await db.write();

        return {
            success: true,
            results
        };

    } catch (error) {

        return {
            success: false,
            error: error.message
        };

    }

}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    CLOUD_TABLES,

    ensureCloudSession,

    saveToCloud,

    deleteFromCloud,

    deleteRecordsFromCloud,

    getFromCloud

};