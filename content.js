(function() {
  if (window.myMeetTranscriber) {
    //console.log("Script já injetado.");
    return;
  }

  window.myMeetTranscriber = true;

  let transcriptions = [];
  let currentSpeaker = '';
  let currentCaption = '';
  let lastCaptionTime = 0;
  let timer = null;
  let capturedWords = new Set();

  function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }

  function saveTranscription() {
    //console.log("Salvando transcrição...");
    if (currentCaption && currentSpeaker) {
      const time = getCurrentTime();
      transcriptions.push(`${time} - ${currentSpeaker}: ${currentCaption.trim()}`);
      //console.log(`${time} - ${currentSpeaker}: ${currentCaption.trim()}`);
      currentCaption = ''; // Reset currentCaption after adding to history
    }
  }

  function startTimer() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (currentCaption.trim() !== '') {
        saveTranscription();
        capturedWords.clear(); // Limpa o Set após salvar a transcrição
      }
    }, 3000); // Atraso de 3 segundos para salvar a transcrição
  }

  function observeCaptions() {
    const captionsContainer = document.querySelector('.iOzk7[jsname="dsyhDe"]'); // Ajuste o seletor conforme necessário
    if (!captionsContainer) {
      //console.log("Contêiner de legendas não encontrado. Tentando novamente em 1 segundo...");
      setTimeout(observeCaptions, 1000); // Tentar novamente em 1 segundo
      return;
    }

    console.log("Observando contêiner de legendas...");

    const config = { childList: true, subtree: true, characterData: true };

    const callback = function(mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const textContainer = document.querySelector('div[jsname="tgaKEf"]');
          if (textContainer) {
            const currentText = textContainer.innerText;
            const words = currentText.split(/\s+/);

            words.forEach((word, index) => {
              setTimeout(() => {
                if (!capturedWords.has(word) && word.trim() !== '') {
                  capturedWords.add(word);
                  const speakerContainer = textContainer.closest('.iOzk7');
                  if (speakerContainer) {
                    const speaker = speakerContainer.querySelector('.zs7s8d.jxFHg'); // Ajuste o seletor conforme necessário
                    if (speaker) {
                      const speakerName = speaker.innerText.trim();
                      const currentTime = new Date().getTime();

                      if (currentSpeaker !== speakerName || (currentTime - lastCaptionTime) > 3000) {
                        // Salva a transcrição atual se o orador mudou ou se houve mais de 3 segundos de silêncio
                        if (currentCaption.trim() !== '') {
                          saveTranscription();
                          capturedWords.clear(); // Limpa o Set após salvar a transcrição
                        }
                        currentSpeaker = speakerName;
                        currentCaption = word + ' ';
                        //console.log(`${currentSpeaker}:`, word);
                        startTimer(); // Inicia o temporizador após uma nova legenda
                      } else {
                        currentCaption += word + ' ';
                        //console.log(`${currentSpeaker}:`, word);
                        startTimer();
                      }
                      lastCaptionTime = currentTime;
                    }
                  }
                }
              }, index * 300); // Atraso de 0.3 segundos entre cada palavra
            });
          }
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(captionsContainer, config);
  }

  // Função para extrair o código do Meet a partir de uma URL
  function getMeetCode(url) {
    const regex = /https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/;
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    } else {
      return null;
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveTranscription') {
      if (transcriptions.length > 0) {
        const blob = new Blob([transcriptions.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0'); // Horas no formato 24 horas
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const filename = `${getMeetCode(window.location.href)} ${day}-${month}-${year}T${hours}-${minutes}.txt`;
        chrome.runtime.sendMessage({ action: 'download', url: url, filename: filename });
        sendResponse({ status: 'success' });
      } else {
        sendResponse({ status: 'no_transcriptions' });
      }
    }
  });

  observeCaptions();
})();