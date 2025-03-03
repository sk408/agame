// DOM Elements
const frequencySelect = document.getElementById('frequency-select');
const intensitySlider = document.getElementById('intensity-slider');
const intensityValue = document.getElementById('intensity-value');
const leftEarButton = document.getElementById('left-ear');
const rightEarButton = document.getElementById('right-ear');
const playToneButton = document.getElementById('play-tone');
const patientHeard = document.getElementById('patient-heard');
const markThresholdButton = document.getElementById('mark-threshold');
const clearAudiogramButton = document.getElementById('clear-audiogram');
const feedbackMessage = document.getElementById('feedback-message');
const audiogramCanvas = document.getElementById('audiogram-canvas');
const ctx = audiogramCanvas.getContext('2d');
const toggleKeyboardButton = document.getElementById('toggle-keyboard');

// Keyboard controls state
let keyboardControlsEnabled = true;

// Game state
let currentEar = 'left'; // 'left' or 'right'
let audiogramData = {
    left: {},  // Will store frequency: threshold pairs
    right: {}
};

// Tone presentation state
let isToneActive = false;
let continuousToneInterval = null;
let oscillator = null;
let gainNode = null;
let panNode = null;
let isToneOn = false; // Track whether tone is currently playing during pulsed presentation
let reticleVisible = false; // Track whether reticle is currently visible during flashing

// Test state tracking
let testState = {
    left: {},  // Will track testing state for each frequency in left ear
    right: {} // Will track testing state for each frequency in right ear
};

// Possible test phases
const TEST_PHASES = {
    INITIAL: 'initial',           // First presentation at this frequency
    DESCENDING: 'descending',     // Decreasing by 10dB until no response
    ASCENDING: 'ascending',       // Increasing by 5dB until response after no response
    CONFIRMATION: 'confirmation', // Confirming threshold with additional presentations
    COMPLETE: 'complete'          // Valid threshold determined
};

// Response history tracking
let responseHistory = {
    left: {},  // Will track responses for each frequency in left ear
    right: {} // Will track responses for each frequency in right ear
};

// Virtual patient profiles collection
const patientProfiles = [
    {
        id: 1,
        name: "John Smith",
        age: 45,
        gender: "Male",
        occupation: "Construction Worker",
        notes: "Complains of difficulty hearing in noisy environments. Notices it's harder to hear people speaking on his right side.",
        hearingThresholds: {
            left: {
                250: 15,
                500: 20,
                1000: 25,
                1500: 28,
                2000: 30,
                3000: 40,
                4000: 45,
                6000: 50,
                8000: 55
            },
            right: {
                250: 20,
                500: 25,
                1000: 35,
                1500: 40,
                2000: 45,
                3000: 55,
                4000: 65,
                6000: 70,
                8000: 75
            }
        },
        patternDescription: "Noise-induced hearing loss, worse in right ear"
    },
    {
        id: 2,
        name: "Mary Johnson",
        age: 72,
        gender: "Female",
        occupation: "Retired Teacher",
        notes: "Reports gradual hearing loss over the past few years. Has difficulty understanding speech, especially in groups.",
        hearingThresholds: {
            left: {
                250: 20,
                500: 25,
                1000: 35,
                1500: 45,
                2000: 50,
                3000: 55,
                4000: 60,
                6000: 65,
                8000: 70
            },
            right: {
                250: 25,
                500: 30,
                1000: 40,
                1500: 50,
                2000: 55,
                3000: 60,
                4000: 65,
                6000: 70,
                8000: 75
            }
        },
        patternDescription: "Age-related hearing loss (presbycusis)"
    },
    {
        id: 3,
        name: "James Wilson",
        age: 35,
        gender: "Male",
        occupation: "IT Specialist",
        notes: "No complaints about hearing. Routine checkup requested by employer.",
        hearingThresholds: {
            left: {
                250: 5,
                500: 5,
                1000: 10,
                1500: 10,
                2000: 10,
                3000: 15,
                4000: 15,
                6000: 15,
                8000: 15
            },
            right: {
                250: 5,
                500: 10,
                1000: 5,
                1500: 10,
                2000: 15,
                3000: 15,
                4000: 10,
                6000: 15,
                8000: 20
            }
        },
        patternDescription: "Normal hearing sensitivity bilaterally"
    },
    {
        id: 4,
        name: "Sarah Davis",
        age: 28,
        gender: "Female",
        occupation: "Musician",
        notes: "Reports persistent ringing in the left ear and occasional dizziness. Concerned about hearing damage from performances.",
        hearingThresholds: {
            left: {
                250: 10,
                500: 15,
                1000: 15,
                1500: 20,
                2000: 25,
                3000: 50,
                4000: 60,
                6000: 65,
                8000: 70
            },
            right: {
                250: 5,
                500: 10,
                1000: 5,
                1500: 10,
                2000: 15,
                3000: 20,
                4000: 25,
                6000: 30,
                8000: 35
            }
        },
        patternDescription: "Noise-induced hearing loss with notch at 4kHz in left ear"
    },
    {
        id: 5,
        name: "Robert Brown",
        age: 52,
        gender: "Male",
        occupation: "Lawyer",
        notes: "Recently had an upper respiratory infection. Reports sudden hearing loss and fullness in the left ear.",
        hearingThresholds: {
            left: {
                250: 40,
                500: 45,
                1000: 45,
                2000: 40,
        4000: 35,
                8000: 35
            },
            right: {
                250: 10,
                500: 10,
                1000: 5,
                2000: 10,
                4000: 15,
                8000: 20
            }
        },
        patternDescription: "Conductive hearing loss in left ear, possibly due to middle ear fluid"
    },
    {
        id: 6,
        name: "Elizabeth Miller",
        age: 65,
        gender: "Female",
        occupation: "Retired Nurse",
        notes: "No complaints about hearing, but family members have noticed she often asks for repetition and turns TV volume high.",
        hearingThresholds: {
            left: {
                250: 15,
                500: 20,
                1000: 30,
                2000: 45,
                4000: 55,
                8000: 65
            },
            right: {
                250: 15,
                500: 25,
                1000: 35,
                2000: 50,
                4000: 60,
                8000: 70
            }
        },
        patternDescription: "Bilateral high-frequency sensorineural hearing loss"
    },
    {
        id: 7,
        name: "Michael Chen",
        age: 8,
        gender: "Male",
        occupation: "Student",
        notes: "Teacher reports inattention in class. Parents note he often doesn't respond when called and sits close to the TV.",
        hearingThresholds: {
            left: {
                250: 25,
                500: 35,
                1000: 30,
                1500: 25,
                2000: 25,
                3000: 30,
                4000: 30,
                6000: 25,
                8000: 25
            },
            right: {
                250: 30,
                500: 40,
                1000: 35,
                1500: 30,
                2000: 30,
                3000: 25,
                4000: 25,
                6000: 30,
                8000: 30
            }
        },
        patternDescription: "Mild bilateral conductive hearing loss, consistent with otitis media with effusion"
    },
    {
        id: 8,
        name: "Patricia Garcia",
        age: 42,
        gender: "Female",
        occupation: "Retail Manager",
        notes: "Complains that voices sound muffled in her right ear. Reports a cold last week.",
        hearingThresholds: {
            left: {
                250: 5,
                500: 5,
                1000: 10,
                1500: 10,
                2000: 10,
                3000: 15,
                4000: 15,
                6000: 20,
                8000: 20
            },
            right: {
                250: 30,
                500: 35,
                1000: 35,
                1500: 30,
                2000: 30,
                3000: 25,
                4000: 25,
                6000: 25,
                8000: 25
            }
        },
        patternDescription: "Right conductive hearing loss, possible Eustachian tube dysfunction"
    },
    {
        id: 9,
        name: "Thomas Wright",
        age: 78,
        gender: "Male",
        occupation: "Retired Engineer",
        notes: "Reports that people mumble all the time. Has difficulty following conversations with multiple speakers.",
        hearingThresholds: {
            left: {
                250: 30,
                500: 40,
                1000: 50,
                1500: 60,
                2000: 65,
                3000: 70,
                4000: 75,
                6000: 80,
                8000: 80
            },
            right: {
                250: 35,
                500: 45,
                1000: 55,
                1500: 65,
                2000: 70,
                3000: 75,
                4000: 80,
                6000: 85,
                8000: 85
            }
        },
        patternDescription: "Moderate to severe bilateral sensorineural hearing loss"
    },
    {
        id: 10,
        name: "Amanda Lee",
        age: 22,
        gender: "Female",
        occupation: "College Student",
        notes: "Experiencing intermittent dizziness and reports a sensation of movement when sitting still. Occasional tinnitus in the right ear.",
        hearingThresholds: {
            left: {
                250: 5,
                500: 10,
                1000: 5,
                1500: 10,
                2000: 10,
                3000: 15,
                4000: 15,
                6000: 15,
                8000: 15
            },
            right: {
                250: 10,
                500: 15,
                1000: 45,
                1500: 45,
                2000: 40,
                3000: 35,
                4000: 35,
                6000: 30,
                8000: 30
            }
        },
        patternDescription: "Right mid-frequency sensorineural hearing loss, possible Meniere's disease"
    },
    {
        id: 11,
        name: "David Anderson",
        age: 60,
        gender: "Male",
        occupation: "Factory Worker",
        notes: "No complaints about hearing. Here for annual occupational screening at workplace's request.",
        hearingThresholds: {
            left: {
                250: 10,
                500: 15,
                1000: 15,
                2000: 30,
                4000: 55,
                8000: 60
            },
            right: {
                250: 15,
                500: 15,
                1000: 20,
                2000: 35,
                4000: 60,
                8000: 65
            }
        },
        patternDescription: "Bilateral noise-induced hearing loss with 4kHz notch"
    },
    {
        id: 12,
        name: "Olivia Martinez",
        age: 4,
        gender: "Female",
        occupation: "Preschooler",
        notes: "Parents report delayed speech development. Often doesn't respond to her name unless looking at the speaker.",
        hearingThresholds: {
            left: {
                250: 40,
                500: 45,
                1000: 50,
                2000: 55,
                4000: 60,
                8000: 65
            },
            right: {
                250: 45,
                500: 50,
                1000: 55,
                2000: 60,
                4000: 65,
                8000: 70
            }
        },
        patternDescription: "Bilateral moderate sensorineural hearing loss"
    }
];

// Current patient
let currentPatientId = 1;
let patientHearingThresholds = patientProfiles[0].hearingThresholds;
const responseVariability = 3; // +/- 3 dB variability in patient response

// Audio context for tone generation
let audioContext;

// Tone presentation parameters
const PULSE_ON_DURATION = 200; // Duration of tone on in ms
const PULSE_OFF_DURATION = 200; // Duration of tone off in ms

// Initialize the application
function init() {
    // Set default frequency to 1000 Hz as per best practice
    frequencySelect.value = '1000';
    
    // Ensure we have a valid patientHearingThresholds
    if (!patientHearingThresholds && patientProfiles && patientProfiles.length > 0) {
        console.log("Initializing patientHearingThresholds with first patient");
        patientHearingThresholds = patientProfiles[0].hearingThresholds;
    } else if (!patientHearingThresholds) {
        console.error("No patients available, creating fallback thresholds");
        // Create a fallback if no patients are defined
        patientHearingThresholds = {
            left: {
                250: 10, 500: 10, 1000: 10, 1500: 10, 2000: 15, 3000: 15, 4000: 20, 6000: 20, 8000: 25
            },
            right: {
                250: 10, 500: 10, 1000: 10, 1500: 10, 2000: 15, 3000: 15, 4000: 20, 6000: 20, 8000: 25
            }
        };
    }
    
    // We'll initialize audio context ONLY upon user interaction rather than during init
    // This avoids the suspended state warning
    
    // Update intensity value display when slider changes
    intensitySlider.addEventListener('input', () => {
        intensityValue.textContent = `${intensitySlider.value} dB HL`;
        // Redraw reticle when intensity changes
        drawAudiogramGrid();
        drawReticle();
    });
    
    // Update the reticle when frequency changes
    frequencySelect.addEventListener('change', () => {
        drawAudiogramGrid();
        drawReticle();
    });
    
    // Ear selection
    leftEarButton.addEventListener('click', () => {
        // Store previous ear to track switching
        const previousEar = currentEar;
        currentEar = 'left';
        leftEarButton.classList.add('active');
        rightEarButton.classList.remove('active');
        
        // Provide context-aware feedback when switching ears
        if (previousEar === 'right') {
            // User switched from right to left ear
            const leftEarProgress = getEarTestingProgress('left');
            
            if (leftEarProgress.testedFrequencies.length === 0) {
                // No frequencies tested in left ear yet
                updateFeedback('Switching to left ear. Start by testing 1000 Hz at 30 dB HL following the Hughson-Westlake procedure.');
                // Set frequency to 1000 Hz if not already tested
                frequencySelect.value = '1000';
                intensitySlider.value = 30;
                intensityValue.textContent = '30 dB HL';
                // Initialize test state for this frequency if not already done
                if (!testState[currentEar][1000]) {
                    initializeTestState(1000);
                }
            } else {
                // Some testing already done in left ear
                // ... existing code for handling partially tested ear
            }
        } else {
            // Initial selection of left ear
            updateFeedback('Now testing left ear. Start with 1000 Hz at 30 dB HL following the Hughson-Westlake procedure.');
        }
        
        // Redraw audiogram with updated ear selection
        drawAudiogramGrid();
        plotAudiogramData();
        drawReticle();
    });
    
    rightEarButton.addEventListener('click', () => {
        // Store previous ear to track switching
        const previousEar = currentEar;
        currentEar = 'right';
        rightEarButton.classList.add('active');
        leftEarButton.classList.remove('active');
        
        // Provide context-aware feedback when switching ears
        if (previousEar === 'left') {
            // User switched from left to right ear
            const rightEarProgress = getEarTestingProgress('right');
            
            if (rightEarProgress.testedFrequencies.length === 0) {
                // No frequencies tested in right ear yet
                updateFeedback('Switching to right ear. Start by testing 1000 Hz at 30 dB HL following the Hughson-Westlake procedure.');
                // Set frequency to 1000 Hz if not already tested
                frequencySelect.value = '1000';
                intensitySlider.value = 30;
                intensityValue.textContent = '30 dB HL';
                // Initialize test state for this frequency if not already done
                if (!testState[currentEar][1000]) {
                    initializeTestState(1000);
                }
            } else if (rightEarProgress.incompleteFrequencies.length > 0) {
                // Some frequencies started but not completed in right ear
                const nextFrequency = rightEarProgress.incompleteFrequencies[0];
                updateFeedback(`Switching to right ear. Continue testing at ${nextFrequency} Hz where you left off.`);
                // Set frequency to the incomplete one
                frequencySelect.value = nextFrequency.toString();
                // Set intensity based on the current state
                const state = testState[currentEar][nextFrequency];
                let suggestedIntensity = 30;
                if (state && state.lastIntensity !== null) {
                    suggestedIntensity = state.lastIntensity;
                }
                intensitySlider.value = suggestedIntensity;
                intensityValue.textContent = `${suggestedIntensity} dB HL`;
            } else if (rightEarProgress.completedFrequencies.length < 9) {
                // Some frequencies completed but not all in right ear
                const nextFreq = getNextFrequencyToTest('right');
                updateFeedback(`Switching to right ear. Continue testing at ${nextFreq} Hz following the standard protocol.`);
                // Set frequency to the next one to test
                frequencySelect.value = nextFreq.toString();
                const suggestedIntensity = getInitialIntensityForFrequency(nextFreq);
                intensitySlider.value = suggestedIntensity;
                intensityValue.textContent = `${suggestedIntensity} dB HL`;
                // Initialize test state for this frequency if not already done
                if (!testState[currentEar][nextFreq]) {
                    initializeTestState(nextFreq);
                }
            } else {
                // All frequencies completed in right ear
                updateFeedback('Switching to right ear. All frequencies have been tested in this ear.');
            }
        } else {
            // Initial selection of right ear
            updateFeedback('Now testing right ear. Start with 1000 Hz at 30 dB HL following the Hughson-Westlake procedure.');
        }
        
        // Redraw audiogram with updated ear selection
        drawAudiogramGrid();
        plotAudiogramData();
        drawReticle();
    });
    
    // Play tone button - replaced with mousedown/mouseup/mouseleave events for continuous tone
    playToneButton.addEventListener('mousedown', (e) => {
        // Initialize audio context on first user interaction
        initializeAudioContext();
        startContinuousTone(e);
    });
    playToneButton.addEventListener('mouseup', stopContinuousTone);
    playToneButton.addEventListener('mouseleave', stopContinuousTone);
    playToneButton.addEventListener('touchstart', (e) => {
        // Initialize audio context on first user interaction
        initializeAudioContext();
        startContinuousTone(e);
    });
    playToneButton.addEventListener('touchend', stopContinuousTone);
    
    // Mark threshold button
    markThresholdButton.addEventListener('click', markThreshold);
    
    // Clear audiogram button
    clearAudiogramButton.addEventListener('click', clearAudiogram);
    
    // Initialize audiogram
    drawAudiogramGrid();
    
    // Initialize frequency select change listener
    frequencySelect.addEventListener('change', handleFrequencyChange);
    
    // Welcome message
    updateFeedback('Welcome! Start by testing the 1000 Hz tone at 30 dB HL in the left ear. Keyboard controls: Space=Play tone, ←→=Change frequency, ↑↓=Change intensity, S=Store threshold, L=Left ear, R=Right ear');
    
    // Set initial intensity to 30 dB as per protocol
    intensitySlider.value = 30;
    intensityValue.textContent = '30 dB HL';
    
    // Draw initial reticle
    drawReticle();

    // Add event listener for patient selection
    const patientSelect = document.getElementById('patient-select');
    if (patientSelect) { // Check if element exists before adding listener
        patientSelect.addEventListener('change', (e) => {
            selectPatient(e.target.value);
        });
        
        // Load patients and select the default
        loadPatients();
        selectPatient(currentPatientId);
    } else {
        console.warn("Patient select element not found");
    }
    
    // Add keyboard controls
    document.addEventListener('keydown', (e) => {
        // Initialize audio context on first user interaction
        if (e.key === ' ' || e.key === 'Space') {
            initializeAudioContext();
        }
        handleKeyPress(e);
    });
    document.addEventListener('keyup', handleKeyRelease);
    
    // Toggle keyboard controls button
    if (toggleKeyboardButton) { // Check if element exists
        toggleKeyboardButton.addEventListener('click', () => {
            keyboardControlsEnabled = !keyboardControlsEnabled;
            toggleKeyboardButton.textContent = `Keyboard Controls: ${keyboardControlsEnabled ? 'On' : 'Off'}`;
            updateFeedback(`Keyboard controls are now ${keyboardControlsEnabled ? 'enabled' : 'disabled'}.`);
        });
    }
}

// Function to initialize audio context on first user interaction
function initializeAudioContext() {
    if (!audioContext) {
        try {
            // Create new AudioContext with options for better mobile compatibility
            audioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'interactive',
                sampleRate: 44100
            });
            console.log("Audio context created:", audioContext.state);
            
            // Most browsers require user interaction before allowing audio
            if (audioContext.state === 'suspended') {
                console.log("Resuming audio context...");
                // Force a user gesture to resume audio context
                const resumeOnClick = function() {
                    audioContext.resume().then(() => {
                        console.log("Audio context resumed successfully:", audioContext.state);
                        // Play a silent buffer to unlock audio on iOS
                        unlockAudioOnIOSAndSafari();
                    }).catch(error => {
                        console.error("Failed to resume audio context:", error);
                        updateFeedback("Unable to start audio. Please try clicking anywhere on the page and trying again.");
                    });
                    
                    // Remove the event listeners once they've been used
                    document.removeEventListener('click', resumeOnClick);
                    document.removeEventListener('touchstart', resumeOnClick);
                };
                
                document.addEventListener('click', resumeOnClick);
                document.addEventListener('touchstart', resumeOnClick);
                
                // Also try to resume right away (might work in some browsers)
                audioContext.resume().then(() => {
                    console.log("Audio context auto-resumed:", audioContext.state);
                    unlockAudioOnIOSAndSafari();
                }).catch(e => console.log("Auto-resume failed, waiting for user interaction"));
            } else {
                // Even if context is running, we still need to unlock audio on iOS
                unlockAudioOnIOSAndSafari();
            }
        } catch (error) {
            console.error("Failed to create audio context:", error);
            updateFeedback("There was a problem initializing audio. Please try using a different browser or device.");
        }
    }
}

// Helper function to unlock audio on iOS and Safari
function unlockAudioOnIOSAndSafari() {
    if (!audioContext) return;
    
    // Create and play a silent buffer to unlock audio on iOS/Safari
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    console.log("Attempted to unlock audio on iOS/Safari");
}

// Handle keyboard controls
function handleKeyPress(event) {
    // Only process keyboard events if controls are enabled
    if (!keyboardControlsEnabled) return;
    
    // Prevent default behavior for the keys we handle
    if (['Space', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'S', 's', 'R', 'r', 'L', 'l'].includes(event.key)) {
        event.preventDefault();
    }
    
    switch (event.key) {
        // Space bar - Play tone
        case ' ':
        case 'Space':
            if (!isToneActive) {
                startContinuousTone();
            }
            break;
            
        // Up/Down arrows - Change intensity (dB level)
        case 'ArrowUp':
            intensitySlider.value = Math.min(parseInt(intensitySlider.value) + 5, 120);
            intensityValue.textContent = `${intensitySlider.value} dB HL`;
            drawAudiogramGrid();
            drawReticle();
            break;
            
        case 'ArrowDown':
            intensitySlider.value = Math.max(parseInt(intensitySlider.value) - 5, -10);
            intensityValue.textContent = `${intensitySlider.value} dB HL`;
            drawAudiogramGrid();
            drawReticle();
            break;
            
        // Left/Right arrows - Change frequency
        case 'ArrowLeft':
            // Move to the previous frequency in the list
            const freqOptions = Array.from(frequencySelect.options).map(option => option.value);
            const currentIndex = freqOptions.indexOf(frequencySelect.value);
            if (currentIndex > 0) {
                frequencySelect.value = freqOptions[currentIndex - 1];
                frequencySelect.dispatchEvent(new Event('change'));
            }
            break;
            
        case 'ArrowRight':
            // Move to the next frequency in the list
            const freqOptionsList = Array.from(frequencySelect.options).map(option => option.value);
            const currentFreqIndex = freqOptionsList.indexOf(frequencySelect.value);
            if (currentFreqIndex < freqOptionsList.length - 1) {
                frequencySelect.value = freqOptionsList[currentFreqIndex + 1];
                frequencySelect.dispatchEvent(new Event('change'));
            }
            break;
            
        // S key - Store threshold
        case 'S':
        case 's':
            markThreshold();
            break;
            
        // R key - Right ear
        case 'R':
        case 'r':
            if (currentEar !== 'right') {
                rightEarButton.click();
            }
            break;
            
        // L key - Left ear
        case 'L':
        case 'l':
            if (currentEar !== 'left') {
                leftEarButton.click();
            }
            break;
    }
}

// Handle key release for continuous tone
function handleKeyRelease(event) {
    if (!keyboardControlsEnabled) return;
    
    // Stop tone when spacebar is released
    if (event.key === ' ' || event.key === 'Space') {
        stopContinuousTone();
    }
}

// Handle frequency change
function handleFrequencyChange() {
    const frequency = parseInt(frequencySelect.value);
    const suggestedIntensity = getInitialIntensityForFrequency(frequency);
    
    intensitySlider.value = suggestedIntensity;
    intensityValue.textContent = `${suggestedIntensity} dB HL`;
    
    // Check if we have already tested this frequency
    if (testState[currentEar][frequency]) {
        updateFeedback(`Returned to ${frequency} Hz. Continue testing according to protocol or mark threshold if completed.`);
    } else {
        updateFeedback(`Testing new frequency: ${frequency} Hz. Start at ${suggestedIntensity} dB HL and present the tone.`);
        // Initialize test state for this frequency
        initializeTestState(frequency);
    }
    
    // Redraw reticle for new frequency
    drawAudiogramGrid();
    plotAudiogramData();
    drawReticle();
}

// Get initial intensity for a new frequency based on nearby frequencies
function getInitialIntensityForFrequency(frequency) {
    // Default starting intensity
    const defaultIntensity = 30;
    
    // If we have thresholds for this ear, use nearby frequencies to estimate a good starting point
    const thresholds = audiogramData[currentEar];
    
    // Standard frequency order
    const frequencies = [250, 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
    const freqIndex = frequencies.indexOf(frequency);
    
    // If we have no data or this is 1000 Hz (first test frequency), use default
    if (Object.keys(thresholds).length === 0 || frequency === 1000) {
        return defaultIntensity;
    }
    
    // Check if we have tested adjacent frequencies
    const adjacentFreqs = [];
    
    if (freqIndex > 0) {
        const lowerFreq = frequencies[freqIndex - 1];
        if (thresholds[lowerFreq] !== undefined) {
            adjacentFreqs.push(lowerFreq);
        }
    }
    
    if (freqIndex < frequencies.length - 1) {
        const higherFreq = frequencies[freqIndex + 1];
        if (thresholds[higherFreq] !== undefined) {
            adjacentFreqs.push(higherFreq);
        }
    }
    
    // If we have adjacent frequencies, use their average as a starting point
    if (adjacentFreqs.length > 0) {
        let sum = 0;
        for (const freq of adjacentFreqs) {
            sum += thresholds[freq];
        }
        const averageThreshold = Math.round(sum / adjacentFreqs.length);
        
        // Start 10 dB above the average to ensure the patient can hear the tone
        return averageThreshold + 10;
    }
    
    // If we have at least one threshold for this ear, use the average + 10 dB
    if (Object.keys(thresholds).length > 0) {
        let sum = 0;
        for (const freq in thresholds) {
            sum += thresholds[freq];
        }
        const averageThreshold = Math.round(sum / Object.keys(thresholds).length);
        
        // Start 10 dB above the average
        return averageThreshold + 10;
    }
    
    // If all else fails, use default
    return defaultIntensity;
}

// Initialize test state for a frequency
function initializeTestState(frequency) {
    // Make sure frequency is a valid number
    if (isNaN(frequency) || !frequency) {
        console.error("Invalid frequency passed to initializeTestState:", frequency);
        frequency = 1000; // Default to 1000 Hz if invalid
    }
    
    // Make sure testState is initialized
    if (!testState) {
        console.error("testState is undefined - reinitializing");
        testState = {
            left: {},
            right: {}
        };
    }
    
    // Make sure currentEar is valid
    if (!currentEar || (currentEar !== 'left' && currentEar !== 'right')) {
        console.error(`Invalid currentEar: ${currentEar} - defaulting to left`);
        currentEar = 'left';
    }
    
    // Make sure testState[currentEar] is initialized
    if (!testState[currentEar]) {
        console.error(`testState[${currentEar}] is undefined - reinitializing`);
        testState[currentEar] = {};
    }
    
    // Now safe to set the test state for this frequency
    console.log(`Initializing test state for ${frequency} Hz in ${currentEar} ear`);
    testState[currentEar][frequency] = {
        phase: TEST_PHASES.INITIAL,
        previousPhase: null,         // Added to track phase changes and prevent duplicate feedback
        lastResponse: null,
        lastIntensity: null,
        potentialThreshold: null,
        previousPotentialThreshold: null, // Added to track threshold changes
        responseCount: 0,
        noResponseLevel: null,
        lastNoResponseLevel: null,
        lastResponseLevel: null,
        ascendingResponses: [],
        responsesAtLevels: {},  // Track responses at each intensity level across different excursions
        validAscendingResponses: {}, // Track only valid ascending responses for threshold determination
        previousDirection: null, // Track if we were previously ascending or descending
        excursionCount: 0,      // Track how many descending/ascending excursions we've done
        descendingResponses: []
    };
    
    // Make sure responseHistory is initialized
    if (!responseHistory) {
        console.error("responseHistory is undefined - reinitializing");
        responseHistory = {
            left: {},
            right: {}
        };
    }
    
    // Make sure responseHistory[currentEar] is initialized
    if (!responseHistory[currentEar]) {
        console.error(`responseHistory[${currentEar}] is undefined - reinitializing`);
        responseHistory[currentEar] = {};
    }
    
    // Initialize response history array for this frequency
    responseHistory[currentEar][frequency] = [];
}

// Start continuous tone presentation (pulsed/beeping)
function startContinuousTone(event) {
    // Only prevent default if event is provided
    if (event && event.preventDefault) {
        event.preventDefault(); // Prevent default action
    }
    
    if (isToneActive) return; // Don't start if already active
    
    isToneActive = true;
    playToneButton.classList.add('active');
    
    // Initialize audio context if not already created
    initializeAudioContext();
    
    // Ensure audio context is ready before proceeding
    if (!audioContext || audioContext.state === 'closed') {
        console.error("Audio context is not available");
        updateFeedback("Audio context not available. Please try refreshing the page.");
        isToneActive = false;
        playToneButton.classList.remove('active');
        return;
    }
    
    // Resume the audio context if it's in suspended state
    if (audioContext.state === 'suspended') {
        console.log("Attempting to resume audio context...");
        audioContext.resume()
            .then(() => {
                console.log("Audio context resumed successfully:", audioContext.state);
                continueWithToneStart();
            })
            .catch(error => {
                console.error("Failed to resume audio context:", error);
                updateFeedback("Unable to play audio. Please click anywhere on the page and try again.");
                isToneActive = false;
                playToneButton.classList.remove('active');
            });
    } else {
        // Audio context is already running, proceed directly
        console.log("Audio context is ready:", audioContext.state);
        continueWithToneStart();
    }
    
    function continueWithToneStart() {
        try {
            // Create audio nodes once
            setupAudioNodes();
            
            // Start pulsed tone presentation
            continuousToneInterval = setInterval(() => {
                if (isToneOn) {
                    // Turn off tone
                    if (gainNode) {
                        gainNode.gain.value = 0;
                    }
                    isToneOn = false;
                    reticleVisible = false;
                    
                    // Redraw audiogram to hide reticle
                    drawAudiogramGrid();
                    plotAudiogramData();
                } else {
                    // Turn on tone
                    const frequency = parseInt(frequencySelect.value);
                    const intensity = parseInt(intensitySlider.value);
                    
                    if (oscillator && gainNode) {
                        // Update oscillator frequency if needed
                        oscillator.frequency.value = frequency;
                        
                        // Calculate gain from intensity using a more effective mapping
                        // Convert decibels to gain value in a way that ensures audibility
                        // This uses a more progressive curve that better represents human hearing
                        let gain;
                        
                        if (intensity <= 0) {
                            gain = 0; // Silent for 0 or negative dB
                        } else {
                            // Exponential curve that maps dB to gain values
                            // This provides better perceptual scaling
                            // Normalize to 0-1 range with higher gain values
                            gain = Math.min(1.0, 20 * Math.pow(10, (intensity - 100) / 40)); // Doubled gain for louder sound
                            
                            // Ensure a minimum audible level
                            if (gain < 0.01) gain = 0.01;
                        }
                        
                        // Apply the gain with a slight ramp to avoid clicks/pops
                        const currentTime = audioContext.currentTime;
                        gainNode.gain.cancelScheduledValues(currentTime);
                        gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
                        gainNode.gain.linearRampToValueAtTime(gain, currentTime + 0.02);
                        
                        // Log the actual gain value applied
                        console.log('Tone playing with gain:', gain, 'for intensity:', intensity);
                        
                        isToneOn = true;
                        reticleVisible = true;
                        
                        // Draw flashing reticle
                        drawAudiogramGrid();
                        plotAudiogramData();
                        drawReticle();
                        
                        // Debugging logs
                        console.log('Tone playing:', { frequency, intensity, gain, 
                            audioContextState: audioContext.state,
                            oscillatorState: 'active'
                        });
                    } else {
                        console.error("Audio nodes not properly initialized");
                        clearInterval(continuousToneInterval);
                        isToneActive = false;
                        playToneButton.classList.remove('active');
                        updateFeedback("There was a problem playing the audio. Please try again.");
                    }
                }
            }, isToneOn ? PULSE_OFF_DURATION : PULSE_ON_DURATION);
        } catch (error) {
            console.error("Error starting tone:", error);
            isToneActive = false;
            playToneButton.classList.remove('active');
            updateFeedback("Failed to play audio. Please try again or refresh the page.");
        }
    }
}

// Set up audio nodes for tone presentation
function setupAudioNodes() {
    const frequency = parseInt(frequencySelect.value);
    
    // Properly clean up previous audio nodes if they exist
    if (oscillator) {
        try {
            oscillator.stop();
            oscillator.disconnect();
        } catch (e) {
            console.log("Error stopping existing oscillator:", e);
        }
    }
    
    if (gainNode) {
        try {
            gainNode.disconnect();
        } catch (e) {
            console.log("Error disconnecting gain node:", e);
        }
    }
    
    if (panNode) {
        try {
            panNode.disconnect();
        } catch (e) {
            console.log("Error disconnecting pan node:", e);
        }
    }
    
    try {
        // Ensure audioContext is active
        if (!audioContext || audioContext.state === 'closed') {
            initializeAudioContext();
        }
        
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(err => {
                console.error("Failed to resume audio context in setupAudioNodes:", err);
            });
        }
        
        // Create oscillator for pure tone with more direct setup
        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();
        panNode = audioContext.createStereoPanner();
        
        // Set oscillator type and frequency
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency; // Set directly instead of using setValueAtTime
        
        // Set initial gain to 0 (silent)
        gainNode.gain.value = 0;
        
        // Route audio to correct ear
        panNode.pan.value = currentEar === 'left' ? -1 : 1;
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(audioContext.destination);
        
        // Start oscillator running (will remain silent until gain is changed)
        oscillator.start();
        
        // Debugging logs
        console.log('Audio nodes set up:', { 
            frequency, 
            pan: panNode.pan.value,
            audioContextState: audioContext.state,
            oscillatorType: oscillator.type
        });
    } catch (error) {
        console.error("Error setting up audio nodes:", error);
        // Show the error to help with debugging
        const audioStatus = document.getElementById('audio-status');
        if (audioStatus) {
            audioStatus.textContent = `Error setting up audio: ${error.message}`;
            audioStatus.style.backgroundColor = "#f8d7da";
        }
    }
}

// Stop continuous tone presentation
function stopContinuousTone() {
    if (!isToneActive) return;
    
    // Clear interval
    if (continuousToneInterval) {
        clearInterval(continuousToneInterval);
        continuousToneInterval = null;
    }
    
    // Stop oscillator
    if (oscillator) {
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        setTimeout(() => {
            try {
                oscillator.stop();
                oscillator = null;
            } catch (e) {
                // Ignore errors if oscillator already stopped
            }
        }, 100);
    }
    
    isToneActive = false;
    isToneOn = false;
    playToneButton.classList.remove('active');
    
    // Process patient response at the current intensity/frequency
    const frequency = parseInt(frequencySelect.value);
    const intensity = parseInt(intensitySlider.value);
    
    // DEBUG: Add console log to verify this function is being called
    console.log(`Processing response: ${frequency} Hz at ${intensity} dB`);
    
    // Check if testState exists and is initialized
    if (!testState) {
        console.error("testState is undefined - reinitializing");
        testState = {
            left: {},
            right: {}
        };
    }
    
    // Check if currentEar is valid
    if (!currentEar || (currentEar !== 'left' && currentEar !== 'right')) {
        console.error(`Invalid currentEar: ${currentEar} - defaulting to left`);
        currentEar = 'left';
    }
    
    // Check if testState[currentEar] exists
    if (!testState[currentEar]) {
        console.error(`testState[${currentEar}] is undefined - reinitializing`);
        testState[currentEar] = {};
    }
    
    // Ensure test state is initialized for this frequency
    if (!testState[currentEar][frequency]) {
        console.log(`Initializing test state for ${frequency} Hz in ${currentEar} ear`);
        initializeTestState(frequency);
    }
    
    try {
        // Call checkPatientResponse which will update the feedback
        checkPatientResponse(frequency, intensity);
        
        // Explicitly provide educational feedback based on test state
        const state = testState[currentEar][frequency];
        if (state) {
            provideHughsonWestlakeEducationalFeedback(frequency, state);
        } else {
            console.error(`Test state for ${frequency} Hz in ${currentEar} ear is still undefined after initialization`);
            // Provide fallback feedback
            updateFeedback(`Presented ${frequency} Hz at ${intensity} dB HL in the ${currentEar} ear. Proceed with testing.`);
        }
    } catch (error) {
        console.error("Error in tone response processing:", error);
        // Provide fallback feedback if an error occurs
        updateFeedback(`Presented ${frequency} Hz at ${intensity} dB HL in the ${currentEar} ear. An error occurred with response processing.`);
    }
    
    // Redraw audiogram without reticle
    reticleVisible = false;
    drawAudiogramGrid();
    plotAudiogramData();
    drawReticle();
}

// Play a pure tone (now used for the single tone response)
function playTone() {
    const frequency = parseInt(frequencySelect.value);
    const intensity = parseInt(intensitySlider.value);
    
    // Initialize test state if this is the first time testing this frequency
    if (!testState[currentEar][frequency]) {
        initializeTestState(frequency);
    }
    
    // Initialize audio context if not already created
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create oscillator for pure tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Convert dB HL to gain value (simplified)
    // In a real application, we would need proper calibration for each frequency
    // This is a simplified approximation
    const maxDb = 120;
    const gain = intensity <= 0 ? 0 : 20 * Math.pow(10, (intensity - maxDb) / 20); // Doubled gain for louder sound
    gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
    
    // Route audio to correct ear
    const panNode = audioContext.createStereoPanner();
    panNode.pan.value = currentEar === 'left' ? -1 : 1;
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(audioContext.destination);
    
    // Play tone for 1 second
    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
        checkPatientResponse(frequency, intensity);
    }, 1000);
    
    // Update test state
    testState[currentEar][frequency].lastIntensity = intensity;
    
    // Provide feedback
    updateFeedback(`Playing ${frequency} Hz tone at ${intensity} dB HL in the ${currentEar} ear...`);
}

// Draw reticle on audiogram at current frequency and intensity
function drawReticle() {
    if (!reticleVisible && isToneActive) return;
    
    const frequency = parseInt(frequencySelect.value);
    const intensity = parseInt(intensitySlider.value);
    
    const width = audiogramCanvas.width;
    const height = audiogramCanvas.height;
    const padding = 40;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    const dbStart = -10;
    const dbEnd = 120;
    const dbRange = dbEnd - dbStart;
    
    const frequencies = [250, 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
    const freqIndex = frequencies.indexOf(frequency);
    
    if (freqIndex >= 0) {
        const x = padding + (freqIndex * graphWidth) / (frequencies.length - 1);
        const y = padding + (graphHeight * (intensity - dbStart)) / dbRange;
        
        // Draw reticle (crosshair with circle)
        ctx.strokeStyle = currentEar === 'left' ? '#0066CC' : '#CC0000';
        ctx.lineWidth = 1.5;
        
        // Reticle size
        const size = 15;
        const circleRadius = 12;
        
        // Draw crosshair lines
        ctx.beginPath();
        // Horizontal line
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        // Vertical line
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y + size);
        ctx.stroke();
        
        // Draw circle
        ctx.beginPath();
        ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Add intensity value above reticle
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${intensity} dB`, x, y - size - 5);
    }
}

// Check if the virtual patient heard the tone
function checkPatientResponse(frequency, intensity) {
    console.log(`checkPatientResponse called for ${frequency} Hz at ${intensity} dB`);
    
    // Check if patientHearingThresholds exists and has valid data
    if (!patientHearingThresholds) {
        console.error("patientHearingThresholds is undefined - using fallback");
        // Use a fallback threshold of 20dB if patient thresholds aren't available
        const fallbackThreshold = 20;
        const variability = Math.floor(Math.random() * (2 * responseVariability + 1)) - responseVariability;
        const adjustedThreshold = fallbackThreshold + variability;
        
        // Proceed with the fallback threshold
        return handlePatientResponse(frequency, intensity, adjustedThreshold);
    }
    
    // Check if the current ear data exists
    if (!patientHearingThresholds[currentEar]) {
        console.error(`patientHearingThresholds for ${currentEar} ear is undefined - using fallback`);
        // Use a fallback threshold of 20dB if the current ear data isn't available
        const fallbackThreshold = 20;
        const variability = Math.floor(Math.random() * (2 * responseVariability + 1)) - responseVariability;
        const adjustedThreshold = fallbackThreshold + variability;
        
        // Proceed with the fallback threshold
        return handlePatientResponse(frequency, intensity, adjustedThreshold);
    }
    
    // Check if the threshold for the current frequency exists
    if (patientHearingThresholds[currentEar][frequency] === undefined) {
        console.error(`No threshold defined for ${frequency} Hz in ${currentEar} ear - using interpolated fallback`);
        // Use interpolation or a reasonable default based on adjacent frequencies
        const fallbackThreshold = 20;
        const variability = Math.floor(Math.random() * (2 * responseVariability + 1)) - responseVariability;
        const adjustedThreshold = fallbackThreshold + variability;
        
        // Proceed with the fallback threshold
        return handlePatientResponse(frequency, intensity, adjustedThreshold);
    }
    
    // Normal case - we have a valid threshold
    const threshold = patientHearingThresholds[currentEar][frequency];
    const variability = Math.floor(Math.random() * (2 * responseVariability + 1)) - responseVariability;
    const adjustedThreshold = threshold + variability;
    
    return handlePatientResponse(frequency, intensity, adjustedThreshold);
}

// Helper function to handle patient response after threshold determination
function handlePatientResponse(frequency, intensity, adjustedThreshold) {
    // Simulate patient response
    const heard = intensity >= adjustedThreshold;
    
    // Update UI to show if patient heard the tone
    patientHeard.textContent = heard ? 'Heard!' : 'Not heard';
    patientHeard.style.backgroundColor = heard ? '#2ecc71' : '#e74c3c';
    patientHeard.classList.add('visible');
    
    // Hide the response after 2 seconds
    setTimeout(() => {
        patientHeard.classList.remove('visible');
    }, 2000);
    
    // Initialize test state if not already done
    if (!testState[currentEar][frequency]) {
        initializeTestState(frequency);
    }
    
    // Update test state
    const state = testState[currentEar][frequency];
    state.lastResponse = heard;
    state.responseCount++;
    
    // Add response to history
    responseHistory[currentEar][frequency].push({
        intensity: intensity,
        response: heard
    });
    
    console.log(`Patient ${heard ? 'heard' : 'did not hear'} tone. Updating test phase...`);
    
    // Update test phase based on response - this should trigger feedback updates
    updateTestPhase(frequency, intensity, heard);
    
    // Double-check that feedback is visible by forcing an update
    const heardText = heard ? 'heard' : 'did not hear';
    const feedbackText = document.getElementById('feedback-message').textContent;
    if (!feedbackText.includes(heardText)) {
        console.log("Feedback not properly updated, forcing update...");
        updateFeedback(`Patient ${heardText} ${frequency} Hz at ${intensity} dB HL. Please refer to the instructor feedback for next steps.`);
    }
    
    return heard;
}

// Update test phase based on response
function updateTestPhase(frequency, intensity, heard) {
    const state = testState[currentEar][frequency];
    const currentPhase = state.phase;
    
    // Store the previous phase before we update it
    const previousPhase = state.phase;
    const previousThreshold = state.potentialThreshold;
    
    switch (currentPhase) {
        case TEST_PHASES.INITIAL:
            if (heard) {
                // If heard on first presentation, move to descending phase
                state.phase = TEST_PHASES.DESCENDING;
                state.lastResponseLevel = intensity;
                state.previousDirection = 'descending'; // Set direction for next iteration
                
                // Begin first excursion - go down by 10dB
                // CRITICAL: This 10 dB reduction is mandatory in Hughson-Westlake after any positive response
                const nextIntensity = intensity - 10;
                intensitySlider.value = nextIntensity;
                intensityValue.textContent = `${nextIntensity} dB HL`;
                updateFeedback(`Patient heard ${frequency} Hz at ${intensity} dB HL. NEXT STEP: Following the Hughson-Westlake procedure, decrease by 10 dB to ${nextIntensity} dB HL and present again.`);
            } else {
                // If not heard on first presentation, increase by 10dB for efficiency
                // during the initial search
                const nextIntensity = intensity + 10;
                state.lastNoResponseLevel = intensity;
                state.previousDirection = 'ascending'; // Set direction for next iteration
                
                // Stay in INITIAL phase until we get a response
                intensitySlider.value = nextIntensity;
                intensityValue.textContent = `${nextIntensity} dB HL`;
                updateFeedback(`Patient did not hear ${frequency} Hz at ${intensity} dB HL. NEXT STEP: For efficiency during initial testing, increase by 10 dB to ${nextIntensity} dB HL and present again.`);
            }
            break;
            
        case TEST_PHASES.DESCENDING:
            // Store descending response
            state.descendingResponses.push({intensity, response: heard});
            
            if (heard) {
                // Update last response level
                state.lastResponseLevel = intensity;
                state.previousDirection = 'descending'; // We are descending
                
                // Continue descending in 10 dB steps
                // CRITICAL: This 10 dB reduction is mandatory in Hughson-Westlake after any positive response
                // It prevents auditory adaptation and reduces false positives
                const nextIntensity = intensity - 10;
                state.excursionCount++;
                intensitySlider.value = nextIntensity;
                intensityValue.textContent = `${nextIntensity} dB HL`;
                updateFeedback(`Patient heard ${frequency} Hz at ${intensity} dB HL. This is excursion #${state.excursionCount}. NEXT STEP: Continue the Hughson-Westlake zigzag pattern by decreasing 10 dB to ${nextIntensity} dB HL and present again.`);
            } else {
                // Update last no-response level
                state.lastNoResponseLevel = intensity;
                
                // Patient no longer hears, record no-response level and move to ascending phase
                state.phase = TEST_PHASES.ASCENDING;
                state.noResponseLevel = intensity;
                state.previousDirection = 'ascending'; // Now we're ascending
                
                // First ascending step is 5 dB up from the level where they didn't hear
                const nextIntensity = intensity + 5;
                intensitySlider.value = nextIntensity;
                intensityValue.textContent = `${nextIntensity} dB HL`;
                
                updateFeedback(`Patient did not hear ${frequency} Hz at ${intensity} dB HL. NEXT STEP: Begin ascending phase. According to the Hughson-Westlake procedure, increase by 5 dB to ${nextIntensity} dB HL and present again.`);
            }
            break;
            
        case TEST_PHASES.ASCENDING:
            // Store ascending response at this level
            state.ascendingResponses.push({intensity, response: heard});
            
            if (heard) {
                // Only count this response for threshold if it occurred during an ascending presentation
                // and wasn't a repeat of the same level
                // AND we must have completed at least one full excursion (initial descending phase doesn't count)
                if (state.previousDirection === 'ascending' && state.excursionCount >= 1) {
                    // Valid ascending response - track it for threshold determination
                    if (!state.validAscendingResponses[intensity]) {
                        state.validAscendingResponses[intensity] = 0;
                    }
                    state.validAscendingResponses[intensity]++;
                    
                    // Check if we have enough valid ascending responses at this level
                    if (state.validAscendingResponses[intensity] >= 2) {
                        // We have at least 2 positive responses during ascending phases
                        state.potentialThreshold = intensity;
                        state.phase = TEST_PHASES.COMPLETE;
                        updateFeedback(`Threshold established at ${frequency} Hz: ${intensity} dB HL. According to the Hughson-Westlake procedure, the threshold is confirmed with ${state.validAscendingResponses[intensity]} valid ascending responses. NEXT STEP: Mark this as the threshold and move to the next frequency.`);
                        break;
                    }
                }
                
                // Update last response level
                state.lastResponseLevel = intensity;
                
                // Start a new excursion - go down by 10dB again
                // CRITICAL: This 10 dB reduction is mandatory in Hughson-Westlake after any positive response
                // Never stay at the same level to accumulate more responses - always decrease by 10 dB
                const nextIntensity = intensity - 10;
                state.phase = TEST_PHASES.DESCENDING;
                state.excursionCount++;
                state.previousDirection = 'descending'; // Now we're descending
                
                intensitySlider.value = nextIntensity;
                intensityValue.textContent = `${nextIntensity} dB HL`;
                updateFeedback(`Patient heard ${frequency} Hz at ${intensity} dB HL. Following Hughson-Westlake, we need to see if the patient responds at this level on another ascending phase. This is excursion #${state.excursionCount}. NEXT STEP: Decrease by 10 dB to ${nextIntensity} dB HL and start a new excursion.`);
            } else {
                // Update last no-response level
                state.lastNoResponseLevel = intensity;
                state.previousDirection = 'ascending'; // Still ascending
                
                // Check if we've had any responses yet for this frequency
                if (state.lastResponseLevel === null) {
                    // No responses yet at this frequency, we're still in initial search
                    // Use more efficient 10dB steps up
                    const nextIntensity = intensity + 10;
                    intensitySlider.value = nextIntensity;
                    intensityValue.textContent = `${nextIntensity} dB HL`;
                    
                    updateFeedback(`Patient did not hear ${frequency} Hz at ${intensity} dB HL. NEXT STEP: Since we haven't established a response yet, increase by 10 dB to ${nextIntensity} dB HL for more efficient testing.`);
                } else {
                    // We've had a response previously, now use standard 5dB steps
                    const nextIntensity = intensity + 5;
                    intensitySlider.value = nextIntensity;
                    intensityValue.textContent = `${nextIntensity} dB HL`;
                    
                    updateFeedback(`Patient did not hear ${frequency} Hz at ${intensity} dB HL. NEXT STEP: Continue ascending by 5 dB to ${nextIntensity} dB HL and present again.`);
                }
            }
            break;
            
        case TEST_PHASES.COMPLETE:
            // Already complete, but patient is still being tested
            if (heard) {
                updateFeedback(`Patient heard ${frequency} Hz at ${intensity} dB HL. A threshold (${state.potentialThreshold} dB HL) has already been established using the Hughson-Westlake procedure. NEXT STEP: Mark the threshold and continue to the next frequency.`);
            } else {
                updateFeedback(`Patient did not hear ${frequency} Hz at ${intensity} dB HL. A threshold (${state.potentialThreshold} dB HL) has already been established using the Hughson-Westlake procedure. NEXT STEP: Mark the threshold and continue to the next frequency.`);
            }
            break;
    }
    
    // Only provide educational feedback if we're transitioning phases or in a significant state
    // and wait a short delay to avoid UI clutter
    if (previousPhase !== state.phase || 
        state.excursionCount === 1 || 
        (previousThreshold !== state.potentialThreshold && state.potentialThreshold !== null) ||
        state.phase === TEST_PHASES.COMPLETE) {
        
        // Small delay to let the user see the primary feedback first
        setTimeout(() => {
            // Educational feedback about the Hughson-Westlake procedure
            provideHughsonWestlakeEducationalFeedback(frequency, state);
        }, 200);
    }
}

// Provide educational feedback about the Hughson-Westlake procedure
function provideHughsonWestlakeEducationalFeedback(frequencyOrPhase, state) {
    const feedbackElement = document.getElementById('feedback-message');
    const currentText = feedbackElement.textContent;
    let educationalNote = "";
    
    // Handle case where only a phase string is passed (backward compatibility)
    if (typeof frequencyOrPhase === 'string' && !state) {
        const phase = frequencyOrPhase;
        
        // Only add initial guidance if there's no existing feedback or it doesn't already contain similar guidance
        if (phase === 'INITIAL' && !currentText.includes("INSTRUCTOR GUIDANCE") && !currentText.includes("Hughson-Westlake")) {
            educationalNote = `\n\n-----\nINSTRUCTOR GUIDANCE:\nFor pure tone audiometry, follow the Hughson-Westlake procedure. Start at 1000 Hz and 30 dB HL for each ear, then follow the zigzag pattern of testing. After obtaining a response, you MUST decrease by 10 dB before ascending in 5 dB steps. This mandatory 10 dB reduction after each response prevents auditory adaptation and reduces false positives due to patient anticipation.

According to ASHA (American Speech-Language-Hearing Association), pure-tone audiometry is a behavioral test of hearing sensitivity where thresholds are measured as the lowest intensity in decibels at which a certain frequency is perceived 50% of the time. Results are plotted on an audiogram, with sound frequency on the horizontal axis and sound intensity on the vertical axis.`;
            feedbackElement.textContent = `${currentText}${educationalNote}`;
        }
        return;
    }
    
    // Normal case with frequency and state
    const frequency = frequencyOrPhase;
    
    // Only add educational feedback if we're in a relevant phase
    if (state.phase === TEST_PHASES.DESCENDING || 
        state.phase === TEST_PHASES.ASCENDING || 
        state.phase === TEST_PHASES.COMPLETE || 
        state.phase === TEST_PHASES.INITIAL) {
        
        // Create an educational note about the procedure - each phase gets exactly one note
        if (state.phase === TEST_PHASES.INITIAL) {
            if (state.lastResponseLevel === null && !currentText.includes("INSTRUCTOR GUIDANCE")) {
                educationalNote = `\n\n-----\nINSTRUCTOR GUIDANCE:\nFor efficiency during initial testing, we use 10 dB steps upward until the patient responds. Once they respond, we'll switch to the standard Hughson-Westlake procedure, which requires an immediate 10 dB reduction after each positive response.
                
ASHA notes that appropriate earphones (supra-aural, circumaural, or insert) should be selected based on the testing situation and should match the audiometer. Pulsed tones have been shown to increase a participant's awareness of the stimuli.`;
            }
        } else if (state.phase === TEST_PHASES.DESCENDING) {
            if (state.excursionCount <= 1 && !currentText.includes("zigzag pattern")) {
                educationalNote = `\n\n-----\nINSTRUCTOR GUIDANCE:\nThe Hughson-Westlake procedure follows a zigzag pattern. After each response, you MUST descend by 10 dB. This mandatory reduction prevents auditory nerve adaptation and reduces false positives. If the patient doesn't respond, begin ascending in 5 dB steps until they respond again. Remember that only responses obtained during the ascending phase count toward threshold determination, and responses during the initial descending phase do not count at all.`;
            } else if (state.excursionCount > 1 && !currentText.includes(`excursion #${state.excursionCount}`)) {
                educationalNote = `\n\n-----\nINSTRUCTOR GUIDANCE:\nThis is excursion #${state.excursionCount} in the Hughson-Westlake procedure. A threshold is established when the patient responds at the same level in at least 2 out of 3 different ascending presentations. After each response, the immediate 10 dB reduction is critical - never remain at the same level to accumulate responses. Remember that any responses in the descending phase (including the initial descending phase) do not count toward threshold determination.`;
            }
        } else if (state.phase === TEST_PHASES.ASCENDING) {
            if (state.lastResponseLevel === null && !currentText.includes("initial search")) {
                educationalNote = `\n\n-----\nINSTRUCTOR GUIDANCE:\nWe haven't established a response yet at this frequency, so we're using more efficient 10 dB steps during the initial search.
                
ASHA standards indicate that thresholds are typically assessed at frequencies between 250 Hz and 8000 Hz, except when low-frequency hearing loss exists or is suspected, in which case 125 Hz is also measured. When differences of 20 dB or more occur between adjacent octave frequencies, additional frequencies may be tested.`;
            } else if (!currentText.includes("ascend in 5 dB steps")) {
                let validResponses = '';
                if (state.validAscendingResponses) {
                    // Count total valid responses identified so far
                    const totalValidResponses = Object.values(state.validAscendingResponses).reduce((sum, count) => sum + count, 0);
                    validResponses = `So far, we have ${totalValidResponses} valid ascending response(s).`;
                }
                
                educationalNote = `\n\n-----\nINSTRUCTOR GUIDANCE:\nIn the Hughson-Westlake procedure, we ascend in 5 dB steps until the patient responds. Only responses during the ascending phase count toward threshold determination, and importantly, responses during the initial descending phase are NOT counted. ${validResponses} We need at least 2 responses at the same level during different ascending phases to establish threshold. Remember: after each response, immediately decrease by 10 dB to begin a new bracketing sequence.
                
ASHA guidelines recommend including frequencies at 3000 Hz and 6000 Hz in routine testing to provide a more complete profile of the individual's hearing status for diagnostic purposes. Extended high-frequency audiology (9000-20000 Hz) may be useful for early detection of hearing loss from noise or ototoxic chemicals.`;
            }
        } else if (state.phase === TEST_PHASES.COMPLETE && !currentText.includes(`threshold (${state.potentialThreshold} dB HL) was established`)) {
            // Get statistics about the threshold determination
            const validAscendingResponsesAtThreshold = state.validAscendingResponses[state.potentialThreshold] || 0;
            
            educationalNote = `\n\n-----\nINSTRUCTOR GUIDANCE:\nAccording to the Hughson-Westlake procedure, the threshold (${state.potentialThreshold} dB HL) was established because the patient responded at this level ${validAscendingResponsesAtThreshold} times during different ascending phases. The procedure requires that responses must occur during the ascending phase (not descending) to be counted toward threshold determination, and responses during the initial descending phase do not count at all. The mandatory 10 dB reduction after each positive response is critical to prevent auditory adaptation that could skew results.

ASHA categorizes hearing thresholds as follows:
- Normal: -10 to 15 dB HL
- Slight: 16 to 25 dB HL
- Mild: 26 to 40 dB HL
- Moderate: 41 to 55 dB HL
- Moderately severe: 56 to 70 dB HL
- Severe: 71 to 90 dB HL
- Profound: 91+ dB HL`;
        }
        
        try {
            // Add ear testing protocol information - safely with error handling
            if (!currentEar) {
                console.error("currentEar is undefined in provideHughsonWestlakeEducationalFeedback");
            } else {
                const earProgress = getEarTestingProgress(currentEar);
                const otherEar = currentEar === 'left' ? 'right' : 'left';
                const otherEarProgress = getEarTestingProgress(otherEar);
                
                // Only add protocol guidance if we have some thresholds already or are near completion
                // and only if we haven't already added clinical protocol info (avoid duplication)
                if (earProgress.completedFrequencies && 
                    (earProgress.completedFrequencies.length > 0 || state.phase === TEST_PHASES.COMPLETE) && 
                    !currentText.includes("CLINICAL PROTOCOL:")) {
                    
                    // Add protocol guidance with clear separation
                    if (educationalNote) {
                        educationalNote += `\n\n-----\nCLINICAL PROTOCOL:\nIn audiometry, test frequencies in this order: 1000, 1500, 2000, 3000, 4000, 6000, 8000, 500, 250 Hz. Complete all frequencies in one ear before switching to the other ear.
                        
ASHA suggests that when differences of 20 dB or more occur between the threshold values at adjacent octave frequencies, additional frequencies may be tested. For challenging testing situations, ASHA recommends modifications such as using pulsed signals for patients with tinnitus, starting with low-frequency pure tones for severe hearing loss, and considering different approaches for patients with claustrophobia, collapsed ear canals, or physical limitations.`;
                    } else {
                        educationalNote = `\n\n-----\nCLINICAL PROTOCOL:\nIn audiometry, test frequencies in this order: 1000, 1500, 2000, 3000, 4000, 6000, 8000, 500, 250 Hz. Complete all frequencies in one ear before switching to the other ear.
                        
ASHA suggests that when differences of 20 dB or more occur between the threshold values at adjacent octave frequencies, additional frequencies may be tested. For challenging testing situations, ASHA recommends modifications such as using pulsed signals for patients with tinnitus, starting with low-frequency pure tones for severe hearing loss, and considering different approaches for patients with claustrophobia, collapsed ear canals, or physical limitations.`;
                    }
                    
                    // Add specific guidance based on progress
                    if (earProgress.completedFrequencies.length >= 5 && earProgress.completedFrequencies.length < 9) {
                        const remainingFreqs = 9 - earProgress.completedFrequencies.length;
                        educationalNote += `\nYou have ${remainingFreqs} more frequency/frequencies to test in the ${currentEar} ear before switching to the ${otherEar} ear.`;
                    } else if (earProgress.completedFrequencies.length >= 9 && 
                        otherEarProgress.completedFrequencies && 
                        otherEarProgress.completedFrequencies.length < 9) {
                        educationalNote += `\nYou have completed all frequencies in the ${currentEar} ear. Remember to switch to the ${otherEar} ear to complete the audiogram.`;
                    }
                }
            }
        } catch (error) {
            console.error("Error in ear testing progress feedback:", error);
            // Only add basic guidance if not already present
            if (!currentText.includes("CLINICAL PROTOCOL:")) {
                if (educationalNote) {
                    educationalNote += `\n\n-----\nCLINICAL PROTOCOL:\nIn audiometry, test frequencies in this order: 1000, 1500, 2000, 3000, 4000, 6000, 8000, 500, 250 Hz. Complete all frequencies in one ear before switching to the other ear.
                    
ASHA suggests that when differences of 20 dB or more occur between the threshold values at adjacent octave frequencies, additional frequencies may be tested. For challenging testing situations, ASHA recommends modifications such as using pulsed signals for patients with tinnitus, starting with low-frequency pure tones for severe hearing loss, and considering different approaches for patients with claustrophobia, collapsed ear canals, or physical limitations.`;
                } else {
                    educationalNote = `\n\n-----\nCLINICAL PROTOCOL:\nIn audiometry, test frequencies in this order: 1000, 1500, 2000, 3000, 4000, 6000, 8000, 500, 250 Hz. Complete all frequencies in one ear before switching to the other ear.
                    
ASHA suggests that when differences of 20 dB or more occur between the threshold values at adjacent octave frequencies, additional frequencies may be tested. For challenging testing situations, ASHA recommends modifications such as using pulsed signals for patients with tinnitus, starting with low-frequency pure tones for severe hearing loss, and considering different approaches for patients with claustrophobia, collapsed ear canals, or physical limitations.`;
                }
            }
        }
        
        // Only add educational note if it's not empty and not already in the feedback
        if (educationalNote && !currentText.includes(educationalNote.trim())) {
            feedbackElement.textContent = `${currentText}${educationalNote}`;
        }
    }
}

// Get next frequency according to protocol
function getNextFrequency(currentFrequency) {
    const frequencies = [1000, 1500, 2000, 3000, 4000, 6000, 8000, 500, 250];
    const currentIndex = frequencies.indexOf(currentFrequency);
    
    if (currentIndex === -1 || currentIndex === frequencies.length - 1) {
        // If current frequency not in list or last in protocol, suggest switching ears
        return null;
    }
    
    return frequencies[currentIndex + 1];
}

// Mark the current intensity as a threshold for the current frequency and ear
function markThreshold() {
    const frequency = parseInt(frequencySelect.value);
    const intensity = parseInt(intensitySlider.value);
    const state = testState[currentEar][frequency];
    
    // Check if we can mark a threshold
    if (!state || state.phase !== TEST_PHASES.COMPLETE) {
        updateFeedback(`Cannot mark threshold yet. Please complete proper Hughson-Westlake procedure for ${frequency} Hz.`);
        return;
    }
    
    // Mark the threshold
    audiogramData[currentEar][frequency] = intensity;
    
    // Update feedback
    updateFeedback(`Threshold for ${frequency} Hz in ${currentEar} ear marked at ${intensity} dB.`);
    
    // Provide feedback on ear testing progress
    const earProgress = getEarTestingProgress(currentEar);
    const nextFreq = getNextFrequencyToTest(currentEar);
    
    // Check if this ear is complete
    if (earProgress.completedFrequencies.length === 9) {
        const otherEar = currentEar === 'left' ? 'right' : 'left';
        const otherEarProgress = getEarTestingProgress(otherEar);
        
        if (otherEarProgress.completedFrequencies.length === 9) {
            // Both ears are complete!
            updateFeedback(`Testing complete for both ears! Excellent work!`);
            // Show true audiogram
            showTrueAudiogram();
        } else {
            // This ear is complete, but other ear is not
            const nextFreqOtherEar = getNextFrequencyToTest(otherEar);
            updateFeedback(`All frequencies tested in ${currentEar} ear. Switch to ${otherEar} ear and test at ${nextFreqOtherEar} Hz.`);
            
            // Auto-select the other ear for convenience
            if (otherEar === 'left') {
                leftEarButton.click();
            } else {
                rightEarButton.click();
            }
        }
    } else {
        // This ear is not complete yet
        updateFeedback(`Threshold marked for ${frequency} Hz. Next, test at ${nextFreq} Hz in the ${currentEar} ear.`);
        
        // Suggest next frequency
        frequencySelect.value = nextFreq.toString();
        const suggestedIntensity = getInitialIntensityForFrequency(nextFreq);
        intensitySlider.value = suggestedIntensity;
        intensityValue.textContent = `${suggestedIntensity} dB HL`;
        
        // Initialize test state for this frequency if not already done
        if (!testState[currentEar][nextFreq]) {
            initializeTestState(nextFreq);
        }
    }
    
    // Redraw audiogram with updated data
    drawAudiogramGrid();
    plotAudiogramData();
    drawReticle();
}

// Generate a summary of test results for an ear
function summarizeEarResults(ear) {
    const thresholds = audiogramData[ear];
    if (Object.keys(thresholds).length === 0) {
        return "No thresholds marked";
    }
    
    // Format the thresholds as frequency: threshold pairs
    return Object.keys(thresholds)
        .map(Number)
        .sort((a, b) => a - b)
        .map(freq => `${freq} Hz: ${thresholds[freq]} dB HL`)
        .join(", ");
}

// Provide feedback about the current ear testing progress
function provideEarTestingProgressFeedback(ear) {
    const progress = getEarTestingProgress(ear);
    const completedCount = progress.completedFrequencies.length;
    const totalFrequencies = 9; // Updated: Total frequencies to test
    const remainingCount = totalFrequencies - completedCount;
    
    let progressMessage = "";
    
    if (completedCount > 0) {
        // List the completed frequencies
        const completedList = progress.completedFrequencies
            .map(freq => `${freq} Hz`)
            .join(", ");
        
        progressMessage = `\n\nProgress: You have completed ${completedCount}/${totalFrequencies} frequencies in the ${ear} ear (${completedList}).`;
        
        if (remainingCount > 0) {
            // List the remaining frequencies according to protocol order
            const protocolOrder = [1000, 1500, 2000, 3000, 4000, 6000, 8000, 500, 250];
            const remainingFreqs = protocolOrder
                .filter(freq => !progress.completedFrequencies.includes(freq))
                .map(freq => `${freq} Hz`)
                .join(", ");
            
            progressMessage += ` Remaining frequencies: ${remainingFreqs}.`;
        }
    }
    
    // Add to existing feedback
    if (progressMessage) {
        updateFeedback(`${feedbackMessage.textContent}${progressMessage}`);
    }
}

// Clear the audiogram data
function clearAudiogram() {
    audiogramData = {
        left: {},
        right: {}
    };
    
    testState = {
        left: {},
        right: {}
    };
    
    responseHistory = {
        left: {},
        right: {}
    };
    
    drawAudiogramGrid();
    
    // Reset to starting conditions
    frequencySelect.value = '1000';
    intensitySlider.value = 30;
    intensityValue.textContent = '30 dB HL';
    
    updateFeedback('Audiogram cleared. Start a new test with 1000 Hz at 30 dB HL in the left ear.');
    
    // Reset ear selection to left
    currentEar = 'left';
    leftEarButton.classList.add('active');
    rightEarButton.classList.remove('active');
}

// Draw the audiogram grid
function drawAudiogramGrid() {
    // Clear canvas
    ctx.clearRect(0, 0, audiogramCanvas.width, audiogramCanvas.height);
    
    // Set up dimensions
    const width = audiogramCanvas.width;
    const height = audiogramCanvas.height;
    const padding = 40;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(padding, padding, graphWidth, graphHeight);
    
    // Draw grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // Horizontal lines (intensity levels)
    const dbStep = 10;
    const dbStart = -10;
    const dbEnd = 120;
    const dbRange = dbEnd - dbStart;
    
    for (let db = dbStart; db <= dbEnd; db += dbStep) {
        const y = padding + (graphHeight * (db - dbStart)) / dbRange;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + graphWidth, y);
        ctx.stroke();
        
        // Label dB values
        ctx.fillStyle = '#555';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${db}`, padding - 5, y + 3);
    }
    
    // Vertical lines (frequencies)
    const frequencies = [250, 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
    for (let i = 0; i < frequencies.length; i++) {
        const freq = frequencies[i];
        const x = padding + (i * graphWidth) / (frequencies.length - 1);
        
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + graphHeight);
        ctx.stroke();
        
        // Label frequencies
        ctx.fillStyle = '#555';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(freq.toString(), x, padding + graphHeight + 15);
    }
    
    // Add axes labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // X-axis label (Frequency)
    ctx.fillText('Frequency (Hz)', width / 2, height - 5);
    
    // Y-axis label (Intensity)
    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Intensity (dB HL)', 0, 0);
    ctx.restore();
    
    // Title
    ctx.font = '14px Arial';
    ctx.fillText('Audiogram', width / 2, 20);
    
    // Plot data after drawing grid
    plotAudiogramData();
}

// Plot the audiogram data
function plotAudiogramData() {
    const width = audiogramCanvas.width;
    const height = audiogramCanvas.height;
    const padding = 40;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    const dbStart = -10;
    const dbEnd = 120;
    const dbRange = dbEnd - dbStart;
    
    const frequencies = [250, 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
    
    // Plot left ear data (blue circles)
    ctx.fillStyle = 'blue';
    for (const freq in audiogramData.left) {
        const freqIndex = frequencies.indexOf(parseInt(freq));
        if (freqIndex >= 0) {
            const x = padding + (freqIndex * graphWidth) / (frequencies.length - 1);
            const y = padding + (graphHeight * (audiogramData.left[freq] - dbStart)) / dbRange;
            
            // Draw circle for left ear (O)
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // Plot right ear data (red X)
    ctx.fillStyle = 'red';
    for (const freq in audiogramData.right) {
        const freqIndex = frequencies.indexOf(parseInt(freq));
        if (freqIndex >= 0) {
            const x = padding + (freqIndex * graphWidth) / (frequencies.length - 1);
            const y = padding + (graphHeight * (audiogramData.right[freq] - dbStart)) / dbRange;
            
            // Draw X for right ear
            const size = 5;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(x - size, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.moveTo(x + size, y - size);
            ctx.lineTo(x - size, y + size);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x + size, y - size);
            ctx.lineTo(x - size, y + size);
            ctx.stroke();
        }
    }
}

// Update feedback message
function updateFeedback(message) {
    // Clear any previous education notes before setting new feedback
    // This prevents accumulation of duplicated notes
    feedbackMessage.textContent = message;
    
    // Adjust the style to make feedback more readable
    feedbackMessage.style.whiteSpace = "pre-wrap"; // Preserve line breaks
    
    // Log for debugging
    console.log("Feedback updated: " + message.substring(0, 50) + (message.length > 50 ? "..." : ""));
}

// Get progress of testing for a specific ear
function getEarTestingProgress(ear) {
    const progress = {
        testedFrequencies: [], // All frequencies that have been tested (at least started)
        completedFrequencies: [], // Frequencies with marked thresholds
        incompleteFrequencies: [] // Frequencies that have been started but not completed
    };
    
    // Check if testState and testState[ear] exist
    if (!testState) {
        console.error(`testState is undefined in getEarTestingProgress for ${ear} ear`);
        return progress;
    }
    
    if (!testState[ear]) {
        console.error(`testState[${ear}] is undefined in getEarTestingProgress`);
        return progress;
    }
    
    // Get all frequencies that have been tested at all
    progress.testedFrequencies = Object.keys(testState[ear]).map(Number);
    
    // Check if audiogramData and audiogramData[ear] exist
    if (!audiogramData) {
        console.error(`audiogramData is undefined in getEarTestingProgress for ${ear} ear`);
        return progress;
    }
    
    if (!audiogramData[ear]) {
        console.error(`audiogramData[${ear}] is undefined in getEarTestingProgress`);
        return progress;
    }
    
    // Get frequencies with marked thresholds
    progress.completedFrequencies = Object.keys(audiogramData[ear]).map(Number);
    
    // Get frequencies that have been started but not completed
    progress.incompleteFrequencies = progress.testedFrequencies.filter(freq => {
        if (!testState[ear][freq]) {
            console.error(`testState[${ear}][${freq}] is undefined in getEarTestingProgress`);
            return false;
        }
        return !progress.completedFrequencies.includes(freq) && 
               testState[ear][freq].responseCount > 0; // Only include if there's been at least one response
    });
    
    // Sort frequencies according to protocol order
    const protocolOrder = [1000, 1500, 2000, 3000, 4000, 6000, 8000, 500, 250];
    
    progress.testedFrequencies.sort((a, b) => protocolOrder.indexOf(a) - protocolOrder.indexOf(b));
    progress.completedFrequencies.sort((a, b) => protocolOrder.indexOf(a) - protocolOrder.indexOf(b));
    progress.incompleteFrequencies.sort((a, b) => protocolOrder.indexOf(a) - protocolOrder.indexOf(b));
    
    return progress;
}

// Get the next frequency to test according to protocol
function getNextFrequencyToTest(ear) {
    const progress = getEarTestingProgress(ear);
    const protocolOrder = [1000, 1500, 2000, 3000, 4000, 6000, 8000, 500, 250];
    
    // If there are incomplete frequencies, suggest the first one
    if (progress.incompleteFrequencies.length > 0) {
        return progress.incompleteFrequencies[0];
    }
    
    // If no frequencies have been tested, start with 1000 Hz
    if (progress.completedFrequencies.length === 0) {
        return 1000;
    }
    
    // Find the next frequency in the protocol that hasn't been completed
    for (const freq of protocolOrder) {
        if (!progress.completedFrequencies.includes(freq)) {
            return freq;
        }
    }
    
    // If all frequencies have been tested, return 1000 Hz as default
    return 1000;
}

// Load patients and populate the patient dropdown
function loadPatients() {
    const patientSelect = document.getElementById('patient-select');
    patientSelect.innerHTML = '';
    
    patientProfiles.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.id;
        option.textContent = `${patient.name} (${patient.age}, ${patient.patternDescription})`;
        patientSelect.appendChild(option);
    });
}

// Select a patient and update the UI
function selectPatient(patientId) {
    currentPatientId = parseInt(patientId);
    const patient = patientProfiles.find(p => p.id === currentPatientId);
    
    if (patient) {
        // Update patient info display
        document.getElementById('patient-name').textContent = patient.name;
        document.getElementById('patient-age').textContent = patient.age;
        document.getElementById('patient-occupation').textContent = patient.occupation;
        document.getElementById('patient-notes').textContent = patient.notes;
        
        // Set the patient's hearing thresholds
        patientHearingThresholds = patient.hearingThresholds;
        
        // Reset the test state
        resetTest();
        
        // Provide educational note about the patient
        let patientInfo = `Selected new patient: ${patient.name} (${patient.age}, ${patient.gender}). `;
        
        // Add information about the patient's hearing pattern
        patientInfo += `${patient.patternDescription}. `;
        
        // Add guidance for the clinician
        patientInfo += `Remember to start testing at 1000 Hz in the left ear, then follow the standard frequency order: 1000, 2000, 3000, 4000, 6000, 8000, then 1500, 500, and 250 Hz. `;
        patientInfo += `Complete all frequencies in one ear before switching to the other ear.`;
        
        // If the patient has specific complaints, highlight them
        if (patient.notes && patient.notes.toLowerCase().includes('complaint')) {
            patientInfo += ` Note the patient's specific complaints which may correlate with the audiogram results.`;
        }
        
        // Add ASHA-specific guidance based on patient condition
        patientInfo += `\n\n-----\nASHA CLINICAL RECOMMENDATIONS:`;
        
        if (patient.patternDescription.includes("noise-induced")) {
            patientInfo += `\nAccording to ASHA, when testing patients with suspected noise-induced hearing loss, include frequencies at 3000 Hz and 6000 Hz in routine testing to provide a more complete profile of the individual's hearing status. This is especially important as noise exposure typically affects the 3000-6000 Hz range first, creating a characteristic "notch" in the audiogram. 
            
ASHA notes that "in young and middle-aged adults, excessive noise exposure is the most common, preventable cause of hearing loss." Pay particular attention to the patient's occupation and recreational activities that may involve noise exposure.`;
        } 
        else if (patient.patternDescription.includes("presbycusis") || (patient.age >= 65 && patient.patternDescription.includes("hearing loss"))) {
            patientInfo += `\nASHA guidelines note that age-related hearing loss (presbycusis) becomes one of the most common sensory deficits as adults. It is the third most common chronic health condition in older adults. 

When testing older adults, ASHA recommends being aware that they may have difficulty with the testing process. Consider using pulsed tones to increase awareness of the stimuli as recommended by ASHA, as this can be particularly helpful for older patients who may have decreased attention or auditory processing issues alongside their hearing loss.`;
        }
        else if (patient.patternDescription.includes("conductive")) {
            patientInfo += `\nFor patients with suspected conductive hearing loss, ASHA recommends both air-conduction and bone-conduction testing. Bone-conduction audiometry utilizes vibrations of the skull as testing stimuli to bypass potential problems in the outer and middle ear.

According to ASHA standards, bone-conduction thresholds should be assessed at 250 Hz, 500 Hz, 1000 Hz, 2000 Hz, 3000 Hz, and 4000 Hz to identify air-bone gaps characteristic of conductive hearing loss. Special attention to low and mid-frequencies (250-2000 Hz) is often helpful for conductive hearing loss assessment.`;
        }
        else if (patient.age < 18) {
            patientInfo += `\nASHA notes that for pediatric patients, developmental age may require modifications to standard testing procedures. Visual reinforcement, conditioned play, or computerized audiometry may be used as appropriate.

For children with suspected hearing loss, ASHA suggests that appropriate modifications be made while maintaining reliable testing standards. The frequency presentation order must remain consistent to ensure accurate results.`;
        }
        else {
            patientInfo += `\nASHA recommends a standard pure-tone audiometry protocol for this patient. If the hearing sensitivity in one ear is known to be better, ASHA suggests testing that ear first. Extended high-frequency audiometry (9000-20000 Hz) may be considered if there are specific concerns such as exposure to noise or ototoxic chemicals.

According to ASHA, modifications for potential issues encountered during testing may include using pulsed signals for patients with tinnitus, addressing claustrophobia by seating the individual facing the window, or using insert earphones to address collapsed ear canals.`;
        }
        
        // Update the instructor feedback message
        updateFeedback(patientInfo);
    }
}

// Reset the test state and clear the audiogram
function resetTest() {
    // Reset all test data
    testState = {
        left: {},
        right: {}
    };
    
    audiogramData = {
        left: {},
        right: {}
    };
    
    responseHistory = {
        left: {},
        right: {}
    };
    
    // Clear the audiogram
    drawAudiogramGrid();
    
    // Reset the UI
    frequencySelect.value = '1000';
    intensitySlider.value = '30';
    intensityValue.textContent = '30 dB HL';
    
    // Instead of directly calling provideHughsonWestlakeEducationalFeedback
    // Just update the feedback with initial instructions and avoid duplication
    updateFeedback("Test reset. Start by testing at 1000 Hz at 30 dB HL in the left ear. Follow the protocol shown in the sidebar.");
    
    // Set the ear to the left ear to start
    if (leftEarButton) {
        leftEarButton.click();
    }
}

// Check if audiogram is complete (all frequencies tested in both ears)
function isAudiogramComplete() {
    // Check if all frequencies have been tested
    const requiredFrequencies = [1000, 1500, 2000, 3000, 4000, 6000, 8000, 500, 250];
    
    // Check left ear
    const leftComplete = requiredFrequencies.every(freq => audiogramData.left[freq] !== undefined);
    
    // Check right ear
    const rightComplete = requiredFrequencies.every(freq => audiogramData.right[freq] !== undefined);
    
    return leftComplete && rightComplete;
}

// Show the true audiogram alongside student's results
function showTrueAudiogram() {
    const currentPatient = patientProfiles.find(p => p.id === currentPatientId);
    
    // Update feedback with completion message
    updateFeedback(`Audiogram complete! Displaying the true hearing thresholds for ${currentPatient.name} alongside your results.`);
    
    // Redraw audiogram with true values
    drawAudiogramGrid();
    plotAudiogramData();
    plotTrueAudiogramData();
    
    // Show completion message with educational feedback
    const educationalNote = document.getElementById('educational-note');
    let completionNote = `Testing complete for ${currentPatient.name}. `;
    completionNote += `True diagnosis: ${currentPatient.patternDescription}. `;
    
    // Compare student results to true thresholds
    const accuracy = calculateTestingAccuracy();
    completionNote += `Your test results are ${accuracy}% accurate compared to the patient's true thresholds. `;
    
    // Add specific observations about the patient's hearing
    if (currentPatient.patternDescription.includes("noise-induced")) {
        completionNote += "Note the characteristic 'notch' at 3000-6000 Hz typical of noise exposure damage. The 3000 Hz and 6000 Hz thresholds are especially important in identifying early noise-induced damage.";
        
        // Add ASHA-specific information for noise-induced hearing loss
        completionNote += "\n\nASHA CLINICAL GUIDANCE: According to ASHA, noise-induced hearing loss is the most common occupational disease in the world. In young and middle-aged adults like this patient, excessive noise exposure is the most common preventable cause of hearing loss. ASHA recommends that follow-up should include counseling on hearing protection and prevention of further damage, as well as possible referral for a hearing aid evaluation depending on the degree of loss. The patient's occupation as a construction worker is a significant risk factor that should be addressed in your management plan.";
    } else if (currentPatient.patternDescription.includes("presbycusis")) {
        completionNote += "Note the sloping high-frequency loss typical of age-related hearing loss. Observe how the loss progressively worsens from 1500 Hz through 8000 Hz.";
        
        // Add ASHA-specific information for presbycusis
        completionNote += "\n\nASHA CLINICAL GUIDANCE: ASHA classifies this patient's hearing loss as follows based on thresholds:\n";
        
        // Find the average threshold for frequencies 500, 1000, 2000, and 4000 Hz for each ear
        const leftEarThresholds = [
            currentPatient.hearingThresholds.left[500] || 0,
            currentPatient.hearingThresholds.left[1000] || 0,
            currentPatient.hearingThresholds.left[2000] || 0,
            currentPatient.hearingThresholds.left[4000] || 0
        ];
        const rightEarThresholds = [
            currentPatient.hearingThresholds.right[500] || 0,
            currentPatient.hearingThresholds.right[1000] || 0,
            currentPatient.hearingThresholds.right[2000] || 0,
            currentPatient.hearingThresholds.right[4000] || 0
        ];
        
        const leftAvg = Math.round(leftEarThresholds.reduce((sum, val) => sum + val, 0) / leftEarThresholds.length);
        const rightAvg = Math.round(rightEarThresholds.reduce((sum, val) => sum + val, 0) / rightEarThresholds.length);
        
        // Add ASHA classification
        let leftDegree = "Normal";
        if (leftAvg > 90) leftDegree = "Profound";
        else if (leftAvg > 70) leftDegree = "Severe";
        else if (leftAvg > 55) leftDegree = "Moderately severe";
        else if (leftAvg > 40) leftDegree = "Moderate";
        else if (leftAvg > 25) leftDegree = "Mild";
        else if (leftAvg > 15) leftDegree = "Slight";
        
        let rightDegree = "Normal";
        if (rightAvg > 90) rightDegree = "Profound";
        else if (rightAvg > 70) rightDegree = "Severe";
        else if (rightAvg > 55) rightDegree = "Moderately severe";
        else if (rightAvg > 40) rightDegree = "Moderate";
        else if (rightAvg > 25) rightDegree = "Mild";
        else if (rightAvg > 15) rightDegree = "Slight";
        
        completionNote += `- Left ear: ${leftDegree} hearing loss (${leftAvg} dB HL average)\n`;
        completionNote += `- Right ear: ${rightDegree} hearing loss (${rightAvg} dB HL average)\n\n`;
        completionNote += "ASHA notes that age-related hearing loss (presbycusis) is one of the most common sensory deficits in older adults and the third most common chronic health condition in this population. ASHA recommends audiologic rehabilitation strategies that may include amplification, assistive listening devices, and communication strategies training.";
        
    } else if (currentPatient.patternDescription.includes("conductive")) {
        completionNote += "Note the air-bone gap that would be present in conductive hearing loss (not shown in this simplified simulation). The 250, 500, and 1000 Hz thresholds are especially important for conductive hearing loss patterns.";
        
        // Add ASHA-specific information for conductive hearing loss
        completionNote += "\n\nASHA CLINICAL GUIDANCE: According to ASHA, conductive hearing loss is due to a problem conducting sound waves through the outer ear canal, tympanic membrane, or middle ear (ossicles). For this patient with suspected Eustachian tube dysfunction, ASHA would recommend complete audiologic evaluation including both air-conduction and bone-conduction measures to confirm the air-bone gap characteristic of conductive hearing loss.";
        
        completionNote += "\n\nASHA standards indicate that bone-conduction thresholds should be assessed at 250 Hz, 500 Hz, 1000 Hz, 2000 Hz, 3000 Hz, and 4000 Hz. Since this patient's notes mention a recent cold, this aligns with possible temporary conductive loss that may resolve. ASHA would recommend appropriate medical referral to an otolaryngologist for further evaluation and possible treatment of the middle ear condition.";
    } else if (currentPatient.age < 18) {
        // Add ASHA-specific information for pediatric patients
        completionNote += "\n\nASHA CLINICAL GUIDANCE: For pediatric patients, ASHA emphasizes the importance of early identification and intervention for hearing loss. According to ASHA, approximately half of all prelingual hearing loss cases are due to genetic causes, including genetic syndromes and nonsyndromic genetic inheritance, while the other half are due to preventable causes.";
        
        completionNote += "\n\nASHA recommends that pediatric testing should be developmentally appropriate, possibly using visual reinforcement, conditioned play, or computerized audiometry as modifications. Follow-up should include appropriate referrals for early intervention services and possible amplification based on the degree of hearing loss.";
    } else {
        // Add general ASHA guidance for other hearing loss patterns
        completionNote += "\n\nASHA CLINICAL GUIDANCE: According to ASHA, hearing loss can be described by variation in type, degree, and configuration. This patient's audiogram shows the following classification based on ASHA standards:\n";
        
        // Find the average threshold for frequencies 500, 1000, 2000, and 4000 Hz for each ear
        const leftEarThresholds = [
            currentPatient.hearingThresholds.left[500] || 0,
            currentPatient.hearingThresholds.left[1000] || 0,
            currentPatient.hearingThresholds.left[2000] || 0,
            currentPatient.hearingThresholds.left[4000] || 0
        ];
        const rightEarThresholds = [
            currentPatient.hearingThresholds.right[500] || 0,
            currentPatient.hearingThresholds.right[1000] || 0,
            currentPatient.hearingThresholds.right[2000] || 0,
            currentPatient.hearingThresholds.right[4000] || 0
        ];
        
        const leftAvg = Math.round(leftEarThresholds.reduce((sum, val) => sum + val, 0) / leftEarThresholds.length);
        const rightAvg = Math.round(rightEarThresholds.reduce((sum, val) => sum + val, 0) / rightEarThresholds.length);
        
        // Add ASHA classification
        let leftDegree = "Normal";
        if (leftAvg > 90) leftDegree = "Profound";
        else if (leftAvg > 70) leftDegree = "Severe";
        else if (leftAvg > 55) leftDegree = "Moderately severe";
        else if (leftAvg > 40) leftDegree = "Moderate";
        else if (leftAvg > 25) leftDegree = "Mild";
        else if (leftAvg > 15) leftDegree = "Slight";
        
        let rightDegree = "Normal";
        if (rightAvg > 90) rightDegree = "Profound";
        else if (rightAvg > 70) rightDegree = "Severe";
        else if (rightAvg > 55) rightDegree = "Moderately severe";
        else if (rightAvg > 40) rightDegree = "Moderate";
        else if (rightAvg > 25) rightDegree = "Mild";
        else if (rightAvg > 15) rightDegree = "Slight";
        
        completionNote += `- Left ear: ${leftDegree} hearing loss (${leftAvg} dB HL average)\n`;
        completionNote += `- Right ear: ${rightDegree} hearing loss (${rightAvg} dB HL average)\n\n`;
        
        completionNote += "ASHA emphasizes a person-centered approach to hearing healthcare. The assessment, treatment, and management of hearing loss and related disorders should be an interprofessional process involving audiologists, speech-language pathologists, otolaryngologists, and other specialists as needed.";
    }
    
    educationalNote.textContent = completionNote;
}

// Calculate testing accuracy percentage
function calculateTestingAccuracy() {
    let totalDifference = 0;
    let totalThresholds = 0;
    
    // Compare each threshold found by the student with the true threshold
    for (const ear of ['left', 'right']) {
        for (const frequency in audiogramData[ear]) {
            const studentThreshold = audiogramData[ear][frequency];
            const trueThreshold = patientHearingThresholds[ear][frequency];
            
            if (studentThreshold !== undefined && trueThreshold !== undefined) {
                totalDifference += Math.abs(studentThreshold - trueThreshold);
                totalThresholds++;
            }
        }
    }
    
    if (totalThresholds === 0) return 0;
    
    // Calculate average difference in dB
    const avgDifference = totalDifference / totalThresholds;
    
    // Convert to percentage accuracy (100% would be 0dB difference, 0% would be 100dB difference)
    const maxDifference = 100; // Maximum expected difference in dB
    const accuracy = 100 - Math.min(100, (avgDifference / maxDifference) * 100);
    
    return Math.round(accuracy);
}

// Plot the true audiogram data in a different color
function plotTrueAudiogramData() {
    const frequencies = [250, 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
    
    const width = audiogramCanvas.width;
    const height = audiogramCanvas.height;
    const padding = 40;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    const dbStart = -10;
    const dbEnd = 120;
    const dbRange = dbEnd - dbStart;
    
    // Plot left ear true thresholds (blue)
    ctx.strokeStyle = 'rgba(30, 144, 255, 0.5)'; // Light blue
    ctx.fillStyle = 'rgba(30, 144, 255, 0.5)';
    
    frequencies.forEach(frequency => {
        const threshold = patientHearingThresholds.left[frequency];
        if (threshold !== undefined) {
            const freqIndex = frequencies.indexOf(frequency);
            const x = padding + (freqIndex * graphWidth) / (frequencies.length - 1);
            const y = padding + (graphHeight * (threshold - dbStart)) / dbRange;
            
            // Draw O symbol (left ear)
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Connect points with lines
            if (frequencies.indexOf(frequency) > 0) {
                const prevFreq = frequencies[frequencies.indexOf(frequency) - 1];
                const prevThreshold = patientHearingThresholds.left[prevFreq];
                if (prevThreshold !== undefined) {
                    const prevFreqIndex = frequencies.indexOf(prevFreq);
                    const prevX = padding + (prevFreqIndex * graphWidth) / (frequencies.length - 1);
                    const prevY = padding + (graphHeight * (prevThreshold - dbStart)) / dbRange;
                    
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            }
        }
    });
    
    // Plot right ear true thresholds (red)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Light red
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    
    frequencies.forEach(frequency => {
        const threshold = patientHearingThresholds.right[frequency];
        if (threshold !== undefined) {
            const freqIndex = frequencies.indexOf(frequency);
            const x = padding + (freqIndex * graphWidth) / (frequencies.length - 1);
            const y = padding + (graphHeight * (threshold - dbStart)) / dbRange;
            
            // Draw X symbol (right ear)
            const size = 8;
            ctx.beginPath();
            ctx.moveTo(x - size, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.moveTo(x + size, y - size);
            ctx.lineTo(x - size, y + size);
            ctx.stroke();
            
            // Connect points with lines
            if (frequencies.indexOf(frequency) > 0) {
                const prevFreq = frequencies[frequencies.indexOf(frequency) - 1];
                const prevThreshold = patientHearingThresholds.right[prevFreq];
                if (prevThreshold !== undefined) {
                    const prevFreqIndex = frequencies.indexOf(prevFreq);
                    const prevX = padding + (prevFreqIndex * graphWidth) / (frequencies.length - 1);
                    const prevY = padding + (graphHeight * (prevThreshold - dbStart)) / dbRange;
                    
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            }
        }
    });
}

// Check if audio context is properly initialized and not suspended
function checkAudioContextState() {
    if (!audioContext) {
        console.log("Creating new audio context...");
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Check if the context is in suspended state (common in browsers that require user interaction)
    if (audioContext.state === 'suspended') {
        // Show a message to the user
        updateFeedback("Audio is currently blocked by your browser. Click anywhere on the page to enable audio playback.");
        
        // Add a one-time click handler to resume the audio context
        const resumeAudio = function() {
            console.log("User interaction detected, resuming audio context...");
            audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully");
                updateFeedback("Audio enabled! You can now use the Play Tone button.");
            });
            
            // Remove event listeners after first successful click
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
        };
        
        document.addEventListener('click', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);
        
        return false;
    }
    
    return true;
}

// Start the application when the page loads
window.addEventListener('load', init);