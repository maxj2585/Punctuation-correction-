# Punctuation Studio

An independent punctuation website project based on a full source copy of Harper. This repository is not an official Automattic product.

## Source-copy step

The Import full Harper source workflow copies all Git-tracked files at upstream revision 04ba445a0ce2fbfc634c36ffe8623892ee3f8952 into vendor/harper/ and commits them to main. It preserves upstream file contents, including license and attribution files, without running upstream code. It does not copy Git history or fetch external submodule/LFS payloads. It refuses to overwrite an existing vendor/harper directory.

The workflow starts when its workflow file is pushed to main, provided GitHub Actions is enabled and allowed to write repository contents. It can also be started manually from Actions. Completion must be verified in Actions and by inspecting vendor/harper/. Adding the workflow alone does not mean the source has been copied.

## Website status

This is the source-import stage only. The custom punctuation interface, build from the copied local source, testing, and website deployment still need to be implemented. No live website is claimed by this commit. The earlier package-only implementation is not being installed.

## Attribution

Original engine and source: Harper, https://github.com/Automattic/harper. Original authorship, license notices, and upstream package names remain in the copied code. Punctuation Studio names the independent website, not the authorship of Harper. The existing root LICENSE remains unchanged; see vendor/harper/LICENSE for upstream terms once the import completes.
