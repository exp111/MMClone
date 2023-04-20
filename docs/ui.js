Global.UI = {
    swiper: null,
}
const SOLVED_STAMP_ANIMATION_DURATION = 600;
const UNLOCK_CARD_ANIMATION_DURATION = 400;
const FINAL_CARD_STACK_ANIMATION_DURATION = 1800;

function setSubMenuVisible(mainID, subMenuID, enabled) {
    let main = document.getElementById(mainID);
    let subMenu = document.getElementById(subMenuID);
    if (!main || !subMenu)
        return;

    const displayOn = "flex";
    const displayOff = "none";
    let val = enabled ? displayOn : displayOff;
    let revVal = enabled ? displayOff : displayOn;
    subMenu.style.display = val;
    main.style.display = revVal;
}

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
    // enable the swiper if it was previously disabled (finished a case)
    if (!Global.UI.swiper.enabled) {
        Global.UI.swiper.enable();
        //FIXME: this is a hack to remove the height
        Global.UI.swiper.el.style.height = "";
    }
    console.debug("Building cards...");
    let orientation = Global.currentCase.orientation ? Global.currentCase.orientation : "vertical";
    let cardClass = `card-${orientation}`;
    // remove old stuff if it exists
    Global.UI.swiper.removeAllSlides();
    // add for each step a new card
    Global.currentCase.steps.forEach((step, i) => {
        // container
        let card = document.createElement("div");
        card.classList.add("swiper-slide");
        card.classList.add("card");
        card.classList.add(cardClass);
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
        if (curStep.solution == null) { //TODO: can we like do this not in the ui context
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

// flips a card. if "stamp" is true, the card will be stamped
async function flipCard(index, stamp) {
    let card = Global.UI.swiper.slides[index];
    let inner = card.getElementsByClassName("card-inner")[0];
    return new Promise(async (resolve, reject) => {
        if (stamp) {
            // first stamp with solve
            let wrap = document.createElement("div");
            wrap.classList.add("card-face", "card-solved-wrapper");
            let solved = document.createElement("img");
            solved.classList.add("card-solved");
            wrap.appendChild(solved);
            inner.appendChild(wrap);
            // wait for the stamp animation
            await delay(SOLVED_STAMP_ANIMATION_DURATION);
            // then flip
            card.classList.add("flipped");
            //TODO: wait for flip?
            resolve();
        } else {
            // only flip
            card.classList.add("flipped");
            resolve();
        }
    });
}

// updates the cards
function updateCards() {
    Global.currentCase.steps.forEach((step, i) => {
        // cards
        let card = Global.UI.swiper.slides[i];
        card.classList.remove("current");

        //TODO: remove these checks as they just make stuff complicated. kill the problems at the root
        /// by flipping cards on casesync and just waiting on animations
        // flip unflipped cards
        if (i < Global.caseProgress) {
            if (!card.classList.contains("flipped"))
                card.classList.add("flipped");
        }
        // remove locked overlay if it exists //TODO: rather hide it?
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
    if (!step.solution) // no solutions
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

function updateObjective(text, current, max) {
    let overlay = document.getElementById("objective-overlay");
    // hide the overlay if we're not showing anything
    if (!text && !current && !max) {
        overlay.style.display = "none";
        return;
    } else {
        overlay.style.display = "";
    }
    let label = document.getElementById("case_objective");
    label.textContent = current != null ? `${text} ${current}/${max}` : text;
}

function playFinalAnimation() {
    // lock
    Global.UI.swiper.disable();
    // move cards
    let cards = Global.UI.swiper.slides;
    let offsets = cards.map(card => card.offsetLeft);
    let lastOffset = offsets[offsets.length - 1];
    let container = Global.UI.swiper.el;
    // save container height
    let containerHeight = window.getComputedStyle(container, null).getPropertyValue("height");
    // move cards apart
    for (i = 0; i < cards.length; i++) {
        let offset = 1000 * (cards.length + 1 - i);
        let card = cards[i];
        card.style.position = "absolute";
        card.style.left = `${offsets[i]}px`;
        card.style.transition = `${FINAL_CARD_STACK_ANIMATION_DURATION}ms`;
        card.style.zIndex = offset.toString();
        card.style.transform = `translate3d(0, 0, ${offset}px) rotateY(180deg)`;
    }
    // set container height as cards dont take up space
    container.style.height = containerHeight;
    // after move, stack cards
    setTimeout(() => {
        for (let i = 0; i < cards.length; i++) {
            let offset = 1000 * (cards.length + 1 - i);
            let card = cards[i];
            card.style.left = `${lastOffset}px`;
            card.style.transform = `translate3d(0, 0, ${offset}px) rotate(${(8 * Math.random() - 3)}deg)`;
        }
        // after stacking, stamp
        setTimeout(() => {
            let first = cards[0];
            let inner = first.getElementsByClassName("card-inner")[0];
            let back = first.getElementsByClassName("card-back")[0];
            let solvedWrapper = document.createElement("div");
            solvedWrapper.classList.add("card-face", "card-solved-wrapper");
            let solved = document.createElement("img");
            solved.classList.add("case-solved");
            solvedWrapper.appendChild(solved);
            inner.insertBefore(solvedWrapper, back);
            // unlock after stamp
            setTimeout(() => {
                //TODO: unlock pointer, reset container height
                // hide cards
                setMenuVisible("card-menu", "top", false);
            }, SOLVED_STAMP_ANIMATION_DURATION * 2); // dont immediately reset
        }, FINAL_CARD_STACK_ANIMATION_DURATION);
    }, 100);
}