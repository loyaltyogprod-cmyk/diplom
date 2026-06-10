(function() {
  // --- DOM элементы ---
  // Шаги
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  // Шаг 1
  const modeOptions = document.querySelectorAll('.mode-option');
  const apiSettingsDiv = document.getElementById('apiSettings');
  const apiKeyInput = document.getElementById('apiKey');
  const apiProviderSelect = document.getElementById('apiProvider');
  const saveApiBtn = document.getElementById('saveApiBtn');
  const apiStatusSpan = document.getElementById('apiStatus');
  const nextToStep2Btn = document.getElementById('nextToStep2');
  // Шаг 2
  const positionSelect = document.getElementById('position');
  const senioritySelect = document.getElementById('seniority');
  const styleSelect = document.getElementById('style');
  const backToStep1Btn = document.getElementById('backToStep1');
  const nextToStep3Btn = document.getElementById('nextToStep3');
  // Шаг 3
  const questionInput = document.getElementById('questionInput');
  const quickSelect = document.getElementById('quickSelect');
  const useQuickBtn = document.getElementById('useQuickBtn');
  const generateBtn = document.getElementById('generateAnswerBtn');
  const answerDiv = document.getElementById('answerContent');
  const copyBtn = document.getElementById('copyAnswerBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const saveToHistoryBtn = document.getElementById('saveToHistoryBtn');
  const historyListDiv = document.getElementById('historyList');
  const exportHistoryBtn = document.getElementById('exportHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const backToStep2Btn = document.getElementById('backToStep2');

  // --- Состояние ---
  let currentMode = null;       // 'local' или 'api'
  let apiKey = localStorage.getItem('hr_api_key') || '';
  let apiProvider = localStorage.getItem('hr_api_provider') || 'deepseek';
  let selectedPosition = 'frontend';
  let selectedSeniority = 'middle';
  let selectedStyle = 'confident';
  let lastGeneratedAnswer = '';
  let history = JSON.parse(localStorage.getItem('hr_answer_history') || '[]');

  // --- Инициализация (восстановление ключа) ---
  if (apiKey) {
    apiKeyInput.value = apiKey;
    apiProviderSelect.value = apiProvider;
  }
  renderHistory();

  // --- Функции управления шагами ---
  function showStep(stepNumber) {
    step1.style.display = 'none';
    step2.style.display = 'none';
    step3.style.display = 'none';
    if (stepNumber === 1) step1.style.display = 'block';
    else if (stepNumber === 2) step2.style.display = 'block';
    else if (stepNumber === 3) step3.style.display = 'block';
  }

  // --- Шаг 1: выбор режима ---
  modeOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      currentMode = mode;
      if (mode === 'local') {
        apiSettingsDiv.style.display = 'none';
        nextToStep2Btn.disabled = false;
      } else {
        apiSettingsDiv.style.display = 'block';
        // проверяем, сохранён ли ключ
        if (apiKey) {
          nextToStep2Btn.disabled = false;
          apiStatusSpan.textContent = '✅ Ключ сохранён';
          apiStatusSpan.style.color = '#10b981';
        } else {
          nextToStep2Btn.disabled = true;
          apiStatusSpan.textContent = '❌ Введите и сохраните ключ';
          apiStatusSpan.style.color = '#ef4444';
        }
      }
    });
  });

  saveApiBtn.addEventListener('click', () => {
    const newKey = apiKeyInput.value.trim();
    if (!newKey) {
      apiStatusSpan.textContent = 'Введите ключ!';
      apiStatusSpan.style.color = '#ef4444';
      return;
    }
    apiKey = newKey;
    apiProvider = apiProviderSelect.value;
    localStorage.setItem('hr_api_key', apiKey);
    localStorage.setItem('hr_api_provider', apiProvider);
    apiStatusSpan.textContent = '✅ Ключ сохранён, можно продолжить';
    apiStatusSpan.style.color = '#10b981';
    if (currentMode === 'api') {
      nextToStep2Btn.disabled = false;
    }
  });

  nextToStep2Btn.addEventListener('click', () => {
    if (currentMode === null) {
      alert('Сначала выберите режим (Локальный или AI)');
      return;
    }
    if (currentMode === 'api' && !apiKey) {
      alert('Введите и сохраните API ключ');
      return;
    }
    showStep(2);
  });

  // --- Шаг 2: параметры и переход на шаг 3 ---
  backToStep1Btn.addEventListener('click', () => {
    showStep(1);
  });

  nextToStep3Btn.addEventListener('click', () => {
    selectedPosition = positionSelect.value;
    selectedSeniority = senioritySelect.value;
    selectedStyle = styleSelect.value;
    showStep(3);
  });

  // --- Шаг 3: работа с вопросами и генерацией ---
  // Быстрые вопросы
  const quickMap = {
    exp: 'Расскажите о вашем опыте работы. Какие проекты вы вели и за что отвечали?',
    challenge: 'Опишите самую сложную техническую задачу, которую вы решали. Как вы подошли к решению?',
    conflict: 'Расскажите о конфликте в команде и как вы помогли его разрешить.',
    motivation: 'Почему вы хотите работать в нашей компании? Что вас привлекает?'
  };
  useQuickBtn.addEventListener('click', () => {
    const val = quickSelect.value;
    if (val && quickMap[val]) {
      questionInput.value = quickMap[val];
    }
  });

  // Генерация
  async function generateAnswer() {
    const questionText = questionInput.value.trim();
    if (!questionText) {
      answerDiv.innerHTML = '<span class="placeholder">⚠️ Введите вопрос</span>';
      return;
    }
    answerDiv.innerHTML = '<span class="placeholder">⏳ Генерация ответа...</span>';
    try {
      let answer;
      if (currentMode === 'api' && apiKey) {
        answer = await callAPI(questionText, selectedPosition, selectedSeniority, selectedStyle);
      } else {
        answer = localGenerate(questionText, selectedPosition, selectedSeniority, selectedStyle);
      }
      lastGeneratedAnswer = answer;
      answerDiv.innerHTML = escapeHtml(answer).replace(/\n/g, '<br>');
    } catch (err) {
      answerDiv.innerHTML = `<span class="placeholder">❌ Ошибка: ${err.message}</span>`;
    }
  }

  function localGenerate(question, pos, seniority, style) {
    const posNames = {
      frontend: 'Frontend-разработчик', backend: 'Backend-разработчик',
      fullstack: 'Fullstack-разработчик', devops: 'DevOps-инженер',
      qa: 'QA-инженер', designer: 'UI/UX-дизайнер', pm: 'Project Manager'
    };
    const positionTitle = posNames[pos] || 'специалист';
    const expYears = { junior: '1-2 года', middle: '3-4 года', senior: '5+ лет', lead: '7+ лет' }[seniority];
    const stylePrefix = {
      confident: 'Уверенно могу сказать:',
      modest: 'Полагаю, что',
      technical: 'С технической точки зрения,'
    }[style] || '';
    return `${stylePrefix} я работаю ${positionTitle} уже ${expYears}. Например, недавно я столкнулся с задачей: ${question.slice(0, 80)}... и успешно её решил, применив свой опыт. Это позволило улучшить процесс и результат. Готов применить эти навыки на вашей позиции.`;
  }

  async function callAPI(question, pos, seniority, style) {
    const provider = apiProvider;
    const systemPrompt = `Ты кандидат на должность ${pos} (уровень ${seniority}). Стиль ответа: ${style}. Дай развернутый ответ (4-7 предложений) на русском языке, с конкретным примером из опыта.`;
    const url = provider === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    const model = provider === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ошибка ${response.status}: ${errorText.slice(0, 100)}`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  generateBtn.addEventListener('click', generateAnswer);
  regenerateBtn.addEventListener('click', generateAnswer);

  copyBtn.addEventListener('click', () => {
    if (!lastGeneratedAnswer) return;
    navigator.clipboard.writeText(lastGeneratedAnswer);
    copyBtn.textContent = '✅ Скопировано!';
    setTimeout(() => copyBtn.textContent = '📋 Скопировать', 1500);
  });

  saveToHistoryBtn.addEventListener('click', () => {
    if (!lastGeneratedAnswer) return;
    const entry = {
      date: new Date().toISOString(),
      question: questionInput.value,
      answer: lastGeneratedAnswer,
      position: selectedPosition,
      level: selectedSeniority,
      mode: currentMode
    };
    history.unshift(entry);
    if (history.length > 50) history.pop();
    localStorage.setItem('hr_answer_history', JSON.stringify(history));
    renderHistory();
    alert('✅ Ответ сохранён в историю');
  });

  function renderHistory() {
    if (!history.length) {
      historyListDiv.innerHTML = '<div class="history-item">История пуста</div>';
      return;
    }
    historyListDiv.innerHTML = history.map((item, idx) => `
      <div class="history-item">
        <small>${new Date(item.date).toLocaleString()}</small>
        <div><strong>${escapeHtml(item.question.substring(0, 80))}...</strong></div>
        <div>${escapeHtml(item.answer.substring(0, 120))}...</div>
        <button class="load-history-btn" data-idx="${idx}">📋 Загрузить</button>
      </div>
    `).join('');
    document.querySelectorAll('.load-history-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        const entry = history[idx];
        questionInput.value = entry.question;
        selectedPosition = entry.position;
        selectedSeniority = entry.level;
        positionSelect.value = entry.position;
        senioritySelect.value = entry.level;
        answerDiv.innerHTML = escapeHtml(entry.answer).replace(/\n/g, '<br>');
        lastGeneratedAnswer = entry.answer;
      });
    });
  }

  exportHistoryBtn.addEventListener('click', () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr_history_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Удалить всю историю?')) {
      history = [];
      localStorage.removeItem('hr_answer_history');
      renderHistory();
    }
  });

  backToStep2Btn.addEventListener('click', () => {
    showStep(2);
    // обновляем выбранные параметры на случай, если они изменились в step3 через загрузку истории
    positionSelect.value = selectedPosition;
    senioritySelect.value = selectedSeniority;
    styleSelect.value = selectedStyle;
  });

  function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // Запуск: показываем первый шаг
  showStep(1);
})();