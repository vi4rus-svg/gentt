
    // Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(err => console.error('Service Worker Error:', err));
    }

    // Check dependencies
    if (!window.JSZip || !window.saveAs || !window.Chart) {
      alert('Błąd: Nie udało się załadować bibliotek JSZip, FileSaver.js lub Chart.js');
    }

    const CATEGORIES = [
      "Cytaty życiowe",
      "Paranormalne zjawiska",
      "Motywacja i rozwój",
      "Fitness i siłownia",
      "Zdrowie i dieta",
      "Podróże i przygody",
      "Gotowanie i przepisy",
      "Technologia i gadżety",
      "Moda i styl",
      "Sztuka i kreatywność",
      "Muzyka i taniec",
      "Edukacja i ciekawostki",
      "Zwierzęta i przyroda",
      "Humor i memy",
      "Rękodzieło i DIY"
    ];

    const TRENDS = {
      "Cytaty życiowe": ["#Inspiracja", "#Motywacja", "#Życie"],
      "Paranormalne zjawiska": ["#Paranormalne", "#Duchy", "#Tajemnice"],
      "Motywacja i rozwój": ["#Sukces", "#Rozwój", "#Cele"],
      "Fitness i siłownia": ["#Trening", "#Siłownia", "#Fit"],
      "Zdrowie i dieta": ["#Zdrowie", "#Dieta", "#Wellness"],
      "Podróże i przygody": ["#Podróże", "#Przygoda", "#Eksploracja"],
      "Gotowanie i przepisy": ["#Gotowanie", "#Przepisy", "#Kuchnia"],
      "Technologia i gadżety": ["#Tech", "#Gadżety", "#Innowacje"],
      "Moda i styl": ["#Moda", "#Styl", "#Trendy"],
      "Sztuka i kreatywność": ["#Sztuka", "#Kreatywność", "#Art"],
      "Muzyka i taniec": ["#Muzyka", "#Taniec", "#Rytm"],
      "Edukacja i ciekawostki": ["#Edukacja", "#Ciekawostki", "#Nauka"],
      "Zwierzęta i przyroda": ["#Zwierzęta", "#Przyroda", "#Natura"],
      "Humor i memy": ["#Humor", "#Memy", "#Śmiech"],
      "Rękodzieło i DIY": ["#DIY", "#Rękodzieło", "#Kreatywne"]
    };

    const GOOGLE_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAdxIdXt9qPOajH6Z_SFt4R4jHJgU8wLRQ";
    const categorySel = document.getElementById('category');
    const templateSel = document.getElementById('template');
    const results = document.getElementById('results');
    const errorMsg = document.getElementById('error-message');
    const generateBtn = document.getElementById('btn-generate');
    const resetBtn = document.getElementById('btn-reset');
    const zipBtn = document.getElementById('btn-zip');
    const csvBtn = document.getElementById('btn-csv');
    const postCounter = document.getElementById('post-counter');
    const progressBarContainer = document.getElementById('progress-bar');
    const progressBar = progressBarContainer.firstElementChild;
    const trendTags = document.getElementById('trend-tags');
    const themeToggle = document.getElementById('theme-toggle');
    let bundles = [];

    // Initialize stats and post counter
    let totalPosts = parseInt(localStorage.getItem('totalPosts') || '0');
    let stats = JSON.parse(localStorage.getItem('stats') || '{}');
    // Initialize stats for all categories with 0 if not present
    CATEGORIES.forEach(category => {
      if (!stats[category]) stats[category] = 0;
    });
    postCounter.textContent = totalPosts;

    // Initialize Chart.js
    const ctx = document.getElementById('stats-chart').getContext('2d');
    const statsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: CATEGORIES,
        datasets: [{
          label: 'Wygenerowane posty',
          data: CATEGORIES.map(category => stats[category] || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Liczba postów' } },
          x: { title: { display: true, text: 'Kategoria' } }
        }
      }
    });

    // Update stats
    function updateStats(category, count = 1) {
      if (!CATEGORIES.includes(category)) return;
      stats[category] = (stats[category] || 0) + count;
      localStorage.setItem('stats', JSON.stringify(stats));
      statsChart.data.datasets[0].data = CATEGORIES.map(c => stats[c] || 0);
      statsChart.update();
    }

    // Initialize theme
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i> Jasny tryb';
    }

    // Theme toggle
    themeToggle.onclick = () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i> Jasny tryb' : '<i class="fas fa-moon"></i> Ciemny tryb';
      localStorage.setItem('darkMode', isDark);
    };

    // Populate categories
    CATEGORIES.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categorySel.appendChild(option);
    });

    // Load saved settings
    const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
    if (savedSettings.category && CATEGORIES.includes(savedSettings.category)) {
      categorySel.value = savedSettings.category;
      updateTrends(savedSettings.category);
    } else {
      categorySel.value = CATEGORIES[0] || ''; // Default to first category if no saved
      updateTrends(categorySel.value);
    }
    if (savedSettings.template) templateSel.value = savedSettings.template;
    if (savedSettings.keywords) document.getElementById('keywords').value = savedSettings.keywords;

    // Show error message
    function showError(message) {
      errorMsg.textContent = message;
      errorMsg.hidden = false;
      setTimeout(() => errorMsg.hidden = true, 5000);
    }

    // Validate keywords
    function validateKeywords(keywords) {
      if (!keywords) return true;
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      if (keywordArray.length > 5) return false;
      return keywordArray.every(k => k.length >= 3) && new Set(keywordArray).size === keywordArray.length;
    }

    // Update trends
    function updateTrends(category) {
      trendTags.innerHTML = '';
      const tags = TRENDS[category] || ["#TikTok", "#Trendy", "#Viral"];
      tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'trend-tag';
        span.textContent = tag;
        trendTags.appendChild(span);
      });
    }
    categorySel.onchange = () => updateTrends(categorySel.value);

    // Content analysis function
    function analyzeContent({ title, description, narrator, hashtags } = {}) {
      const wordCount = text => (text || '').split(/\s+/).filter(w => w).length;
      const sentenceCount = text => (text || '').split(/[.!?]+/).filter(s => s.trim()).length;
      const engagementScore = text => {
        const lowerText = (text || '').toLowerCase();
        let score = 0;
        if (lowerText.includes('?')) score += 30; // Questions
        if (lowerText.match(/(sprawdź|dołącz|zobacz|spróbuj|polub|skomentuj)/)) score += 30; // CTA
        if (wordCount(text) > 50) score += 20; // Longer content
        return Math.min(score, 100);
      };
      const readabilityScore = (text, type) => {
        const words = wordCount(text);
        const sentences = sentenceCount(text);
        if (words === 0 || sentences === 0) return 0;
        const avgWordsPerSentence = words / sentences;
        const baseScore = type === 'title' ? 100 - avgWordsPerSentence * 5 : 100 - avgWordsPerSentence * 2;
        return Math.max(0, Math.min(100, Math.round(baseScore)));
      };

      return {
        title: {
          wordCount: wordCount(title),
          readability: readabilityScore(title, 'title')
        },
        description: {
          wordCount: wordCount(description),
          readability: readabilityScore(description, 'description'),
          engagement: engagementScore(description)
        },
        narrator: {
          wordCount: wordCount(narrator),
          readability: readabilityScore(narrator, 'narrator'),
          engagement: engagementScore(narrator)
        },
        hashtags: {
          count: (hashtags || '').split(' ').filter(h => h).length
        }
      };
    }

    // Generate AI content using Google Gemini
    async function generateAIGoogle(category, keywords, template) {
      if (!CATEGORIES.includes(category)) throw new Error("Nieprawidłowa kategoria");
      let keywordPart = keywords ? ` Słowa kluczowe: ${keywords}.` : '';
      let templatePart = template === 'short_humor' ? 'Treść z humorem, krótka (15-30s), z chwytliwym hookiem w pierwszych 3 sekundach.' :
                        template === 'long_educational' ? 'Treść edukacyjna, dłuższa (30-60s), z chwytliwym hookiem w pierwszych 3 sekundach.' :
                        'Treść standardowa, angażująca (15-60s), z chwytliwym hookiem w pierwszych 3 sekundach.';
      const prompt = `Stwórz JSON z polami: title (krótki, chwytliwy tytuł, maks. 30 znaków, po polsku), description (min 250 znaków, angażujący opis, po polsku), hashtags (8-12 hashtagów oddzielonych spacją, bez #, po polsku), narrator (krótka narracja do 130 słów, po polsku, z hookiem w pierwszych 3 sekundach), imgPrompts (tablica 5 promptów do obrazów, po polsku), vidPrompts (tablica 5 promptów do wideo, po polsku). Kategoria: ${category}.${keywordPart} ${templatePart} Wszystkie treści muszą być w języku polskim. Odpowiedź musi być w formacie JSON, otoczona znacznikami \`\`\`json\n...\n\`\`\`.`;
      try {
        console.log('Wysyłanie żądania do Google Gemini dla kategorii:', category);
        const response = await fetch(GOOGLE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Błąd HTTP:', response.status, errorText);
          if (response.status === 401) {
            throw new Error("Błąd autoryzacji API. Sprawdź klucz API w Google AI Studio.");
          } else if (response.status === 429) {
            throw new Error("Przekroczono limit zapytań API. Odczekaj kilka minut i spróbuj ponownie.");
          } else {
            throw new Error(`Błąd Google Gemini: ${response.status} - ${errorText}`);
          }
        }
        const data = await response.json();
        if (!data.candidates || !data.candidates[0]) {
          console.error('Brak kandydatów w odpowiedzi:', data);
          throw new Error("Brak danych w odpowiedzi API");
        }
        let text = data.candidates[0].content?.parts[0]?.text || "";
        text = text.trim();
        const match = text.match(/```json\n([\s\S]*?)\n```/);
        if (!match) {
          console.error('Brak poprawnego JSON w odpowiedzi:', text);
          throw new Error("Odpowiedź Google Gemini nie zawiera poprawnego JSON");
        }
        let parsed;
        try {
          parsed = JSON.parse(match[1]);
        } catch (e) {
          console.error('Błąd parsowania JSON:', e, match[1]);
          throw new Error("Nie udało się sparsować odpowiedzi API: " + e.message);
        }
        // Walidacja pól
        parsed = {
          title: (parsed.title || "").substring(0, 30),
          description: parsed.description || "",
          hashtags: parsed.hashtags || "",
          narrator: parsed.narrator || "",
          imgPrompts: parsed.imgPrompts || [],
          vidPrompts: parsed.vidPrompts || []
        };
        if (!parsed.description || parsed.description.length < 250) {
          console.warn('Opis za krótki, generowanie domyślnego tekstu');
          parsed.description = "Brak wystarczającego opisu. Proszę wygenerować ponownie.";
        }
        return parsed;
      } catch (error) {
        console.error('Błąd generowania Google Gemini:', error);
        throw error;
      }
    }

    // Render content bundles
    function render(bundles) {
      results.innerHTML = '';
      if (bundles.length === 0) {
        results.innerHTML = '<p class="error">Brak wygenerowanych treści.</p>';
        return;
      }
      bundles.forEach((bundle, index) => {
        const analysis = analyzeContent(bundle);
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h3>Post ${index + 1}</h3>
          <div class="field">
            <label><i class="fas fa-heading"></i> Tytuł</label>
            <textarea readonly>${bundle.title || "Brak tytułu"}</textarea>
            <button class="btn copy-btn" data-content="${bundle.title || "Brak tytułu"}"><i class="fas fa-copy"></i> Kopiuj</button>
            <button class="btn analyze-btn" data-index="${index}"><i class="fas fa-chart-line"></i> Analizuj treść</button>
            <div class="analysis" id="analysis-${index}">
              <strong>Długość:</strong> ${analysis.title.wordCount} słów<br>
              <strong>Czytelność:</strong> ${analysis.title.readability}/100
            </div>
          </div>
          <div class="field">
            <label><i class="fas fa-paragraph"></i> Opis</label>
            <textarea readonly>${bundle.description || "Brak opisu"}</textarea>
            <button class="btn copy-btn" data-content="${bundle.description || "Brak opisu"}"><i class="fas fa-copy"></i> Kopiuj</button>
            <button class="btn analyze-btn" data-index="${index}"><i class="fas fa-chart-line"></i> Analizuj treść</button>
            <div class="analysis" id="analysis-desc-${index}">
              <strong>Długość:</strong> ${analysis.description.wordCount} słów<br>
              <strong>Czytelność:</strong> ${analysis.description.readability}/100<br>
              <strong>Angażowanie:</strong> ${analysis.description.engagement}/100
            </div>
          </div>
          <div class="field">
            <label><i class="fas fa-hashtag"></i> Hashtagi</label>
            <textarea readonly>${bundle.hashtags || "Brak hashtagów"}</textarea>
            <button class="btn copy-btn" data-content="${bundle.hashtags || "Brak hashtagów"}"><i class="fas fa-copy"></i> Kopiuj</button>
            <button class="btn analyze-btn" data-index="${index}"><i class="fas fa-chart-line"></i> Analizuj treść</button>
            <div class="analysis" id="analysis-hash-${index}">
              <strong>Liczba hashtagów:</strong> ${analysis.hashtags.count}
            </div>
          </div>
          <div class="field">
            <label><i class="fas fa-microphone"></i> Narrator</label>
            <textarea readonly>${bundle.narrator || "Brak narracji"}</textarea>
            <button class="btn copy-btn" data-content="${bundle.narrator || "Brak narracji"}"><i class="fas fa-copy"></i> Kopiuj</button>
            <button class="btn analyze-btn" data-index="${index}"><i class="fas fa-chart-line"></i> Analizuj treść</button>
            <div class="analysis" id="analysis-narr-${index}">
              <strong>Długość:</strong> ${analysis.narrator.wordCount} słów<br>
              <strong>Czytelność:</strong> ${analysis.narrator.readability}/100<br>
              <strong>Angażowanie:</strong> ${analysis.narrator.engagement}/100
            </div>
          </div>
          <div class="field">
            <label><i class="fas fa-images"></i> Prompty obrazów</label>
            <textarea readonly>${(bundle.imgPrompts || []).map((p, i) => `${i + 1}. ${p || "Brak promptu"}`).join('\n')}</textarea>
            <button class="btn copy-btn" data-content="${(bundle.imgPrompts || []).map((p, i) => `${i + 1}. ${p || "Brak promptu"}`).join('\n')}"><i class="fas fa-copy"></i> Kopiuj</button>
          </div>
          <div class="field">
            <label><i class="fas fa-video"></i> Prompty wideo</label>
            <textarea readonly>${(bundle.vidPrompts || []).map((p, i) => `${i + 1}. ${p || "Brak promptu"}`).join('\n')}</textarea>
            <button class="btn copy-btn" data-content="${(bundle.vidPrompts || []).map((p, i) => `${i + 1}. ${p || "Brak promptu"}`).join('\n')}"><i class="fas fa-copy"></i> Kopiuj</button>
          </div>
        `;
        card.querySelectorAll('.copy-btn').forEach(btn => {
          btn.onclick = () => {
            const content = btn.getAttribute('data-content');
            navigator.clipboard.writeText(content)
              .then(() => showError("Treść skopiowana do schowka!"))
              .catch(() => showError("Błąd kopiowania treści"));
          };
        });
        card.querySelectorAll('.analyze-btn').forEach(btn => {
          btn.onclick = () => {
            const index = btn.getAttribute('data-index');
            const analysisDivs = card.querySelectorAll(`.analysis[id*="analysis-${index}"]`);
            analysisDivs.forEach(div => {
              div.style.display = div.style.display === 'block' ? 'none' : 'block';
            });
          };
        });
        results.appendChild(card);
      });
    }

    // Generate button handler
    generateBtn.onclick = async () => {
      const count = parseInt(document.getElementById('count').value) || 1;
      const category = categorySel.value || CATEGORIES[0]; // Default to first category if none selected
      const template = templateSel.value;
      const keywords = document.getElementById('keywords').value.trim();

      if (!category || !CATEGORIES.includes(category)) return showError("Wybierz prawidłową kategorię");
      if (count < 1 || count > 10) return showError("Liczba postów musi być między 1 a 10");
      if (!validateKeywords(keywords)) return showError("Maks. 5 unikalnych słów kluczowych, każde min. 3 znaki");

      // Save settings
      localStorage.setItem('settings', JSON.stringify({ category, template, keywords }));

      generateBtn.disabled = true;
      generateBtn.classList.add('loading');
      progressBarContainer.classList.add('active');
      errorMsg.hidden = true;
      bundles = [];

      try {
        for (let i = 0; i < count; i++) {
          progressBar.style.width = `${((i + 1) / count * 100)}%`;
          console.log(`Generowanie posta ${i + 1}/${count} dla kategorii: ${category}`);
          const bundle = await generateAIGoogle(category, keywords, template);
          bundles.push(bundle);
          render(bundles);
          totalPosts += 1;
          localStorage.setItem('totalPosts', totalPosts);
          postCounter.textContent = totalPosts;
          updateStats(category, 1);
        }
        if (bundles.length === 0) {
          throw new Error("Nie wygenerowano żadnych treści");
        }
        zipBtn.disabled = false;
        csvBtn.disabled = false;
      } catch (error) {
        showError(`Błąd: ${error.message}`);
        console.error('Szczegóły błędu:', error);
      } finally {
        generateBtn.disabled = false;
        generateBtn.classList.remove('loading');
        progressBarContainer.classList.remove('active');
        progressBar.style.width = '0';
      }
    };

    // Reset button handler
    resetBtn.onclick = () => {
      if (!confirm("Czy na pewno chcesz zresetować wszystkie dane?")) return;
      results.innerHTML = '';
      bundles = [];
      zipBtn.disabled = true;
      csvBtn.disabled = true;
      document.getElementById('content-form').reset();
      categorySel.value = '';
      updateTrends('');
    };

    // ZIP button handler
    zipBtn.onclick = async () => {
      if (!window.JSZip || !window.saveAs) {
        showError('Błąd: Biblioteki JSZip lub FileSaver.js nie są dostępne');
        return;
      }
      const zip = new JSZip();
      bundles.forEach((bundle, i) => {
        const base = `post_${String(i + 1).padStart(2, '0')}`;
        zip.file(`${base}/topic.txt`, bundle.title || "");
        zip.file(`${base}/description.txt`, bundle.description || "");
        zip.file(`${base}/hashtags.txt`, bundle.hashtags || "");
        zip.file(`${base}/narrator.txt`, bundle.narrator || "");
        zip.file(`${base}/image_prompts.txt`, (bundle.imgPrompts || []).join('\n'));
        zip.file(`${base}/video_prompts.txt`, (bundle.vidPrompts || []).join('\n'));
      });
      try {
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, 'tiktok_content_pack.zip');
      } catch (error) {
        showError('Błąd podczas generowania ZIP: ' + error.message);
      }
    };

    // CSV button handler
    csvBtn.onclick = () => {
      const csv = [
        ['Post', 'Tytuł', 'Opis', 'Hashtagi', 'Narrator', 'Prompty obrazów', 'Prompty wideo'],
        ...bundles.map((b, i) => [
          i + 1,
          `"${b.title || ''}"`,
          `"${b.description || ''}"`,
          `"${b.hashtags || ''}"`,
          `"${b.narrator || ''}"`,
          `"${(b.imgPrompts || []).join(';')}"`,
          `"${(b.vidPrompts || []).join(';')}"`
        ])
      ].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      saveAs(blob, 'tiktok_content_pack.csv');
    };

    // Initial trends
    updateTrends(categorySel.value);
  