Global.MAP = {
    markers: {},
    nextMarkerID: 0,
    metadata: {
        name: "Placeholder",
        minZoom: 2,
        maxZoom: 6,
        width: 300,
        height: 300
    }
}

const MAP_BOUNDS_VISCOSITY = 1;
const MAP_BASE_TILE_SIZE = 256;
const MAP_BOUNDS_EXTENSION = 1e3;
const MAP_MAX_RESOLUTION = 1;
const INITIAL_AREA = 2e3;

// copy cause it sucks ass
function getTileUrl(urlTemplate, data) {
    return leaflet.Util.template(urlTemplate, {
        ...data,
        r: leaflet.Browser.retina ? '@2x' : ''
    });
}

const metadataStoreName = "metadata";
const metaDBName = "mmclone.meta";
let metaDbPromise;
// Returns a promise for the DB
function openMetaDB() {
    if (metaDbPromise)
        return metaDbPromise;

    metaDbPromise = idb.openDB(metaDBName, 2, {
        upgrade(db, oldVersion) {
            // INFO: mitigrations here
            // No store before => create new
            if (oldVersion < 1) {
                const metaStore = db.createObjectStore(metadataStoreName, {
                    keyPath: 'id'
                });
                metaStore.createIndex('id', 'id');
            }
        }
    });
    return metaDbPromise;
}

const mapMetadataID = "map";
async function loadMapMetadata() {
    const db = await openMetaDB();
    return await db.get(metadataStoreName, mapMetadataID);
}

async function saveMapMetadata(json) {
    openMetaDB().then(db => {
        // save object in db
        db.put(metadataStoreName, {
            ...json,
            id: mapMetadataID
        });
    });
}

async function initMap() {
    let meta = await loadMapMetadata();
    if (meta)
        Global.MAP.metadata = meta;
    l = Math.pow(2, 6) * MAP_MAX_RESOLUTION;
    transformation = .5;
    u = transformation;

    var c = L.CRS.Simple;
    c.transformation = new L.Transformation(u, 0, u, 0);
    c.scale = function (e) {
        return Math.pow(2, e) / l
    }
    c.zoom = function (e) {
        return Math.log(e * l) / Math.LN2
    }

    Global.map = L.map('map', {
        contextmenu: true,
        contextmenuItems: [{}], // needs object inside to open
        crs: c,
        maxZoom: Global.MAP.metadata.maxZoom,
        minZoom: Global.MAP.metadata.minZoom,
        zoomSnap: 1,
        zoomDelta: .75,
        wheelPxPerZoomLevel: 250,
        bounceAtZoomLimits: false,
        maxBounds: [c.unproject(L.point(-MAP_BOUNDS_EXTENSION, -MAP_BOUNDS_EXTENSION)), c.unproject(L.point(
            Global.MAP.metadata.width + MAP_BOUNDS_EXTENSION, Global.MAP.metadata.height + MAP_BOUNDS_EXTENSION))],
        maxBoundsViscosity: MAP_BOUNDS_VISCOSITY,
        attributionControl: false
    });

    // hijack right click menu
    Global.map.on("contextmenu.show", onMapRightClick);
    Global.map.on("mousemove", onMapMouseMove);
    Global.map.on("draw:editmove", onDrawEditMove);
    Global.map.on("draw:editresize", onDrawEditResize);
    // create offline layer
    Global.baseLayer = LeafletOffline.tileLayerOffline("{z}/{y}/{x}.png", {
        minZoom: Global.MAP.metadata.minZoom,
        maxZoom: Global.MAP.metadata.maxZoom,
        noWrap: true,
        tms: false,
        edgeBufferTiles: 1,
        tileSize: MAP_BASE_TILE_SIZE,
        bounds: [c.unproject(L.point(0, 0)), c.unproject(L.point(Global.MAP.metadata.width, Global.MAP.metadata.height))]
    });

    // let layer let from cache
    Global.baseLayer.on("tileloadstart", (event) => {
        tile = event.tile;
        coords = event.coords;
        url = getTileUrl(Global.baseLayer._url, coords);
        // reset tile.src, to not start download yet
        tile.src = '';
        LeafletOffline.getBlobByKey(url).then((blob) => {
            if (blob) {
                tile.src = URL.createObjectURL(blob);
                console.debug(`Loaded ${url} from idb`);
                return;
            }
            console.debug(`missing tile ${url}`);
        });
    });
    Global.baseLayer.addTo(Global.map);

    //INFO: need to set view once before moving
    Global.map.setView([0, 0], 0);
    // zoom into middle of map
    let startZoom = Global.MAP.metadata.startZoom ? Global.MAP.metadata.startZoom : Global.MAP.metadata.minZoom;
    Global.map.setView(Global.map.getCenter(), startZoom);
}

function onMapMouseMove(e) {
    //TODO: limit cursor updates
    // send it
    if (!Global.MP.dontSendCursor && Global.MP.peer) {
        let now = new Date();
        let diff = now - Global.MP.lastCursorUpdate;
        if (diff > Global.MP.cursorUpdateLimit) {
            Global.MP.lastCursorUpdate = now;
            sendCursorPos(e.latlng.lng, e.latlng.lat);
        }
    }
}

const tileStoreName = 'tileStore';
const urlTemplateIndex = 'urlTemplate';
let tileDbPromise = null;

function openTilesDataBase() {
    if (tileDbPromise) {
        return tileDbPromise;
    }
    tileDbPromise = idb.openDB('leaflet.offline', 2, {
        upgrade(db, oldVersion) {
            idb.deleteDB('leaflet_offline');
            idb.deleteDB('leaflet_offline_areas');

            if (oldVersion < 1) {
                const tileStore = db.createObjectStore(tileStoreName, {
                    keyPath: 'key',
                });
                tileStore.createIndex(urlTemplateIndex, 'urlTemplate');
                tileStore.createIndex('z', 'z');
            }
        },
    });
    return tileDbPromise;
}
async function openMapTransaction() {
    return (await openTilesDataBase()).transaction(tileStoreName, "readwrite");
}

function createTileDBObj(coords, blob) {
    let info = createTileDBInfo(coords);
    return {
        blob,
        ...info,
    };
}

function createTileDBInfo(coords) {
    url = getTileUrl(Global.baseLayer._url, coords);
    info = {
        key: url,
        url: url,
        x: coords.x,
        y: coords.y,
        z: coords.z,
        urlTemplate: Global.baseLayer._url,
        createdAt: Date.now()
    };
    return info;
}
async function saveTile(coords, blob) {
    let info = createTileDBInfo(coords);
    return LeafletOffline.saveTile(info, blob);
}

// Called from the map file upload
function handleZipFile(event) {
    // hide menu
    setMenuVisible("menu", "bottom", false);
    // show load menu
    setMenuVisible("load-menu", "top", true);
    console.debug("Got Zip File");
    let files = event.target.files;
    let promises = [];
    let start = new Date();
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        console.debug(`Loading Zip ${file.name}`);
        promises.push(loadFromZip(file));
    }

    Promise.all(promises).then(() => {
        // info at the end of load
        let txt = `Loaded Zip in ${(new Date() - start) / 1000} seconds. Refreshing site.`;
        console.log(txt);
        alert(txt);
        if (!Global.DEBUG.enabled)
            window.location.reload();
    });
}
// attach handler to input (in index.html)

// Parses coords from a map/ path. Else returns null
function parseCoords(path) {
    // 6/9/9.png
    let p = path.split(".")[0]; // remove file ending
    nums = p.split("/"); // split by dirs
    if (nums.length != 3)
        return null;

    return {
        z: nums[0], // zoom first
        y: nums[1], // then y
        x: nums[2], // then x
    }
}

function clearMapDB() {
    LeafletOffline.truncate();
}

function loadTestMap() {
    const path = "data/ghosthunt.zip";
    alert("Fetching and loading Test Map. This can take a few seconds. Press OK to continue.");
    let start = new Date();
    fetch(path).then(res => res.blob()).then(blob => loadFromZip(blob)).then(() => {
        let txt = `Loaded Map in ${(new Date() - start) / 1000} seconds. Refreshing site.`;
        console.log(txt);
        alert(txt);
        if (!Global.DEBUG.enabled)
            window.location.reload();
    });
}

function getNextMarkerID() {
    // get next free id
    while (Global.MAP.markers[Global.MAP.nextMarkerID])
        Global.MAP.nextMarkerID++;
    // return id
    return Global.MAP.nextMarkerID;
}