(function () {
  "use strict";

  const RECORD_KEY = "oasis-field-records-v2";
  const TASK_KEY = "oasis-task-state-v2";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const nowLabel = () => new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date()).replaceAll("/", "-");
  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  })[char]);
  const notify = (message) => {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 2500);
  };

  function readRecords() {
    try { return JSON.parse(localStorage.getItem(RECORD_KEY) || "[]"); }
    catch { return []; }
  }
  function writeRecords(records) {
    localStorage.setItem(RECORD_KEY, JSON.stringify(records.slice(0, 50)));
  }
  function currentValues() {
    return {
      field: $("#fieldName").value.trim() || "未命名地块",
      stage: $("#stage").value,
      moisture: safeNumber($("#moisture").value),
      ec: safeNumber($("#ec").value),
      temp: safeNumber($("#temp").value)
    };
  }
  function analyse(values) {
    const reasons = [];
    const actions = [];
    if (values.moisture < 22) {
      reasons.push(`土壤湿度 ${values.moisture}% 偏低`);
      actions.push("复测土壤湿度，并检查滴灌带首尾出水情况");
    }
    if (values.ec > 3.5) {
      reasons.push(`土壤 EC ${values.ec} dS/m 需关注`);
      actions.push("在相同取样深度复测 EC，记录取样位置和时间");
    }
    if (values.temp >= 34) {
      reasons.push(`未来高温 ${values.temp}℃`);
      actions.push("将现场复查安排在高温前后，记录叶片状态");
    }
    if (!reasons.length) {
      reasons.push("当前填写的水分、盐分和温度未触发演示阈值");
      actions.push("按既定巡查周期继续记录");
    }
    return {
      level: reasons.length >= 3 ? "优先复查" : reasons.length >= 2 ? "建议复查" : "常规记录",
      reasons,
      actions
    };
  }

  function showView(id) {
    $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === id));
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addViews() {
    const nav = $(".nav");
    const reportTab = $('.tab[data-view="report"]');
    const historyTab = document.createElement("button");
    historyTab.className = "tab";
    historyTab.dataset.view = "history";
    historyTab.textContent = "巡查记录";
    nav.insertBefore(historyTab, reportTab);

    const projectTab = document.createElement("button");
    projectTab.className = "tab";
    projectTab.dataset.view = "project";
    projectTab.textContent = "项目说明";
    nav.appendChild(projectTab);

    const panel = $(".panel");
    const reportView = $("#report");
    reportView.insertAdjacentHTML("beforebegin", `
      <div class="view" id="history">
        <div class="section-head"><div><h2>巡查记录</h2><p>记录保存在当前浏览器，可导出后交给指导教师或队员汇总</p></div>
          <div class="secondary-actions"><button class="outline" id="exportCsv">导出 CSV</button><button class="outline" id="clearRecords">清空示例记录</button></div>
        </div>
        <div class="record-table-wrap"><table class="record-table"><thead><tr><th>记录时间</th><th>地块</th><th>生育期</th><th>湿度</th><th>EC</th><th>温度</th><th>提示</th><th></th></tr></thead><tbody id="recordRows"></tbody></table></div>
        <p class="note">当前版本使用浏览器本地存储。正式云端版本计划由 RDS 保存地块与巡查记录。</p>
      </div>`);
    panel.insertAdjacentHTML("beforeend", `
      <div class="view" id="project">
        <div class="section-head"><div><h2>项目说明</h2><p>明确当前演示范围与后续华为云接入计划</p></div></div>
        <div class="project-grid">
          <section class="card"><h3>当前已实现</h3><ul class="plain-list">
            <li>地块数据填写与演示阈值分析</li><li>照片本地预览，不上传服务器</li><li>巡查记录本地保存与 CSV 导出</li><li>任务勾选状态保存</li><li>根据当前数据生成巡查报告</li>
          </ul></section>
          <section class="card"><h3>华为云接入计划</h3><div class="status-line"><b>CodeArts</b><span>需求拆解、代码生成、测试、仓库与流水线</span></div><div class="status-line"><b>RDS</b><span>保存用户、地块、巡查记录和方案</span></div><div class="status-line"><b>Redis</b><span>管理会话、热点数据和异步任务状态</span></div><div class="status-line"><b>对象存储</b><span>保存田间照片和生成的报告</span></div></section>
        </div>
        <section class="card" style="margin-top:16px"><h3>公开材料</h3><ul class="plain-list"><li><a href="https://github.com/ZZDD-1103/bookish-umbrella" target="_blank" rel="noreferrer">GitHub 代码仓库</a></li><li><a href="source.zip" download>下载当前版本源码</a></li><li>仓库内含架构说明、部署说明与 20 组测试用例</li></ul></section>
        <section class="card" style="margin-top:16px"><h3>答辩时可以展示的开发证据</h3><ul class="plain-list"><li>CodeArts 中的需求任务、提交记录和问题修复过程</li><li>RDS 数据表与 Redis 键设计截图</li><li>部署流水线运行记录和公开 Demo 地址</li><li>20 组测试案例及人工复核结果</li></ul><p class="note">页面中的阈值和数据仅用于演示，不代表农艺处方。生产使用需由农技人员校准。</p></section>
      </div>`);

    $$(".tab", nav).forEach((tab) => {
      tab.onclick = () => showView(tab.dataset.view);
    });
  }

  function enhanceDiagnosis() {
    const upload = $("#uploadBox");
    upload.insertAdjacentHTML("afterend", '<div class="photo-preview" id="photoPreview"><img alt="巡查照片预览"><p>照片只在当前浏览器预览，刷新页面后不会保留。</p></div>');
    const actions = $("#diagnoseBtn").parentElement;
    const save = document.createElement("button");
    save.className = "btn secondary";
    save.id = "saveRecord";
    save.textContent = "保存巡查记录";
    actions.insertBefore(save, actions.lastElementChild);

    $("#photo").addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const preview = $("#photoPreview");
      $("img", preview).src = URL.createObjectURL(file);
      preview.classList.add("show");
    });

    $("#diagnoseBtn").addEventListener("click", () => {
      const values = currentValues();
      const result = analyse(values);
      $("#resultText").textContent = `${result.level}：${result.reasons.join("；")}。`;
      $("#resultList").innerHTML = result.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      $("#diagnosisResult .pill").textContent = result.level;
      updateReport(values, result);
    });

    save.addEventListener("click", () => {
      const values = currentValues();
      const result = analyse(values);
      const records = readRecords();
      records.unshift({ id: Date.now(), time: nowLabel(), ...values, level: result.level });
      writeRecords(records);
      renderRecords();
      updateDashboard();
      notify("巡查记录已保存到当前浏览器");
    });
  }

  function renderRecords() {
    const rows = $("#recordRows");
    const records = readRecords();
    if (!records.length) {
      rows.innerHTML = '<tr><td class="empty" colspan="8">暂无保存记录。可在“数据分析”页面填写数据后保存。</td></tr>';
      return;
    }
    rows.innerHTML = records.map((record) => `<tr>
      <td>${escapeHtml(record.time)}</td><td>${escapeHtml(record.field)}</td><td>${escapeHtml(record.stage)}</td>
      <td>${record.moisture}%</td><td>${record.ec} dS/m</td><td>${record.temp}℃</td><td>${escapeHtml(record.level)}</td>
      <td><button class="text-btn" data-delete="${record.id}">删除</button></td></tr>`).join("");
    $$('[data-delete]', rows).forEach((button) => button.addEventListener("click", () => {
      writeRecords(readRecords().filter((record) => String(record.id) !== button.dataset.delete));
      renderRecords(); updateDashboard();
    }));
  }

  function exportCsv() {
    const records = readRecords();
    if (!records.length) return notify("暂无可导出的巡查记录");
    const header = ["记录时间", "地块", "生育期", "土壤湿度(%)", "EC(dS/m)", "温度(℃)", "提示"];
    const lines = records.map((r) => [r.time, r.field, r.stage, r.moisture, r.ec, r.temp, r.level]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob(["\ufeff" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = "绿洲智探巡查记录.csv"; link.click();
    URL.revokeObjectURL(link.href);
  }

  function updateDashboard() {
    const records = readRecords();
    const metrics = $$("#dashboard .metric strong");
    if (metrics[0]) metrics[0].textContent = `${new Set(records.map((r) => r.field)).size || 1} 块`;
    if (metrics[3]) metrics[3].textContent = `${records.length} 条`;
  }

  function persistTasks() {
    const list = $("#taskList");
    const checks = $$('input[type="checkbox"]', list);
    try {
      const state = JSON.parse(localStorage.getItem(TASK_KEY) || "[]");
      checks.forEach((check, index) => { if (typeof state[index] === "boolean") check.checked = state[index]; });
    } catch { /* use defaults */ }
    list.addEventListener("change", (event) => {
      if (!event.target.matches('input[type="checkbox"]')) return;
      localStorage.setItem(TASK_KEY, JSON.stringify($$('input[type="checkbox"]', list).map((item) => item.checked)));
    });
  }

  function updateReport(values = currentValues(), result = analyse(values)) {
    const report = $("#reportContent");
    $("h2", report).textContent = `${values.field}水盐巡查报告`;
    $(".meta", report).textContent = `绿洲智探 · ${nowLabel()} · ${values.stage}`;
    $(".pill", report).textContent = result.level;
    const paragraphs = $$("p", report);
    if (paragraphs[0]) paragraphs[0].textContent = `本次记录：土壤湿度 ${values.moisture}%，EC ${values.ec} dS/m，未来 24 小时最高温度 ${values.temp}℃。${result.reasons.join("；")}。`;
    if (paragraphs[1]) paragraphs[1].textContent = result.actions.join("；") + "。";
    if (paragraphs[2]) paragraphs[2].textContent = "后续补充复测数值、现场照片和实际处理结果。本报告使用演示阈值生成，需由现场人员确认。";
    let data = $(".report-data", report);
    if (!data) {
      data = document.createElement("div"); data.className = "report-data";
      data.innerHTML = `<div><small>土壤湿度</small><b id="reportMoisture"></b></div><div><small>EC</small><b id="reportEc"></b></div><div><small>最高温度</small><b id="reportTemp"></b></div>`;
      $(".field-row", report).insertAdjacentElement("afterend", data);
    }
    $("#reportMoisture").textContent = `${values.moisture}%`;
    $("#reportEc").textContent = `${values.ec} dS/m`;
    $("#reportTemp").textContent = `${values.temp}℃`;
  }

  function bindHistoryActions() {
    $("#exportCsv").addEventListener("click", exportCsv);
    $("#clearRecords").addEventListener("click", () => {
      localStorage.removeItem(RECORD_KEY); renderRecords(); updateDashboard(); notify("本地巡查记录已清空");
    });
  }

  addViews();
  enhanceDiagnosis();
  bindHistoryActions();
  renderRecords();
  updateDashboard();
  persistTasks();
  updateReport();
})();
