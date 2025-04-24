// Constantes para mensagens
const MESSAGES = {
  SUCCESS: 'Transcrição gerada com sucesso!',
  NO_TRANSCRIPTIONS: 'Não há transcrições para download.\nVerifique se as legendas estão ativas na reunião.',
  ERROR: 'Erro ao gerar transcrição.\nVerifique se você está em uma reunião do Google Meet.',
  INVALID: 'Resposta inválida recebida.'
};

// Helper para criar notificações
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Google Meet Transcriber',
    message: message
  });
}

// Handler para downloads
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`Mensagem recebida: ${request.action}`);
  
  if (request.action === 'download') {
    try {
      chrome.downloads.download({
        url: request.url,
        filename: request.filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error(`Erro no download: ${chrome.runtime.lastError.message}`);
        } else {
          console.log(`Download iniciado: ${downloadId}`);
        }
      });
    } catch (error) {
      console.error(`Erro ao iniciar download: ${error.message}`);
    }
  }
});

// Handler para clique no ícone
chrome.action.onClicked.addListener((tab) => {
  console.log(`Ícone clicado na aba: ${tab.url}`);
  
  // Verifica se está no Google Meet
  if (!tab.url || !tab.url.includes('meet.google.com')) {
    showNotification(MESSAGES.ERROR);
    return;
  }
  
  chrome.tabs.sendMessage(tab.id, { action: 'saveTranscription' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(`Erro: ${chrome.runtime.lastError.message}`);
      showNotification(MESSAGES.ERROR);
      return;
    }
    
    if (response && response.status) {
      if (response.status === 'success') {
        showNotification(MESSAGES.SUCCESS);
      } else if (response.status === 'no_transcriptions') {
        showNotification(MESSAGES.NO_TRANSCRIPTIONS);
      }
    } else {
      showNotification(MESSAGES.INVALID);
    }
  });
});

// Log de instalação
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`Extensão ${details.reason === 'install' ? 'instalada' : 'atualizada'}`);
}); 