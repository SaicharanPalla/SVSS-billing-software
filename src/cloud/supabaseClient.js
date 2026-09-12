// =========================================================
// SVSS BILLING CLOUD
// SUPABASE CLIENT
//
// IMPORTANT:
// This module is isolated from the existing local database.
// Do not add local database logic here.
// =========================================================

const { createClient } = require("@supabase/supabase-js");

// =========================================================
// SUPABASE PROJECT
// =========================================================

const SUPABASE_URL = "https://mkgjljszzgnncjgyuilp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_DssBuH2udxpTRkTte8XQCw_h6-rwoLQ";

// =========================================================
// VALIDATION
// =========================================================

if (
    !SUPABASE_URL ||
    SUPABASE_URL === "PASTE_YOUR_PROJECT_URL_HERE"
) {

    throw new Error(
        "SVSS Cloud: Supabase Project URL has not been configured."
    );

}

if (
    !SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_PUBLISHABLE_KEY === "PASTE_YOUR_PUBLISHABLE_KEY_HERE"
) {

    throw new Error(
        "SVSS Cloud: Supabase Publishable Key has not been configured."
    );

}

// =========================================================
// SUPABASE CLIENT
// =========================================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// =========================================================
// EXPORT
// =========================================================

module.exports = {
    supabase
};