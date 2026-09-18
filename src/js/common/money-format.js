// ==========================================
// SVSS GLOBAL MONEY FORMATTER
// Indian Lakhs / Thousands / Hundreds Format
// ==========================================

(function () {
    "use strict";

    // --------------------------------------
    // Format number into Indian currency
    // --------------------------------------
    function formatMoney(value) {
        if (value === null || value === undefined || value === "") {
            return "Rs. 0.00";
        }

        let cleanValue = String(value)
            .replace(/₹/g, "")
            .replace(/Rs\.?/gi, "")
            .replace(/,/g, "")
            .trim();

        const amount = Number(cleanValue);

        if (!Number.isFinite(amount)) {
            return value;
        }

        return (
            "Rs. " +
            amount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
        );
    }

    // --------------------------------------
    // Make function available everywhere
    // --------------------------------------
    window.formatMoney = formatMoney;
    window.formatCurrency = formatMoney;

    // --------------------------------------
    // Format money inside normal text
    // Example:
    // Rs. 100000 -> Rs. 1,00,000.00
    // --------------------------------------
    function formatTextMoney(text) {
        if (!text || typeof text !== "string") {
            return text;
        }

        return text.replace(
            /(Rs\.?|₹)\s*([-+]?\d[\d,]*(?:\.\d+)?)/gi,
            function (fullMatch, currency, amount) {
                const cleanAmount = amount.replace(/,/g, "");
                const numberAmount = Number(cleanAmount);

                if (!Number.isFinite(numberAmount)) {
                    return fullMatch;
                }

                const formattedAmount = numberAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                return currency.toLowerCase().startsWith("rs")
                    ? `Rs. ${formattedAmount}`
                    : `₹${formattedAmount}`;
            }
        );
    }

    // --------------------------------------
    // Format elements marked with:
    // data-money="100000"
    // --------------------------------------
    function formatMoneyElements(root = document) {
        const moneyElements = root.querySelectorAll
            ? root.querySelectorAll("[data-money]")
            : [];

        moneyElements.forEach(element => {
            const value = element.getAttribute("data-money");

            if (value !== null) {
                element.textContent = formatMoney(value);
            }
        });
    }

    // --------------------------------------
    // Format text nodes throughout page
    // --------------------------------------
    function formatPageMoney() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const parent = node.parentElement;

                    if (!parent) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    const tagName = parent.tagName.toLowerCase();

                    // Do not change code, scripts or input fields
                    if (
                        tagName === "script" ||
                        tagName === "style" ||
                        tagName === "noscript" ||
                        tagName === "textarea" ||
                        tagName === "input" ||
                        tagName === "select"
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // Only process text containing money symbols
                    if (!/(Rs\.?|₹)\s*\d/i.test(node.nodeValue)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];

        let node;

        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const oldText = textNode.nodeValue;
            const newText = formatTextMoney(oldText);

            if (oldText !== newText) {
                textNode.nodeValue = newText;
            }
        });

        formatMoneyElements();
    }

    // --------------------------------------
    // Initial formatting
    // --------------------------------------
    function initializeMoneyFormatter() {
        if (document.body) {
            formatPageMoney();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeMoneyFormatter
        );
    } else {
        initializeMoneyFormatter();
    }

    // --------------------------------------
    // Automatically format newly added HTML
    // --------------------------------------
    const observer = new MutationObserver(function (mutations) {
        let shouldFormat = false;

        mutations.forEach(mutation => {
            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                shouldFormat = true;
            }

            if (mutation.type === "characterData") {
                shouldFormat = true;
            }
        });

        if (shouldFormat) {
            formatPageMoney();
        }
    });

    function startObserver() {
        if (!document.body) return;

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startObserver);
    } else {
        startObserver();
    }
})();