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
  const formMessage = document.getElementById("form-message");

  let pendingDeleteId = null;
  let dialogTriggerEl = null;

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
      return true;
    } catch (e) {
      console.error("メモの保存に失敗しました", e);
      return false;
    }
  }

  function showFormMessage(text) {
    formMessage.textContent = text;
    formMessage.hidden = false;
  }

  function clearFormMessage() {
    formMessage.textContent = "";
    formMessage.hidden = true;
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
    clearFormMessage();
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
    clearFormMessage();

    const target = targetField.value.trim();
    const content = contentField.value.trim();
    const datetime = datetimeField.value
      ? datetimeField.value
      : toDatetimeLocalValue(new Date());

    if (!target || !content) {
      showFormMessage("対象と内容を入力してください。");
      return;
    }

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

    if (!saveMemos(memos)) {
      showFormMessage("メモの保存に失敗しました。保存容量が上限に達している可能性があります。");
      return;
    }

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
      openDialog(deleteBtn);
    }
  });

  function openDialog(triggerEl) {
    dialogTriggerEl = triggerEl;
    dialogOverlay.hidden = false;
    cancelDeleteBtn.focus();
    document.addEventListener("keydown", handleDialogKeydown);
  }

  function closeDialog() {
    dialogOverlay.hidden = true;
    document.removeEventListener("keydown", handleDialogKeydown);
    if (dialogTriggerEl) {
      dialogTriggerEl.focus();
      dialogTriggerEl = null;
    }
  }

  function handleDialogKeydown(e) {
    if (e.key === "Escape") {
      pendingDeleteId = null;
      closeDialog();
    }
  }

  confirmDeleteBtn.addEventListener("click", () => {
    if (pendingDeleteId) {
      const memos = loadMemos().filter((m) => m.id !== pendingDeleteId);
      if (!saveMemos(memos)) {
        showFormMessage("メモの削除に失敗しました。");
      } else if (idField.value === pendingDeleteId) {
        resetForm();
      }
      pendingDeleteId = null;
    }
    closeDialog();
    renderList();
  });

  cancelDeleteBtn.addEventListener("click", () => {
    pendingDeleteId = null;
    closeDialog();
  });

  searchField.addEventListener("input", renderList);

  renderList();
})();
