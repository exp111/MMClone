// opens a file input and calls the callback when a file is selected
function askForFile(callback, accept) {
    let input = document.createElement("input");
    input.type = "file";
    input.onchange = callback;
    input.accept = accept;
    input.click();
}

let start = new Date();
function setProgressBar(text, val) {
    console.debug(`${text} (${(new Date() - start) / 1000} seconds)`);
    let progress = document.getElementById("load-progress");
    let loadText = document.getElementById("load-text");
    loadText.textContent = text;
    progress.value = val;
    //TODO: set text
}
//TODO: move parsing funcs into map.js/case.js
async function loadFromZip(f) {
    //TODO: JSZip doesn't support windows style paths (\\)
    //TODO: warn user cause deleting
    start = new Date();
    setProgressBar("Opening file...", 0);
    return JSZip.loadAsync(f)
        .then(async (zip) => {
            console.debug(zip);
            promises = [];
            mapFiles = [];

            // Load map
            setProgressBar("Loading map files...", 10);
            clearMapDB();
            let mapTileCounter = 0;

            function MapRead(path, entry) {
                if (entry.dir)
                    return;

                // TODO: check file ending?
                // try to parse coords
                let coords = parseCoords(path);
                if (!coords)
                    return;

                mapTileCounter++;
                let promise = entry.async("blob").then(blob => {
                    mapFiles.push(createTileDBObj(coords, blob));
                });
                promises.push(promise);
            }
            zip.folder("map").forEach(MapRead);
            console.debug(`Found ${mapTileCounter} Map Tiles...`);

            // Map.json metadata
            let mapJson = zip.file("map.json");
            if (mapJson) {
                setProgressBar("Loading map metadata", 20);
                let promise = mapJson.async("text").then(text => saveMapMetadata(JSON.parse(text)));
                promises.push(promise);
            }

            // Cases
            clearCaseDB();
            clearCaseImgDB();
            setProgressBar("Loading cases...", 25);
            let caseCounter = 0;
            let cases = [];
            let casePromises = [];

            function CaseRead(path, entry) {
                if (entry.dir)
                    return;

                if (!entry.name.endsWith(".json"))
                    return;

                caseCounter++;
                let promise = entry.async("text").then(text => {
                    // parse json
                    let json = JSON.parse(text);
                    // save case id, so we can load the case images later
                    cases.push(json.id);
                    // save into db
                    saveCaseJson(json);
                });
                casePromises.push(promise);
            }
            zip.folder("cases").forEach(CaseRead);
            console.debug(`Found ${caseCounter} Cases.`);

            // load case images
            Promise.all(casePromises).then(() => {
                setProgressBar("Loading case images...", 40);
                let caseImgCounter = 0;
                for (let key in cases) {
                    let id = cases[key];
                    let path = `cases/${id}`
                    zip.folder(path).forEach((p, e) => {
                        if (e.dir)
                            return;
                        //TODO: file ending check?

                        caseImgCounter++;
                        let promise = e.async("blob").then(blob => saveCaseImage(path, p, blob));
                        promises.push(promise);
                    });
                }
                console.debug(`Found ${caseImgCounter} Case Images.`);
            });

            await Promise.all(promises);
            // save files in one transaction
            setProgressBar("Saving map files to db...", 60);
            let tx = await openMapTransaction();
            let store = tx.store;
            mapFiles.forEach((f) => {
                store.put(f);
            });
            tx.commit();
            setProgressBar(`Waiting for transaction...`, 70);
            await tx.done;
            setProgressBar(`Done.`, 100);
        });
}