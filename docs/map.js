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
        Global.mapMetadata = meta;
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
        maxZoom: Global.mapMetadata.maxZoom,
        minZoom: Global.mapMetadata.minZoom,
        zoomSnap: 1,
        zoomDelta: .75,
        wheelPxPerZoomLevel: 250,
        bounceAtZoomLimits: false,
        maxBounds: [c.unproject(L.point(-MAP_BOUNDS_EXTENSION, -MAP_BOUNDS_EXTENSION)), c.unproject(L.point(
            Global.mapMetadata.width + MAP_BOUNDS_EXTENSION, Global.mapMetadata.height + MAP_BOUNDS_EXTENSION))],
        maxBoundsViscosity: MAP_BOUNDS_VISCOSITY,
        attributionControl: false
    });

    // hijack right click menu
    Global.map.on("contextmenu.show", onMapRightClick);
    Global.map.on("mousemove", onMapMouseMove);
    // create offline layer
    Global.baseLayer = LeafletOffline.tileLayerOffline("{z}/{y}/{x}.png", {
        minZoom: Global.mapMetadata.minZoom,
        maxZoom: Global.mapMetadata.maxZoom,
        noWrap: true,
        tms: false,
        edgeBufferTiles: 1,
        tileSize: MAP_BASE_TILE_SIZE,
        bounds: [c.unproject(L.point(0, 0)), c.unproject(L.point(Global.mapMetadata.width, Global.mapMetadata.height))]
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
    Global.map.setView([0,0], 0);
    // zoom into middle of map
    let startZoom = Global.mapMetadata.startZoom ? Global.mapMetadata.startZoom : Global.mapMetadata.minZoom;
    Global.map.setView(Global.map.getCenter(), startZoom);
}

function onMapMouseMove(e) {
    //TODO: limit cursor updates
    // send it
    if (!Global.MP.dontSendCursor && Global.MP.peer)
    {
        let now = new Date();
        let diff = now - Global.MP.lastCursorUpdate;
        if (diff > Global.MP.cursorUpdateLimit)
        {
            Global.MP.lastCursorUpdate = now;
            sendCursorPos(e.latlng.lng, e.latlng.lat);
        }
    }
}

async function saveTile(coords, blob) {
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

    return LeafletOffline.saveTile(info, blob)
}

// Called from the map file upload
function handleZipFile(event) {
    alert("Loading Zip. This can take up to 30 seconds depending on the map size. Press OK to continue.");
    console.debug("Got Zip File");
    let files = event.target.files;
    let promises = [];
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        console.debug(`Loading Zip ${file.name}`);
        promises.push(loadFromZip(file));
    }

    Promise.all(promises).then(() => {
        // info at the end of load
        console.log("done");
        alert(`Loaded Zip. Refreshing site.`);
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
    fetch(path).then(res => res.blob()).then(blob => loadFromZip(blob)).then(() => {
        alert(`Loaded Map. Refreshing site.`);
        if (!Global.DEBUG.enabled)
            window.location.reload();
    });
}