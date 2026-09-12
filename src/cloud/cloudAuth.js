// =========================================================
// SVSS BILLING CLOUD
// SUPABASE AUTHENTICATION
//
// This module handles the Supabase cloud session.
// It does NOT replace the existing local SVSS login.
// =========================================================

const { supabase } = require("./supabaseClient");

// =========================================================
// CLOUD LOGIN
// =========================================================

async function loginToCloud(email, password) {

    if (!email || !password) {

        throw new Error(
            "SVSS Cloud: Cloud login credentials are missing."
        );

    }

    const {
        data,
        error
    } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {

        throw new Error(
            `SVSS Cloud: Login failed. ${error.message}`
        );

    }

    if (!data || !data.session) {

        throw new Error(
            "SVSS Cloud: Login succeeded but no session was returned."
        );

    }

    return {
        user: data.user,
        session: data.session
    };
}

// =========================================================
// CLOUD LOGOUT
// =========================================================

async function logoutFromCloud() {

    const {
        error
    } = await supabase.auth.signOut();

    if (error) {

        throw new Error(
            `SVSS Cloud: Logout failed. ${error.message}`
        );

    }

    return true;
}

// =========================================================
// GET CURRENT CLOUD SESSION
// =========================================================

async function getCloudSession() {

    const {
        data,
        error
    } = await supabase.auth.getSession();

    if (error) {

        throw new Error(
            `SVSS Cloud: Unable to get session. ${error.message}`
        );

    }

    return data.session;
}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    loginToCloud,

    logoutFromCloud,

    getCloudSession

};