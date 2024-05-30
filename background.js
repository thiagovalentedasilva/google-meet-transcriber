chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: true
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'saveTranscription' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Google Meet Transcriber',
        message: 'Erro ao tentar gerar a transcrição.\nEntre em uma reunião no Google Meet.'
      });
      return;
    }

    if (response && response.status) {
      if (response.status === 'success') {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Google Meet Transcriber',
          message: 'Transcrição gerada com sucesso!'
        });
      } else if (response.status === 'no_transcriptions') {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Google Meet Transcriber',
          message: 'Não tem transcrições para fazer download.\nVerifique se as legendas estão ativas.'
        });
      }
    } else {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Google Meet Transcriber',
        message: 'Resposta inválida recebida.'
      });
    }
  });
});
