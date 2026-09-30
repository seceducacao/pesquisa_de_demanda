(() => {
  "use strict";

  const form = document.getElementById("preMatriculaForm");
  const allSteps = [...document.querySelectorAll(".form-step")];
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const submitBtn = document.getElementById("submitBtn");

  const stepCounter = document.getElementById("stepCounter");
  const stepName = document.getElementById("stepName");
  const progressPercent = document.getElementById("progressPercent");
  const progressBar = document.getElementById("progressBar");

  const birthInput = document.getElementById("dataNascimento");
  const codeCard = document.getElementById("codeCard");
  const generatedCode = document.getElementById("generatedCode");
  const codeHelp = document.getElementById("codeHelp");
  const ageBadge = document.getElementById("ageBadge");
  const codeInput = document.getElementById("codigoPreMatricula");
  const turnoCard = document.getElementById("turnoCard");

  const reviewCode = document.getElementById("reviewCode");
  const reviewList = document.getElementById("reviewList");

  const successCard = document.getElementById("successCard");
  const successCode = document.getElementById("successCode");
  const newFormBtn = document.getElementById("newFormBtn");

  let currentVisibleIndex = 0;
  let randomNumber = sessionStorage.getItem("preMatriculaRandom") || null;

  // ---------- Utilidades ----------
  function todayISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  }

  function subtractMonths(date, months) {
    const copy = new Date(date);
    const originalDay = copy.getDate();
    copy.setDate(1);
    copy.setMonth(copy.getMonth() - months);
    const lastDay = new Date(copy.getFullYear(), copy.getMonth() + 1, 0).getDate();
    copy.setDate(Math.min(originalDay, lastDay));
    return copy;
  }

  function toISODate(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  }

  const today = new Date();
  birthInput.max = todayISO();
  birthInput.min = toISODate(subtractMonths(today, 48));

  function getRandom3Digits() {
    // Evita repetir números já gerados neste navegador.
    const storageKey = "preMatriculaUsedRandoms";
    const used = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]").map(String));

    let value;
    let attempts = 0;

    do {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      value = String(100 + (arr[0] % 900));
      attempts++;
    } while (used.has(value) && attempts < 1000);

    if (attempts >= 1000) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      value = String(100 + (arr[0] % 900));
    }

    return value;
  }

  function ensureRandomNumber() {
    if (!randomNumber) {
      randomNumber = getRandom3Digits();
      sessionStorage.setItem("preMatriculaRandom", randomNumber);
    }
    return randomNumber;
  }

  function markNumberAsUsed() {
    if (!randomNumber) return;
    const storageKey = "preMatriculaUsedRandoms";
    const used = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]").map(String));
    used.add(String(randomNumber));
    // Mantém no máximo 900 entradas.
    localStorage.setItem(storageKey, JSON.stringify([...used].slice(-900)));
  }

  function calculateAgeInMonths(dateString) {
    if (!dateString) return null;

    const [year, month, day] = dateString.split("-").map(Number);
    const birth = new Date(year, month - 1, day);
    const now = new Date();

    if (Number.isNaN(birth.getTime()) || birth > now) return null;

    let months = (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth());

    if (now.getDate() < birth.getDate()) months--;

    return months;
  }

  function ageRule(months) {
    if (months === null || months < 0) return null;
    if (months <= 12) return { faixa: "0-12", label: "0 a 12 meses", };
    if (months <= 24) return { faixa: "1-2", label: "1 a 2 anos", };
    if (months <= 36) return { faixa: "2-3", label: "2 a 3 anos", };
    if (months <= 48) return { faixa: "3-4", label: "3 a 4 anos", };
    return { invalid: true };
  }

  function selectedTurno() {
    return form.querySelector('input[name="turno"]:checked')?.value || "";
  }

  function clearTurnoSelection() {
    form.querySelectorAll('input[name="turno"]').forEach(r => { r.checked = false; });
  }

  function updateCode() {
    const months = calculateAgeInMonths(birthInput.value);
    const rule = ageRule(months);

    clearError("dataNascimento");
    clearError("turno");

    if (!birthInput.value) {
      generatedCode.textContent = "—";
      codeInput.value = "";
      codeHelp.textContent = "Informe uma data de nascimento válida para gerar o código.";
      ageBadge.textContent = "Aguardando";
      ageBadge.classList.remove("ready");
      turnoCard.classList.add("is-hidden");
      return;
    }

    if (!rule || rule.invalid) {
      generatedCode.textContent = "—";
      codeInput.value = "";
      codeHelp.textContent = "A criança precisa ter entre 0 e 48 meses.";
      ageBadge.textContent = "Fora da faixa";
      ageBadge.classList.remove("ready");
      turnoCard.classList.add("is-hidden");
      setError("dataNascimento", "A data informada está fora da faixa atendida (0 a 48 meses).");
      return;
    }

    const number = ensureRandomNumber();
    let turno = rule.autoTurno;

    if (rule.faixa === "2-3") {
      turnoCard.classList.remove("is-hidden");
      turno = selectedTurno();
    } else {
      turnoCard.classList.add("is-hidden");
      clearTurnoSelection();
    }

    const turnoDisplay = turno || "—";
    const code = `${number}.${rule.faixa}.${turnoDisplay}`;

    generatedCode.textContent = code;
    codeInput.value = turno ? code : "";
    codeHelp.textContent = rule.autoTurno
      ? `${rule.label} • Turno parcial definido automaticamente`
      : `${rule.label} • Selecione o turno para concluir o código`;

    ageBadge.textContent = rule.label;
    ageBadge.classList.add("ready");

    codeCard.animate(
      [
        { transform: "scale(.992)", opacity: .85 },
        { transform: "scale(1)", opacity: 1 }
      ],
      { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }

  // ---------- Máscara de telefone ----------
  function formatPhone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }

  document.getElementById("celularResponsavel").addEventListener("input", (e) => {
    e.target.value = formatPhone(e.target.value);
  });

  // ---------- Condicionais ----------
  function setRequiredForContainer(container, required) {
    container.querySelectorAll("input, select, textarea").forEach(el => {
      if (el.type !== "hidden") el.required = required;
    });
  }

  form.addEventListener("change", (e) => {
    if (e.target.name === "turno") updateCode();

    if (e.target.name === "possuiDeficiencia") {
      const condStep = allSteps.find(s => s.dataset.conditional === "deficiencia");
      const shouldShow = e.target.value === "Sim";
      condStep.dataset.enabled = shouldShow ? "true" : "false";
      setRequiredForContainer(condStep, shouldShow);

      if (!shouldShow) {
        condStep.querySelectorAll("input").forEach(i => { i.checked = false; });
      }
      refreshProgress();
    }

    if (e.target.name === "maeSolo") {
      const isSolo = e.target.value === "Sim";
      const nameCard = document.getElementById("paiNameCard");
      const soloCard = document.getElementById("paiSoloCard");

      nameCard.classList.toggle("is-hidden", isSolo);
      soloCard.classList.toggle("is-hidden", isSolo);

      setRequiredForContainer(nameCard, !isSolo);
      setRequiredForContainer(soloCard, !isSolo);

      if (isSolo) {
        nameCard.querySelectorAll("input").forEach(i => {
          if (i.type === "radio" || i.type === "checkbox") i.checked = false;
          else i.value = "";
        });
        soloCard.querySelectorAll("input").forEach(i => { i.checked = false; });
        clearError("nomePai");
        clearError("paiSolo");
      }
    }

    clearRelevantError(e.target);
  });

  birthInput.addEventListener("change", updateCode);
  birthInput.addEventListener("input", updateCode);

  // ---------- Validação ----------
  function setError(nameOrId, message) {
    const error = document.querySelector(`[data-error-for="${CSS.escape(nameOrId)}"]`);
    if (error) error.textContent = message;
  }

  function clearError(nameOrId) {
    const error = document.querySelector(`[data-error-for="${CSS.escape(nameOrId)}"]`);
    if (error) error.textContent = "";
  }

  function clearRelevantError(input) {
    clearError(input.name || input.id);
    input.removeAttribute("aria-invalid");
  }

  function fieldDisplayName(input) {
    const label = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
    if (label) return label.textContent.replace("*", "").trim();
    return "Este campo";
  }

  function validateNameField(input) {
    const value = input.value.trim().replace(/\s+/g, " ");
    if (!value) return "Informe o nome completo.";
    const parts = value.split(" ").filter(part => part.length >= 2);
    if (parts.length < 2) return "Informe nome e sobrenome.";
    return "";
  }

  function validateCurrentStep(step) {
    let valid = true;
    let firstInvalid = null;

    // Text/date/tel inputs visíveis.
    const fields = [...step.querySelectorAll("input[required], select[required], textarea[required]")]
      .filter(el => !el.closest(".is-hidden") && el.type !== "radio" && el.type !== "checkbox" && el.type !== "hidden");

    fields.forEach(input => {
      clearError(input.name || input.id);
      input.removeAttribute("aria-invalid");

      let message = "";

      if (!input.value.trim()) {
        message = `${fieldDisplayName(input)} é obrigatório.`;
      }

      if (!message && ["nomeCrianca", "nomeMae", "nomePai", "responsavelLegal"].includes(input.id)) {
        message = validateNameField(input);
      }

      if (!message && input.id === "celularResponsavel") {
        const digits = input.value.replace(/\D/g, "");
        if (digits.length < 10) message = "Informe um número de celular válido com DDD.";
      }

      if (!message && input.id === "dataNascimento") {
        const months = calculateAgeInMonths(input.value);
        const rule = ageRule(months);
        if (!rule || rule.invalid) message = "A criança precisa ter entre 0 e 48 meses.";
      }

      if (message) {
        valid = false;
        input.setAttribute("aria-invalid", "true");
        setError(input.name || input.id, message);
        firstInvalid ||= input;
      }
    });

    // Grupos de rádio obrigatórios.
    const radioNames = [...new Set(
      [...step.querySelectorAll('input[type="radio"][required]')]
        .filter(el => !el.closest(".is-hidden"))
        .map(el => el.name)
    )];

    radioNames.forEach(name => {
      clearError(name);
      const checked = step.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
      if (!checked) {
        valid = false;
        setError(name, "Selecione uma opção para continuar.");
        firstInvalid ||= step.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]`);
      }
    });

    // Turno é obrigatório apenas na faixa 25–36 meses.
    if (step.dataset.step === "1") {
      const months = calculateAgeInMonths(birthInput.value);
      const rule = ageRule(months);
      if (rule?.faixa === "2-3" && !selectedTurno()) {
        valid = false;
        setError("turno", "Selecione Parcial ou Integral para continuar.");
        firstInvalid ||= turnoCard;
      }
      if (rule && !rule.invalid && !codeInput.value) {
        valid = false;
      }
    }

    // Grupos de checkbox com ao menos uma seleção.
    step.querySelectorAll("[data-checkbox-group]").forEach(group => {
      const name = group.dataset.checkboxGroup;
      clearError(name);
      const anyChecked = group.querySelector('input[type="checkbox"]:checked');
      if (!anyChecked) {
        valid = false;
        setError(name, "Selecione pelo menos uma opção.");
        firstInvalid ||= group;
      }
    });

    // Checkbox simples obrigatório.
    const requiredChecks = [...step.querySelectorAll('input[type="checkbox"][required]')]
      .filter(el => !el.closest("[data-checkbox-group]") && !el.closest(".is-hidden"));

    requiredChecks.forEach(input => {
      clearError(input.name || input.id);
      if (!input.checked) {
        valid = false;
        setError(input.name || input.id, "Confirme esta opção para continuar.");
        firstInvalid ||= input;
      }
    });

    if (!valid && firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      if (firstInvalid.focus) setTimeout(() => firstInvalid.focus({ preventScroll: true }), 250);
    }

    return valid;
  }

  // ---------- Navegação ----------
  function isStepEnabled(step) {
    if (step.dataset.conditional === "deficiencia") {
      return step.dataset.enabled === "true";
    }
    return true;
  }

  function visibleSteps() {
    return allSteps.filter(isStepEnabled);
  }

  function showStepByVisibleIndex(index) {
    const steps = visibleSteps();
    currentVisibleIndex = Math.max(0, Math.min(index, steps.length - 1));

    allSteps.forEach(step => step.classList.remove("is-active"));
    const current = steps[currentVisibleIndex];
    current.classList.add("is-active");

    prevBtn.style.visibility = currentVisibleIndex === 0 ? "hidden" : "visible";

    const isLast = currentVisibleIndex === steps.length - 1;
    nextBtn.classList.toggle("is-hidden", isLast);
    submitBtn.classList.toggle("is-hidden", !isLast);

    refreshProgress();

    if (isLast) populateReview();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function refreshProgress() {
    const steps = visibleSteps();
    const current = steps[currentVisibleIndex] || steps[0];
    const n = currentVisibleIndex + 1;
    const total = steps.length;
    const pct = Math.round((n / total) * 100);

    stepCounter.textContent = `Etapa ${n} de ${total}`;
    stepName.textContent = current?.dataset.title || "";
    progressPercent.textContent = `${pct}%`;
    progressBar.style.width = `${pct}%`;
  }

  nextBtn.addEventListener("click", () => {
    const steps = visibleSteps();
    const current = steps[currentVisibleIndex];
    if (!validateCurrentStep(current)) return;
    showStepByVisibleIndex(currentVisibleIndex + 1);
  });

  prevBtn.addEventListener("click", () => {
    showStepByVisibleIndex(currentVisibleIndex - 1);
  });

  // ---------- Revisão ----------
  function getRadioValue(name) {
    return form.querySelector(`input[name="${CSS.escape(name)}"]:checked`)?.value || "—";
  }

  function getCheckedValues(name) {
    const values = [...form.querySelectorAll(`input[name="${CSS.escape(name)}"]:checked`)].map(i => i.value);
    return values.length ? values.join(", ") : "—";
  }

  function populateReview() {
    reviewCode.textContent = codeInput.value || generatedCode.textContent || "—";

    const items = [
      ["Nome da criança", document.getElementById("nomeCrianca").value || "—"],
      ["Data de nascimento", formatDateBR(birthInput.value)],
      ["Faixa / turno", codeInput.value ? codeInput.value.split(".").slice(1).join(" • ") : "—"],
      ["Responsável legal", document.getElementById("responsavelLegal").value || "—"],
      ["Celular", document.getElementById("celularResponsavel").value || "—"],
      ["Já estuda em Creche/EMEI", getRadioValue("estudaAtualmente")],
      ["Cor/raça", getRadioValue("corRaca")],
      ["Possui deficiência", getRadioValue("possuiDeficiencia")],
      ["Renda familiar", getRadioValue("rendaFamiliar")],
      ["Pessoas na residência", getRadioValue("moradoresCasa")],
      ["Benefício social", getRadioValue("beneficioSocial")]
    ];

    reviewList.innerHTML = items.map(([term, desc]) => `
      <div>
        <dt>${escapeHTML(term)}</dt>
        <dd>${escapeHTML(desc)}</dd>
      </div>
    `).join("");
  }

  function formatDateBR(value) {
    if (!value) return "—";
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Finalização ----------
  function serializeForm() {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (key in data) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });
    return data;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const steps = visibleSteps();
    const current = steps[currentVisibleIndex];
    if (!validateCurrentStep(current)) return;

    if (!codeInput.value) {
      showStepByVisibleIndex(0);
      setError("dataNascimento", "Não foi possível concluir o código da pré-matrícula.");
      return;
    }

    const payload = serializeForm();

    // Ponto de integração com backend:
    // document.addEventListener("prematricula:submit", (event) => {
    //   // enviar event.detail para Supabase/API
    // });
    document.dispatchEvent(new CustomEvent("prematricula:submit", { detail: payload }));

    markNumberAsUsed();
    successCode.textContent = codeInput.value;

    form.classList.add("is-hidden");
    document.querySelector(".progress-shell").classList.add("is-hidden");
    successCard.classList.remove("is-hidden");

    sessionStorage.removeItem("preMatriculaRandom");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  newFormBtn.addEventListener("click", () => {
    form.reset();
    randomNumber = null;
    sessionStorage.removeItem("preMatriculaRandom");

    generatedCode.textContent = "—";
    codeInput.value = "";
    codeHelp.textContent = "Informe uma data de nascimento válida para gerar o código.";
    ageBadge.textContent = "Aguardando";
    ageBadge.classList.remove("ready");
    turnoCard.classList.add("is-hidden");

    const condStep = allSteps.find(s => s.dataset.conditional === "deficiencia");
    condStep.dataset.enabled = "false";
    setRequiredForContainer(condStep, false);

    document.getElementById("paiNameCard").classList.remove("is-hidden");
    document.getElementById("paiSoloCard").classList.remove("is-hidden");
    setRequiredForContainer(document.getElementById("paiNameCard"), true);
    setRequiredForContainer(document.getElementById("paiSoloCard"), true);

    successCard.classList.add("is-hidden");
    form.classList.remove("is-hidden");
    document.querySelector(".progress-shell").classList.remove("is-hidden");

    currentVisibleIndex = 0;
    showStepByVisibleIndex(0);
  });

  // ---------- Estado inicial ----------
  const disabilityStep = allSteps.find(s => s.dataset.conditional === "deficiencia");
  disabilityStep.dataset.enabled = "false";
  setRequiredForContainer(disabilityStep, false);

  showStepByVisibleIndex(0);
  updateCode();
})();
