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

async function getCaseImage(caseName, img) {
    let key = `${caseName}_${img}`;
    return (await openCaseDB()).get(caseImgStoreName, key).then(result => result && result.blob)
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
        select.append(new Option(val["name"], key));
    }
    // Manually call the change func
    handleCaseChange(select);
}

function handleCaseChange(select) {
    let option = select.selectedOptions[0]
    let selected = Global.cases[option.value];
    if (!selected)
        return;
    Global.currentCase = selected;
    Global.caseProgress = 0;
    updateCase();
    console.debug(`Selected case ${selected.name} (ID ${selected.id})`);
}

// Updates the objective text and markers. Returns the amount of solutions
function updateCaseStep() {
    let step = Global.currentCase.steps[Global.caseProgress];
    if (!step)
        return;
    // update objective label
    let label = document.getElementById("case_objective");
    label.textContent = step.text ? step.text : "";
    let objectiveImg = step.image_front;
    if (!objectiveImg)
        objectiveImg = `${step.id}_front.png`
    getCaseImage(Global.currentCase.id, objectiveImg).then(img => {
        if (img)
            document.getElementById("case_img_front").src = URL.createObjectURL(img);;
    });
    // clear solution
    document.getElementById("case_solution_title").textContent = "";
    document.getElementById("case_solution_text").textContent = "";
    document.getElementById("case_img_back").src = "";

    // update solutions
    // clear existing circles
    console.debug(`Removing ${Global.caseMarkers.length} markers`);
    for (let key in Global.caseMarkers) {
        let val = Global.caseMarkers[key];
        val.remove();
    }
    Global.caseMarkers = [];

    // then add the new ones
    var fillColor = Global.DEBUG ? "#f00" : "#fff";
    var opacity = Global.DEBUG ? 0.5 : 0;
    console.debug(`Adding ${step.solutions ? step.solutions.length : 0} new markers`);
    for (let key in step.solutions) {
        let s = step.solutions[key];
        switch (s.type) {
            case "circle": {
                var circle = L.circle([s.y, s.x], {
                    contextmenu: true,
                    color: "none",
                    fillColor: fillColor,
                    fillOpacity: opacity,
                    radius: s.radius,
                    bubblingMouseEvents: false, // needed or else we cause a map contextmenu event
                });
                circle.addTo(Global.map);
                circle.addEventListener("click", () => solveStep());
                Global.caseMarkers.push(circle);
                break;
            }
            default: {
                console.log(`Unknown Type ${s.type}`);
                break;
            }
        }
    }
    return step.solutions ? step.solutions.length : 0;
}

// Enable/disable the "next" button
function unlockNextButton() {
    document.getElementById("button_next").disabled = false;
}

function lockNextButton() {
    document.getElementById("button_next").disabled = true;
}

// Solves the current step and shows the solution. Also unlocks the next button.
function solveStep() {
    if (!Global.currentCase)
        return;

    let step = Global.currentCase.steps[Global.caseProgress];
    if (!step)
        return;

    // show solution
    document.getElementById("case_solution_title").textContent = step.solution_title;
    document.getElementById("case_solution_text").textContent = step.solution_text;

    let solutionImg = step.image_back;
    if (!solutionImg)
        solutionImg = `${step.id}_back.png`
    getCaseImage(Global.currentCase.id, solutionImg).then(img => {
        if (img)
            document.getElementById("case_img_back").src = URL.createObjectURL(img);
    });

    // unlock button
    unlockNextButton();
}

// Increases the case progress and updates the objective and solution text.
function progressCase() {
    if (!Global.currentCase) {
        alert("No case selected!");
        return;
    }

    //TODO: check end of case
    console.debug(`Increasing case step from ${Global.caseProgress}`);
    Global.caseProgress++;
    updateCase();
}

// used to update the case. if you want to progress, use progressCase();
function updateCase() {
    let amountSolutions = updateCaseStep();
    if (amountSolutions > 0)
        lockNextButton();
    else
        solveStep();
}