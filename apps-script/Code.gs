/**
 * 南臺科技大學・學生思考研究 — Google Sheets 回覆接收程式
 * STUST Student Thinking Study — Google Sheets response receiver
 *
 * 部署 / Deploy: Deploy → New deployment → Web app
 *   Execute as: Me   ·   Who has access: Anyone
 * 每位學生一列；平均分數自動計算。No names, student IDs or IP addresses are stored.
 */
const RESPONSES = 'Responses 回覆';
const QUESTIONS = 'Questions 題目';
const TZ = 'Asia/Taipei';

const Q = [
  ['Q01','choice','Background','What is your current year of study?','你目前就讀的年級是？',['Year 1','Year 2','Year 3','Year 4','Graduate','Other']],
  ['Q02','text','Background','Which university and department do you study in?','你目前就讀的學校與系所是？'],
  ['Q03','choice','Background','Have you used generative AI for university coursework?','你是否曾在課業中使用過生成式 AI？',['Yes','No']],
  ['Q04','choice','Background','How often do you use generative AI for university work?','你使用生成式 AI 處理課業的頻率為何？',['Less than monthly','1–3 times / month','1–2 days / week','3–5 days / week','Daily']],
  ['Q05','choice','Background','Which generative AI tool do you use most often?','你最常使用哪一種生成式 AI 工具？',['ChatGPT','Gemini','Microsoft Copilot','Claude','Grok','Perplexity','Other']],
  ['Q06','scale','AI dependence','I rely on generative AI to help complete my course assignments.','我會依賴生成式 AI 協助完成課堂作業。'],
  ['Q07','scale','AI dependence','Without generative AI, certain university tasks would be difficult for me to complete.','如果沒有生成式 AI，有些課業任務對我來說會比較難完成。'],
  ['Q08','scale','AI dependence','When a study problem is difficult, I tend to ask AI before exploring solutions myself.','遇到困難的課業問題時，我通常會先詢問 AI，再自己思考解法。'],
  ['Q09','scale','Critical thinking','Before using an AI response, I consider the assumptions behind it.','採用 AI 的回答前，我會思考它依據哪些假設。'],
  ['Q10','scale','Critical thinking','I compare information from AI with evidence from other sources.','我會將 AI 提供的資訊與其他來源的證據進行比較。'],
  ['Q11','scale','Critical thinking','I can explain why an AI-generated answer is reasonable or unreasonable.','我能說明 AI 的回答為何合理或不合理。'],
  ['Q12','scale','Critical thinking','I notice when an AI-generated explanation lacks evidence.','當 AI 的說明缺乏證據時，我通常能察覺。'],
  ['Q13','scale','Critical thinking','I distinguish facts from opinions in AI-generated content.','我會區分 AI 產生內容中的事實與觀點。'],
  ['Q14','scale','Critical thinking','I evaluate whether AI suggestions fit the requirements of my assignment.','我會評估 AI 的建議是否符合實際作業要求。'],
  ['Q15','scale','Critical thinking','I am willing to reconsider my opinion when I see convincing evidence.','當出現有說服力的證據時，我願意重新思考原本的看法。'],
  ['Q16','scale','Critical thinking','I actively look for viewpoints that differ from an AI-generated answer.','我會主動尋找與 AI 回答不同的觀點。'],
  ['Q17','scale','Critical thinking','I can accept that my own interpretation may be incorrect.','我能接受自己的理解可能有錯。'],
  ['Q18','scale','Critical thinking','I consider more than one possible solution to a study problem.','面對課業問題時，我會考慮不只一種解法。'],
  ['Q19','scale','Critical thinking','I listen carefully to classmates whose interpretations differ from mine.','同學的理解與我不同時，我會認真聆聽。'],
  ['Q20','scale','Critical thinking','I change my conclusion when better information becomes available.','有更可靠的資訊時，我會調整自己的結論。'],
  ['Q21','scale','Critical thinking','I break complicated study questions into smaller parts before answering.','回答複雜的課業問題前，我會先將問題拆解成較小的部分。'],
  ['Q22','scale','Critical thinking','I follow a clear sequence of steps when evaluating information.','評估資訊時，我會按照清楚的步驟進行。'],
  ['Q23','scale','Critical thinking','I check whether my final answer follows logically from the evidence.','我會確認最後的答案是否能由證據合理推導。'],
  ['Q24','scale','Critical thinking','I review important details before submitting an AI-assisted assignment.','繳交 AI 協助完成的作業前，我會再次檢查重要細節。'],
  ['Q25','scale','Critical thinking','I organize information from different sources before reaching a conclusion.','形成結論前，我會整理不同來源的資訊。'],
  ['Q26','scale','Creativity','I think of original ways to solve everyday problems.','我會想出有創意的方法來解決日常問題。'],
  ['Q27','scale','Creativity','I find new uses for familiar objects or ideas.','我能為熟悉的物品或概念想出新的用途。'],
  ['Q28','scale','Creativity','I combine different ideas to create something new.','我會結合不同想法，產生新的點子。'],
  ['Q29','scale','Creativity','I explore several approaches before choosing one.','我會探索多種方法後，再決定採用哪一種。'],
  ['Q30','scale','Creativity','I suggest unconventional ideas in class or group projects.','在課堂或分組專題中，我會提出不同於一般做法的想法。'],
  ['Q31','scale','Creativity','I improve existing ideas by adding my own perspective.','我會加入自己的觀點，改進既有的想法。']
];
const IDS = Q.map(q => q[0]);
const HEADERS = ['Student No 學生編號', 'Submitted 送出時間 (Taiwan)', 'Response ID 回覆編號']
  .concat(IDS, ['AI dependence mean 依賴平均', 'Critical thinking mean 批判思考平均', 'Creativity mean 創造力平均']);

function doGet() {
  return json({ ok: true, service: 'STUST survey receiver', responses: Math.max(sheet_().getLastRow() - 1, 0) });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const problem = validate_(data);
    if (problem) return json({ ok: false, error: problem });

    const sh = sheet_();
    const last = sh.getLastRow();
    if (last > 1) {
      const ids = sh.getRange(2, 3, last - 1, 1).getValues().map(r => String(r[0]));
      const hit = ids.indexOf(data.id);
      if (hit > -1) return json({ ok: true, duplicate: true, studentNumber: sh.getRange(hit + 2, 1).getValue() });
    }
    const nums = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => Number(r[0]) || 0) : [0];
    const no = Math.max.apply(null, nums) + 1;

    const a = data.answers;
    const mean = list => Math.round(list.reduce((s, id) => s + Number(a[id]), 0) / list.length * 100) / 100;
    const row = [no, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), data.id]
      .concat(Q.map(q => q[1] === 'scale' ? Number(a[q[0]]) : safeText_(a[q[0]])))
      .concat([mean(IDS.slice(5, 8)), mean(IDS.slice(8, 25)), mean(IDS.slice(25, 31))]);
    sh.appendRow(row);
    return json({ ok: true, studentNumber: no });
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function validate_(d) {
  if (!d || typeof d !== 'object') return 'Invalid payload';
  if (typeof d.id !== 'string' || !/^STUST-\d{8}-[A-Z0-9]{4,12}$/.test(d.id)) return 'Invalid response id';
  const a = d.answers;
  if (!a || typeof a !== 'object') return 'Missing answers';
  for (const q of Q) {
    const v = a[q[0]];
    if (q[1] === 'scale') { if (![1, 2, 3, 4, 5].includes(Number(v))) return 'Invalid value for ' + q[0]; }
    else if (q[1] === 'choice') { if (!q[5].includes(v)) return 'Invalid value for ' + q[0]; }
    else if (typeof v !== 'string' || !v.trim() || v.length > 120) return 'Invalid value for ' + q[0];
  }
  if (a.Q03 === 'No') return 'Respondent has not used AI for coursework';
  return '';
}

// Stop spreadsheet formula injection from the free-text answer.
function safeText_(v) { v = String(v || '').replace(/[\r\n\t]+/g, ' ').trim(); return /^[=+\-@]/.test(v) ? "'" + v : v; }

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(RESPONSES);
  if (!sh) {
    sh = ss.getSheets()[0].getLastRow() === 0 ? ss.getSheets()[0].setName(RESPONSES) : ss.insertSheet(RESPONSES, 0);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#1B1A17').setFontColor('#F3EFE6');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
  }
  if (!ss.getSheetByName(QUESTIONS)) {
    const qs = ss.insertSheet(QUESTIONS);
    const rows = [['ID', 'Topic 構面', 'Question (English)', '題目（繁體中文）', 'Response type 作答方式']]
      .concat(Q.map(q => [q[0], q[2], q[3], q[4], q[1] === 'scale' ? '1–5 Likert' : q[1] === 'text' ? 'Short answer' : 'Choice']));
    qs.getRange(1, 1, rows.length, 5).setValues(rows);
    qs.getRange(1, 1, 1, 5).setFontWeight('bold');
    qs.setFrozenRows(1);
  }
  return sh;
}

/** 在編輯器中執行一次以建立工作表 / Run once from the editor to create the sheets. */
function setup() { sheet_(); }

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
