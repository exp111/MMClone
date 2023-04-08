Global.MP = {
    peer: null,
    connections: [],
    hosting: false,
    hostID: null,
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
    if (!Global.MP.peer) // dont add anything if we're not connected
        return;
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

    Global.MP.hostID = id;
    initPeer();
}

// initializes the peer and connects to the peerjs server
function initPeer() {
    Global.MP.peer = new Peer();
    Global.MP.peer.on("open", onPeerOpen);
    Global.MP.peer.on("disconnected", onPeerDisconnect);
    Global.MP.peer.on("connection", onPeerConnection);
    setPeerID("Connecting...", true);
}

// disconnects from the server and any lobby
function disconnectMP() {
    if (!Global.MP.peer)
        return;

    Global.MP.peer.disconnect();
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
    Global.MP.peer.destroy();
    Global.MP.peer = null;
    Global.MP.connections = [];

    setPeerID("Disconnected", true);
    setDisconnectHidden(true);
    hideLobbyButtons(false);
    updatePeerList();
}

// called upon receiving a new connection from a peer.
function onPeerConnection(connection) {
    console.debug(`new connection from ${connection.peer}`);
    connection.on("close", onConnectionClose);
    connection.on("data", onConnectionDataReceive);
    // if we're hosting, inform them of all the other peers
    if (Global.MP.hosting) {
        // inform them after the connection is ready to read/write
        //TODO: sync cases and such here?
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
        type: "lobbyjoin",
        data: {
            peerList: peerList
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
    console.debug("Received data:");
    console.debug(data);
    switch (data.type) {
        case "lobbyjoin": {
            let peerList = data.data.peerList;
            if (!peerList) {
                console.debug(`Got faulty LobbyJoin message`);
                return;
            }
            console.debug(`Got LobbyJoin message (${peerList.length} Peers)`);
            connectToPeers(peerList);
            break;
        }
        case "solveStep": {
            solveStepCall();
            break;
        }
        case "createMarker": {
            let x = data.data.x;
            let y = data.data.y;
            createMarkerCall(x, y);
            break;
        }
        case "deleteMarker": {
            let x = data.data.x;
            let y = data.data.y;
            deleteMarkerAt(x, y);
            break;
        }
        default: {
            console.debug(`Unknown data received: ${data}`);
            break;
        }
    }
}

// send data functions
function sendCreateMarker(x, y) {
    sendDataMP({
        type: "createMarker",
        data: {
            x: x,
            y: y
        }
    });
}

function sendDeleteMarker(x, y) {
    sendDataMP({
        type: "deleteMarker",
        data: {
            x: x,
            y: y
        }
    });
}

function sendSolveStep() {
    sendDataMP({
        type: "solveStep"
    });
}

// broadcasts data to all connections
function sendDataMP(data) {
    if (!Global.MP.peer || Global.MP.connections.length == 0)
        return;

    console.debug("Sending Data:");
    console.debug(data);
    Global.MP.connections.forEach((con) => {
        con.send(data);
    });
}