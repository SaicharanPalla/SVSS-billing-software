// ======================================
// SVSS Keyboard Shortcuts
// ======================================

document.addEventListener("keydown", function (e) {

    // Don't trigger shortcuts while typing
    const tag = document.activeElement.tagName;

    if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Ctrl + N
    if (e.ctrlKey && e.key.toLowerCase() === "n") {

        e.preventDefault();

        document.dispatchEvent(
            new CustomEvent("svss:new")
        );

    }

    // Ctrl + S
    if (e.ctrlKey && e.key.toLowerCase() === "s") {

        e.preventDefault();

        document.dispatchEvent(
            new CustomEvent("svss:save")
        );

    }

    // Ctrl + P
    if (e.ctrlKey && e.key.toLowerCase() === "p") {

        e.preventDefault();

        document.dispatchEvent(
            new CustomEvent("svss:print")
        );

    }

    // Ctrl + F
    if (e.ctrlKey && e.key.toLowerCase() === "f") {

        e.preventDefault();

        document.dispatchEvent(
            new CustomEvent("svss:search")
        );

    }

    // Escape
    if (e.key === "Escape") {

        document.dispatchEvent(
            new CustomEvent("svss:escape")
        );

    }

});