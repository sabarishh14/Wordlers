import { useState, useEffect } from 'react';
import { StyleSheet, StatusBar, View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const injectWordleHeist = `
  const style = document.createElement('style');
  style.innerHTML = '[class*="StatsRegiwall"], [class*="Welcome-module"], [class*="fides-banner"] { display: none !important; }';
  document.head.appendChild(style);

  let lastReportedStatus = 'IN_PROGRESS';
  setInterval(() => {
    try {
      const stateStr = window.localStorage.getItem('nyt-wordle-state');
      if (stateStr) {
        const state = JSON.parse(stateStr);
        
        if (state.gameStatus && state.gameStatus !== 'IN_PROGRESS' && state.gameStatus !== lastReportedStatus) {
          lastReportedStatus = state.gameStatus;
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: state.gameStatus,
            guessesTaken: state.rowIndex,
            wordsGuessed: state.boardState.filter(word => word !== '')
          }));
        }
      }
    } catch (e) {}
  }, 2000);
  
  true;
`;

export default function HomeScreen() {
  const [username, setUsername] = useState('Player');

  useEffect(() => {
    AsyncStorage.getItem('wordlers_name').then(name => {
      if (name) setUsername(name);
    });
  }, []);
  const handleMessage = (event: any) => {
    try {
      const stats = JSON.parse(event.nativeEvent.data);
      console.log("Clean Wordlers Data:", stats);

      fetch('/api/save-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: "sabs", // Still hardcoded for testing
          ...stats
        })
      })
      .then(res => res.json())
      .then(data => console.log("DB Save Result:", data))
      .catch(err => console.error("DB Save Error:", err));
        
    } catch (error) {
      console.error("Error parsing Wordle data:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView
        source={{ uri: 'https://www.nytimes.com/games/wordle/index.html' }}
        injectedJavaScript={injectWordleHeist}
        onMessage={handleMessage}
        incognito={true} /* Keeps it fresh for testing */
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', 
  },
  webview: {
    flex: 1,
  },
});