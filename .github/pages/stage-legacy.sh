#!/usr/bin/env bash
set -euo pipefail

repository=${1:?Path to the repository containing the legacy revision}
revision=${2:?Legacy commit SHA}
destination=${3:?New directory for the Pages artifact}
script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

mkdir -- "$destination"
git -C "$repository" archive "$revision" -- \
  index.html manifest.json style.css api.js main.js render.js weather.js favicon.ico icon.png icons \
  | tar -xf - -C "$destination"
rm -f -- "$destination/icons/.DS_Store"
cp -- "$script_directory/retire-sw.js" "$destination/sw.js"
