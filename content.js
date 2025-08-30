// SAT Score Hider Content Script
(function() {
    'use strict';

    // Configuration
    const config = {
        // Common selectors where SAT scores might appear
        scoreSelectors: [
            // Main score display areas
            '[data-testid*="score"]',
            '[class*="score"]',
            '[id*="score"]',
            // Specific College Board patterns
            '.score-value',
            '.test-score',
            '.sat-score',
            // More generic patterns
            '[class*="Score"]',
            '[class*="Result"]',
            // Look for numbers that could be scores (400-1600 range)
            'span:contains("400")',
            'span:contains("500")',
            'span:contains("600")',
            'span:contains("700")',
            'span:contains("800")',
            'span:contains("900")',
            'span:contains("1000")',
            'span:contains("1100")',
            'span:contains("1200")',
            'span:contains("1300")',
            'span:contains("1400")',
            'span:contains("1500")',
            'span:contains("1600")'
        ],
        // Keywords that indicate SAT-related content
        satKeywords: [
            'SAT',
            'Scholastic Assessment Test',
            'Total Score',
            'Evidence-Based Reading and Writing',
            'Math',
            'Reading',
            'Writing and Language'
        ],
        // CSS class for hidden scores
        hiddenClass: 'sat-score-hidden',
        // CSS class for clickable elements
        clickableClass: 'sat-score-clickable'
    };

    // State management
    let scoresRevealed = false;
    let autoHideEnabled = true;
    
         // Score range settings
     let scoreSettings = {
         total: { good: { min: 1400, max: 1600 }, mid: { min: 1000, max: 1399 }, bad: { min: 400, max: 999 } },
         reading: { good: { min: 700, max: 800 }, mid: { min: 500, max: 699 }, bad: { min: 200, max: 499 } },
         math: { good: { min: 700, max: 800 }, mid: { min: 500, max: 699 }, bad: { min: 200, max: 499 } },
         writing: { good: { min: 700, max: 800 }, mid: { min: 500, max: 699 }, bad: { min: 200, max: 499 } }
     };
     
     // Sound settings
     let soundSettings = {
         goodScoreSound: 'default',
         midScoreSound: 'default',
         badScoreSound: 'default',
         enableSounds: true
     };
     
     // Rate limiting for sound effects (prevent spam)
     let lastSoundPlayTime = 0;
     const SOUND_COOLDOWN = 1000; // 1 second between sounds

    // Function to check if text contains a potential SAT score
    function isPotentialSATScore(text) {
        if (!text) return false;
        
        // Remove commas and spaces
        const cleanText = text.replace(/[, ]/g, '');
        
        // Check if it's a number in SAT score range (400-1600)
        const score = parseInt(cleanText);
        if (score >= 400 && score <= 1600) {
            return true;
        }
        
        // Check for score patterns like "800/800" or "400-1600"
        const scorePatterns = [
            /^\d{3,4}\/\d{3,4}$/,  // 800/800
            /^\d{3,4}-\d{3,4}$/,  // 400-1600
            /^\d{3,4}\s*-\s*\d{3,4}$/  // 400 - 1600
        ];
        
        return scorePatterns.some(pattern => pattern.test(cleanText));
    }

    // Function to check if element is a score range (should not be hidden)
    function isScoreRange(element) {
        const text = element.textContent || '';
        const cleanText = text.toLowerCase().trim();
        
        // Common score range patterns that should NOT be hidden
        const rangePatterns = [
            /^\d{3,4}\s+to\s+\d{3,4}$/,  // "120 to 720"
            /^\d{3,4}\s*-\s*\d{3,4}$/,   // "120-720"
            /^\d{3,4}\s*through\s*\d{3,4}$/, // "120 through 720"
            /^range:\s*\d{3,4}\s*-\s*\d{3,4}$/i, // "Range: 120-720"
            /^possible\s+scores:\s*\d{3,4}\s*-\s*\d{3,4}$/i, // "Possible scores: 120-720"
            /^score\s+range:\s*\d{3,4}\s*-\s*\d{3,4}$/i, // "Score range: 120-720"
        ];
        
        return rangePatterns.some(pattern => pattern.test(cleanText));
    }

    // Function to check if element is in SAT context
    function isInSATContext(element) {
        const text = element.textContent || '';
        const parentText = element.parentElement ? element.parentElement.textContent || '' : '';
        const grandParentText = element.parentElement && element.parentElement.parentElement ? 
            element.parentElement.parentElement.textContent || '' : '';
        
        const allText = (text + ' ' + parentText + ' ' + grandParentText).toLowerCase();
        
        return config.satKeywords.some(keyword => 
            allText.includes(keyword.toLowerCase())
        );
    }

    // Function to hide a score element
    function hideScore(element) {
        if (element.classList.contains(config.hiddenClass)) {
            return; // Already hidden
        }

        const originalText = element.textContent;
        const originalHTML = element.innerHTML;
        
        // Store original content
        element.setAttribute('data-original-text', originalText);
        element.setAttribute('data-original-html', originalHTML);
        
        // Hide the content
        element.classList.add(config.hiddenClass, config.clickableClass);
        element.innerHTML = '<span class="hidden-score-text">[Click to reveal SAT score]</span>';
        
        // Add click event listener
        element.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            revealScore(element);
        });
        
        // Add hover effect
        element.style.cursor = 'pointer';
        element.title = 'Click to reveal SAT score';
    }

         // Function to reveal a score
     function revealScore(element) {
         const originalText = element.getAttribute('data-original-text');
         const originalHTML = element.getAttribute('data-original-html');
         
         if (originalHTML) {
             element.innerHTML = originalHTML;
         } else if (originalText) {
             element.textContent = originalText;
         }
         
         element.classList.remove(config.hiddenClass, config.clickableClass);
         element.style.cursor = '';
         element.title = '';
         
         // Remove event listener
         element.removeEventListener('click', revealScore);
         
         // Mark this element as revealed to prevent re-hiding
         element.setAttribute('data-revealed', 'true');
         
         // Check score and show effects
         console.log('Revealing individual score:', originalText);
         checkScoreAndShowEffects(element, originalText);
     }

         // Function to reveal all scores
     function revealAllScores() {
         // First, restore any temporarily hidden elements
         const tempHidden = document.querySelectorAll('[data-temp-hidden="true"]');
         tempHidden.forEach(element => {
             element.style.visibility = '';
             element.style.opacity = '';
             element.removeAttribute('data-temp-hidden');
         });
         
         const hiddenElements = document.querySelectorAll('.' + config.hiddenClass);
         hiddenElements.forEach(element => {
             revealScore(element);
         });
         
         // Hide the big reveal button after revealing all scores
         const bigRevealBtn = document.getElementById('sat-score-hider-big-button');
         if (bigRevealBtn) {
             bigRevealBtn.style.display = 'none';
         }
         
         // Mark scores as revealed to prevent re-hiding
         scoresRevealed = true;
     }

         // Function to hide all scores
     function hideAllScores() {
         // Reset the revealed state to allow re-hiding
         scoresRevealed = false;
         
         // Remove revealed markers from all elements
         const revealedElements = document.querySelectorAll('[data-revealed="true"]');
         revealedElements.forEach(element => {
             element.removeAttribute('data-revealed');
         });
         
         // Also remove any temporary hidden markers
         const tempHidden = document.querySelectorAll('[data-temp-hidden="true"]');
         tempHidden.forEach(element => {
             element.removeAttribute('data-temp-hidden');
         });
         
         scanAndHideScores();
     }

    // Function to create and show the big reveal button
    function showBigRevealButton() {
        // Remove existing button if it exists
        const existingBtn = document.getElementById('sat-score-hider-big-button');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        // Create the big reveal button
        const bigRevealBtn = document.createElement('div');
        bigRevealBtn.id = 'sat-score-hider-big-button';
        bigRevealBtn.className = 'sat-score-hider-big-reveal-btn';
        bigRevealBtn.innerHTML = `
            <div class="big-reveal-content">
                <span class="big-reveal-icon">🎯</span>
                <span class="big-reveal-text">Click to Reveal All SAT Scores</span>
            </div>
            <div class="settings-button" id="settings-btn">⚙️</div>
        `;
        
        // Add click event
        bigRevealBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            revealAllScores();
        });
        
        // Add settings button click event
        const settingsBtn = bigRevealBtn.querySelector('#settings-btn');
        settingsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showSettingsPanel();
        });
        
        // Add to page
        document.body.appendChild(bigRevealBtn);
        
        // Position the button
        positionBigRevealButton();
    }

    // Function to position the big reveal button
    function positionBigRevealButton() {
        const btn = document.getElementById('sat-score-hider-big-button');
        if (!btn) return;
        
        // Position in top-right corner with some margin
        btn.style.position = 'fixed';
        btn.style.top = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '10000';
    }

    // Function to determine score type based on context
    function getScoreType(element) {
        const context = element.textContent || '';
        const parentText = element.parentElement ? element.parentElement.textContent || '' : '';
        const grandParentText = element.parentElement && element.parentElement.parentElement ? 
            element.parentElement.parentElement.textContent || '' : '';
        
        // Check more levels up for better context
        let greatGrandParentText = '';
        if (element.parentElement && element.parentElement.parentElement && element.parentElement.parentElement.parentElement) {
            greatGrandParentText = element.parentElement.parentElement.parentElement.textContent || '';
        }
        
        const allText = (context + ' ' + parentText + ' ' + grandParentText + ' ' + greatGrandParentText).toLowerCase();
        
        console.log('Score type detection - allText:', allText);
        
        // Check for total score indicators
        if (allText.includes('total score') || 
            allText.includes('your total score') || 
            allText.includes('sat total') ||
            allText.includes('overall score') ||
            allText.includes('composite score') ||
            allText.includes('final score')) {
            console.log('Detected as total score');
            return 'total';
        } 
        // Check for section scores
        else if (allText.includes('reading')) {
            console.log('Detected as reading score');
            return 'reading';
        } else if (allText.includes('math')) {
            console.log('Detected as math score');
            return 'math';
        } else if (allText.includes('writing')) {
            console.log('Detected as writing score');
            return 'writing';
        }
        
        // If the score is in the 400-1600 range and we can't determine the type, assume it's total
        const score = parseInt(context.replace(/[, ]/g, ''));
        if (score >= 400 && score <= 1600) {
            console.log('Score in total range, defaulting to total score');
            return 'total';
        }
        
        console.log('Defaulting to total score');
        return 'total'; // default
    }

         // Function to check score and show effects
     function checkScoreAndShowEffects(element, scoreText) {
         try {
             console.log('checkScoreAndShowEffects called with:', scoreText);
             
             const score = parseInt(scoreText.replace(/[, ]/g, ''));
             if (isNaN(score)) {
                 console.log('Score is NaN, returning');
                 return;
             }
             
             const scoreType = getScoreType(element);
             const settings = scoreSettings[scoreType];
             
             if (!settings) {
                 console.log('No settings found for score type:', scoreType);
                 return;
             }
             
             console.log('Checking score:', score, 'for type:', scoreType, 'settings:', settings);
             console.log('Score ranges - Good:', settings.good, 'Mid:', settings.mid, 'Bad:', settings.bad);
             
             // Check if score is in good range
             if (score >= settings.good.min && score <= settings.good.max) {
                 console.log('Good score detected!');
                 showConfettiEffect(element);
             }
             // Check if score is in mid range
             else if (score >= settings.mid.min && score <= settings.mid.max) {
                 console.log('Mid score detected!');
                 showMidScoreEffect(element);
             }
             // Check if score is in bad range
             else if (score >= settings.bad.min && score <= settings.bad.max) {
                 console.log('Bad score detected!');
                 showBadScoreEffect(element);
             } else {
                 console.log('Score is outside all ranges, no effect');
             }
         } catch (error) {
             console.error('Error in checkScoreAndShowEffects:', error);
         }
     }

         // Function to show confetti effect for good scores
     function showConfettiEffect(element) {
         console.log('showConfettiEffect called');
         const rect = element.getBoundingClientRect();
         const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
         
         for (let i = 0; i < 50; i++) {
             setTimeout(() => {
                 const confetti = document.createElement('div');
                 confetti.style.position = 'fixed';
                 confetti.style.left = rect.left + Math.random() * rect.width + 'px';
                 confetti.style.top = rect.top + 'px';
                 confetti.style.width = '10px';
                 confetti.style.height = '10px';
                 confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                 confetti.style.borderRadius = '50%';
                 confetti.style.pointerEvents = 'none';
                 confetti.style.zIndex = '10001';
                 confetti.style.animation = 'confettiFall 3s ease-out forwards';
                 
                 document.body.appendChild(confetti);
                 
                 setTimeout(() => {
                     confetti.remove();
                 }, 3000);
             }, i * 50);
         }
         
         // Add celebration text
         showCelebrationText(element, '🎉 AMAZING SCORE! 🎉');
         
         // Play sound effect
         playSoundEffect('good');
     }

     // Function to show mid score effect
     function showMidScoreEffect(element) {
         console.log('showMidScoreEffect called');
         const rect = element.getBoundingClientRect();
         const emojis = ['😐', '🤷‍♂️', '😶', '🤔', '😏', '😌', '😊', '👍'];
         
         for (let i = 0; i < 15; i++) {
             setTimeout(() => {
                 const emoji = document.createElement('div');
                 emoji.style.position = 'fixed';
                 emoji.style.left = rect.left + Math.random() * rect.width + 'px';
                 emoji.style.top = rect.top + 'px';
                 emoji.style.fontSize = '20px';
                 emoji.style.pointerEvents = 'none';
                 emoji.style.zIndex = '10001';
                 emoji.style.animation = 'emojiFloat 3s ease-out forwards';
                 emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                 
                 document.body.appendChild(emoji);
                 
                 setTimeout(() => {
                     emoji.remove();
                 }, 3000);
             }, i * 80);
         }
         
         // Add neutral text
         showCelebrationText(element, '😐 NOT BAD! 😐');
         
         // Play sound effect
         playSoundEffect('mid');
     }

         // Function to show bad score effect
     function showBadScoreEffect(element) {
         console.log('showBadScoreEffect called');
         const rect = element.getBoundingClientRect();
         const emojis = ['💀', '🤡', '😵', '🤦‍♂️', '😭', '🤪', '😱', '💩'];
         
         for (let i = 0; i < 20; i++) {
             setTimeout(() => {
                 const emoji = document.createElement('div');
                 emoji.style.position = 'fixed';
                 emoji.style.left = rect.left + Math.random() * rect.width + 'px';
                 emoji.style.top = rect.top + 'px';
                 emoji.style.fontSize = '24px';
                 emoji.style.pointerEvents = 'none';
                 emoji.style.zIndex = '10001';
                 emoji.style.animation = 'emojiFloat 4s ease-out forwards';
                 emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                 
                 document.body.appendChild(emoji);
                 
                 setTimeout(() => {
                     emoji.remove();
                 }, 4000);
             }, i * 100);
         }
         
                  // Add funny text
          showCelebrationText(element, '💀 OOPS! 💀');
          
          // Play sound effect
          playSoundEffect('bad');
      }

    // Function to show celebration/funny text
    function showCelebrationText(element, text) {
        const rect = element.getBoundingClientRect();
        const textDiv = document.createElement('div');
        textDiv.style.position = 'fixed';
        textDiv.style.left = rect.left + 'px';
        textDiv.style.top = rect.top - 40 + 'px';
        textDiv.style.fontSize = '16px';
        textDiv.style.fontWeight = 'bold';
        textDiv.style.color = '#ff6b6b';
        textDiv.style.pointerEvents = 'none';
        textDiv.style.zIndex = '10002';
        textDiv.style.animation = 'textFloat 2s ease-out forwards';
        textDiv.textContent = text;
        
        document.body.appendChild(textDiv);
        
                 setTimeout(() => {
             textDiv.remove();
         }, 2000);
     }

          // Function to play sound effects
     function playSoundEffect(soundType) {
         try {
             console.log('playSoundEffect called with type:', soundType);
             
             if (!soundSettings.enableSounds) {
                 console.log('Sounds disabled, returning');
                 return;
             }
             
             // Rate limiting check
             const now = Date.now();
             if (now - lastSoundPlayTime < SOUND_COOLDOWN) {
                 console.log('Sound effect rate limited');
                 return;
             }
             lastSoundPlayTime = now;
             
             let soundSetting;
             if (soundType === 'good') {
                 soundSetting = soundSettings.goodScoreSound;
             } else if (soundType === 'mid') {
                 soundSetting = soundSettings.midScoreSound;
             } else {
                 soundSetting = soundSettings.badScoreSound;
             }
             
             console.log('Sound setting for', soundType, ':', soundSetting);
             
             if (soundSetting === 'custom') {
                 // Load custom audio from storage
                 const storageKey = soundType === 'good' ? 'goodScoreCustomAudio' : 
                                   soundType === 'mid' ? 'midScoreCustomAudio' : 'badScoreCustomAudio';
                 chrome.storage.local.get([storageKey], function(result) {
                     const customAudio = result[storageKey];
                     if (customAudio) {
                         const audio = new Audio();
                         audio.src = customAudio;
                         audio.volume = 0.3;
                         audio.play().catch(e => console.log('Custom audio play failed:', e));
                     }
                 });
             } else {
                 // Use generated sound effects
                 console.log('Playing generated sound for', soundType);
                 playGeneratedSound(soundType, soundSetting);
             }
         } catch (error) {
             console.error('Error in playSoundEffect:', error);
         }
     }
     
           // Generate simple audio tones for sound effects
      function generateTone(frequency, duration, type = 'sine') {
          try {
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
              oscillator.type = type;
              
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + duration);
              
              return true;
          } catch (e) {
              console.log('Audio generation failed:', e);
              return false;
          }
      }

           // Function to play generated sound effects
      function playGeneratedSound(soundType, soundSetting) {
          try {
              let frequency, duration, type;
              
              // Good score sounds - higher, happier frequencies
              if (soundType === 'good') {
                  switch (soundSetting) {
                      case 'default':
                          frequency = 800; duration = 0.8; type = 'sine'; break;
                      case 'confetti':
                          frequency = 1000; duration = 0.5; type = 'square'; break;
                      case 'success':
                          frequency = 1200; duration = 0.6; type = 'sine'; break;
                      default:
                          frequency = 800; duration = 0.8; type = 'sine';
                  }
              }
              // Mid score sounds - medium frequencies
              else if (soundType === 'mid') {
                  switch (soundSetting) {
                      case 'default':
                          frequency = 600; duration = 0.6; type = 'sine'; break;
                      case 'neutral':
                          frequency = 500; duration = 0.7; type = 'triangle'; break;
                      case 'okay':
                          frequency = 400; duration = 1.0; type = 'sawtooth'; break;
                      default:
                          frequency = 600; duration = 0.6; type = 'sine';
                  }
              }
              // Bad score sounds - lower, sadder frequencies
              else if (soundType === 'bad') {
                  switch (soundSetting) {
                      case 'default':
                          frequency = 200; duration = 0.8; type = 'sawtooth'; break;
                      case 'fail':
                          frequency = 150; duration = 1.0; type = 'square'; break;
                      case 'sad':
                          frequency = 100; duration = 1.2; type = 'triangle'; break;
                      default:
                          frequency = 200; duration = 0.8; type = 'sawtooth';
                  }
              }
              
              generateTone(frequency, duration, type);
          } catch (e) {
              console.log('Generated sound play failed:', e);
          }
      }

         // Function to test effects manually
     function testEffects() {
         console.log('Testing effects...');
         
         // Test good score effect
         setTimeout(() => {
             const testElement = document.createElement('div');
             testElement.textContent = '1500'; // Test good score
             testElement.style.position = 'fixed';
             testElement.style.top = '50%';
             testElement.style.left = '50%';
             testElement.style.transform = 'translate(-50%, -50%)';
             testElement.style.fontSize = '48px';
             testElement.style.fontWeight = 'bold';
             testElement.style.color = 'red';
             testElement.style.zIndex = '9999';
             testElement.style.background = 'white';
             testElement.style.padding = '20px';
             testElement.style.border = '2px solid black';
             
             document.body.appendChild(testElement);
             
             console.log('Testing good score effect...');
             checkScoreAndShowEffects(testElement, '1500');
             
             setTimeout(() => {
                 testElement.remove();
             }, 4000);
         }, 1000);
         
         // Test mid score effect after 6 seconds
         setTimeout(() => {
             const testElement2 = document.createElement('div');
             testElement2.textContent = '1200'; // Test mid score
             testElement2.style.position = 'fixed';
             testElement2.style.top = '50%';
             testElement2.style.left = '50%';
             testElement2.style.transform = 'translate(-50%, -50%)';
             testElement2.style.fontSize = '48px';
             testElement2.style.fontWeight = 'bold';
             testElement2.style.color = 'red';
             testElement2.style.zIndex = '9999';
             testElement2.style.background = 'white';
             testElement2.style.padding = '20px';
             testElement2.style.border = '2px solid black';
             
             document.body.appendChild(testElement2);
             
             console.log('Testing mid score effect...');
             checkScoreAndShowEffects(testElement2, '1200');
             
             setTimeout(() => {
                 testElement2.remove();
             }, 4000);
         }, 6000);
         
         // Test bad score effect after 12 seconds
         setTimeout(() => {
             const testElement3 = document.createElement('div');
             testElement3.textContent = '800'; // Test bad score
             testElement3.style.position = 'fixed';
             testElement3.style.top = '50%';
             testElement3.style.left = '50%';
             testElement3.style.transform = 'translate(-50%, -50%)';
             testElement3.style.fontSize = '48px';
             testElement3.style.fontWeight = 'bold';
             testElement3.style.color = 'red';
             testElement3.style.zIndex = '9999';
             testElement3.style.background = 'white';
             testElement3.style.padding = '20px';
             testElement3.style.border = '2px solid black';
             
             document.body.appendChild(testElement3);
             
             console.log('Testing bad score effect...');
             checkScoreAndShowEffects(testElement3, '800');
             
             setTimeout(() => {
                 testElement3.remove();
             }, 4000);
         }, 12000);
     }

    // Function to show settings panel
    function showSettingsPanel() {
        // Remove existing panel if it exists
        const existingPanel = document.getElementById('sat-score-settings-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        const panel = document.createElement('div');
        panel.id = 'sat-score-settings-panel';
        panel.className = 'sat-score-settings-panel';
        panel.innerHTML = `
            <div class="settings-header">
                <h3>🎯 Score Effects Settings</h3>
                <button class="close-btn" id="close-settings">×</button>
            </div>
            <div class="settings-content">
                <div class="setting-group">
                    <h4>Total Score</h4>
                    <div class="range-inputs">
                        <label>Good Range: <input type="number" id="total-good-min" value="${scoreSettings.total.good.min}" min="400" max="1600"> - <input type="number" id="total-good-max" value="${scoreSettings.total.good.max}" min="400" max="1600"></label>
                        <label>Bad Range: <input type="number" id="total-bad-min" value="${scoreSettings.total.bad.min}" min="400" max="1600"> - <input type="number" id="total-bad-max" value="${scoreSettings.total.bad.max}" min="400" max="1600"></label>
                    </div>
                </div>
                <div class="setting-group">
                    <h4>Reading & Writing</h4>
                    <div class="range-inputs">
                        <label>Good Range: <input type="number" id="reading-good-min" value="${scoreSettings.reading.good.min}" min="200" max="800"> - <input type="number" id="reading-good-max" value="${scoreSettings.reading.good.max}" min="200" max="800"></label>
                        <label>Bad Range: <input type="number" id="reading-bad-min" value="${scoreSettings.reading.bad.min}" min="200" max="800"> - <input type="number" id="reading-bad-max" value="${scoreSettings.reading.bad.max}" min="200" max="800"></label>
                    </div>
                </div>
                <div class="setting-group">
                    <h4>Math</h4>
                    <div class="range-inputs">
                        <label>Good Range: <input type="number" id="math-good-min" value="${scoreSettings.math.good.min}" min="200" max="800"> - <input type="number" id="math-good-max" value="${scoreSettings.math.good.max}" min="200" max="800"></label>
                        <label>Bad Range: <input type="number" id="math-bad-min" value="${scoreSettings.math.bad.min}" min="200" max="800"> - <input type="number" id="math-bad-max" value="${scoreSettings.math.bad.max}" min="200" max="800"></label>
                    </div>
                </div>
                <div class="settings-buttons">
                    <button class="save-btn" id="save-settings">Save Settings</button>
                    <button class="reset-btn" id="reset-settings">Reset to Default</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Add event listeners
        document.getElementById('close-settings').addEventListener('click', () => {
            panel.remove();
        });
        
        document.getElementById('save-settings').addEventListener('click', saveSettings);
        document.getElementById('reset-settings').addEventListener('click', resetSettings);
        
        // Close panel when clicking outside
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                panel.remove();
            }
        });
    }

    // Function to save settings
    function saveSettings() {
        scoreSettings = {
            total: {
                good: { min: parseInt(document.getElementById('total-good-min').value), max: parseInt(document.getElementById('total-good-max').value) },
                bad: { min: parseInt(document.getElementById('total-bad-min').value), max: parseInt(document.getElementById('total-bad-max').value) }
            },
            reading: {
                good: { min: parseInt(document.getElementById('reading-good-min').value), max: parseInt(document.getElementById('reading-good-max').value) },
                bad: { min: parseInt(document.getElementById('reading-bad-min').value), max: parseInt(document.getElementById('reading-bad-max').value) }
            },
            math: {
                good: { min: parseInt(document.getElementById('math-good-min').value), max: parseInt(document.getElementById('math-good-max').value) },
                bad: { min: parseInt(document.getElementById('math-bad-min').value), max: parseInt(document.getElementById('math-bad-max').value) }
            },
            writing: {
                good: { min: parseInt(document.getElementById('reading-good-min').value), max: parseInt(document.getElementById('reading-good-max').value) },
                bad: { min: parseInt(document.getElementById('reading-bad-min').value), max: parseInt(document.getElementById('reading-bad-max').value) }
            }
        };
        
        // Save to chrome storage
        chrome.storage.local.set({ satScoreSettings: scoreSettings });
        
        // Show success message
        showSettingsMessage('Settings saved! 🎉');
        
        // Close panel
        document.getElementById('sat-score-settings-panel').remove();
    }

    // Function to reset settings
    function resetSettings() {
        scoreSettings = {
            total: { good: { min: 1400, max: 1600 }, bad: { min: 400, max: 1000 } },
            reading: { good: { min: 700, max: 800 }, bad: { min: 200, max: 500 } },
            math: { good: { min: 700, max: 800 }, bad: { min: 200, max: 500 } },
            writing: { good: { min: 700, max: 800 }, bad: { min: 200, max: 500 } }
        };
        
        // Update form values
        document.getElementById('total-good-min').value = scoreSettings.total.good.min;
        document.getElementById('total-good-max').value = scoreSettings.total.good.max;
        document.getElementById('total-bad-min').value = scoreSettings.total.bad.min;
        document.getElementById('total-bad-max').value = scoreSettings.total.bad.max;
        document.getElementById('reading-good-min').value = scoreSettings.reading.good.min;
        document.getElementById('reading-good-max').value = scoreSettings.reading.good.max;
        document.getElementById('reading-bad-min').value = scoreSettings.reading.bad.min;
        document.getElementById('reading-bad-max').value = scoreSettings.reading.bad.max;
        document.getElementById('math-good-min').value = scoreSettings.math.good.min;
        document.getElementById('math-good-max').value = scoreSettings.math.good.max;
        document.getElementById('math-bad-min').value = scoreSettings.math.bad.min;
        document.getElementById('math-bad-max').value = scoreSettings.math.bad.max;
        
        showSettingsMessage('Settings reset to default! 🔄');
    }

    // Function to show settings message
    function showSettingsMessage(message) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'settings-message';
        msgDiv.textContent = message;
        document.body.appendChild(msgDiv);
        
        setTimeout(() => {
            msgDiv.remove();
        }, 2000);
    }

         // Function to scan and hide scores
     function scanAndHideScores() {
         // Don't hide scores if they've been revealed or auto-hide is disabled
         if (scoresRevealed || !autoHideEnabled) {
             return;
         }
         
         // Look for elements with potential scores
         const allElements = document.querySelectorAll('*');
         let foundScores = false;
         
         allElements.forEach(element => {
             // Skip if already processed, if it's our hidden element, or if it's been revealed
             if (element.classList.contains(config.hiddenClass) || 
                 element.classList.contains(config.clickableClass) ||
                 element.getAttribute('data-revealed') === 'true' ||
                 element.getAttribute('data-temp-hidden') === 'true') {
                 return;
             }
             
             const text = element.textContent || '';
             
             // Check if this element contains a potential SAT score
             if (isPotentialSATScore(text) && isInSATContext(element) && !isScoreRange(element)) {
                 // If this element was temporarily hidden, restore it first
                 if (element.getAttribute('data-temp-hidden') === 'true') {
                     element.style.visibility = '';
                     element.style.opacity = '';
                     element.removeAttribute('data-temp-hidden');
                 }
                 
                 hideScore(element);
                 foundScores = true;
             }
         });
         
         // Show big reveal button if scores were found and hidden
         if (foundScores) {
             showBigRevealButton();
         }
     }

         // Function to handle dynamic content
     function observeDOMChanges() {
         const observer = new MutationObserver(function(mutations) {
             let shouldScan = false;
             
             mutations.forEach(function(mutation) {
                 if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                     shouldScan = true;
                 }
             });
             
             if (shouldScan) {
                 // Scan immediately for faster response
                 scanAndHideScores();
                 // Also scan again after a short delay to catch any missed scores
                 setTimeout(scanAndHideScores, 100);
             }
         });
         
         observer.observe(document.body, {
             childList: true,
             subtree: true
         });
     }

         // Initialize the extension
     function init() {
         console.log('SAT Score Hider: Initializing...');
         
         // Load saved settings
         chrome.storage.local.get(['satScoreSettings', 'soundSettings'], function(result) {
             if (result.satScoreSettings) {
                 scoreSettings = result.satScoreSettings;
                 console.log('Loaded settings:', scoreSettings);
                 
                 // Ensure mid ranges exist for all score types
                 if (!scoreSettings.total.mid) {
                     scoreSettings.total.mid = { min: 1000, max: 1399 };
                 }
                 if (!scoreSettings.reading.mid) {
                     scoreSettings.reading.mid = { min: 500, max: 699 };
                 }
                 if (!scoreSettings.math.mid) {
                     scoreSettings.math.mid = { min: 500, max: 699 };
                 }
                 if (!scoreSettings.writing.mid) {
                     scoreSettings.writing.mid = { min: 500, max: 699 };
                 }
                 console.log('Settings after ensuring mid ranges:', scoreSettings);
             }
             if (result.soundSettings) {
                 soundSettings = result.soundSettings;
                 console.log('Loaded sound settings:', soundSettings);
             }
         });
         
         // Start hiding immediately - don't wait for page load
         quickPreScan(); // Quick pre-scan to hide scores immediately
         
         // Set up continuous monitoring
         observeDOMChanges();
         
         // Also scan periodically to catch any missed scores
         setInterval(() => {
             scanAndHideScores();
         }, 2000);
         
         // Additional scans on page events
         if (document.readyState === 'loading') {
             document.addEventListener('DOMContentLoaded', function() {
                 scanAndHideScores();
             });
         }
         
         window.addEventListener('load', function() {
             scanAndHideScores();
         });

        // Listen for messages from popup
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            switch(request.action) {
                case 'hideAllScores':
                    hideAllScores();
                    break;
                case 'revealAllScores':
                    revealAllScores();
                    break;
                case 'showBigRevealButton':
                    showBigRevealButton();
                    break;
                case 'toggleAutoHide':
                    autoHideEnabled = request.enabled;
                    if (!autoHideEnabled) {
                        // If auto-hide is disabled, reveal all scores
                        revealAllScores();
                    } else {
                        // If auto-hide is re-enabled, reset state and scan
                        scoresRevealed = false;
                        
                        // Remove revealed markers from all elements
                        const revealedElements = document.querySelectorAll('[data-revealed="true"]');
                        revealedElements.forEach(element => {
                            element.removeAttribute('data-revealed');
                        });
                        
                        scanAndHideScores();
                    }
                    break;
                                 case 'updateSettings':
                     scoreSettings = request.settings;
                     if (request.soundSettings) {
                         soundSettings = request.soundSettings;
                     }
                     console.log('Settings updated:', scoreSettings);
                     console.log('Sound settings updated:', soundSettings);
                     break;
                case 'testEffects':
                    testEffects();
                    break;
            }
        });
    }

         // Quick pre-scan to hide scores immediately
     function quickPreScan() {
         // Look for any text nodes that might contain scores
         const walker = document.createTreeWalker(
             document.body,
             NodeFilter.SHOW_TEXT,
             null,
             false
         );
         
         const textNodes = [];
         let node;
         while (node = walker.nextNode()) {
             textNodes.push(node);
         }
         
         // Check each text node for potential scores
         textNodes.forEach(textNode => {
             const text = textNode.textContent || '';
             const cleanText = text.replace(/[, ]/g, '');
             const score = parseInt(cleanText);
             
             if (score >= 400 && score <= 1600) {
                 // Hide the parent element immediately
                 const parent = textNode.parentElement;
                 if (parent && !parent.classList.contains('sat-score-hidden') && 
                     !parent.getAttribute('data-temp-hidden') && 
                     !parent.getAttribute('data-revealed')) {
                     parent.style.visibility = 'hidden';
                     parent.style.opacity = '0';
                     parent.setAttribute('data-temp-hidden', 'true');
                 }
             }
         });
     }
     
     // Start the extension
     init();
})();
