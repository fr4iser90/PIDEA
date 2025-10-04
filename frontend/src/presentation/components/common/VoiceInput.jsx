import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import '@/css/common/voice-input.css';

const VoiceInput = ({ 
  onTextReceived, 
  disabled = false, 
  size = 'md',
  placeholder = 'Voice input...',
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  // Check browser support and permissions
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        
        if (!hasSpeechRecognition) {
          throw new Error('SpeechRecognition not available');
        }

        // Test if it's actually a constructor
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        if (typeof SpeechRecognition !== 'function') {
          throw new Error('SpeechRecognition is not a constructor');
        }
        
        // Check microphone permissions
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Clean up
        } catch (permError) {
          console.warn('Microphone permission not granted:', permError);
          // Don't throw - user can grant permission later
        }
        
        setIsSupported(true);
        setError(null);
      } catch (err) {
        console.warn('Speech recognition not supported:', err.message);
        setIsSupported(false);
        setError(null);
        // Don't show error to user - just disable the feature gracefully
      }
    };

    checkSupport();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const initRecognition = () => {
      try {
        // Better browser detection for Firefox
        let SpeechRecognition;
        
        if (window.webkitSpeechRecognition) {
          SpeechRecognition = window.webkitSpeechRecognition;
        } else if (window.SpeechRecognition) {
          SpeechRecognition = window.SpeechRecognition;
        } else if (window.mozSpeechRecognition) {
          SpeechRecognition = window.mozSpeechRecognition;
        } else {
          throw new Error('SpeechRecognition not supported in this browser');
        }
        
        recognitionRef.current = new SpeechRecognition();
        
        const recognition = recognitionRef.current;
        
        // Configure recognition settings
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'de-DE'; // German language
        recognition.maxAlternatives = 1;

        // Event handlers
        recognition.onstart = () => {
          setIsRecording(true);
          setStatus('Listening...');
          setError(null);
          setRetryCount(0);
          
          // Auto-stop after 30 seconds
          timeoutRef.current = setTimeout(() => {
            if (isRecording) {
              recognition.stop();
            }
          }, 30000);
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setStatus('Processing...');
          setIsProcessing(true);
          
          // Simulate processing delay for better UX
          setTimeout(() => {
            onTextReceived(transcript);
            setIsProcessing(false);
            setStatus('Text received!');
            
            // Clear status after 2 seconds
            setTimeout(() => {
              setStatus('');
            }, 2000);
          }, 500);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          setIsProcessing(false);
          
          switch (event.error) {
            case 'no-speech':
              setError('No speech detected. Please try again.');
              break;
            case 'audio-capture':
              setError('Microphone access denied. Please allow microphone access and try again.');
              break;
            case 'not-allowed':
              setError('Microphone access denied. Please allow microphone access and try again.');
              break;
            case 'network':
              setError('Network error. Please check your connection.');
              break;
            case 'service-not-allowed':
              setError('Speech recognition service not available. Please try again.');
              break;
            default:
              setError(`Speech recognition error: ${event.error}. Please try again.`);
          }
          
          // Clear error after 5 seconds
          setTimeout(() => {
            setError(null);
          }, 5000);
        };

        recognition.onend = () => {
          setIsRecording(false);
          setIsProcessing(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          if (!status) {
            setStatus('');
          }
        };

      } catch (err) {
        console.warn('Failed to initialize speech recognition:', err.message);
        setIsSupported(false);
        setError(null);
        // Gracefully disable the feature without showing errors to user
      }
    };

    initRecognition();

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onTextReceived, isRecording, status, isSupported]);

  const handleToggleRecording = async () => {
    if (disabled || !isSupported) return;
    
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error('Failed to stop recording:', e);
      }
    } else {
      try {
        // Check microphone permissions before starting
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permError) {
          setError('Microphone access required. Please allow microphone access and try again.');
          return;
        }

        // Retry logic for inconsistent behavior
        if (retryCount > 0) {
          setStatus('Retrying...');
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch (error) {
              console.error('Retry failed:', error);
              setError('Failed to start recording. Please refresh the page.');
            }
          }, 1000);
        } else {
          recognitionRef.current?.start();
        }
      } catch (error) {
        console.error('Failed to start recording:', error);
        setRetryCount(prev => prev + 1);
        
        if (retryCount < 2) {
          setError('Failed to start recording. Retrying...');
          setTimeout(() => {
            setError(null);
            handleToggleRecording();
          }, 2000);
        } else {
          setError('Failed to start recording. Please refresh the page and try again.');
        }
      }
    }
  };

  const getButtonClass = () => {
    let baseClass = `voice-input-button voice-input-button-${size}`;
    
    if (disabled || !isSupported) {
      baseClass += ' voice-input-button-disabled';
    } else if (isRecording) {
      baseClass += ' voice-input-button-recording';
    } else if (isProcessing) {
      baseClass += ' voice-input-button-processing';
    }
    
    return baseClass;
  };

  const getIcon = () => {
    if (isRecording) {
      return <StopIcon className="voice-input-icon" />;
    }
    return <MicrophoneIcon className="voice-input-icon" />;
  };

  const getTitle = () => {
    if (!isSupported) return '🎤 Voice input requires Chrome, Edge, or Safari';
    if (disabled) return 'Voice input disabled';
    if (isRecording) return 'Click to stop recording';
    if (isProcessing) return 'Processing speech...';
    return 'Click to start voice input';
  };

  // Show fallback message if not supported
  if (!isSupported) {
    return (
      <div className={`voice-input-container ${className}`}>
        <button
          type="button"
          className={getButtonClass()}
          disabled={true}
          title={getTitle()}
          aria-label={getTitle()}
        >
          {getIcon()}
        </button>
      </div>
    );
  }

  return (
    <div className={`voice-input-container ${className}`}>
      <button
        type="button"
        className={getButtonClass()}
        onClick={handleToggleRecording}
        disabled={disabled}
        title={getTitle()}
        aria-label={getTitle()}
      >
        {getIcon()}
      </button>
      
      {/* Status indicator */}
      {status && (
        <div className="voice-input-status">
          {status}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="voice-input-error">
          {error}
        </div>
      )}
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="voice-input-recording-indicator">
          <div className="recording-dot"></div>
          <div className="recording-dot"></div>
          <div className="recording-dot"></div>
        </div>
      )}
    </div>
  );
};

export default VoiceInput; 