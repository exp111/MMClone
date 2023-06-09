Global.MP = {
    peer: null,
    connections: [],
    hosting: false,
    hostID: null,
    username: "",
    cursors: {},
    dontSendCursor: false,
    cursorUpdateLimit: 50,
    lastCursorUpdate: 0,
};

// UI
function setPeerID(text, disabled) {
    let peerID = document.getElementById("mp-status");
    peerID.textContent = text;
    peerID.disabled = disabled;
}

function hideLobbyButtons(hidden) {
    let hostLobby = document.getElementById("mp-host-lobby");
    let joinLobby = document.getElementById("mp-join-lobby");
    let display = hidden ? "none" : "";
    hostLobby.style.display = display;
    joinLobby.style.display = display;
}

function setDisconnectHidden(hidden) {
    let disconnect = document.getElementById("mp-disconnect");
    let display = hidden ? "none" : "";
    disconnect.style.display = display;
}

function updatePeerList() {
    let list = document.getElementById("mp-players");
    // clear
    list.innerHTML = "";
    list.style.display = "";
    if (!Global.MP.peer) // hide if we're not connected
    {
        list.style.display = "none";
        return;
    }
    // add header
    let header = document.createElement("div");
    header.textContent = "Players:";
    list.appendChild(header);
    // add us
    let us = document.createElement("div");
    us.textContent = `#1: ${Global.MP.peer.id} (You)`;
    list.append(us);
    // add others
    Global.MP.connections.forEach((con, i) => {
        let p = document.createElement("div");
        p.textContent = `#${i + 2}: ${con.peer}`;
        list.appendChild(p);
    });
}

function generateUsername() {
    let input = document.getElementById("mp-username");
    let passphrase = generatePassphrase();
    Global.MP.username = passphrase;
    input.textContent = `Name: ${passphrase}`;
}

function hideUsername(hidden) {
    let input = document.getElementById("mp-username");
    let display = hidden ? "none" : "";
    input.style.display = display;
}

// MP functions
// opens a lobby so other players can join
function hostLobby() {
    Global.MP.hosting = true;
    initPeer();
}

// asks for a lobby (peer) id and connects to it
function joinLobby() {
    Global.MP.hosting = false;
    Connect();
    //TODO: open lobby browser submenu?
}

// prompts for the id and connects to it. You probably want to call joinLobby()
function Connect() {
    let id = prompt("Enter the Peer ID");
    if (!id)
        return;

    // we only have lowercase IDs
    id = id.toLowerCase();

    Global.MP.hostID = id;
    initPeer();
}

// initializes the peer and connects to the peerjs server
function initPeer() {
    let id = Global.MP.username;
    Global.MP.peer = new Peer(id);
    Global.MP.peer.on("open", onPeerOpen);
    Global.MP.peer.on("disconnected", onPeerDisconnect);
    Global.MP.peer.on("connection", onPeerConnection);
    Global.MP.peer.on("error", onPeerError);
    setPeerID("Connecting...", true);
    hideUsername(true);
}

// disconnects from the server and any lobby
function disconnectMP() {
    if (!Global.MP.peer)
        return;

    Global.MP.peer.disconnect();
}

// called upon a peer error. most likely fatal
function onPeerError(err) {
    //TODO: do we need to clean up?
    console.log(`Peer Error: ${err} (${err.type})`);
    switch (err.type) {
        case "unavailable-id":
            alert("ID already taken.");
            break;
        case "invalid-id":
        case "peer-unavailable":
            alert("Invalid ID.")
            break;
    }
    disconnectMP();
}
// called upon connecting to the peerjs server
function onPeerOpen(id) {
    console.log(`Assigned Peer ID: ${id}`);

    if (Global.MP.hosting) {
        setPeerID(`Peer ID: ${id}`, false);
        updatePeerList();
    } else { // join host
        let hostID = Global.MP.hostID;
        if (hostID) {
            console.debug(`Connecting to ${hostID}`);
            connectToPeer(hostID);
        } else {
            console.debug("No HostID set");
        }
    }
    setDisconnectHidden(false);
    hideLobbyButtons(true);
}

// called upon disconnecting from the server. cleans up
function onPeerDisconnect() {
    //INFO: theoretically we could still reconnect as connections are still alive and such but i dont wanna
    Global.MP.peer.destroy(); // this also destroys all connections
    Global.MP.peer = null;
    Global.MP.connections = [];

    hideUsername(false);
    setPeerID("Disconnected", true);
    setDisconnectHidden(true);
    hideLobbyButtons(false);
    updatePeerList();
    // call content event
    Disconnected();
}

// called upon receiving a new connection from a peer.
function onPeerConnection(connection) {
    console.debug(`new connection from ${connection.peer}`);
    connection.on("close", onConnectionClose);
    connection.on("data", onConnectionDataReceive);
    // if we're hosting, inform them of all the other peers
    if (Global.MP.hosting) {
        // inform them after the connection is ready to read/write
        connection.on("open", hostOnConnectionOpen);
    }
    // add the connection to our peerlist
    Global.MP.connections.push(connection);
    updatePeerList();
}

// copies the current peer id to the clipboard and notifies the user of it
function copyPeerID() {
    if (!Global.MP.peer)
        return;

    navigator.clipboard.writeText(Global.MP.peer.id);
    // notify the user
    console.log("Copied ID to clipboard.");
    alert("Copied ID to clipboard.");
}

// only called by the host to send new data to a connection when its ready
function hostOnConnectionOpen() {
    let connection = this;
    // build peerlist
    let peerList = [];
    Global.MP.connections.forEach((con) => {
        if (con.peer != connection.peer) // send all peers except the current one
            peerList.push(con.peer);
    });
    console.debug(`Sending peers ${peerList.length} to new peer.`);
    // send data
    connection.send({
        type: "lobbyJoin",
        data: {
            peerList: peerList,
            map: Global.MAP.metadata ? Global.MAP.metadata.name : "",
            caseID: Global.currentCase ? Global.currentCase.id : "",
            caseProgress: Global.CASE.progress,
            markerID: Global.MAP.nextMarkerID,
            shapeID: Global.DEBUG.nextShapeID,
        }
    });
}

// connects to a peer and hooks up the events
function connectToPeer(id) {
    let connection = Global.MP.peer.connect(id);
    // init events
    connection.on("open", onConnectionOpen);
    connection.on("close", onConnectionClose);
    connection.on("data", onConnectionDataReceive);
}

// called upon a new connection being initiated (by us)
function onConnectionOpen() {
    let connection = this;
    console.debug(`New Connection to ${connection.peer}`);

    // add host status
    if (!Global.MP.hosting && Global.MP.connections.length == 0) {
        setPeerID(`Connected to ${connection.peer}`, true);
    }
    Global.MP.connections.push(connection);
    updatePeerList();
}

// called upon a connection being closed
function onConnectionClose() {
    let connection = this;
    console.debug(`Closed connection ${connection.peer}`);
    let index = Global.MP.connections.indexOf(connection);
    if (index > -1)
        Global.MP.connections.splice(index, 1);
    updatePeerList();
    // call content event
    PlayerDisconnected(connection);
}

// connects to a list of peers if we havent gotten a connection to them yet
function connectToPeers(peerList) {
    if (!peerList)
        return;

    peerList.forEach((p) => {
        if (p == Global.MP.peer.id) // self id
            return;

        if (Global.MP.connections.find((c) => c.peer == p)) // already connected
            return;

        console.debug(`Connecting to ${p}...`)
        connectToPeer(p);
    });
}

// called upon receiving data from a peer
function onConnectionDataReceive(data) {
    let connection = this;
    let sender = connection.peer;
    switch (data.type) {
        case "lobbyJoin": {
            let peerList = data.data.peerList;
            if (!peerList) {
                console.debug(`Got faulty LobbyJoin message`);
                return;
            }
            let map = data.data.map;
            let caseID = data.data.caseID;
            let caseProgress = data.data.caseProgress;
            let markerID = data.data.markerID;
            let shapeID = data.data.shapeID;
            Global.MAP.nextMarkerID = markerID;
            Global.DEBUG.nextShapeID = shapeID;

            if (Global.MAP.metadata && Global.MAP.metadata.name != map) {
                let txt = `The host is using a different map (${map}). This may cause problems.`;
                console.log(txt);
                alert(txt);
            }
            // connect to peers
            console.debug(`Got LobbyJoin message (${peerList.length} Peers)`);
            connectToPeers(peerList);
            // change the case
            if (changeCase(caseID)) {
                setCaseProgress(caseProgress);
            } else {
                let txt = `The host is using a case you don't have (${caseID}). This may cause problems.`;
                console.log(txt);
                alert(txt);
            }
            break;
        }
        case "cursorUpdate": {
            let x = data.data.x;
            let y = data.data.y;
            cursorUpdate(sender, x, y);
            return; // dont log
        }
        case "solveStep": {
            let id = data.data.id;
            solveStepCall(id);
            break;
        }
        case "incrementNode": {
            let step = data.data.step;
            let id = data.data.id;
            let solved = data.data.solved;
            incrementNode(step, id, solved);
            break;
        }
        case "changeCase": {
            let id = data.data.id;
            if (!changeCase(id))
                console.log(`Failed changing case to case ${id}`);
            break;
        }
        case "resetCase": {
            resetCaseCall();
            break;
        }
        case "createMarker": {
            let id = data.data.id;
            let x = data.data.x;
            let y = data.data.y;
            let clr = data.data.clr;
            createMarkerCall(id, clr, x, y);
            break;
        }
        case "changeMarkerColor": {
            let id = data.data.id;
            let clr = data.data.clr;
            changeMarkerColorCall(id, clr);
            break;
        }
        case "deleteMarker": {
            let id = data.data.id;
            deleteMarkerCall(id);
            break;
        }
        case "createCircle": {
            let id = data.data.id;
            let x = data.data.x;
            let y = data.data.y;
            createCircleCall(id, x, y);
            break;
        }
        case "deleteCircle": {
            let id = data.data.id;
            deleteCircleCall(id);
            break;
        }
        case "changeCircleRadius": {
            let id = data.data.id;
            let radius = data.data.radius;
            changeCircleRadiusCall(id, radius);
            return; // dont log
        }
        case "changeCirclePosition": {
            let id = data.data.id;
            let newX = data.data.newX;
            let newY = data.data.newY;
            changeCirclePositionCall(id, newX, newY);
            return; // dont log
        }
        default: {
            console.debug(`Unknown data received: ${data}`);
            break;
        }
    }
    console.debug(`Received data from ${sender}:`);
    console.debug(data);
}

// content events
function PlayerDisconnected(connection) {
    // remove the cursor
    let peer = connection.peer;
    let cursor = Global.MP.cursors[peer];
    if (cursor) {
        Global.MP.cursors[peer] = null;
        cursor.remove();
    }
}

function Disconnected() {
    for (let key in Global.MP.cursors) {
        let cursor = Global.MP.cursors[key];
        if (cursor)
            cursor.remove();
    };
    Global.MP.cursors = []
}

function cursorUpdate(sender, x, y) {
    let cursor = Global.MP.cursors[sender];
    if (!cursor) {
        console.debug(`Created cursor object for ${sender}`);
        cursor = L.circle([y, x], {
            color: "none",
            fillColor: StringToColor(sender),
            fillOpacity: 0.5,
            radius: 70,
        }).addTo(Global.map);
        Global.MP.cursors[sender] = cursor;
        return;
    }

    // update pos
    cursor.setLatLng([y, x]);
}

// send data functions
function sendCursorPos(x, y) {
    sendDataMP({
        type: "cursorUpdate",
        data: {
            x: x,
            y: y
        }
    }, true);
}

function sendCreateMarker(id, clr, x, y) {
    sendDataMP({
        type: "createMarker",
        data: {
            id: id,
            clr: clr,
            x: x,
            y: y
        }
    });
}

function sendChangeMarkerColor(id, clr) {
    sendDataMP({
        type: "changeMarkerColor",
        data: {
            id: id,
            clr: clr
        }
    });
}

function sendDeleteMarker(id) {
    sendDataMP({
        type: "deleteMarker",
        data: {
            id: id
        }
    });
}

function sendCreateCircle(id, x, y) {
    sendDataMP({
        type: "createCircle",
        data: {
            id: id,
            x: x,
            y: y
        }
    });
}

function sendDeleteCircle(id) {
    sendDataMP({
        type: "deleteCircle",
        data: {
            id: id
        }
    });
}

function sendChangeCircleRadius(id, radius) {
    sendDataMP({
        type: "changeCircleRadius",
        data: {
            id: id,
            radius: radius
        }
    }, true);
}

function sendChangeCirclePosition(id, newX, newY) {
    sendDataMP({
        type: "changeCirclePosition",
        data: {
            id: id,
            newX: newX,
            newY: newY
        }
    }, true);
}

function sendSolveStep(id) {
    sendDataMP({
        type: "solveStep",
        data: {
            id: id,
        }
    });
}

function sendIncrementNode(step, id, solved) {
    sendDataMP({
        type: "incrementNode",
        data: {
            step: step,
            id: id,
            solved: solved
        },
    })
}

function sendChangeCase(id) {
    sendDataMP({
        type: "changeCase",
        data: {
            id: id
        }
    });
}

function sendResetCase() {
    sendDataMP({
        type: "resetCase"
    });
}

// broadcasts data to all connections
function sendDataMP(data, nolog) {
    if (!Global.MP.peer || Global.MP.connections.length == 0)
        return;

    if (!nolog) {
        console.debug("Sending Data:");
        console.debug(data);
    }
    Global.MP.connections.forEach((con) => {
        con.send(data);
    });
}