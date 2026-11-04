# Upgrade and rollback

## Upgrade

1. Export the current Lovelace card configuration and record the installed release tag.
2. Read the release notes for schema changes and required Home Assistant versions.
3. Verify the new artifact checksum and provenance attestation.
4. Install the new release in a temporary dashboard first.
5. Confirm the visual editor reports a valid schema and preserves all room, presentation, background, and entity mappings.
6. Run the acceptance order in [Installation](INSTALLATION.md).
7. Upgrade the commissioned resource only after physical tablet acceptance.

H2DC accepts schema version 1 and normalizes it to the current version 2 model. Unknown future versions fail closed instead of guessing.

## Rollback

1. Select the previously recorded release in HACS.
2. Restore the exported card configuration if the operator changed it during testing.
3. Clear only the Fully Kiosk web cache, reload the start URL, and confirm the prior resource version.
4. If the dashboard cannot render, remove the H2DC card from the temporary view and use Home Assistant's standard dashboard editor. Do not delete entities, integrations, or automations.

Blueprint-created automations are independent of the frontend artifact. Disable or roll them back explicitly; downgrading the card does not alter them.
