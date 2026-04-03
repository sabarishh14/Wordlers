import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../contexts/_ThemeContext';

type Stats = {
  totalPlayed: number;
  winPercentage: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<string, number>;
  averageTime: number;
};

export default function ProfileScreen() {
  const [username, setUsername] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [funFact, setFunFact] = useState("Initializing NYT Heist...");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTimeInfo, setShowTimeInfo] = useState(false); // <-- ADD THIS

  const facts = [
  "Wordle was created by software engineer Josh Wardle for his partner.",
  "The New York Times bought Wordle in early 2022.",
  "There are 2,309 possible winning words in the original game.",
  "The most common first guess is 'ADIEU'.",
  "CRANE is considered one of the mathematically best starting words.",
  "Cracking the NYT vault...",
  "Extracting your shiny badges...",
  "Wordle was originally released to the public in October 2021.",
  "Josh Wardle stopped playing Wordle the same day he sold it to The New York Times.",
  "The game’s name is a playful pun on creator Josh Wardle’s last name.",
  "Over 12,000 five-letter words are allowed as guesses in Wordle.",
  "E is the most frequently used letter in official Wordle answers.",
  "More than 15% of Wordle answers begin with the letter S.",
  "About 33% of all Wordle solutions contain the letter E.",
  "The average number of guesses needed to solve Wordle is around 3.8.",
  "Only about 0.2% to 0.5% of players solve Wordle in one guess.",
  "SALET is often ranked as the single best starting word by math.",
  "ADIEU is popular but one of the least efficient starting words.",
  "ROATE and TRACE are strong alternatives to CRANE.",
  "Wordle answers are chosen from a pre-selected list of 2,309 words.",
  "The full list of acceptable guesses is much larger than the answer list.",
  "Wordle exploded in popularity during the COVID-19 pandemic.",
  "By January 2022, millions of people were playing Wordle daily.",
  "Sharing Wordle scores on Twitter became a massive viral trend.",
  "Wordle has no advertisements and remains completely free.",
  "The New York Times slightly edited the word list after buying the game.",
  "STARE, SLATE, and CRANE frequently appear in top starter recommendations.",
  "WordleBot analyzes your guesses and rates your skill.",
  "The hardest Wordle words often require 5 or 6 guesses on average.",
  "Over 5 billion Wordle puzzles were solved in 2023.",
  "The 1,000th official Wordle puzzle was celebrated in March 2024.",
  "Nearly 40% of players solve Wordle first thing in the morning.",
  "Some players have maintained streaks longer than 500 days.",
  "Y is one of the most common letters in the fifth position.",
  "Wordle uses American English spellings only.",
  "The original prototype of Wordle was created as early as 2013.",
  "RAISE is a popular starting word that balances vowels and common letters.",
  "Computers using optimal strategy solve Wordle in about 3.5 guesses on average.",
  "Around 3% of Wordle games end unsolved within the six-guess limit.",
  "Wordle helped bring tens of millions of new users to NYT Games.",
  "The letter E appears in the fifth position more often than any other letter.",
  "SLICE and TRIED are solid starting words for many players.",
  "Wordle answers are scheduled in advance rather than picked randomly each day.",
  "Optimal two-word starter combinations can eliminate most possibilities quickly.",
  "MUMMY, JAZZY, and PARER are among the statistically hardest answers.",
  "Wordle inspired dozens of variants including Quordle, Octordle, and Dordle.",
  "The median number of guesses to solve a puzzle is approximately 3.8.",
  "Over 70% of Wordle solutions contain at least two different vowels.",
  "AUDIO is a common first guess favored for its four vowels.",
  "SOARE was once considered one of the strongest mathematical openers.",
  "Players tend to improve slightly with practice over time.",
  "The game’s simple black, yellow, and green color scheme became iconic.",
  "Wordle’s success turned a personal gift into a global daily habit."
];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isImporting) {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % facts.length;
        setFunFact(facts[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isImporting]);

  const handleNYTMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'NYT_STATS') {
        setFunFact("Stats acquired! Saving to database...");
        await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/import-legacy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, stats: data.stats })
        });
        await loadProfile(); // Refresh the page stats
        setIsImporting(false);
        setShowSuccessModal(true);
      } else if (data.type === 'NYT_ERROR') {
        setIsImporting(false);
        Alert.alert("Import Failed", "Could not find your stats. Make sure you are logged into NYT on Safari/Chrome.");
      }
    } catch (e) {
      setIsImporting(false);
    }
  };

  const scrapeNYTScript = `
    setTimeout(() => {
      try {
        const admire = document.querySelector('[data-testid="Admire Puzzle"]');
        const play = document.querySelector('[data-testid="Play"]');
        if (admire) admire.click();
        else if (play) play.click();

        setTimeout(() => {
          const statsBtn = document.getElementById('stats-button');
          if (statsBtn) {
            statsBtn.click();
            setTimeout(() => {
              const played = document.querySelector('[data-testid="stat-Played"] div')?.innerText || "0";
              const winPct = document.querySelector('[data-testid="stat-Win %"] div')?.innerText || "0";
              const currentStreak = document.querySelector('[data-testid="stat-Current Streak"] div')?.innerText || "0";
              const maxStreak = document.querySelector('[data-testid="stat-Max Streak"] div')?.innerText || "0";
              
              const dist = {};
              document.querySelectorAll('[data-testid="stats__histogram_row"]').forEach(row => {
                const guess = row.querySelector('p')?.innerText;
                const count = row.querySelector('[data-testid="stats__histogram_bar"]')?.innerText || "0";
                dist[guess] = parseInt(count);
              });

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'NYT_STATS',
                stats: {
                  played: parseInt(played), winPct: parseInt(winPct), 
                  currentStreak: parseInt(currentStreak), maxStreak: parseInt(maxStreak),
                  distribution: dist
                }
              }));
            }, 1000);
          } else {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NYT_ERROR' }));
          }
        }, 1000);
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NYT_ERROR' }));
      }
    }, 1500);
    true;
  `;

  // New State for Editing and Avatar
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // --- ADD THESE THEME VARIABLES HERE ---
  const { isDark, toggleTheme } = useTheme();

  const themeBg = isDark ? '#121212' : '#f4f4f5';
  const cardBg = isDark ? '#1e1e1e' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#121212';
  const graphBg = isDark ? '#333333' : '#f4f4f5';

  useEffect(() => {
    loadProfile();
  }, []);

  // Update loadProfile to fetch the user-specific avatar
  const loadProfile = async () => {
    try {
      const storedName = await AsyncStorage.getItem('wordlers_name');
      
      if (storedName) {
        setUsername(storedName);
        // Look for the avatar specifically tied to this username
        const storedAvatar = await AsyncStorage.getItem(`wordlers_avatar_${storedName}`); 
        if (storedAvatar) {
          setAvatarUri(storedAvatar);
        } else {
          setAvatarUri(null); // Clear it if this specific user doesn't have one
        }

        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/profile?username=${encodeURIComponent(storedName)}`);
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
      // Save it dynamically with their username attached
      await AsyncStorage.setItem(`wordlers_avatar_${username}`, result.assets[0].uri);
    }
  };

  const handleSaveName = async () => {
    const newName = editNameValue.trim();
    if (!newName || newName === username) {
      setIsEditingName(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/update-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName: username, newName })
      });

      if (res.ok) {
        await AsyncStorage.setItem('wordlers_name', newName);
        setUsername(newName);
        setIsEditingName(false);
      } else {
        const data = await res.json();
        Alert.alert('Hold up!', data.error || 'Could not update name');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while updating name');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('wordlers_name');
    router.replace('/welcome');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6aaa64" />
      </View>
    );
  }

  // Calculate Wins, Fails, and Averages
  let totalGuesses = 0;
  let totalWins = 0;
  if (stats) {
    Object.entries(stats.distribution).forEach(([guess, count]) => {
      totalGuesses += (parseInt(guess) * count);
      totalWins += count;
    });
  }
  
  // Fails = Total Played minus all the wins
  const fails = stats ? stats.totalPlayed - totalWins : 0;
  
  const averageGuesses = totalWins > 0 ? (totalGuesses / totalWins).toFixed(2) : '0.00';

  // Find highest number to scale the bar chart (now including fails!)
  const maxDistribution = stats ? Math.max(...Object.values(stats.distribution), fails) : 1;

  // Format Average Time
  const formatTime = (seconds?: number) => {
    if (!seconds || seconds === 0) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={themeBg} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header with Dark Mode Toggle */}
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: textColor }]}>Profile</Text>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleTheme();
            }} 
            style={styles.themeToggleBtn}
          >
            <Ionicons name={isDark ? "sunny" : "moon"} size={26} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Interactive Name Badge */}
        <View style={styles.userBadge}>
          <TouchableOpacity onPress={pickImage} style={[styles.avatarCircle, { backgroundColor: isDark ? '#333' : '#121212' }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{username ? username.charAt(0).toUpperCase() : '?'}</Text>
            )}
            <View style={[styles.editAvatarBadge, { borderColor: themeBg, backgroundColor: isDark ? '#555' : '#121212' }]}>
              <Ionicons name="camera" size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={[styles.nameInput, { backgroundColor: cardBg, color: textColor, borderColor: isDark ? '#444' : '#e5e5e5' }]}
                value={editNameValue}
                onChangeText={setEditNameValue}
                autoFocus
                onSubmitEditing={handleSaveName}
                placeholder="New name..."
                placeholderTextColor="#a1a1aa"
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.iconBtn}>
                <Ionicons name="checkmark-circle" size={28} color="#6aaa64" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsEditingName(false)} style={styles.iconBtn}>
                <Ionicons name="close-circle" size={28} color="#e57373" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameDisplayContainer}>
              <Text style={[styles.userName, { color: textColor }]} numberOfLines={1} ellipsizeMode="tail">
                {username}
              </Text>
              <TouchableOpacity 
                onPress={() => { setEditNameValue(username); setIsEditingName(true); }} 
                style={styles.editNameBtn}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <View style={[styles.pencilCircle, { backgroundColor: isDark ? '#333' : '#121212' }]}>
                  <Ionicons name="pencil" size={14} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sleek Import Button */}
        <TouchableOpacity 
          style={[styles.importButton, { borderColor: isDark ? '#333' : '#d3d6da' }]}
          onPress={() => setIsImporting(true)}
        >
          <Ionicons name="cloud-download-outline" size={18} color={textColor} />
          <Text style={[styles.importButtonText, { color: textColor }]}>Import NYT Stats</Text>
        </TouchableOpacity>

        {/* Modern Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNumber, { color: textColor }]}>{String(stats?.totalPlayed || 0)}</Text>
            <Text style={styles.statLabel}>Played</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNumber, { color: textColor }]}>{String(stats?.winPercentage || 0)}</Text>
            <Text style={styles.statLabel}>Win %</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNumber, { color: textColor }]}>{String(stats?.currentStreak || 0)}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNumber, { color: textColor }]}>{String(stats?.maxStreak || 0)}</Text>
            <Text style={styles.statLabel}>Max Streak</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNumber, { color: textColor }]}>{averageGuesses}</Text>
            <Text style={styles.statLabel}>Avg Guesses</Text>
          </View>
          <TouchableOpacity 
            style={[styles.statBox, { backgroundColor: cardBg }]}
            activeOpacity={0.7}
            onPress={() => setShowTimeInfo(true)}
          >
            <Text style={[styles.statNumber, { color: textColor }]}>
              {formatTime(stats?.averageTime)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.statLabel}>Avg Time </Text>
              <Ionicons name="information-circle-outline" size={16} color="#a1a1aa" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Guess Distribution Chart */}
        <View style={[styles.chartContainer, { backgroundColor: cardBg }]}>
          <Text style={[styles.chartTitle, { color: textColor }]}>Guess Distribution</Text>
          
          {[1, 2, 3, 4, 5, 6].map((guess) => {
            const count = stats?.distribution[guess] || 0;
            const fillPercentage = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
            const barWidth = fillPercentage > 7 ? `${fillPercentage}%` : '7%'; 

            return (
              <View key={guess} style={styles.graphRow}>
                <Text style={[styles.graphNumber, { color: textColor }]}>{String(guess)}</Text>
                <View style={styles.graphBarWrapper}>
                  <View style={[
                    styles.graphBar, 
                    { width: barWidth as any, backgroundColor: graphBg },
                    count > 0 && styles.graphBarFilled
                  ]}>
                    <Text style={[styles.graphBarText, { color: count > 0 ? '#ffffff' : textColor }]}>{String(count)}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* NEW: The Fails / Missed Row */}
          <View style={styles.graphRow}>
            <Text style={[styles.graphNumber, { color: textColor }]}>X</Text>
            <View style={styles.graphBarWrapper}>
              <View style={[
                styles.graphBar, 
                { width: (maxDistribution > 0 ? (fails / maxDistribution) * 100 : 0) > 7 ? `${(fails / maxDistribution) * 100}%` : '7%', backgroundColor: graphBg },
                fails > 0 && { backgroundColor: '#e57373' } // Red bar for fails!
              ]}>
                <Text style={[styles.graphBarText, { color: fails > 0 ? '#ffffff' : textColor }]}>{String(fails)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Solid Red Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#ffffff" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Hidden WebView & Loading Modal */}
      {isImporting && (
        <Modal transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <ActivityIndicator size="large" color="#4caf50" style={{ marginBottom: 24 }} />
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
              Importing from NYT...
            </Text>
            <Text style={{ color: '#aaa', fontSize: 14, textAlign: 'center', fontStyle: 'italic' }}>
              {funFact}
            </Text>
            
            {/* The Invisible Scraper */}
            <View style={{ width: 0, height: 0, opacity: 0 }}>
              <WebView
                source={{ uri: 'https://www.nytimes.com/games/wordle/index.html' }}
                injectedJavaScript={scrapeNYTScript}
                onMessage={handleNYTMessage}
                javaScriptEnabled={true}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Congrats Success Modal */}
      <Modal visible={showSuccessModal} transparent={true} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 24, padding: 32, alignItems: 'center' }}>
            
            <View style={styles.successModalIcon}>
              <Ionicons name="checkmark-circle" size={40} color="#6aaa64" />
            </View>

            <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor, marginBottom: 12 }}>Data Secured!</Text>
            <Text style={{ fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
              Your NYT legacy stats have been successfully extracted and merged with your Wordlers profile.
            </Text>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#121212', paddingVertical: 16, width: '100%', borderRadius: 16, alignItems: 'center' }} 
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Awesome</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Average Time Info Modal */}
      <Modal visible={showTimeInfo} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg, padding: 32 }]}>
            <Ionicons name="time-outline" size={48} color="#6aaa64" style={{ marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: textColor, marginBottom: 12, textAlign: 'center' }]}>
              About Average Time
            </Text>
            <Text style={{ fontSize: 16, color: isDark ? '#aaa' : '#555', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
              The New York Times doesn't track how long it takes you to solve a puzzle. 
              {'\n\n'}
              Because of this, your average time is calculated <Text style={{ fontWeight: 'bold', color: textColor }}>only</Text> from the games you play directly within the Wordlers app!
            </Text>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#121212', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center' }} 
              onPress={() => setShowTimeInfo(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 16, marginBottom: 16 },
  header: { fontSize: 36, fontWeight: '900', letterSpacing: -1.5 },
  themeToggleBtn: { padding: 4 },  userBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 32 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  userName: { fontSize: 24, fontWeight: '700', flexShrink: 1 },  editNameBtn: { justifyContent: 'center', alignItems: 'center' },
  
  statsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    paddingHorizontal: 16, 
    justifyContent: 'space-between', 
    marginBottom: 12 // Reduced from 24 to tighten the gap above the chart
  },
  statBox: { width: '47%', backgroundColor: '#ffffff', padding: 16, borderRadius: 20, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  statNumber: { fontSize: 32, fontWeight: '800', color: '#121212', marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: '600', color: '#a1a1aa', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  chartContainer: { backgroundColor: '#ffffff', marginHorizontal: 20, padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  chartTitle: { fontSize: 18, fontWeight: '800', color: '#121212', marginBottom: 20 },
  graphRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  graphNumber: { width: 16, fontSize: 16, fontWeight: 'bold', color: '#121212' },
  graphBarWrapper: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  graphBar: { backgroundColor: '#f4f4f5', paddingVertical: 6, paddingRight: 8, justifyContent: 'center', alignItems: 'flex-end', borderRadius: 6 },
  graphBarFilled: { backgroundColor: '#6aaa64' },
  graphBarText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  
  scrollContent: { paddingBottom: 40 }, // Gives plenty of scroll room at the bottom
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#ef4444', 
    marginHorizontal: 20, 
    marginTop: 16, // Tucked it up even tighter to the chart (was 24)
    paddingVertical: 18, 
    borderRadius: 20,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: { fontSize: 16, color: '#ffffff', fontWeight: 'bold', marginLeft: 8 },
  // Add these right under your existing avatarText style
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  editAvatarBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#121212', borderRadius: 10, padding: 4, borderWidth: 2, borderColor: '#f4f4f5' },
  nameDisplayContainer: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, paddingRight: 10 },
  pencilCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  nameEditContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  nameInput: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: '#e5e5e5', marginRight: 8 },
  iconBtn: { paddingHorizontal: 4 },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'transparent'
  },
  importButtonText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  successModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
