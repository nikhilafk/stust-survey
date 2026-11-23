# 南臺科技大學・學生思考研究 — STUST Student Thinking Study

An anonymous bilingual survey, in Traditional Chinese and English, on generative AI dependence, critical thinking and creativity among STUST students. It has 31 items in four parts: background (5), AI dependence (3), critical thinking (17) and creativity (6).

- `index.html`: the survey page, served by GitHub Pages. It is a single self-contained file with no external dependencies.
- `apps-script/Code.gs`: a Google Apps Script that receives each submission and writes it to Google Sheets as one row per student, with the three mean scores calculated.

## Connect the response sheet

1. Create a Google Sheet, for example "STUST 學生 AI 問卷回覆".
2. Open **Extensions → Apps Script**, replace the default code with `apps-script/Code.gs`, and save.
3. Select the `setup` function and click **Run**. Approve the permissions. This creates the `Responses 回覆` and `Questions 題目` tabs.
4. Click **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then deploy and copy the URL that ends in `/exec`.
5. Paste that URL into `SHEET_ENDPOINT` near the top of the script in `index.html`, then commit and push.

If you change `Code.gs` later, go to **Deploy → Manage deployments → Edit → Version: New version**. This keeps the same URL; creating a new deployment would give you a new one.

## Privacy

No name, student ID, IP address or browser details are collected. Each response has a random ID, which is used to ignore accidental double submissions. Export the data with **File → Download → Microsoft Excel (.xlsx)**.

The 3/17/6 structure follows Study 1 of Yuan, Liu & Yang (2026). The wording was written for this survey and is not the verbatim validated instrument. Get professor or ethics approval and run a pilot test before collecting data.
