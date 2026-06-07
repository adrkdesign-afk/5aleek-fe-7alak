import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Crown,
  Gamepad2,
  Heart,
  Lock,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X
} from "lucide-react";

const emptyAnswers = {};

function getSessionId() {
  const existing = localStorage.getItem("game-session-id");
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem("game-session-id", id);
  return id;
}

function normalize(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

function ApiButton({ children, className = "", ...props }) {
  return (
    <button className={`btn ${className}`} {...props}>
      {children}
    </button>
  );
}

function FloatingScene() {
  const flyers = ["🎮", "💛", "✨", "⭐", "🎀", "💎", "🍒", "🕹️", "👾", "🌸", "🏆", "💫"];

  return (
    <div className="scene" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <span key={index} className={`orb orb-${index + 1}`} />
      ))}
      {flyers.map((item, index) => (
        <span key={item + index} className={`flyer flyer-${index + 1}`}>
          {item}
        </span>
      ))}
      <div className="arcade-ring ring-one" />
      <div className="arcade-ring ring-two" />
      <div className="grid-glow" />
      <div className="pixel-heart">♥</div>
    </div>
  );
}

function GameScreen({ game }) {
  const [started, setStarted] = useState(false);
  const [levelIndex, setLevelIndex] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);
  const [sessionId] = useState(getSessionId);

  const level = game.levels[levelIndex];
  const progress = started ? Math.round(((levelIndex + (finished ? 1 : 0)) / game.levels.length) * 100) : 0;

  function updateAnswer(key, value) {
    setFeedback("");
    setAnswers((current) => ({
      ...current,
      [level.id]: {
        ...(current[level.id] || {}),
        [key]: value
      }
    }));
  }

  useEffect(() => {
    if (!started) return;

    const timer = setTimeout(() => {
      fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          currentLevel: level?.label,
          currentLevelId: level?.id,
          answers,
          updatedAt: new Date().toISOString()
        })
      }).catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [answers, level?.id, level?.label, sessionId, started]);

  async function submitFinal() {
    const payload = {
      gameTitle: game.title,
      sessionId,
      answers,
      completedAt: new Date().toISOString()
    };
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setFinished(true);
  }

  function nextLevel() {
    const currentAnswers = answers[level.id] || {};

    if (level.type === "multi-answer") {
      const values = [0, 1, 2, 3].map((item) => normalize(currentAnswers[`answer-${item}`] || ""));
      const expected = level.answers.map(normalize);
      const ok = expected.every((answer) => values.includes(answer));
      if (!ok) {
        setFeedback("لسه في كلمة مستخبية. جربي تاني كده 😄");
        return;
      }
    } else if (level.type === "dual-textarea") {
      if ((currentAnswers.first || "").trim().length < level.minLength || (currentAnswers.second || "").trim().length < level.minLength) {
        setFeedback(`كل بوكس محتاج ${level.minLength} حروف على الأقل.`);
        return;
      }
    } else {
      const value = currentAnswers.text || "";
      if (value.trim().length < level.minLength) {
        setFeedback(`لسه محتاجين ${level.minLength - value.trim().length} حرف كمان.`);
        return;
      }
    }

    if (level.type === "final-textarea") {
      submitFinal();
      return;
    }

    setFeedback("");
    setLevelIndex((current) => current + 1);
  }

  if (finished) {
    return (
      <main className="shell ending-shell">
        <FloatingScene />
        <section className="hero-panel finish-panel">
          <div className="level-badge"><Crown size={18} /> Completed</div>
          <h1>{game.title}</h1>
          <div className="ending-message">
            {game.endingMessage.split("\n").map((line, index) => (
              <p key={index}>{line || "\u00A0"}</p>
            ))}
          </div>
          <ApiButton onClick={() => window.location.reload()} className="primary">
            <Gamepad2 size={20} /> العب تاني
          </ApiButton>
        </section>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="shell">
        <FloatingScene />
        <section className="hero-panel welcome-panel">
          <div className="brand-mark"><Gamepad2 size={30} /> {game.title}</div>
          <h1>{game.welcomeText} <span>💛</span></h1>
          <p>تجربة صغيرة، شوية هزار، وشوية كلام حلو في الآخر.</p>
          <ApiButton onClick={() => setStarted(true)} className="primary start-btn">
            ابدأ <ArrowLeft size={22} />
          </ApiButton>
        </section>
      </main>
    );
  }

  const currentAnswers = answers[level.id] || {};
  const finalLength = (currentAnswers.text || "").trim().length;

  return (
    <main className="shell">
      <FloatingScene />
      <section className="game-panel">
        <div className="top-row">
          <div className="level-badge"><Sparkles size={18} /> {level.label}</div>
          <div className="progress-pill">{progress}%</div>
        </div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <h2>{level.title}</h2>
        <p className="prompt">{level.prompt}</p>
        <p className="helper">{level.helper}</p>

        {level.type === "multi-answer" && (
          <div className="answer-grid">
            {[0, 1, 2, 3].map((item) => (
              <input
                key={item}
                value={currentAnswers[`answer-${item}`] || ""}
                onChange={(event) => updateAnswer(`answer-${item}`, event.target.value)}
                placeholder={`الكلمة ${item + 1}`}
              />
            ))}
          </div>
        )}

        {level.type === "textarea" && (
          <textarea
            value={currentAnswers.text || ""}
            onChange={(event) => updateAnswer("text", event.target.value)}
            placeholder="اكتبي هنا..."
          />
        )}

        {level.type === "dual-textarea" && (
          <div className="stack">
            <textarea
              value={currentAnswers.first || ""}
              onChange={(event) => updateAnswer("first", event.target.value)}
              placeholder="الحاجة اللي بتبسطك..."
            />
            <p className="prompt small">{level.promptTwo}</p>
            <textarea
              value={currentAnswers.second || ""}
              onChange={(event) => updateAnswer("second", event.target.value)}
              placeholder="الحاجة اللي بتدايقك..."
            />
          </div>
        )}

        {level.type === "final-textarea" && (
          <div className="stack">
            <textarea
              className="final-textarea"
              value={currentAnswers.text || ""}
              onChange={(event) => updateAnswer("text", event.target.value)}
              placeholder="اكتبي الستين حرف كاملين..."
            />
            <div className="letter-row">
              <div className="progress-track mini"><span style={{ width: `${Math.min((finalLength / level.minLength) * 100, 100)}%` }} /></div>
              <strong>{finalLength} / {level.minLength}</strong>
            </div>
          </div>
        )}

        {feedback && <div className="feedback"><X size={18} /> {feedback}</div>}
        <ApiButton onClick={nextLevel} className="primary wide">
          {level.type === "final-textarea" ? "سلمي الرسالة" : "التالي"} <Check size={20} />
        </ApiButton>
      </section>
    </main>
  );
}

function AdminPanel({ game, onClose, onSaved }) {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("admin-token") || "");
  const [draft, setDraft] = useState(game);
  const [liveDrafts, setLiveDrafts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [message, setMessage] = useState("");

  async function loadDashboard(activeToken = token) {
    const response = await fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${activeToken}` }
    });
    if (!response.ok) {
      localStorage.removeItem("admin-token");
      setToken("");
      setMessage("سجل دخول تاني.");
      return;
    }
    const data = await response.json();
    setDraft(data.game);
    setLiveDrafts(data.drafts || []);
    setSubmissions(data.submissions);
  }

  useEffect(() => {
    if (token) loadDashboard(token);
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    const interval = setInterval(() => {
      loadDashboard(token);
    }, 3000);

    return () => clearInterval(interval);
  }, [token]);

  async function login(event) {
    event.preventDefault();
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "حصلت مشكلة.");
      return;
    }
    localStorage.setItem("admin-token", data.token);
    setToken(data.token);
    setMessage("دخلت لوحة التحكم.");
  }

  function updateLevel(index, key, value) {
    setDraft((current) => ({
      ...current,
      levels: current.levels.map((level, levelIndex) =>
        levelIndex === index ? { ...level, [key]: value } : level
      )
    }));
  }

  function updateAnswer(levelIndex, answerIndex, value) {
    setDraft((current) => ({
      ...current,
      levels: current.levels.map((level, index) =>
        index === levelIndex
          ? {
              ...level,
              answers: level.answers.map((answer, itemIndex) => (itemIndex === answerIndex ? value : answer))
            }
          : level
      )
    }));
  }

  async function saveGame() {
    const response = await fetch("/api/admin/game", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(draft)
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "الحفظ فشل.");
      return;
    }
    setMessage("اتحفظت يا معلم.");
    onSaved(data.game);
  }

  async function removeSubmission(id) {
    await fetch(`/api/admin/submissions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    loadDashboard();
  }

  return (
    <div className="modal-backdrop">
      <section className="admin-panel">
        <button className="close-btn" onClick={onClose} aria-label="Close admin">
          <X size={22} />
        </button>
        <div className="admin-head">
          <div>
            <span className="level-badge"><Lock size={17} /> Admin</span>
            <h2>لوحة التحكم</h2>
          </div>
          {token && <ApiButton onClick={saveGame} className="primary"><Save size={18} /> حفظ</ApiButton>}
        </div>

        {!token ? (
          <form onSubmit={login} className="login-form">
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="الباسورد" />
            <ApiButton className="primary" type="submit">دخول</ApiButton>
            {message && <p className="feedback">{message}</p>}
          </form>
        ) : (
          <div className="admin-grid">
            <div className="editor-column">
              <label>اسم الموقع</label>
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              <label>رسالة البداية</label>
              <textarea value={draft.welcomeText} onChange={(event) => setDraft({ ...draft, welcomeText: event.target.value })} />
              <label>رسالة النهاية</label>
              <textarea className="tall" value={draft.endingMessage} onChange={(event) => setDraft({ ...draft, endingMessage: event.target.value })} />

              {draft.levels.map((level, index) => (
                <div className="level-editor" key={level.id}>
                  <h3>{level.label}</h3>
                  <input value={level.title} onChange={(event) => updateLevel(index, "title", event.target.value)} placeholder="العنوان" />
                  <textarea value={level.prompt} onChange={(event) => updateLevel(index, "prompt", event.target.value)} placeholder="السؤال" />
                  {level.promptTwo !== undefined && (
                    <textarea value={level.promptTwo} onChange={(event) => updateLevel(index, "promptTwo", event.target.value)} placeholder="السؤال التاني" />
                  )}
                  <input type="number" min="1" value={level.minLength} onChange={(event) => updateLevel(index, "minLength", Number(event.target.value))} />
                  {level.type === "multi-answer" && (
                    <div className="answers-admin">
                      {level.answers.map((answer, answerIndex) => (
                        <input key={answerIndex} value={answer} onChange={(event) => updateAnswer(index, answerIndex, event.target.value)} />
                      ))}
                      <ApiButton onClick={() => updateLevel(index, "answers", [...level.answers, ""])}><Plus size={18} /> إجابة</ApiButton>
                    </div>
                  )}
                </div>
              ))}
              {message && <p className="save-message">{message}</p>}
            </div>

            <aside className="submissions-column">
              <h3>الكتابة الحالية Live</h3>
              {!liveDrafts.length && <p className="helper">لسه مفيش كتابة مباشرة.</p>}
              {liveDrafts.map((item) => (
                <article className="submission live" key={item.sessionId}>
                  <div className="submission-top">
                    <strong>{item.payload.currentLevel || "Playing"}</strong>
                    <small>{new Date(item.updatedAt).toLocaleString("ar-EG")}</small>
                  </div>
                  <pre>{JSON.stringify(item.payload.answers, null, 2)}</pre>
                </article>
              ))}

              <h3>الإجابات اللي اتسلمت</h3>
              {!submissions.length && <p className="helper">لسه مفيش submissions.</p>}
              {submissions.map((submission) => (
                <article className="submission" key={submission.id}>
                  <div className="submission-top">
                    <strong>#{submission.id}</strong>
                    <button onClick={() => removeSubmission(submission.id)} aria-label="Delete submission"><Trash2 size={17} /></button>
                  </div>
                  <small>{new Date(submission.createdAt).toLocaleString("ar-EG")}</small>
                  <pre>{JSON.stringify(submission.payload.answers, null, 2)}</pre>
                </article>
              ))}
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState(null);
  const [adminOpen, setAdminOpen] = useState(() => window.location.pathname === "/admin");

  useEffect(() => {
    fetch("/api/game")
      .then((response) => response.json())
      .then(setGame);
  }, []);

  const content = useMemo(() => {
    if (!game) {
      return (
        <main className="shell">
          <FloatingScene />
          <section className="hero-panel"><h1>Loading...</h1></section>
        </main>
      );
    }
    return <GameScreen game={game} />;
  }, [game]);

  function closeAdmin() {
    setAdminOpen(false);
    if (window.location.pathname === "/admin") {
      window.history.replaceState({}, "", "/");
    }
  }

  return (
    <>
      {content}
      {adminOpen && game && (
        <AdminPanel game={game} onClose={closeAdmin} onSaved={setGame} />
      )}
    </>
  );
}
