# Kenya Retail Report Upload Notes

These files are public release assets for the 2026 Kenya Retail Relational Readiness Report.

Upload into the live African Market OS WordPress root, not the static FTP mirror:

1. Copy `reports/kenya-retail-relational-readiness-2026/` to:

   `public_html/reports/kenya-retail-relational-readiness-2026/`

2. Copy `deploy/wordpress/mu-plugins/mvr-report-analytics-mu-plugin.php` to:

   `public_html/wp-content/mu-plugins/mvr-report-analytics-mu-plugin.php`

3. Verify:

   - `https://africanmarketos.com/reports/kenya-retail-relational-readiness-2026/`
   - `https://africanmarketos.com/reports/kenya-retail-relational-readiness-2026/Kenya_Retail_Relational_Readiness_Report_2026_v1.pdf`
   - `https://africanmarketos.com/wp-json/mvr/v1/report-stats` should be restricted to WordPress admins.

The plugin logs privacy-respecting report view/download events, supports daily summary emails to `info@africanmarketos.com`, and can serve the report files through WordPress if the web server routes `/reports/...` through WordPress instead of serving static files directly.

Do not publish raw engine outputs, driver scripts, source registers, private JSON audit artifacts, calibration assets, or protected Worker/API runtime source.
