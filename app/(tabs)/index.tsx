import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../_ThemeContext';

// The rock-solid, crash-free Heist Script
const injectWordleHeist = `
  setTimeout(() => {
    const style = document.createElement('style');
    style.innerHTML = 'div[class*="StatsRegiwall"], div[class*="fides-banner"], #fides-overlay, .purr-blocker { display: none !important; }';
    if (document.head) document.head.appendChild(style);

    setTimeout(() => {
      const playButton = document.querySelector('[data-testid="Play"]');
      if (playButton) playButton.click();
    }, 400);
  }, 500);

  let lastReportedStatus = 'INITIALIZING';
  let sessionStartTime = null; // <-- ADD THIS

  setInterval(() => {
    try {
      const storageKey = Object.keys(window.localStorage).find(k => k.startsWith('games-state-wordleV2/'));
      const stateStr = storageKey ? window.localStorage.getItem(storageKey) : null;
      
      if (stateStr) {
        const parsed = JSON.parse(stateStr);
        const state = parsed.states[0].data;
        const currentStatus = state.status;
        
        // START TIMER: If they made at least 1 guess and we haven't started the clock yet
        if (state.currentRowIndex > 0 && !sessionStartTime && currentStatus === 'IN_PROGRESS') {
          sessionStartTime = Date.now();
        }
        
        // FUNCTION TO EXTRACT DATA
        const getPayload = () => {
          // Grab ONLY the board tiles (ignoring the keyboard keys!)
          const allTiles = Array.from(document.querySelectorAll('[data-testid="tile"]'));
          const extractedEvals = [];
          
          for (let i = 0; i < allTiles.length; i += 5) {
            const rowEvals = allTiles.slice(i, i + 5).map(t => t.getAttribute('data-state'));
            
            // Only save the row if it's fully evaluated (not empty or flipping/tbd)
            if (rowEvals.length === 5 && rowEvals[0] !== 'empty' && rowEvals[0] !== 'tbd') {
              extractedEvals.push(rowEvals);
            }
          }

          // Calculate seconds passed (default to 0 if they somehow won instantly)
          const timeTakenSeconds = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;

          return {
            status: currentStatus,
            guessesTaken: state.currentRowIndex,
            wordsGuessed: state.boardState.filter(word => word !== ''),
            evaluations: extractedEvals,
            time_taken: timeTakenSeconds // <-- ADD THIS TO YOUR DB PAYLOAD
          };
        };

        if (lastReportedStatus === 'INITIALIZING') {
          lastReportedStatus = currentStatus;
          if (currentStatus === 'WIN' || currentStatus === 'FAIL') {
            // No delay needed for initial load, game is already finished
            window.ReactNativeWebView.postMessage(JSON.stringify({ ...getPayload(), silent: true }));
          }
        } else if (currentStatus && currentStatus !== 'IN_PROGRESS' && currentStatus !== lastReportedStatus) {
          lastReportedStatus = currentStatus;
          
          // DELAY: Wait 3 seconds for the "Flip" animations to finish so the colors match!
          setTimeout(() => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ ...getPayload(), silent: false }));
          }, 5000);
        }
      }
    } catch (e) {}
  }, 2000);
  
  true;
`;

export default function HomeScreen() {
  const [username, setUsername] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [gameStats, setGameStats] = useState<any>(null);
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    const checkUser = async () => {
      const name = await AsyncStorage.getItem('wordlers_name');
      setUsername(name);
    };
    checkUser();
  }, []);

  // --- THEME VARIABLES ---
  const { isDark } = useTheme();
  const themeBg = isDark ? '#121212' : '#f4f4f5';
  const textColor = isDark ? '#ffffff' : '#000000';
  const btnBg = isDark ? '#333333' : '#e5e5e5';
  const btnText = isDark ? '#cccccc' : '#555555';
  // -----------------------

  const handleMessage = (event: any) => {
    try {
      const stats = JSON.parse(event.nativeEvent.data);
      console.log("Clean Wordlers Data:", stats);

      if (stats.status === 'WIN' || stats.status === 'FAIL') {
        
        // ONLY process the save and the popup if this is a fresh game completion (!silent)
        if (!stats.silent) {
          
          // 1. Save to database
          fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/save-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: username,
              ...stats
            })
          })
          .then(res => res.json())
          .then(data => console.log("DB Save Result:", data))
          .catch(err => console.error("DB Save Error:", err));

          // 2. Show the popup modal
          setGameStats(stats);
          setShowModal(true);
        }
      }
        
    } catch (error) {
      console.error("Error parsing Wordle data:", error);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={themeBg} />
      
      {/* Escape Hatch Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { color: textColor }]}>Wordlers</Text>
        
        <TouchableOpacity 
          style={[styles.refreshButton, { backgroundColor: btnBg }]}
          onPress={() => {
            // Added window.localStorage.clear() to nuke the NYT save state for testing!
            webviewRef.current?.injectJavaScript(`
              window.localStorage.clear(); 
              window.location.href = 'https://www.nytimes.com/games/wordle/index.html'; 
              true;
            `);
          }}
        >
          <Ionicons name="refresh" size={16} color={btnText} />
          <Text style={[styles.refreshText, { color: btnText }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.webviewWrapper, { backgroundColor: isDark ? '#121212' : '#ffffff' }]}>
        <WebView
          ref={webviewRef}
          source={{ uri: 'https://www.nytimes.com/games/wordle/index.html' }}
          injectedJavaScript={injectWordleHeist}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          style={styles.webview}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
              return true; 
            }
            return false; 
          }}
        />
      </View>

      {/* The Success / Game Over Popup */}
      <Modal visible={showModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {gameStats?.status === 'WIN' ? '🎉 You got it!' : 'Better luck tomorrow!'}
            </Text>
            <Text style={styles.modalText}>
              {gameStats?.status === 'WIN' 
                ? `You solved today's Wordle in ${gameStats?.guessesTaken} ${gameStats?.guessesTaken === 1 ? 'guess' : 'guesses'}.` 
                : 'The streak ends, but the leaderboard awaits.'}
            </Text>
            <Text style={styles.modalSubText}>Your score is locked in on Wordlers.</Text>
            
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setShowModal(false);
                router.push('/(tabs)/explore');
              }}
            >
              <Text style={styles.modalButtonText}>View Leaderboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5', 
    padding: 16, 
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, 
    paddingHorizontal: 4, 
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    color: '#000',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e5e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  webviewWrapper: {
    flex: 1,
    borderRadius: 24, 
    overflow: 'hidden', 
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5, 
    marginBottom: 8, 
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  modalText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  modalSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    color: '#888',
  },
  modalButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});