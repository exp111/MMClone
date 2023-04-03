function setMenuVisible(id, enabled)
{
    let menu = document.getElementById(id);
    if (!menu)
        return;
    let val = enabled ? "0%" : "100%";
    menu.style.bottom = val;
}