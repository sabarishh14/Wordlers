import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../_ThemeContext';

type Stats = {
  totalPlayed: number;
  winPercentage: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<string, number>;
};

export default function ProfileScreen() {
  const [username, setUsername] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
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

  // Find the highest number in the distribution to scale the bar chart properly
  const maxDistribution = stats ? Math.max(...Object.values(stats.distribution)) : 1;

  // Calculate Average Guesses
  let totalGuesses = 0;
  let totalWins = 0;
  if (stats) {
    Object.entries(stats.distribution).forEach(([guess, count]) => {
      totalGuesses += (parseInt(guess) * count);
      totalWins += count;
    });
  }
  const averageGuesses = totalWins > 0 ? (totalGuesses / totalWins).toFixed(2) : '0.00';

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
            <Text style={[styles.statNumber, { color: textColor }]}>{averageGuesses}</Text>
            <Text style={styles.statLabel}>Avg Guesses</Text>
          </View>
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
        </View>

        {/* Solid Red Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#ffffff" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
});
