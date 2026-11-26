# JobsDB to Markdown

A Firefox extension that collects the job ads from a JobsDB Thailand (th.jobsdb.com) search and exports them as one Markdown file. You can give that file to an AI assistant to filter jobs by skills, salary, working days or location.

## How it works

The extension works in your own browser tab, the same way you would by hand:

1. It opens the search results for the position you typed.
2. It clicks each job card, waits for the job details to appear in the right-hand panel and reads them.
3. When the page is done, it clicks **Next** and repeats, up to the number of pages you chose.

It waits a random 1.5–3 seconds between jobs. Progress is saved after each job, so it carries on after a page reload. If JobsDB shows a Cloudflare check, the extension stops. Pass the check, then press **Start** again.

## Install (temporary, for development)

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on...** and choose `manifest.json` in this folder.

Temporary add-ons are removed when Firefox restarts.

## Use

1. Open any page on th.jobsdb.com.
2. Click the extension icon. Type a **Position**, for example `DevOps Engineer`, and the number of **Pages**.
3. Click **Start**. When the status says **Done**, click **Export .md**.

| Button | What it does |
|---|---|
| Start | Collects the chosen number of pages for the position. Starting the same position again skips jobs already collected. |
| Stop | Stops after the current job. |
| Export .md | Downloads everything collected so far as one `.md` file. |
| Clear | Deletes the collected data. |

## Output format

```markdown
# JobsDB export: DevOps Engineer

- **Search URL:** https://th.jobsdb.com/DevOps-Engineer-jobs
- **Exported:** 2026-11-17
- **Jobs:** 64

---

## 1. DevOps Engineer

- **Company:** ...
- **Location:** Bangkok (Hybrid)
- **Work type:** Full time
- **Salary:** Not stated
- **Classification:** ...
- **Listed:** 6d ago
- **Job ID:** 95803432
- **URL:** https://th.jobsdb.com/job/95803432

### Job description

...
```

## Limits

- Supports th.jobsdb.com only.
- The extension finds page elements by JobsDB's `data-automation` attributes. If JobsDB changes its page, those lookups can break.
- Most ads do not state a salary.