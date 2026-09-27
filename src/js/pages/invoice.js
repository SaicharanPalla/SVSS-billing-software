// =====================================
// SVSS PROFESSIONAL TAX INVOICE
// print.js
// =====================================


// =====================================
// MONEY FORMAT
// =====================================

function formatInvoiceMoney(value) {

    const amount =
        Number(
            String(value ?? 0)
                .replace(/[^\d.-]/g, "")
        ) || 0;

    return "₹" + amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


// =====================================
// NUMBER FORMAT WITHOUT ₹
// =====================================

function getNumber(value) {

    return Number(
        String(value ?? 0)
            .replace(/[^\d.-]/g, "")
    ) || 0;

}


// =====================================
// GST VALUE
// =====================================

function getItemGST(item) {

    const gst = Number(item.gst);

    if (Number.isFinite(gst) && gst > 0) {
        return gst;
    }

    const cgst = Number(item.cgst || 0);
    const sgst = Number(item.sgst || 0);

    return cgst + sgst;
}


// =====================================
// ITEM TAXABLE VALUE
// =====================================

function getItemTaxable(item) {

    if (
        item.taxable !== undefined &&
        item.taxable !== null &&
        item.taxable !== ""
    ) {

        return getNumber(item.taxable);

    }

    const qty =
        Number(item.qty) || 0;

    const rate =
        Number(item.rate) || 0;

    return qty * rate;

}


// =====================================
// ITEM CGST
// =====================================

function getItemCGST(item, taxable) {

    if (
        item.cgstAmount !== undefined &&
        item.cgstAmount !== null
    ) {

        return getNumber(item.cgstAmount);

    }

    if (
        item.cgstValue !== undefined &&
        item.cgstValue !== null
    ) {

        return getNumber(item.cgstValue);

    }

    const cgstRate =
        Number(item.cgst || 0);

    // If cgst is already an amount
    if (cgstRate > 0 && cgstRate > 20) {
        return cgstRate;
    }

    return taxable * cgstRate / 100;

}


// =====================================
// ITEM SGST
// =====================================

function getItemSGST(item, taxable) {

    if (
        item.sgstAmount !== undefined &&
        item.sgstAmount !== null
    ) {

        return getNumber(item.sgstAmount);

    }

    if (
        item.sgstValue !== undefined &&
        item.sgstValue !== null
    ) {

        return getNumber(item.sgstValue);

    }

    const sgstRate =
        Number(item.sgst || 0);

    // If sgst is already an amount
    if (sgstRate > 0 && sgstRate > 20) {
        return sgstRate;
    }

    return taxable * sgstRate / 100;

}


// =====================================
// NUMBER TO WORDS
// =====================================

function numberToWords(num) {

    num = Number(num) || 0;

    if (num === 0) {
        return "Zero Rupees Only";
    }

    const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen"
    ];

    const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety"
    ];

    function convertBelowThousand(n) {

        let result = "";

        if (n >= 100) {

            result +=
                ones[Math.floor(n / 100)] +
                " Hundred ";

            n %= 100;

        }

        if (n >= 20) {

            result +=
                tens[Math.floor(n / 10)] +
                " ";

            n %= 10;

        }

        if (n > 0) {

            result += ones[n] + " ";

        }

        return result.trim();

    }


    let integerPart =
        Math.floor(num);

    const paise =
        Math.round((num - integerPart) * 100);

    let result = "";


    if (integerPart >= 10000000) {

        result +=
            convertBelowThousand(
                Math.floor(integerPart / 10000000)
            ) +
            " Crore ";

        integerPart %= 10000000;

    }


    if (integerPart >= 100000) {

        result +=
            convertBelowThousand(
                Math.floor(integerPart / 100000)
            ) +
            " Lakh ";

        integerPart %= 100000;

    }


    if (integerPart >= 1000) {

        result +=
            convertBelowThousand(
                Math.floor(integerPart / 1000)
            ) +
            " Thousand ";

        integerPart %= 1000;

    }


    if (integerPart > 0) {

        result +=
            convertBelowThousand(integerPart);

    }


    result =
        result.trim() + " Rupees";


    if (paise > 0) {

        result +=
            " and " +
            convertBelowThousand(paise) +
            " Paise";

    }


    return result + " Only";

}


// =====================================
// MAIN
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            // =====================================
            // GET BILL NUMBER
            // =====================================

            const params =
                new URLSearchParams(
                    window.location.search
                );

            const billNo =
                params.get("bill");


            if (!billNo) {

                showToast(
                    "Bill Number not found.",
                    "info"
                );

                window.close();

                return;

            }


            // =====================================
            // LOAD DATABASE
            // =====================================

            const db =
                await window.api.getDatabase();

            const bills =
                Array.isArray(db.bills)
                    ? db.bills
                    : [];


            const invoice =
                bills.find(
                    bill =>
                        String(bill.billNo) ===
                        String(billNo)
                );


            if (!invoice) {

                showToast(
                    "Invoice not found.",
                    "info"
                );

                window.close();

                return;

            }


            // =====================================
            // CUSTOMER / INVOICE DETAILS
            // =====================================

            document.getElementById(
                "billNo"
            ).textContent =
                invoice.billNo || "-";


            const billBookElement =
                document.getElementById(
                    "billBookNo"
                );

            if (billBookElement) {

                billBookElement.textContent =
                    invoice.billBookNo || "-";

            }


            document.getElementById(
                "customer"
            ).textContent =
                invoice.customer ||
                "Walk-in Customer";


            document.getElementById(
                "mobile"
            ).textContent =
                invoice.mobile || "-";


            document.getElementById(
                "gstNumber"
            ).textContent =

                invoice.gst ||

                invoice.gstNumber ||

                invoice.gstNo ||

                invoice.customerGST ||

                invoice.customerGst ||

                "-";


            document.getElementById(
                "address"
            ).textContent =
                invoice.address || "-";


            document.getElementById(
                "billDate"
            ).textContent =
                invoice.date || "-";


            document.getElementById(
                "paymentMode"
            ).textContent =
                invoice.paymentMode || "Cash";


            // =====================================
            // PAYMENT DETAILS
            // =====================================

            const amountPaid =
                getNumber(
                    invoice.amountPaid
                );


            const balanceDue =
                getNumber(
                    invoice.balanceDue
                );


            const paymentStatus =
                invoice.paymentStatus ||
                (
                    balanceDue <= 0
                        ? "Paid"
                        : amountPaid > 0
                            ? "Partial"
                            : "Pending"
                );


            const amountPaidElement =
                document.getElementById(
                    "amountPaid"
                );

            if (amountPaidElement) {

                amountPaidElement.textContent =
                    formatInvoiceMoney(
                        amountPaid
                    );

            }


            const balanceDueElement =
                document.getElementById(
                    "balanceDue"
                );

            if (balanceDueElement) {

                balanceDueElement.textContent =
                    formatInvoiceMoney(
                        balanceDue
                    );

            }


            const paymentStatusElement =
                document.getElementById(
                    "paymentStatus"
                );

            if (paymentStatusElement) {

                paymentStatusElement.textContent =
                    paymentStatus;

            }


            // =====================================
            // PRODUCTS
            // =====================================

            const tbody =
                document.getElementById(
                    "invoiceBody"
                );


            tbody.innerHTML = "";


            let calculatedSubTotal = 0;
            let calculatedCGST = 0;
            let calculatedSGST = 0;
            let calculatedGST = 0;


            const items =
                Array.isArray(invoice.items)
                    ? invoice.items
                    : [];


            items.forEach(
                (item, index) => {

                    const qty =
                        Number(item.qty) || 0;


                    const rate =
                        Number(item.rate) || 0;


                    const taxable =
                        getItemTaxable(item);


                    const cgst =
                        getItemCGST(
                            item,
                            taxable
                        );


                    const sgst =
                        getItemSGST(
                            item,
                            taxable
                        );


                    const gstRate =
                        getItemGST(item);


                    let total =
                        getNumber(
                            item.total
                        );


                    if (!total) {

                        total =
                            taxable +
                            cgst +
                            sgst;

                    }


                    calculatedSubTotal +=
                        taxable;

                    calculatedCGST +=
                        cgst;

                    calculatedSGST +=
                        sgst;

                    calculatedGST +=
                        cgst + sgst;


                    const row = `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                ${item.code || "-"}
                            </td>

                            <td>
                                ${
                                    item.productName ||
                                    item.product ||
                                    item.name ||
                                    "-"
                                }
                            </td>

                            <td>
                                ${item.unit || "-"}
                            </td>

                            <td>
                                ${qty}
                            </td>

                            <td>
                                ${formatInvoiceMoney(rate)}
                            </td>

                            <td>
                                ${formatInvoiceMoney(taxable)}
                            </td>

                            <td>
                                ${formatInvoiceMoney(cgst)}
                            </td>

                            <td>
                                ${formatInvoiceMoney(sgst)}
                            </td>

                            <td>
                                ${gstRate}%
                            </td>

                            <td>
                                ${formatInvoiceMoney(total)}
                            </td>

                        </tr>

                    `;


                    tbody.insertAdjacentHTML(
                        "beforeend",
                        row
                    );

                }
            );


            // =====================================
            // TOTALS
            // =====================================

            const subTotal =
                getNumber(
                    invoice.subTotal
                ) ||
                calculatedSubTotal;


            const cgstTotal =
                getNumber(
                    invoice.cgstTotal
                ) ||
                calculatedCGST;


            const sgstTotal =
                getNumber(
                    invoice.sgstTotal
                ) ||
                calculatedSGST;


            const gstTotal =
                getNumber(
                    invoice.gstTotal
                ) ||
                (
                    cgstTotal +
                    sgstTotal
                );


            const discount =
                getNumber(
                    invoice.discount
                );


            const grandTotal =
                getNumber(
                    invoice.grandTotal
                );


            // =====================================
            // SUMMARY
            // =====================================

            document.getElementById(
                "subTotal"
            ).textContent =
                formatInvoiceMoney(
                    subTotal
                );


            const cgstElement =
                document.getElementById(
                    "cgstTotal"
                );

            if (cgstElement) {

                cgstElement.textContent =
                    formatInvoiceMoney(
                        cgstTotal
                    );

            }


            const sgstElement =
                document.getElementById(
                    "sgstTotal"
                );

            if (sgstElement) {

                sgstElement.textContent =
                    formatInvoiceMoney(
                        sgstTotal
                    );

            }


            document.getElementById(
                "gstTotal"
            ).textContent =
                formatInvoiceMoney(
                    gstTotal
                );


            document.getElementById(
                "discount"
            ).textContent =
                formatInvoiceMoney(
                    discount
                );


            document.getElementById(
                "grandTotal"
            ).textContent =
                formatInvoiceMoney(
                    grandTotal
                );


            // =====================================
            // SUMMARY PAID
            // =====================================

            const summaryPaid =
                document.getElementById(
                    "summaryPaid"
                );

            if (summaryPaid) {

                summaryPaid.textContent =
                    formatInvoiceMoney(
                        amountPaid
                    );

            }


            // =====================================
            // SUMMARY DUE
            // =====================================

            const summaryDue =
                document.getElementById(
                    "summaryDue"
                );

            if (summaryDue) {

                summaryDue.textContent =
                    formatInvoiceMoney(
                        balanceDue
                    );

            }


            // =====================================
            // AMOUNT IN WORDS
            // =====================================

            const amountWords =
                document.getElementById(
                    "amountWords"
                );


            if (amountWords) {

                amountWords.textContent =
                    numberToWords(
                        grandTotal
                    );

            }


            // =====================================
            // PAYMENT STATUS COLOR
            // =====================================

            const statusCard =
                document.querySelector(
                    ".status-card"
                );


            if (statusCard) {

                statusCard.classList.remove(
                    "status-paid",
                    "status-pending",
                    "status-due"
                );


                const normalizedStatus =
                    String(
                        paymentStatus
                    )
                        .trim()
                        .toLowerCase();


                if (
                    normalizedStatus ===
                    "paid"
                ) {

                    statusCard.classList.add(
                        "status-paid"
                    );

                }
                else if (
                    normalizedStatus ===
                    "pending" ||
                    normalizedStatus ===
                    "partial"
                ) {

                    statusCard.classList.add(
                        "status-pending"
                    );

                }
                else {

                    statusCard.classList.add(
                        "status-due"
                    );

                }

            }


            // =====================================
            // AUTO PRINT
            // =====================================

            setTimeout(
                () => {

                    window.focus();

                    requestAnimationFrame(
                        () => {

                            setTimeout(
                                () => {

                                    window.print();

                                },
                                300
                            );

                        }
                    );

                },
                1500
            );


        }
        catch (error) {

            console.error(
                "Invoice Print Error:",
                error
            );


            alert(
                "Unable to generate invoice.\n\n" +
                error.message
            );

        }

    }
);