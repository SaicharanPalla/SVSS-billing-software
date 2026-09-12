(function () {

    if (window.api) {
        return;
    }

    const STORAGE_KEY = "svss_browser_database";

    const isBrowser = true;

    let currentDatabase = null;

    const SUPABASE_URL =
        "https://mkgjljszzgnncjgyuilp.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_DssBuH2udxpTRkTte8XQCw_h6-rwoLQ";

    const supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );

    function getDefaultDatabase() {

        return {
            settings: {
                loggedIn: false,
                loggedUser: "",
                username: "",
                password: "",
                rememberMe: false,
                savedUsername: "",
                savedPassword: ""
            },

            categories: [],
            masterProducts: [],
            products: [],
            customers: [],
            bills: [],

            syncMeta: {}
        };
    }

    function loadDatabase() {

        try {

            const stored =
                localStorage.getItem(STORAGE_KEY);

            if (!stored) {
                return getDefaultDatabase();
            }

            const database =
                JSON.parse(stored);

            return {
                ...getDefaultDatabase(),
                ...database,
                settings: {
                    ...getDefaultDatabase().settings,
                    ...(database.settings || {})
                }
            };

        } catch (error) {

            console.error(
                "SVSS Browser API: Failed to load database",
                error
            );

            return getDefaultDatabase();
        }
    }

    function saveDatabase(database) {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(database)
        );

        currentDatabase = database;

        return true;
    }

    function getCollection(collection) {

        const database = loadDatabase();

        return database[collection] || [];
    }

    function saveCollection(collection, data) {

        const database = loadDatabase();

        database[collection] = data;

        saveDatabase(database);

        return true;
    }

    async function getCloudCollection(table, key) {

        const { data, error } =
            await supabaseClient
                .from(table)
                .select("id,data,updated_at")
                .eq("id", key)
                .limit(1);

        if (error) {
            throw new Error(
                `SVSS Browser Cloud: ${table}: ${error.message}`
            );
        }

        if (!data || data.length === 0) {
            return {
                records: [],
                updatedAt: null
            };
        }

        const container = data[0];

        if (table === "business_settings") {
            return {
                records: container.data?.settings &&
                    typeof container.data.settings === "object"
                    ? container.data.settings
                    : {},
                updatedAt: container.updated_at || null
            };
        }

        return {
            records: Array.isArray(container.data?.[table === "master_products" ? "masterProducts" : table])
                ? container.data[table === "master_products" ? "masterProducts" : table]
                : [],
            updatedAt: container.updated_at || null
        };
    }

    async function cloudLogin(email, password) {

        if (!email || !password) {
            return {
                success: false,
                error: "Email and password are required."
            };
        }

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email.trim(),
                password
            });

        if (error || !data?.session) {
            return {
                success: false,
                error: error?.message ||
                    "Browser cloud authentication failed."
            };
        }

        return {
            success: true,
            userId: data.user?.id || null,
            email: data.user?.email || email
        };
    }

    async function syncFromCloud() {

        try {

            const {
                data: sessionData,
                error: sessionError
            } = await supabaseClient.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (!sessionData?.session) {
                return {
                    success: false,
                    error: "Browser cloud session is not available."
                };
            }

            const [
                categories,
                masterProducts,
                products,
                customers,
                bills,
                businessSettings
            ] = await Promise.all([

                getCloudCollection(
                    "categories",
                    "SVSS_CATEGORIES_COLLECTION"
                ),

                getCloudCollection(
                    "master_products",
                    "SVSS_MASTER_PRODUCTS_COLLECTION"
                ),

                getCloudCollection(
                    "products",
                    "SVSS_PRODUCTS_COLLECTION"
                ),

                getCloudCollection(
                    "customers",
                    "SVSS_CUSTOMERS_COLLECTION"
                ),

                getCloudCollection(
                    "bills",
                    "SVSS_BILLS_COLLECTION"
                ),

                getCloudCollection(
                    "business_settings",
                    "SVSS_BUSINESS_SETTINGS"
                )

            ]);

            const database = loadDatabase();

            database.categories =
                categories.records;

            database.masterProducts =
                masterProducts.records;

            database.products =
                products.records;

            database.customers =
                customers.records;

            database.bills =
                bills.records;

            if (
                businessSettings.records &&
                !Array.isArray(businessSettings.records)
            ) {
                database.settings = {
                    ...database.settings,
                    ...businessSettings.records
                };
            }

            database.syncMeta = {
                ...(database.syncMeta || {}),
                browserCloudSync: true,
                lastSyncAt: new Date().toISOString()
            };

            saveDatabase(database);

            return {
                success: true,
                database
            };

        } catch (error) {

            console.error(
                "SVSS Browser Cloud: Sync failed",
                error
            );

            return {
                success: false,
                error: error?.message ||
                    "Browser cloud sync failed."
            };
        }
    }

    window.api = {

        async getDatabase() {

            currentDatabase =
                loadDatabase();

            return currentDatabase;
        },

        async saveDatabase(database) {
            return saveDatabase(database);
        },

        async getCategories() {
            return getCollection("categories");
        },

        async saveCategories(data) {
            return saveCollection("categories", data);
        },

        async getMasterProducts() {
            return getCollection("masterProducts");
        },

        async saveMasterProducts(data) {
            return saveCollection("masterProducts", data);
        },

        async getProducts() {
            return getCollection("products");
        },

        async saveProducts(data) {
            return saveCollection("products", data);
        },

        async getCustomers() {
            return getCollection("customers");
        },

        async saveCustomers(data) {
            return saveCollection("customers", data);
        },

        async getBills() {
            return getCollection("bills");
        },

        async saveBills(data) {
            return saveCollection("bills", data);
        },

        async getSettings() {

            const database =
                loadDatabase();

            return database.settings || {};
        },

        async saveSettings(settings) {

            const database =
                loadDatabase();

            database.settings =
                settings || {};

            saveDatabase(database);

            return true;
        },

        async getAppVersion() {
            return "Web";
        },

        isBrowser: true,

        async cloudLogin() {
            return cloudLogin();
        },

        async syncFromCloud() {
            return syncFromCloud();
        },

        async cloudLogout() {

            const { error } =
                await supabaseClient.auth.signOut();

            if (error) {
                return {
                    success: false,
                    error: error.message
                };
            }

            return {
                success: true
            };
        }

    };

})();







