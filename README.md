# 誰在思考？— STUST Student Thinking Study

This is an anonymous bilingual survey, in Traditional Chinese and English, about generative AI dependence, critical thinking and creativity among university students. Nikky designed and built it.

**Live:** https://nikhilafk.github.io/stust-survey/

The survey has 31 items in four parts: background (5), AI dependence (3), critical thinking (17) and creativity (6).

## How it works

- `index.html` is the landing page and the survey shell. It is a static site served by GitHub Pages, with no build step and no third-party scripts.
- `assets/js/survey.js` holds the question set, the step engine, validation, drafts saved to localStorage, the review screen, submission, and all motion such as the preloader, marquee, magnetic buttons and curtains.
- `assets/css/survey.css` is the design system: grey, near-black and white with an electric-blue accent, Inter and Inter Tight, and the system Traditional Chinese fonts. The visual language comes from [Nikky's portfolio](https://nikhilafk.github.io/nikkyportfolio/).
- `apps-script/Code.gs` is a Google Apps Script web app. It validates each submission and adds one row per student to Google Sheets, with the three mean scores calculated automatically.

## Survey flow

1. On the landing page, the participant reads about the study, the researcher and privacy, then ticks the consent box.
2. Each part opens with an intro screen explaining the 1–5 scale, followed by one question per screen.
   - Choices and scale answers move to the next question automatically when tapped.
   - Keyboard shortcuts work: `1`–`5`, `A`–`F` and `Enter`.
   - Answering 沒有 to Q03 shows a screen-out message, because the study only covers students who use AI.
3. The review screen lists all 31 answers. Selecting any answer lets the participant change it.
4. Pressing submit sends one anonymous request to the Apps Script endpoint. A thank-you screen then shows the response ID.

Progress is saved on the device after every answer. Reloading the page, or choosing 儲存並離開, keeps the draft so the participant can continue later.

## Changing the receiver

The endpoint URL is set in `ENDPOINT` at the top of `assets/js/survey.js`. If you change `Code.gs`, go to **Deploy → Manage deployments → Edit → New version**. This keeps the same URL.

## Privacy

No name, student ID, IP address or browser details are collected. Each response carries a random ID, which the receiver uses to ignore accidental double submissions.

## Credits

- Inter and Inter Tight are used under the SIL Open Font License 1.1 (`assets/fonts/LICENSE.txt`).
- The STUST logo belongs to Southern Taiwan University of Science and Technology.
- The portrait is from Nikky's portfolio.

The 3/17/6 structure follows Study 1 of Yuan, Liu & Yang (2026). The wording was written for this survey and is not the verbatim validated instrument.
