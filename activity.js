const activityHistoryKey = "biblioteca-historico-acessos";
const activitySessionKey = "biblioteca-sessao-acesso";
const activityLimit = 200;

function readActivityHistory() {
  const savedHistory = window.localStorage.getItem(activityHistoryKey);
  if (savedHistory === null) {
    return [];
  }

  const history = JSON.parse(savedHistory);
  if (!Array.isArray(history)) {
    throw new Error("O histórico de acessos salvo não tem um formato válido.");
  }
  return history;
}

function writeActivityHistory(history) {
  window.localStorage.setItem(activityHistoryKey, JSON.stringify(history.slice(-activityLimit)));
}

function recordLibraryLogin(profile) {
  const sessionId = window.crypto.randomUUID();
  const now = new Date().toISOString();
  const entry = {
    id: sessionId,
    role: profile.role,
    identifier: profile.identifier,
    loggedInAt: now,
    lastActivityAt: now,
    status: "active",
    leftAt: "",
  };

  try {
    const history = readActivityHistory();
    history.push(entry);
    writeActivityHistory(history);
    window.sessionStorage.setItem(activitySessionKey, sessionId);
    window.sessionStorage.setItem("biblioteca-perfil-atual", JSON.stringify({
      role: profile.role,
      identifier: profile.identifier,
      activitySessionId: sessionId,
    }));
  } catch (error) {
    console.error("Não foi possível salvar o acesso neste navegador.", error);
    throw new Error("O histórico não pôde ser salvo. Verifique as permissões do navegador.");
  }
}

window.bibliotecaRegistrarAcesso = recordLibraryLogin;

function updateCurrentActivity(isVisible) {
  let currentSessionId;
  try {
    currentSessionId = window.sessionStorage.getItem(activitySessionKey);
    if (!currentSessionId) {
      return;
    }

    const history = readActivityHistory();
    const currentEntry = history.find((entry) => entry.id === currentSessionId);
    if (!currentEntry) {
      return;
    }

    const now = new Date().toISOString();
    currentEntry.lastActivityAt = now;
    if (isVisible) {
      if (currentEntry.status === "left") {
        currentEntry.returnedAt = now;
      }
      currentEntry.status = "active";
      currentEntry.leftAt = "";
    } else if (currentEntry.status !== "left") {
      currentEntry.status = "left";
      currentEntry.leftAt = now;
    }
    writeActivityHistory(history);
    window.dispatchEvent(new CustomEvent("activity-history-updated"));
  } catch (error) {
    console.error("Não foi possível atualizar o histórico de atividade.", error);
  }
}

document.addEventListener("visibilitychange", () => {
  updateCurrentActivity(document.visibilityState === "visible");
});

updateCurrentActivity(document.visibilityState === "visible");
