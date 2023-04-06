Global.UI = {
    swiper: null,
}
const UNLOCK_CARD_ANIMATION_DURATION = 400;

function setMenuVisible(id, direction, enabled) {
    let menu = document.getElementById(id);
    if (!menu)
        return;

    let val = enabled ? "0%" : "100%";
    menu.style[direction] = val;
}

function initSwiper() {
    Global.UI.swiper = new Swiper(".swiper-container", {
        slidesPerView: "auto",
        spaceBetween: 20,
        centeredSlides: true,
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
            renderBullet: function (e, t) {
                return `<span class="${t}"></span>`
            }
        }
    });
}

function buildCards() {
    console.debug("Building cards...");
    // remove old stuff if it exists
    Global.UI.swiper.removeAllSlides();
    // add for each step a new card
    Global.currentCase.steps.forEach((step, i) => {
        // container
        let card = document.createElement("div");
        card.classList.add("swiper-slide");
        card.classList.add("card");
        card.addEventListener("click", () => onSlideClick(i));
        // inner
        let inner = document.createElement("div");
        inner.classList.add("card-inner");

        // add lock overlay if its locked
        if (i > Global.caseProgress) {
            let lock = document.createElement("div");
            lock.classList.add("card-face");
            lock.classList.add("card-locked-overlay");
            inner.appendChild(lock);
        }

        function createCard(imgFunc, face, contentCallback) {
            function createDivCard(face) {
                let card = document.createElement("div");
                card.classList.add("card-face");
                card.classList.add(face);
                card.classList.add("text-card");
                return card
            }

            function createImgCard(face, src) {
                let card = document.createElement("img");
                card.classList.add("card-face");
                card.classList.add(face);
                card.src = src;
                return card
            }

            imgFunc(step).then((img) => {
                let card = null;
                if (img) // use image
                {
                    card = createImgCard(face, URL.createObjectURL(img));
                } else // create text card
                {
                    card = createDivCard(face);
                    //TODO: card content
                    contentCallback(card);
                }
                inner.appendChild(card);
            });
        }

        // front
        createCard(getStepImageFront, "card-front", (card) => {
            let header = document.createElement("h1");
            header.textContent = step.text;
            card.appendChild(header);
        });
        // back
        createCard(getStepImageBack, "card-back", (card) => {
            let header = document.createElement("h1");
            header.textContent = step.solution_title;
            let text = document.createElement("p");
            text.textContent = step.solution_text;
            card.appendChild(header);
            card.appendChild(text);
        });

        card.appendChild(inner);
        Global.UI.swiper.appendSlide(card);
    });
    updateCards();
}

function onSlideClick(index) {
    //console.debug(`Clicked on slide ${index}`);

    if (index == Global.UI.swiper.activeIndex && index == Global.caseProgress) {
        let curStep = Global.currentCase.steps[Global.caseProgress];
        // unlock if unsolvable
        if (curStep.solutions == null || curStep.solutions.length == 0) {
            solveStep();
            return;
        }
        // else go into the map
        setMenuVisible("card-menu", "top", false);
        return;
    }

    // slide to card
    Global.UI.swiper.slideTo(index);
}

function flipCard(index) {
    Global.UI.swiper.slides[index].classList.toggle("flipped");
}

// updates the cards
function updateCards() {
    Global.currentCase.steps.forEach((step, i) => {
        // cards
        let card = Global.UI.swiper.slides[i];
        card.classList.remove("current");

        // remove locked overlay if it exists
        if (i <= Global.caseProgress) {
            let locked = card.getElementsByClassName("card-locked-overlay");
            if (locked.length > 0) {
                let target = locked[0];
                // remove the locked overlay
                /// first set opacity, which will slowly transition
                target.style.opacity = 0;
                setTimeout(() => target.remove(), UNLOCK_CARD_ANIMATION_DURATION);
            }
        }

        // set current for cursor
        if (Global.caseProgress == i) {
            card.classList.add("current");
        }

        // pagination
        updatePaginationBullet(step, i);
    });
}

function updatePaginationBullet(step, i) {
    let bullet = Global.UI.swiper.pagination.bullets[i];
    if (!bullet) // sanity check
        return;

    // remove classes
    bullet.classList.remove("unsolvable", "completed", "not-completed", "locked");
    // apply new ones
    let style = "";
    if (step.solutions == null || step.solutions.length == 0) // no solutions
    {
        style = "unsolvable";
    } else if (i > Global.caseProgress) // locked
    {
        style = "locked";
    } else if (i == Global.caseProgress) // not completed
    {
        style = "not-completed";
    } else if (i < Global.caseProgress) // completed
    {
        style = "completed";
    }
    bullet.classList.add(style);
}

function setMarkerCursor(enabled) {
    let root = document.querySelector(":root");
    let val = enabled ? "pointer" : "inherit";
    console.debug(`Setting --marker-cursor to ${val}`);
    root.style.setProperty("--marker-cursor", val);
}