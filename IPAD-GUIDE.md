# Manage Punctuation Studio from your iPad

No terminal or Rust installation is needed on your iPad. GitHub runs the build on its servers. You must be signed into the GitHub account with repository write access.

## Start a fresh build

1. Open https://github.com/maxj2585/Punctuation-correction-/actions/workflows/deploy-site.yml in Safari.
2. Tap Run workflow and select main.
3. Choose build-and-deploy to build, test, and publish; choose check-only to test without publishing.
4. Tap the green Run workflow button, then open the new run in the list.
5. Read the Punctuation Studio — iPad report on its Summary page. If Safari hides controls, try Request Desktop Website from Safari's page menu.

## If something fails

The summary names the failed build stage and shows the last 45 lines of build output when the build script encounters an error. It also links to Pages settings and the workflow editor. If failure happens before the diagnostic script starts, or the job is canceled or times out, open the failed step's regular logs instead.

Copy the summary text or send a screenshot for help. Logs are also saved as the ipad-build-diagnostics artifact for 7 days. Review logs before sharing; never share tokens or passwords.

For Pages configuration failures, check Settings → Pages → Source → GitHub Actions. If that does not resolve it, use the exact error from Configure GitHub Pages. For deployment failures, use the Publish website step's error.

## Edit a known fix

Open https://github.com/maxj2585/Punctuation-correction-/edit/main/.github/workflows/deploy-site.yml to edit the workflow in GitHub's browser editor. Only make changes you understand; preserve YAML indentation. Commit the change to main, which starts a new run automatically. For a temporary service failure, use Re-run jobs on the existing run instead. Re-running old jobs uses that run's original code; after a code change, use a fresh run on main.

The workflow cannot automatically diagnose and repair every error, change your account's Pages settings, or guarantee publication. Check-only does not publish a site. A successful deploy summary provides the actual published URL; open it and verify engine loading and correction behavior.
