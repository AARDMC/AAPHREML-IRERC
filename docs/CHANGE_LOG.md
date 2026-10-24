# Change Log

## Clean source update

- Removed the demo data seeder and its public API endpoint.
- Removed mock accounts, role shortcuts, example protocol and meeting records, and the offline mock API.
- Preserved the repository's server-issued session authentication.
- Replaced fixed meeting examples with records loaded from the Apps Script backend.
- Kept the official signature in restricted Google Drive storage and excluded it from Git.
- Clarified that source cleanup does not delete records already stored in Sheets or Drive.
