# Punctuation Studio

Independent English punctuation website using the full Harper source snapshot in vendor/harper/. The engine is compiled directly from that local Rust copy to WebAssembly; no published harper.js package or third-party grammar API is used. Original Harper authorship, file names, and licenses remain intact.

## Publish

In repository Settings → Pages → Build and deployment, choose GitHub Actions as the source. The Build and deploy Punctuation Studio workflow compiles the engine, runs Chromium smoke tests, and deploys only if those steps pass. It starts on relevant pushes to main and can be run manually in Actions. GitHub Actions and Pages must be available and enabled for this repository.

Expected default URL after a successful deployment: https://maxj2585.github.io/Punctuation-correction-/
This address is not proof of deployment; check the workflow's deployment output and load the page.

## Interface

Responsive editor, punctuation/spacing or all-checks mode, per-suggestion corrections, up to 30 correction undo states, copy, examples, and word/character counts. Text stays on-device in a background worker. No draft storage or analytics is implemented. Maximum input is 50,000 UTF-16 code units. Missing periods, commas, question marks, and colons inside pasted text are restored by an on-device model (kredor/punctuate-all, ONNX, loaded through Transformers.js from jsDelivr and Hugging Face). It downloads once, about 270 MB, on the first check and is cached by the browser; text never leaves the device. If it cannot load, the Harper checks still run. Suggestions need human review; category filtering may omit punctuation-related grammar checks.

## Build locally

Install Rust stable with wasm32-unknown-unknown and wasm-pack. From vendor/harper/harper-wasm run:

```sh
wasm-pack build --target web --release --no-opt --no-default-features --out-name harper_wasm --out-dir ../../../site/engine
```

From the repository root, copy vendor/harper/LICENSE to site/HARPER-LICENSE.txt and HARPER_SOURCE.txt to site/SOURCE.txt, then run `python3 -m http.server 8080 --directory site` and open http://localhost:8080/.

## Verification

The workflow tests engine startup, repeated-word correction, undo, punctuation correction, and mobile width before deployment. The assistant has not executed these browser tests locally. Passing CI and a verified live page are required before claiming this website works publicly.

## Credits

Harper: https://github.com/Automattic/harper. See HARPER_SOURCE.txt, vendor/harper/LICENSE, and the unchanged root LICENSE. Punctuation Studio is the independent site name, not a claim of original authorship of the Harper engine.
