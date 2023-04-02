const MAP_BOUNDS_VISCOSITY = 1;
const MAP_WIDTH_IN_PIXELS = 24685;
const MAP_HEIGHT_IN_PIXELS = 17513;
const MAP_BASE_TILE_SIZE = 256;

const MAP_MIN_ZOOM = 2;
const MAP_BOUNDS_EXTENSION = 1e3;
const MAP_MAX_RESOLUTION = 1;

// copy cause it sucks ass
function getTileUrl(urlTemplate, data) {
    return leaflet.Util.template(urlTemplate, {
        ...data,
        r: leaflet.Browser.retina ? '@2x' : ''
    });
}

function initMap() {
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
        maxZoom: 6,
        minZoom: MAP_MIN_ZOOM,
        zoomSnap: 1,
        zoomDelta: .75,
        wheelPxPerZoomLevel: 250,
        bounceAtZoomLimits: false,
        maxBounds: [c.unproject(L.point(-MAP_BOUNDS_EXTENSION, -MAP_BOUNDS_EXTENSION)), c.unproject(L.point(
            MAP_WIDTH_IN_PIXELS + MAP_BOUNDS_EXTENSION, MAP_HEIGHT_IN_PIXELS +
            MAP_BOUNDS_EXTENSION))],
        maxBoundsViscosity: MAP_BOUNDS_VISCOSITY,
        attributionControl: false
    });

    // hijack right click menu
    Global.map.on("contextmenu.show", onMapRightClick);
    // create offline layer
    Global.baseLayer = LeafletOffline.tileLayerOffline("{z}/{y}/{x}.png", {
        minZoom: MAP_MIN_ZOOM,
        maxZoom: 6,
        noWrap: true,
        tms: !1,
        edgeBufferTiles: 1,
        tileSize: MAP_BASE_TILE_SIZE,
        bounds: [c.unproject(L.point(0, 0)), c.unproject(L.point(MAP_WIDTH_IN_PIXELS,
            MAP_HEIGHT_IN_PIXELS))]
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
    Global.map.setView([0, 0], 0);
}

function zoomIn() {
    Global.map.zoomIn();
}

function zoomOut() {
    Global.map.zoomOut();
}

function createCircle(e) {
    let y = e.latlng.lat;
    let x = e.latlng.lng;
    let radius = 100;
    let circle = L.circle([y + radius, x + radius], {
        contextmenu: true,
        color: "none",
        fillColor: "#f00",
        fillOpacity: 0.5,
        radius: radius,
        bubblingMouseEvents: false, // needed or else we cause a map contextmenu event
    });
    circle.addTo(Global.map);
}

function deleteCircle(e) {
    let target = e.relatedTarget;
    if (!target)
        return;
    //TODO: remove from global array if casemarker?
    target.remove();
}

// Creates a marker at e.latlng
function createMarker(e) {
    let y = e.latlng.lat;
    let x = e.latlng.lng;
    let radius = 100;
    let marker = L.marker([y + radius, x + radius], {
        contextmenu: true,
    });
    marker.addTo(Global.map);
    Global.markers.push(marker);
}

// Removes the given marker
function deleteMarker(e) {
    let target = e.relatedTarget;
    if (!target)
        return;

    // remove from global array
    for (let key in Global.markers) {
        let val = Global.markers[key];
        if (val == target) {
            Global.markers.splice(key, 1);
            break;
        }
    }

    // remove from map
    target.remove();
}


// Called on contextmenu, add our own items
function onMapRightClick(e) {
    // clear menu
    e.contextmenu.removeAllItems();
    // First context relevant ones
    if (e.relatedTarget) {
        let target = e.relatedTarget;
        let addSeperator = true;
        // marker
        if (target instanceof(L.Marker)) {
            e.contextmenu.addItem({
                text: 'Delete Marker',
                callback: deleteMarker
            });
            //TODO: let user set color
        } else if (target instanceof(L.Circle)) {
            // only add circle items on debug
            if (Global.DEBUG) {
                e.contextmenu.addItem({
                    text: 'Delete Circle',
                    callback: deleteCircle
                });
                //TODO: set radius by opening a popup, giving the circle to it and letting user change radius
            } else {
                addSeperator = false;
            }
        }

        // add seperator
        if (addSeperator)
            e.contextmenu.addItem("-");
    }

    // Add marker //TODO: remove when on marker?
    e.contextmenu.addItem({
        text: "Add Marker",
        callback: createMarker
    });

    // Zoom
    e.contextmenu.addItem({
        text: "Zoom in",
        callback: zoomIn
    });
    e.contextmenu.addItem({
        text: "Zoom out",
        callback: zoomOut
    });

    // Debug items
    if (Global.DEBUG) {
        e.contextmenu.addItem("-");
        e.contextmenu.addItem({
            text: `Pos: ${e.latlng}`,
            disabled: true
        });
        e.contextmenu.addItem({
            text: "Add Circle",
            callback: createCircle
        });
    }
}

function saveTile(coords, blob) {
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

    LeafletOffline.saveTile(info, blob)
}

// Called from the map file upload
function handleMapFile(event) {
    console.debug("Got Map File");
    let files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        console.debug(`Loading Map from ${file}`);
        loadMapFromZip(file);
    }
}
// attach handler to input (in index.html)

// Parses coords from a map/ path. Else returns null
function parseCoords(path) {
    // map/6/9/9.png
    let p = path.split("map/")[1]; // remove "img/"
    p = p.split(".")[0]; // remove file ending
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

var loadedTiles;

function loadMapFromZip(f) {
    //TODO: warn user cause deleting
    // delete the current cache
    clearMapDB();

    //TODO: sometimes reading doesnt fully read everything and you need multiple tries. idk why

    loadedTiles = {};
    JSZip.loadAsync(f)
        .then((zip) => {
            // load images
            zip.forEach(function (path, entry) {
                // only need files
                if (entry.dir)
                    return;

                // map imgs are in path "map/"
                if (!path.startsWith("map/"))
                    return;

                // TODO: check file ending?

                // try to parse coords
                let coords = parseCoords(path);
                if (!coords)
                    return;

                loadedTiles[`${coords.z}/${coords.y}/${coords.x}`] = false;

                entry.async("arraybuffer").then(c => {
                    console.debug(
                        `loaded data for (x: ${coords.x}, y: ${coords.y}, z: ${coords.z}), url ${path}`
                    );
                    let buffer = new Uint8Array(c);
                    let blob = new Blob([buffer.buffer]);
                    saveTile(coords, blob);
                    loadedTiles[`${coords.z}/${coords.y}/${coords.x}`] = true;
                });
            });
        });
    //TODO: info at the end of load
    //alert("Loaded Map.");
}

function printMissingTiles() {
    print("Missing tiles");
    for (let key in loadedTiles) {
        let val = loadedTiles[key];
        if (!val)
            console.log(`Missing ${key}`);
    }
}