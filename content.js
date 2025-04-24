(function() {
  if (window.myMeetTranscriber) {
    return;
  }

  window.myMeetTranscriber = true;
  console.log("Google Meet Transcriber carregado - Consolidação de texto final.");

  let processedMessages = new Set();
  let transcriptions = [];
  let lastSpeakerText = {}; // Rastreia o texto mais recente consolidado para cada orador

  function getCurrentTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  }

  function processCaptions() {
    try {
      const captionsRegion = document.querySelector('div[role="region"][aria-label="Legendas"]');
      if (!captionsRegion) {
        console.log("Contêiner de legendas não encontrado.");
        return;
      }

      const messageBlocks = captionsRegion.querySelectorAll('.nMcdL.bj4p3b');
      if (!messageBlocks || messageBlocks.length === 0) {
        console.log("Nenhuma mensagem detectada.");
        return;
      }

      messageBlocks.forEach(block => {
        const speakerElement = block.querySelector('.NWpY1d');
        const textElement = block.querySelector('div[jsname="tgaKEf"]');

        if (!speakerElement || !textElement) return;

        const speakerName = speakerElement.innerText.trim();
        const messageText = textElement.innerText.trim();

        if (!messageText) return;

        // Verifica se o texto é o mesmo do mais recente para este orador
        if (lastSpeakerText[speakerName] === messageText) {
          return; // Já processado, não faz nada
        }

        // Atualiza a transcrição para consolidar o texto final
        const time = getCurrentTime();
        if (processedMessages.has(messageText)) {
          // Se já processamos exatamente este texto, apenas atualizamos o último texto do orador
          lastSpeakerText[speakerName] = messageText;
        } else {
          // Adiciona uma nova entrada consolidada
          transcriptions.push(`${time} - ${speakerName}: ${messageText}`);
          processedMessages.add(messageText);
          lastSpeakerText[speakerName] = messageText;
          console.log(`Mensagem capturada: ${speakerName}: ${messageText}`);
        }
      });
    } catch (error) {
      console.error(`Erro ao processar legendas: ${error.message}`);
    }
  }

  function getMeetCode(url) {
    const regex = /https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/;
    const match = url.match(regex);
    return match ? match[1] : 'meet-transcription';
  }

  function downloadTranscription() {
    console.log("Preparando para baixar transcrição.");

    if (transcriptions.length === 0) {
      console.log("Nenhuma transcrição disponível para baixar.");
      return false;
    }

    const content = transcriptions.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const meetCode = getMeetCode(window.location.href);
    const filename = `${meetCode}_${day}-${month}-${year}_${hours}-${minutes}.txt`;

    chrome.runtime.sendMessage(
      { action: 'download', url: url, filename: filename },
      response => {
        console.log(`Download solicitado: ${filename}`);
      }
    );

    return true;
  }

  function setupMutationObserver() {
    console.log("Configurando MutationObserver para detectar mudanças.");

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (
          mutation.target &&
          mutation.target.nodeType === Node.ELEMENT_NODE // Garante que é um nó DOM
        ) {
          processCaptions();
        }
      });
    });

    const captionsRegion = document.querySelector('div[role="region"][aria-label="Legendas"]');
    if (captionsRegion) {
      observer.observe(captionsRegion, {
        childList: true,
        subtree: true,
      });
    } else {
      console.log("Região de legendas ainda não encontrada.");
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveTranscription') {
      processCaptions();
      const success = downloadTranscription();
      sendResponse({
        status: success ? 'success' : 'no_transcriptions',
        count: transcriptions.length,
      });
    }
    return true;
  });

  setTimeout(() => {
    try {
      setupMutationObserver();
      console.log("Transcriber inicializado com sucesso.");
    } catch (error) {
      console.error(`Erro ao inicializar: ${error.message}`);
    }
  }, 2000);
})();