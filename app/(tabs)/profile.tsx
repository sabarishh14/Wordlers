import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

        const res = await fetch(`/api/profile?username=${encodeURIComponent(storedName)}`);
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
      const res = await fetch('/api/update-username', {
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f4f5" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Profile</Text>

        {/* Interactive Name Badge */}
        <View style={styles.userBadge}>
          
          <TouchableOpacity onPress={pickImage} style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{username ? username.charAt(0).toUpperCase() : '?'}</Text>
            )}
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={styles.nameInput}
                value={editNameValue}
                onChangeText={setEditNameValue}
                autoFocus
                onSubmitEditing={handleSaveName}
                placeholder="New name..."
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
              <Text style={styles.userName}>{username}</Text>
              <TouchableOpacity 
                onPress={() => { setEditNameValue(username); setIsEditingName(true); }} 
                style={styles.editNameBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={styles.pencilCircle}>
                  <Ionicons name="pencil" size={14} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Modern Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{String(stats?.totalPlayed || 0)}</Text>
            <Text style={styles.statLabel}>Played</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{String(stats?.winPercentage || 0)}</Text>
            <Text style={styles.statLabel}>Win %</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{String(stats?.currentStreak || 0)}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{averageGuesses}</Text>
            <Text style={styles.statLabel}>Avg Guesses</Text>
          </View>
        </View>

        {/* Guess Distribution Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Guess Distribution</Text>
          
          {[1, 2, 3, 4, 5, 6].map((guess) => {
            const count = stats?.distribution[guess] || 0;
            const fillPercentage = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
            const barWidth = fillPercentage > 7 ? `${fillPercentage}%` : '7%'; 

            return (
              <View key={guess} style={styles.graphRow}>
                <Text style={styles.graphNumber}>{String(guess)}</Text>
                <View style={styles.graphBarWrapper}>
                  <View style={[
                    styles.graphBar, 
                    { width: barWidth as any },
                    count > 0 && styles.graphBarFilled
                  ]}>
                    <Text style={styles.graphBarText}>{String(count)}</Text>
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
  header: { fontSize: 36, fontWeight: '900', marginBottom: 16, marginTop: 16, paddingHorizontal: 20, letterSpacing: -1.5, color: '#121212' },
  userBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 32 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  userName: { fontSize: 24, fontWeight: '700', color: '#121212' },
  
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
  nameDisplayContainer: { flexDirection: 'row', alignItems: 'center' },
  editNameBtn: { justifyContent: 'center', alignItems: 'center' },
  pencilCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  nameEditContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  nameInput: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: '#e5e5e5', marginRight: 8 },
  iconBtn: { paddingHorizontal: 4 },
});
