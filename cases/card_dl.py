import requests, os
import const

lang = "de"
cards = [
    "introduction",
    "step1",
    "step2",
    "step3",
    "step4",
    "step5",
    "step6",
    "step7",
    "step8",
]
sides = ["front", "back"]

langAddress = f"{const.address}/de"
out = "democase"

def dlImage(url, path):
    res = requests.get(url)
    if res.status_code != 200:
        return False
    dir = os.path.dirname(path)
    if not os.path.exists(dir):
        os.makedirs(dir)
    file = open(path, "wb")
    file.write(res.content)
    file.close()
    return True

for card in cards:
    print(f"Downloading card {card}")
    for side in sides:
        file = f"{card}_{side}.png"
        print(f"- Side {side} -> {file}")
        dlImage(f"{langAddress}/{file}", f"{out}/{file}")