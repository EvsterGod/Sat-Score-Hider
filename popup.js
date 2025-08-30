// Popup script for SAT Score Hider
document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const hideAllBtn = document.getElementById('hideAllBtn');
    const revealAllBtn = document.getElementById('revealAllBtn');
    const showBigBtn = document.getElementById('showBigBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const statusText = document.getElementById('statusText');

    // Check if we're on a College Board page
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const isCollegeBoard = currentTab.url && currentTab.url.includes('collegeboard.org');
        
        if (!isCollegeBoard) {
            statusText.textContent = 'Not on College Board';
            toggleSwitch.classList.remove('active');
            hideAllBtn.disabled = true;
            revealAllBtn.disabled = true;
        }
    });

    // Toggle switch functionality
    toggleSwitch.addEventListener('click', function() {
        const isActive = toggleSwitch.classList.contains('active');
        
        if (isActive) {
            toggleSwitch.classList.remove('active');
            statusText.textContent = 'Auto-hide disabled';
        } else {
            toggleSwitch.classList.add('active');
            statusText.textContent = 'Active on College Board';
        }

        // Send message to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'toggleAutoHide',
                enabled: !isActive
            });
        });
    });

    // Hide all scores button
    hideAllBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'hideAllScores'
            });
        });
    });

    // Reveal all scores button
    revealAllBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'revealAllScores'
            });
        });
    });

            // Show big reveal button
        showBigBtn.addEventListener('click', function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'showBigRevealButton'
                });
            });
        });
        
        // Load settings
        loadSettings();
        
        // Save settings
        document.getElementById('saveSettingsBtn').addEventListener('click', function() {
            saveSettings();
        });
        
        // Reset settings
        document.getElementById('resetSettingsBtn').addEventListener('click', function() {
            resetSettings();
        });
        
                 // Test effects button
         document.getElementById('testEffectsBtn').addEventListener('click', function() {
             chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                 chrome.tabs.sendMessage(tabs[0].id, {
                     action: 'testEffects'
                 });
             });
         });
         
         // Sound settings event listeners
         document.getElementById('good-score-sound').addEventListener('change', function() {
             const customInput = document.getElementById('good-score-custom');
             if (this.value === 'custom') {
                 customInput.style.display = 'block';
                 customInput.click();
             } else {
                 customInput.style.display = 'none';
             }
         });
         
         document.getElementById('mid-score-sound').addEventListener('change', function() {
             const customInput = document.getElementById('mid-score-custom');
             if (this.value === 'custom') {
                 customInput.style.display = 'block';
                 customInput.click();
             } else {
                 customInput.style.display = 'none';
             }
         });
         
         document.getElementById('bad-score-sound').addEventListener('change', function() {
             const customInput = document.getElementById('bad-score-custom');
             if (this.value === 'custom') {
                 customInput.style.display = 'block';
                 customInput.click();
             } else {
                 customInput.style.display = 'none';
             }
         });
         
         // Handle custom file uploads
         document.getElementById('good-score-custom').addEventListener('change', function(e) {
             if (e.target.files.length > 0) {
                 const file = e.target.files[0];
                 const reader = new FileReader();
                 reader.onload = function(e) {
                     chrome.storage.local.set({ goodScoreCustomAudio: e.target.result });
                 };
                 reader.readAsDataURL(file);
             }
         });
         
         document.getElementById('mid-score-custom').addEventListener('change', function(e) {
             if (e.target.files.length > 0) {
                 const file = e.target.files[0];
                 const reader = new FileReader();
                 reader.onload = function(e) {
                     chrome.storage.local.set({ midScoreCustomAudio: e.target.result });
                 };
                 reader.readAsDataURL(file);
             }
         });
         
         document.getElementById('bad-score-custom').addEventListener('change', function(e) {
             if (e.target.files.length > 0) {
                 const file = e.target.files[0];
                 const reader = new FileReader();
                 reader.onload = function(e) {
                     chrome.storage.local.set({ badScoreCustomAudio: e.target.result });
                 };
                 reader.readAsDataURL(file);
             }
         });

    // Refresh page button
    refreshBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.reload(tabs[0].id);
        });
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'updateStatus') {
            statusText.textContent = request.status;
        }
    });
    
         // Function to load settings
     function loadSettings() {
         chrome.storage.local.get(['satScoreSettings', 'soundSettings'], function(result) {
             const settings = result.satScoreSettings || {
                 total: { good: { min: 1400, max: 1600 }, mid: { min: 1000, max: 1399 }, bad: { min: 400, max: 999 } },
                 reading: { good: { min: 700, max: 800 }, mid: { min: 500, max: 699 }, bad: { min: 200, max: 499 } },
                 math: { good: { min: 700, max: 800 }, mid: { min: 500, max: 699 }, bad: { min: 200, max: 499 } },
                 writing: { good: { min: 700, max: 800 }, mid: { min: 500, max: 699 }, bad: { min: 200, max: 499 } }
             };
             
             const soundSettings = result.soundSettings || {
                 goodScoreSound: 'default',
                 midScoreSound: 'default',
                 badScoreSound: 'default',
                 enableSounds: true
             };
             
             // Populate form fields
             document.getElementById('total-good-min').value = settings.total.good.min;
             document.getElementById('total-good-max').value = settings.total.good.max;
             document.getElementById('total-mid-min').value = settings.total.mid.min;
             document.getElementById('total-mid-max').value = settings.total.mid.max;
             document.getElementById('total-bad-min').value = settings.total.bad.min;
             document.getElementById('total-bad-max').value = settings.total.bad.max;
             
             document.getElementById('reading-good-min').value = settings.reading.good.min;
             document.getElementById('reading-good-max').value = settings.reading.good.max;
             document.getElementById('reading-mid-min').value = settings.reading.mid.min;
             document.getElementById('reading-mid-max').value = settings.reading.mid.max;
             document.getElementById('reading-bad-min').value = settings.reading.bad.min;
             document.getElementById('reading-bad-max').value = settings.reading.bad.max;
             
             document.getElementById('math-good-min').value = settings.math.good.min;
             document.getElementById('math-good-max').value = settings.math.good.max;
             document.getElementById('math-mid-min').value = settings.math.mid.min;
             document.getElementById('math-mid-max').value = settings.math.mid.max;
             document.getElementById('math-bad-min').value = settings.math.bad.min;
             document.getElementById('math-bad-max').value = settings.math.bad.max;
             
             // Populate sound settings
             document.getElementById('good-score-sound').value = soundSettings.goodScoreSound;
             document.getElementById('mid-score-sound').value = soundSettings.midScoreSound;
             document.getElementById('bad-score-sound').value = soundSettings.badScoreSound;
             document.getElementById('enable-sounds').checked = soundSettings.enableSounds;
         });
     }
    
         // Function to save settings
     function saveSettings() {
         const settings = {
             total: {
                 good: { min: parseInt(document.getElementById('total-good-min').value), max: parseInt(document.getElementById('total-good-max').value) },
                 mid: { min: parseInt(document.getElementById('total-mid-min').value), max: parseInt(document.getElementById('total-mid-max').value) },
                 bad: { min: parseInt(document.getElementById('total-bad-min').value), max: parseInt(document.getElementById('total-bad-max').value) }
             },
             reading: {
                 good: { min: parseInt(document.getElementById('reading-good-min').value), max: parseInt(document.getElementById('reading-good-max').value) },
                 mid: { min: parseInt(document.getElementById('reading-mid-min').value), max: parseInt(document.getElementById('reading-mid-max').value) },
                 bad: { min: parseInt(document.getElementById('reading-bad-min').value), max: parseInt(document.getElementById('reading-bad-max').value) }
             },
             math: {
                 good: { min: parseInt(document.getElementById('math-good-min').value), max: parseInt(document.getElementById('math-good-max').value) },
                 mid: { min: parseInt(document.getElementById('math-mid-min').value), max: parseInt(document.getElementById('math-mid-max').value) },
                 bad: { min: parseInt(document.getElementById('math-bad-min').value), max: parseInt(document.getElementById('math-bad-max').value) }
             },
             writing: {
                 good: { min: parseInt(document.getElementById('reading-good-min').value), max: parseInt(document.getElementById('reading-good-max').value) },
                 mid: { min: parseInt(document.getElementById('reading-mid-min').value), max: parseInt(document.getElementById('reading-mid-max').value) },
                 bad: { min: parseInt(document.getElementById('reading-bad-min').value), max: parseInt(document.getElementById('reading-bad-max').value) }
             }
         };
         
         const soundSettings = {
             goodScoreSound: document.getElementById('good-score-sound').value,
             midScoreSound: document.getElementById('mid-score-sound').value,
             badScoreSound: document.getElementById('bad-score-sound').value,
             enableSounds: document.getElementById('enable-sounds').checked
         };
         
         // Save to chrome storage
         chrome.storage.local.set({ 
             satScoreSettings: settings,
             soundSettings: soundSettings
         }, function() {
             // Send to content script
             chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                 chrome.tabs.sendMessage(tabs[0].id, {
                     action: 'updateSettings',
                     settings: settings,
                     soundSettings: soundSettings
                 });
             });
             
             // Show success message
             showMessage('Settings saved! 🎉');
         });
     }
    
         // Function to reset settings
     function resetSettings() {
         const defaultSettings = {
             total: { good: { min: 1400, max: 1600 }, mid: { min: 1000, max: 1399 }, bad: { min: 400, max: 999 } },
             reading: { good: { min: 700, max: 800 }, mid: { min: 500, max: 699 }, bad: { min: 200, max: 499 } },
             math: { good: { min: 700, max: 800 }, mid: { min: 500, max: 699 }, bad: { min: 200, max: 499 } },
             writing: { good: { min: 700, max: 800 }, mid: { min: 500, max: 699 }, bad: { min: 200, max: 499 } }
         };
         
         const defaultSoundSettings = {
             goodScoreSound: 'default',
             midScoreSound: 'default',
             badScoreSound: 'default',
             enableSounds: true
         };
         
         // Update form values
         document.getElementById('total-good-min').value = defaultSettings.total.good.min;
         document.getElementById('total-good-max').value = defaultSettings.total.good.max;
         document.getElementById('total-mid-min').value = defaultSettings.total.mid.min;
         document.getElementById('total-mid-max').value = defaultSettings.total.mid.max;
         document.getElementById('total-bad-min').value = defaultSettings.total.bad.min;
         document.getElementById('total-bad-max').value = defaultSettings.total.bad.max;
         
         document.getElementById('reading-good-min').value = defaultSettings.reading.good.min;
         document.getElementById('reading-good-max').value = defaultSettings.reading.good.max;
         document.getElementById('reading-mid-min').value = defaultSettings.reading.mid.min;
         document.getElementById('reading-mid-max').value = defaultSettings.reading.mid.max;
         document.getElementById('reading-bad-min').value = defaultSettings.reading.bad.min;
         document.getElementById('reading-bad-max').value = defaultSettings.reading.bad.max;
         
         document.getElementById('math-good-min').value = defaultSettings.math.good.min;
         document.getElementById('math-good-max').value = defaultSettings.math.good.max;
         document.getElementById('math-mid-min').value = defaultSettings.math.mid.min;
         document.getElementById('math-mid-max').value = defaultSettings.math.mid.max;
         document.getElementById('math-bad-min').value = defaultSettings.math.bad.min;
         document.getElementById('math-bad-max').value = defaultSettings.math.bad.max;
         
         // Update sound form values
         document.getElementById('good-score-sound').value = defaultSoundSettings.goodScoreSound;
         document.getElementById('mid-score-sound').value = defaultSoundSettings.midScoreSound;
         document.getElementById('bad-score-sound').value = defaultSoundSettings.badScoreSound;
         document.getElementById('enable-sounds').checked = defaultSoundSettings.enableSounds;
         
         // Save to chrome storage
         chrome.storage.local.set({ 
             satScoreSettings: defaultSettings,
             soundSettings: defaultSoundSettings
         }, function() {
             // Send to content script
             chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                 chrome.tabs.sendMessage(tabs[0].id, {
                     action: 'updateSettings',
                     settings: defaultSettings,
                     soundSettings: defaultSoundSettings
                 });
             });
             
             showMessage('Settings reset to default! 🔄');
         });
     }
    
    // Function to show message
    function showMessage(message) {
        const statusText = document.getElementById('statusText');
        const originalText = statusText.textContent;
        statusText.textContent = message;
        
        setTimeout(() => {
            statusText.textContent = originalText;
        }, 2000);
    }
});
