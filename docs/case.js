Global.CASE = {
    objective: [],
    nodes: [],
}

function handleCaseFile(event) {
    console.debug("Got Case File(s)");
    let files = event.target.files;
    let promises = []
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        console.debug(`Loading Case from ${file}`);
        promises.push(loadCaseJson(file));
    }

    // wait for all files to load
    Promise.all(promises).then(() => {
        // refresh cases
        refreshCases();
        alert(`Loaded ${files.length} Cases.`);
    });
}

const caseStoreName = "cases";
const caseImgStoreName = "images";
const caseDBName = "mmclone.cases";
let caseDbPromise;
// Returns a promise for the DB
function openCaseDB() {
    if (caseDbPromise)
        return caseDbPromise;

    caseDbPromise = idb.openDB(caseDBName, 2, {
        upgrade(db, oldVersion) {
            // INFO: mitigrations here
            // No store before => create new
            if (oldVersion < 1) {
                const caseStore = db.createObjectStore(caseStoreName, {
                    keyPath: 'id'
                });
                caseStore.createIndex('id', 'id');
                const caseImgStore = db.createObjectStore(caseImgStoreName, {
                    keyPath: 'id'
                });
                caseImgStore.createIndex('id', 'id');
            }
        }
    });
    return caseDbPromise;
}

// Loads json from a file and saves it into the db
async function loadCaseJson(file) {
    // load object into store. use json["id"] as key
    return new Promise((resolve, reject) => {
        // read json file
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            // fetch + parse as json
            let text = event.target.result;
            let json = JSON.parse(text);
            console.debug(`Loaded case file ${file.name}`);
            saveCaseJson(json).then(() => resolve());
        });
        reader.readAsText(file);
    });
}

async function saveCaseJson(json) {
    console.debug(json);
    // open db
    return openCaseDB().then(db => {
        // save object in db
        return db.put(caseStoreName, json);
    });
}

// Deletes a case from the db
async function removeCase(key) {
    const db = await openCaseDB();
    return db.delete(caseStoreName, key);
}
// Deletes all cases from the db
async function clearCaseDB() {
    return (await openCaseDB()).clear(caseStoreName);
}

async function clearCaseImgDB() {
    return (await openCaseDB()).clear(caseStoreName);
}

async function saveCaseImage(folder, name, blob) {
    const db = await openCaseDB();
    let prefix = folder.split("cases/")[1].split("/")[0]; // remove "cases/", then take the first folder after that
    let id = `${prefix}_${name}`;
    return db.put(caseImgStoreName, {
        blob: blob,
        id: id
    });
}

async function loadCaseImage(caseName, img) {
    let key = `${caseName}_${img}`;
    return (await openCaseDB()).get(caseImgStoreName, key).then(result => result && result.blob)
}

async function getStepImageFront(step) {
    let img = step.image_front;
    if (!img)
        img = `${step.id}_front.png`
    return loadCaseImage(Global.currentCase.id, img)
}

async function getStepImageBack(step) {
    let img = step.image_back;
    if (!img)
        img = `${step.id}_back.png`
    return loadCaseImage(Global.currentCase.id, img)
}

// helper to delete all children of a element
function clearChildren(parent) {
    var childArray = parent.children;
    var cL = childArray.length;
    while (cL > 0) {
        cL--;
        parent.removeChild(childArray[cL]);
    }
}

// Read cases from db and load them into the frontend
async function refreshCases() {
    // Get cases from db
    const db = await openCaseDB();
    let cases = await db.getAll(caseStoreName);

    console.debug(`Loaded ${cases.length} Cases from idb`);
    if (cases.length == 0)
        return;

    Global.cases = {}
    for (let key in cases) {
        let val = cases[key];
        Global.cases[val["id"]] = val;
    }

    // Put into select
    let select = document.getElementById("select_case");
    clearChildren(select);
    for (let key in Global.cases) {
        let val = Global.cases[key];
        let text = val.difficulty ? `${val.name} (${val.difficulty})` : val.name
        select.append(new Option(text, key));
    }
    // set to starting case
    let startCase = Global.MAP.metadata.startCase;
    if (startCase) {
        if (Object.keys(Global.cases).find(c => c == startCase)) {
            select.value = startCase;
        } else {
            console.log(`Starting case ${startCase} not found.`);
        }
    }


    let id = select.value;
    // Manually call the change func
    handleCaseChange(id);
}

function changeCase(id) {
    let select = document.getElementById("select_case");
    let index = null;
    for (let i in select.options) {
        let opt = select.options[i];
        if (opt.value == id) {
            index = i;
            break;
        }
    }
    if (!index) {
        console.log(`Case with ID ${id} not found.`);
        return false;
    }
    select.selectedIndex = index;
    // select event doesnt trigger, call manually
    handleCaseChangeCall(id);
    return true;
}

function handleCaseChange(id) {
    sendChangeCase(id);
    handleCaseChangeCall(id);
}

function handleCaseChangeCall(id) {
    let selected = Global.cases[id];
    if (!selected)
        return;

    Global.currentCase = selected;
    Global.caseProgress = 0;
    buildCards();
    updateCaseStep();
    console.debug(`Selected case ${selected.name} (ID ${selected.id})`);
}

function resetCase() {
    if (!Global.currentCase)
        return;

    sendResetCase();
    resetCaseCall();
}

function resetCaseCall() {
    if (!Global.currentCase)
        return;

    Global.caseProgress = 0;
    // just rebuild cards lmao
    buildCards();
    updateCaseStep();
    console.debug(`Reset case ${Global.currentCase.name} (ID ${Global.currentCase.id})`);
}

// Updates the objective text and markers.
function updateCaseStep() {
    let step = Global.currentCase.steps[Global.caseProgress];
    if (!step)
        return;
    // update solutions
    clearCaseMarkers();

    // then add the new ones
    let root = buildStepNodes(step);
    // update objective label
    Global.CASE.objective = step.text ? step.text : "";
    if (root && root.counter != null) {
        updateObjective(Global.CASE.objective, root.counter, root.children.length);
    } else
        updateObjective(Global.CASE.objective, null, null);

    console.debug(`Built ${Global.CASE.nodes.length} nodes.`);
    console.debug(`Added ${Global.caseMarkers.length} new markers`);
}

function clearCaseMarkers() {
    // clear existing circles
    console.debug(`Removing ${Global.caseMarkers.length} markers`);
    for (let key in Global.caseMarkers) {
        let val = Global.caseMarkers[key];
        val.remove();
    }
    Global.caseMarkers = [];
}

function buildStepNodes(step) {
    Global.CASE.nodes = [];
    if (step.solution) {
        return buildStepNode(step.solution, null)
    }
    return null;
}

function solveParent(node) {
    // mark this node as done
    node.done = true;
    // pass to parent
    if (node.parent == null)
        solveStep();
    else
        solveNode(node.parent);
}

function solveNode(node) {
    if (node.done)
        return;

    console.debug(`Solving node ${node.type}`);
    switch (node.type) {
        case "or":
        case "circle": {
            solveParent(node);
            break;
        }
        case "and": {
            let solved = incrementNodeCall(node);
            // only inform other clients if the node wasnt solved. else solveStep should do it (in hopes of defeating potential desync)
            if (!solved) // also send all done nodes to the other clients
                sendIncrementNode(node.id, node.children.filter(n => n.done).map(n => n.id));
            break;
        }
        default: {
            console.log(`solveNode: Unknown Type ${s.type}`);
            break;
        }
    }
}

function incrementNode(id, solved) {
    let node = Global.CASE.nodes[id];
    if (!node || node.done)
        return;

    // increment the node counter
    incrementNodeCall(node);
    // mark all solved nodes as done
    solved.forEach((i) => {
        let node = Global.CASE.nodes[i];
        if (node)
            node.done = true;
    })
}

// increments the counter on a node. returns true if the node was solved.
function incrementNodeCall(node) {
    node.counter++;
    if (node.counter >= node.children.length) {
        solveParent(node);
        return true;
    }

    //TODO: delete all done children?

    // only update the top node
    if (node.parent == null)
        updateObjective(Global.CASE.objective, node.counter, node.children.length);
    return false;
}

function buildStepNode(node, parent) {
    // create new node
    let id = Global.CASE.nodes.length;
    let n = {
        type: node.type,
        id: id,
        parent: parent,
        children: [],
    };
    Global.CASE.nodes[id] = n;

    switch (node.type) {
        case "circle": {
            const fillColor = Global.DEBUG.enabled ? "#f00" : "#fff";
            const opacity = Global.DEBUG.enabled ? 0.5 : 0;
            var circle = L.circle([node.y, node.x], {
                contextmenu: true,
                color: "none",
                fillColor: fillColor,
                fillOpacity: opacity,
                radius: node.radius,
                bubblingMouseEvents: false, // needed or else we cause a map contextmenu event
            });
            circle.addTo(Global.map);
            circle.addEventListener("click", () => solveNode(n));
            Global.caseMarkers.push(circle);
            break;
        }
        case "and": {
            n.counter = 0;
            node.nodes.forEach((child) => {
                n.children.push(buildStepNode(child, n));
            });
            break;
        }
        case "or": {
            node.nodes.forEach((child) => {
                n.children.push(buildStepNode(child, n));
            });
            break;
        }
        default: {
            console.log(`buildStepNode: Unknown Type ${s.type}`);
            break;
        }
    }
    return n;
}

function solveStep() {
    if (!Global.currentCase)
        return;

    let step = Global.currentCase.steps[Global.caseProgress];
    if (!step)
        return;

    // send mp
    sendSolveStep()
    // call rpc func
    solveStepCall()
}
// Solves the current step and shows the solution. Also unlocks the next button.
function solveStepCall() {
    if (!Global.currentCase)
        return;

    let step = Global.currentCase.steps[Global.caseProgress];
    if (!step)
        return;

    //INFO: if step is solved, open menu, flip card, unlock next card. thats all
    // slide instantly to next current card
    Global.UI.swiper.slideTo(Global.caseProgress, 0);
    // open menu
    setMenuVisible("card-menu", "top", true);
    // flip card, stamp if there was a solution
    flipCard(Global.caseProgress, step.solution != null).then(() => {
        // unlock next card
        progressCase();
    });
}

function setCaseProgress(progress) {
    if (progress == Global.caseProgress)
        return;

    // set to progress - 1
    Global.caseProgress = progress - 1;
    // update cards to flip and unlock each cards
    updateCards();
    // then solve that step to do all the necessary stuff
    solveStepCall();
    //TODO: dont rely on solvestep?
}

// Increases the case progress and updates the objective and solution text.
function progressCase() {
    if (!Global.currentCase) {
        alert("No case selected!");
        return;
    }

    console.debug(`Increasing case step from ${Global.caseProgress}`);
    Global.caseProgress++;

    // update cards
    updateCards();
    //TODO: end of case animation or smth
    if (Global.caseProgress == Global.currentCase.steps.length) {
        console.debug("Reached the end of the case.");
        // clear any case leftovers
        Global.CASE.objective = "";
        clearCaseMarkers();
        updateObjective(Global.CASE.objective, null, null);
        // stamp the cards
        playFinalAnimation();
        return;
    }

    // update the case
    updateCase();
}

// used to update the case. if you want to progress, use progressCase();
function updateCase() {
    updateCaseStep();
}