document.addEventListener("DOMContentLoaded", () => {
  const q = (s) => document.querySelector(s);
  const qa = (s) => document.querySelectorAll(s);
  const toast = (msg) => {
    const t = q("#toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2500);
  };

  // Load Subjects
  let allSubjects = [];
  fetch("/api/subjects")
    .then((r) => r.json())
    .then((data) => {
      allSubjects = data;
      renderSubjects(data);
      setupCategoryChips(data);
      updateSubjectCount(data.length);
    });

  function renderSubjects(list) {
    const grid = q("#subjectGrid");
    const empty = q("#subjectEmpty");
    if (!list.length) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    grid.innerHTML = list
      .map(
        (s) => `
      <article class="subject-card" data-cat="${s.category}">
        <div class="icon">âœ¦</div>
        <h3>${s.name}</h3>
        <p>${s.description}</p>
        <small>${s.category} Â· ${s.level}</small>
      </article>
    `
      )
      .join("");
  }

  function updateSubjectCount(n) {
    q("#subjectCount").textContent = `${n} subjects`;
  }

  function setupCategoryChips(data) {
    const cats = ["All subjects", ...new Set(data.map((s) => s.category))];
    q("#chips").innerHTML = cats
      .map(
        (c, i) =>
          `<button class="chip ${i === 0 ? "active" : ""}" data-cat="${c}">${c}</button>`
      )
      .join("");

    q("#chips").addEventListener("click", (e) => {
      if (!e.target.classList.contains("chip")) return;
      qa(".chip").forEach((c) => c.classList.remove("active"));
      e.target.classList.add("active");
      q("#category").value = e.target.dataset.cat;
      filterSubjects();
    });
  }

  function filterSubjects() {
    const search = q("#subjectSearch").value.toLowerCase();
    const cat = q("#category").value;
    const level = q("#level").value;

    const filtered = allSubjects.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search);
      const matchCat = cat === "All subjects" || s.category === cat;
      const matchLevel =
        level === "All levels" || s.level.toLowerCase().includes(level.toLowerCase());
      return matchSearch && matchCat && matchLevel;
    });
    renderSubjects(filtered);
    updateSubjectCount(filtered.length);
  }

  q("#subjectSearch").addEventListener("input", filterSubjects);
  q("#category").addEventListener("change", filterSubjects);
  q("#level").addEventListener("change", filterSubjects);

  // Load Lessons
  let allLessons = [];
  fetch("/api/lessons")
    .then((r) => r.json())
    .then((data) => {
      allLessons = data;
      renderLessons(data);
      populateLessonSubjects(data);
    });

  function populateLessonSubjects(data) {
    const subjects = [...new Set(data.map((l) => l.subject))];
    q("#lessonSubject").innerHTML =
      `<option>All subjects</option>` +
      subjects.map((s) => `<option>${s}</option>`).join("");
  }

  function renderLessons(list) {
    const grid = q("#lessonGrid");
    const empty = q("#lessonEmpty");
    if (!list.length) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    grid.innerHTML = list
      .map(
        (l) => `
      <article class="lesson-card">
        <span class="tag">${l.subject}</span>
        <h3>${l.title}</h3>
        <p>${l.summary}</p>
        <div class="meta"><span>${l.level}</span><span>${l.topic}</span></div>
        <a href="/lessons/${l.id}" class="btn outline" style="text-decoration:none; text-align:center;">Open lesson â†’</a>
      </article>
    `
      )
      .join("");
  }

  function filterLessons() {
    const search = q("#lessonSearch").value.toLowerCase();
    const subject = q("#lessonSubject").value;
    const filtered = allLessons.filter((l) => {
      const matchSearch =
        l.title.toLowerCase().includes(search) ||
        l.summary.toLowerCase().includes(search) ||
        l.topic.toLowerCase().includes(search);
      const matchSub = subject === "All subjects" || l.subject === subject;
      return matchSearch && matchSub;
    });
    renderLessons(filtered);
  }

  q("#lessonSearch").addEventListener("input", filterLessons);
  q("#lessonSubject").addEventListener("change", filterLessons);

  // Tools: Tutor
  q("#tutorForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const question = q("#tutorQuestion").value;
    fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    })
      .then((r) => r.json())
      .then((res) => {
        const rep = q("#tutorReply");
        rep.classList.remove("hidden");
        rep.textContent = res.reply;
      });
  });

  // Tools: Recall Note
  q("#recallForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const note = q("#recallNote").value;
    fetch("/api/recall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.saved) {
          toast("Revision note saved!");
          q("#recallNote").value = "";
          loadProgress();
        }
      });
  });

  // Tools: Study Planner
  q("#planForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const subject = q("#planSubject").value;
    const minutes = q("#planMinutes").value;
    const goal = q("#planGoal").value;
    fetch("/api/study-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, minutes, goal }),
    })
      .then((r) => r.json())
      .then((res) => {
        const pr = q("#planResult");
        pr.classList.remove("hidden");
        pr.innerHTML = `<b>Suggested Study Plan (${minutes} mins):</b><ul>` +
          res.plan.map((p) => `<li><b>${p.time}:</b> ${p.task}</li>`).join("") +
          `</ul><small>${res.note}</small>`;
      });
  });

  // Progress metrics
  function loadProgress() {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((p) => {
        q("#completed").textContent = p.completed_lessons.length;
        q("#notes").textContent = p.recall_notes.length;
        const total = p.quiz_scores.length;
        if (total > 0) {
          const correct = p.quiz_scores.filter((q) => q.correct).length;
          const pct = Math.round((correct / total) * 100);
          q("#accuracy").textContent = `${pct}%`;
          q("#bar").style.width = `${pct}%`;
          q("#quizCount").textContent = `${correct} of ${total} quiz attempts correct.`;
        } else {
          q("#accuracy").textContent = "â€”";
          q("#bar").style.width = "0%";
          q("#quizCount").textContent = "Complete a quiz to begin tracking.";
        }
      });
  }
  loadProgress();
  q("#refreshProgress").addEventListener("click", () => {
    loadProgress();
    toast("Progress refreshed!");
  });
});
