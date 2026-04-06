#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/Users/muratsag/Developer/Slim30_backend/.env}"
SRC_DIR="${SRC_DIR:-/Users/muratsag/Downloads/Slim30 Videolar}"
OUT_DIR="${OUT_DIR:-/Users/muratsag/Downloads/Slim30_Videolar_mp4}"
MANIFEST="${MANIFEST:-/Users/muratsag/Developer/Slim30_backend/video_upload_manifest.csv}"
REMOTE_PREFIX="${REMOTE_PREFIX:-workouts/v1}"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

mkdir -p "$OUT_DIR"
mkdir -p "$(dirname "$MANIFEST")"

echo 'source_file,converted_file,remote_path,cdn_url,status' > "$MANIFEST"

count=0
ok=0
fail=0

while IFS= read -r -d '' src; do
  rel="${src#${SRC_DIR}/}"
  rel_no_ext="${rel%.*}"
  safe_rel="$(echo "$rel_no_ext" | sed 's/[[:space:]]\+/_/g; s/[^A-Za-z0-9_\/.-]/_/g')"

  out="${OUT_DIR}/${safe_rel}.mp4"
  mkdir -p "$(dirname "$out")"

  count=$((count + 1))
  echo "[$count] CONVERT: $rel"

  if ! ffmpeg -y -i "$src" \
    -nostdin \
    -map "0:v:0" -map "0:a:0?" \
    -c:v libx264 -preset medium -crf 22 \
    -pix_fmt yuv420p -profile:v high -level 4.1 \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    "$out" -loglevel error; then
    fail=$((fail + 1))
    printf '"%s","%s","%s","%s",%s\n' "$src" "$out" "" "" "convert_failed" >> "$MANIFEST"
    continue
  fi

  remote_path="${REMOTE_PREFIX}/${safe_rel}.mp4"
  url="https://${CDN_HOSTNAME}/${remote_path}"
  echo "[$count] UPLOAD : $remote_path"

  if curl --fail --silent --show-error \
    -X PUT "https://storage.bunnycdn.com/${CDN_STORAGE_ZONE}/${remote_path}" \
    -H "AccessKey: ${CDN_ACCESS_KEY}" \
    --data-binary @"$out" >/dev/null; then
    ok=$((ok + 1))
    status="ok"
  else
    fail=$((fail + 1))
    status="upload_failed"
  fi

  printf '"%s","%s","%s","%s",%s\n' "$src" "$out" "$remote_path" "$url" "$status" >> "$MANIFEST"
done < <(find "$SRC_DIR" -type f \( -iname '*.mov' -o -iname '*.mp4' -o -iname '*.m4v' -o -iname '*.avi' -o -iname '*.mkv' \) -print0)

echo "---- SUMMARY ----"
echo "Processed: $count"
echo "Uploaded : $ok"
echo "Failed   : $fail"
echo "Manifest : $MANIFEST"
