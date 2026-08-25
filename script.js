(() => {
  const STORAGE_KEY = "observation-memos";

  const form = document.getElementById("memo-form");
  const idField = document.getElementById("memo-id");
  const targetField = document.getElementById("target");
  const datetimeField = document.getElementById("datetime");
  const contentField = document.getElementById("content");
  const submitBtn = document.getElementById("submit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const searchField = document.getElementById("search");
  const memoList = document.getElementById("memo-list");
  const emptyMessage = document.getElementById("empty-message");

  const dialogOverlay = document.getElementById("confirm-dialog");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

  let pendingDeleteId = null;

  function loadMemos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("メモの読み込みに失敗しました", e);
      return [];
    }
  }

  function saveMemos(memos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  }

  function generateId() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function toDatetimeLocalValue(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }

  function formatDisplayDatetime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function resetForm() {
    form.reset();
    idField.value = "";
    submitBtn.textContent = "保存する";
    cancelEditBtn.hidden = true;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderList() {
    const keyword = searchField.value.trim().toLowerCase();
    const memos = loadMemos()
      .filter((memo) => {
        if (!keyword) return true;
        return (
          memo.target.toLowerCase().includes(keyword) ||
          memo.content.toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    memoList.innerHTML = "";
    emptyMessage.hidden = memos.length > 0;

    memos.forEach((memo) => {
      const li = document.createElement("li");
      li.className = "memo-card";
      li.innerHTML = `
        <div class="memo-card-header">
          <span class="memo-target">${escapeHtml(memo.target)}</span>
          <span class="memo-datetime">${formatDisplayDatetime(memo.datetime)}</span>
        </div>
        <p class="memo-content">${escapeHtml(memo.content)}</p>
        <div class="memo-actions">
          <button type="button" class="secondary edit-btn" data-id="${memo.id}">編集</button>
          <button type="button" class="danger delete-btn" data-id="${memo.id}">削除</button>
        </div>
      `;
      memoList.appendChild(li);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const target = targetField.value.trim();
    const content = contentField.value.trim();
    const datetime = datetimeField.value
      ? datetimeField.value
      : toDatetimeLocalValue(new Date());

    if (!target || !content) return;

    const memos = loadMemos();
    const editingId = idField.value;

    if (editingId) {
      const index = memos.findIndex((m) => m.id === editingId);
      if (index !== -1) {
        memos[index] = { ...memos[index], target, datetime, content };
      }
    } else {
      memos.push({ id: generateId(), target, datetime, content });
    }

    saveMemos(memos);
    resetForm();
    renderList();
  });

  cancelEditBtn.addEventListener("click", () => {
    resetForm();
  });

  memoList.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");

    if (editBtn) {
      const memo = loadMemos().find((m) => m.id === editBtn.dataset.id);
      if (!memo) return;
      idField.value = memo.id;
      targetField.value = memo.target;
      datetimeField.value = memo.datetime;
      contentField.value = memo.content;
      submitBtn.textContent = "更新する";
      cancelEditBtn.hidden = false;
      targetField.focus();
    }

    if (deleteBtn) {
      pendingDeleteId = deleteBtn.dataset.id;
      dialogOverlay.hidden = false;
    }
  });

  confirmDeleteBtn.addEventListener("click", () => {
    if (pendingDeleteId) {
      const memos = loadMemos().filter((m) => m.id !== pendingDeleteId);
      saveMemos(memos);
      if (idField.value === pendingDeleteId) {
        resetForm();
      }
      pendingDeleteId = null;
    }
    dialogOverlay.hidden = true;
    renderList();
  });

  cancelDeleteBtn.addEventListener("click", () => {
    pendingDeleteId = null;
    dialogOverlay.hidden = true;
  });

  searchField.addEventListener("input", renderList);

  renderList();
})();
