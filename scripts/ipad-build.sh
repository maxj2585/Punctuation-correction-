#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p diagnostics
root="$PWD"
log="$root/diagnostics/build.log"
report="$root/diagnostics/report.md"
stage='Starting build'
on_error() {
  code=$?
  trap - ERR
  {
    printf '\n## Failed stage: %s\n\nExit code: %s\n\nLast build output:\n\n' "$stage" "$code"
    tail -n 45 "$log" | sed 's/^/    /'
  } >> "$report"
  exit "$code"
}
trap on_error ERR
step() { stage="$1"; printf '\n### %s\n' "$stage" | tee -a "$log"; }
step 'Install Rust and WebAssembly tools'
rustup update stable 2>&1 | tee -a "$log"
rustup target add wasm32-unknown-unknown --toolchain stable 2>&1 | tee -a "$log"
cargo install wasm-pack --locked 2>&1 | tee -a "$log"
step 'Compile the copied Harper source'
cd "$root/vendor/harper/harper-wasm"
wasm-pack build --target web --release --no-opt --no-default-features --out-name harper_wasm --out-dir "$root/site/engine" 2>&1 | tee -a "$log"
cd "$root"
step 'Preserve engine license and attribution'
cp vendor/harper/LICENSE site/HARPER-LICENSE.txt
cp HARPER_SOURCE.txt site/SOURCE.txt
touch site/.nojekyll
step 'Install browser test tools'
npm install --prefix "$RUNNER_TEMP/browser" playwright@1.60.0 2>&1 | tee -a "$log"
"$RUNNER_TEMP/browser/node_modules/.bin/playwright" install --with-deps chromium 2>&1 | tee -a "$log"
step 'Run browser smoke tests'
python3 -m http.server 8080 --directory site > "$root/diagnostics/http.log" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:8080/ > /dev/null; then break; fi
  sleep 1
done
node scripts/smoke.mjs 2>&1 | tee -a "$log"
printf '\n## Build passed\n\nThe local-source engine compiled and browser smoke tests passed. Deployment is a separate step.\n' >> "$report"
