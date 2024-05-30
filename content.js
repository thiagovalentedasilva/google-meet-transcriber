(function() {
  if (window.myMeetTranscriber) {
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
    if (currentCaption && currentSpeaker) {
      const time = getCurrentTime();
      transcriptions.push(`${time} - ${currentSpeaker}: ${currentCaption.trim()}`);
      currentCaption = '';
    }
  }

  function startTimer() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (currentCaption.trim() !== '') {
        saveTranscription();
        capturedWords.clear();
      }
    }, 3000);
  }

  function observeCaptions() {
    const captionsContainer = document.querySelector('.iOzk7[jsname="dsyhDe"]');
    if (!captionsContainer) {
      setTimeout(observeCaptions, 1000);
      return;
    }

    const config = { childList: true, subtree: true, characterData: true };

    const callback = function(mutationsList) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const textContainer = document.querySelector('div[jsname="tgaKEf"]'); // Seleciona o texto da legenda
          if (textContainer) {
            const currentText = textContainer.innerText;
            const words = currentText.split(/\s+/);

            words.forEach((word, index) => {
              setTimeout(() => {
                if (!capturedWords.has(word) && word.trim() !== '') {
                  capturedWords.add(word);
                  const speakerContainer = textContainer.closest('div[jsname="dsyhDe"]'); // Seleciona o container da legenda
                  if (speakerContainer) {
                    const speaker = speakerContainer.querySelector('.zs7s8d.jxFHg'); // Seleciona o nome do orador
                    if (speaker) {
                      const speakerName = speaker.innerText.trim();
                      const currentTime = new Date().getTime();

                      if (currentSpeaker !== speakerName || (currentTime - lastCaptionTime) > 3000) {
                        if (currentCaption.trim() !== '') {
                          saveTranscription();
                          capturedWords.clear();
                        }
                        currentSpeaker = speakerName;
                        currentCaption = word + ' ';
                        startTimer();
                      } else {
                        currentCaption += word + ' ';
                        startTimer();
                      }
                      lastCaptionTime = currentTime;
                    }
                  }
                }
              }, index * 300);
            });
          }
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(captionsContainer, config);
  }

  function getMeetCode(url) {
    const regex = /https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  function downloadTranscription() {
    if (transcriptions.length > 0) {
      const blob = new Blob([transcriptions.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const filename = `${getMeetCode(window.location.href)} ${day}-${month}-${year}T${hours}-${minutes}.txt`;
      chrome.runtime.sendMessage({ action: 'download', url: url, filename: filename });
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveTranscription') {
      downloadTranscription();
      sendResponse({ status: transcriptions.length > 0 ? 'success' : 'no_transcriptions' });
    }
  });

  function observeLeaveButton() {
    const leaveButton = document.querySelector('button[jsname="CQylAd"]');
    if (!leaveButton) {
      setTimeout(observeLeaveButton, 1000);
      return;
    }

    leaveButton.addEventListener('click', () => {
      saveTranscription();
      downloadTranscription();
    });
  }

  observeCaptions();
  observeLeaveButton();
})();
