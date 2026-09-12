// ======================================
// SVSS Billing Website
// script.js
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    // ======================================
    // Smooth Navbar Active Link
    // ======================================

    const sections =
        document.querySelectorAll("section");

    const navLinks =
        document.querySelectorAll(".nav-link");

    window.addEventListener("scroll", () => {

        let current = "";

        sections.forEach(section => {

            const top =
                section.offsetTop - 120;

            const height =
                section.offsetHeight;

            if (
                window.scrollY >= top &&
                window.scrollY < top + height
            ) {

                current = section.getAttribute("id");

            }

        });

        navLinks.forEach(link => {

            link.classList.remove("active");

            if (
                link.getAttribute("href") === "#" + current
            ) {

                link.classList.add("active");

            }

        });

    });

    // ======================================
    // Navbar Background
    // ======================================

    const navbar =
        document.querySelector(".navbar");

    window.addEventListener("scroll", () => {

        if (window.scrollY > 60) {

            navbar.style.padding = "10px 0";

            navbar.style.boxShadow =
                "0 8px 25px rgba(0,0,0,.12)";

        }

        else {

            navbar.style.padding = "14px 0";

            navbar.style.boxShadow =
                "0 5px 20px rgba(0,0,0,.05)";

        }

    });

    // ======================================
    // Scroll To Top Button
    // ======================================

    const topBtn =
        document.createElement("button");

    topBtn.className =
        "scroll-top";

    topBtn.innerHTML =
        '<i class="bi bi-arrow-up"></i>';

    document.body.appendChild(topBtn);

    topBtn.style.cssText = `

        position:fixed;
        right:25px;
        bottom:25px;
        width:55px;
        height:55px;
        border:none;
        border-radius:50%;
        background:#2563eb;
        color:#fff;
        font-size:24px;
        cursor:pointer;
        display:none;
        z-index:9999;
        box-shadow:0 10px 25px rgba(37,99,235,.35);
        transition:.3s;

    `;

    window.addEventListener("scroll", () => {

        topBtn.style.display =
            window.scrollY > 400
                ? "block"
                : "none";

    });

    topBtn.addEventListener("click", () => {

        window.scrollTo({

            top:0,

            behavior:"smooth"

        });

    });

    // ======================================
    // Reveal Animation
    // ======================================

    const revealItems =
        document.querySelectorAll(

            ".feature-card,.screenshot-card,.about-box,.contact-card,.download-card"

        );

    const reveal = () => {

        revealItems.forEach(item => {

            const top =
                item.getBoundingClientRect().top;

            if (top < window.innerHeight - 100) {

                item.style.opacity = "1";

                item.style.transform =
                    "translateY(0)";

            }

        });

    };

    revealItems.forEach(item => {

        item.style.opacity = "0";

        item.style.transform =
            "translateY(50px)";

        item.style.transition =
            ".8s ease";

    });

    reveal();

    window.addEventListener(

        "scroll",

        reveal

    );

    // ======================================
    // Counter Animation
    // ======================================

    const counters =
        document.querySelectorAll(".hero-stats h3");

    counters.forEach(counter => {

        counter.style.opacity = "0";

        setTimeout(() => {

            counter.style.opacity = "1";

        },500);

    });

    // ======================================
    // Screenshot Hover Tilt
    // ======================================

    document
    .querySelectorAll(".screenshot-card")
    .forEach(card=>{

        card.addEventListener(

            "mousemove",

            e=>{

                const x =
                    e.offsetX;

                const y =
                    e.offsetY;

                const rotateY =
                    (x-card.offsetWidth/2)/18;

                const rotateX =
                    -(y-card.offsetHeight/2)/18;

                card.style.transform =
                    `perspective(900px)
                    rotateX(${rotateX}deg)
                    rotateY(${rotateY}deg)
                    translateY(-10px)`;

            }

        );

        card.addEventListener(

            "mouseleave",

            ()=>{

                card.style.transform =
                    "translateY(0)";

            }

        );

    });

    // ======================================
    // Download Button Effect
    // ======================================

    const downloadBtn =
        document.querySelector(".download-btn");

    if(downloadBtn){

        downloadBtn.addEventListener(

            "mouseenter",

            ()=>{

                downloadBtn.style.transform =
                    "scale(1.05)";

            }

        );

        downloadBtn.addEventListener(

            "mouseleave",

            ()=>{

                downloadBtn.style.transform =
                    "scale(1)";

            }

        );

    }

    // ======================================
    // Mobile Menu Close
    // ======================================

    document
    .querySelectorAll(".nav-link")
    .forEach(link=>{

        link.addEventListener(

            "click",

            ()=>{

                const nav =
                    document.querySelector(".navbar-collapse");

                if(nav.classList.contains("show")){

                    new bootstrap.Collapse(nav).hide();

                }

            }

        );

    });

});