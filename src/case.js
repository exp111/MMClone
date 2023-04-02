function handleCaseFile(event) {
    console.debug("Got Case File(s)");
    let files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        console.debug(`Loading Case from ${file}`);
        loadCaseJson(file);
    }
    //TODO: inform user at the end of load
    //alert(`Loaded ${files.length} Cases.`);

    // refresh cases
    refreshCases();
}

const caseStoreName = "cases";
const caseDBName = "mmclone.cases";
let dbPromise;
// Returns a promise for the DB
function openCaseDB() {
    if (dbPromise)
        return dbPromise;

    dbPromise = idb.openDB(caseDBName, 2, {
        upgrade(db, oldVersion) {
            // INFO: mitigrations here
            // No store before => create new
            if (oldVersion < 1) {
                const caseStore = db.createObjectStore(caseStoreName, {
                    keyPath: 'id'
                });
                caseStore.createIndex('id', 'id');
            }
        }
    });
    return dbPromise;
}

// Loads json from a file and saves it into the db
function loadCaseJson(file) {
    // load object into store. use json["id"] as key
    // read json file
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
        // fetch + parse as json
        let url = event.target.result;
        fetch(url).then(res => res.json())
            .then(json => {
                console.debug(json);
                // open db
                openCaseDB().then(db => {
                    // save object in db
                    db.put(caseStoreName, json);
                });
            });
    });
    reader.readAsDataURL(file);
    console.debug(`Loaded case file ${file}`);
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
    for (let c in cases) {
        let val = cases[c];
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
    Global.currentCase = selected;
    Global.caseProgress = 0;
    console.debug(`Selected case ${selected.name} (ID ${selected.id})`);
}

function updateCaseStep() {
    let step = Global.currentCase.steps[Global.caseProgress];
    if (!step)
        return;
    // update objective label
    let label = document.getElementById("case_objective");
    label.textContent = step.text ? step.text : "";

    //TODO: update solutions
}