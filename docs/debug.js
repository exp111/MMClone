document.getElementById("debug-menu-button").style.display = (Global.DEBUG ? "" : "none"); // hide if not debug
document.getElementById("debug_toggle").checked = Global.DEBUG;

//TODO: print circle to json
function enableDebug() {
    Global.DEBUG = true;
    document.getElementById("debug-menu-button").style.display = "";
    document.getElementById("debug_toggle").checked = true;
}