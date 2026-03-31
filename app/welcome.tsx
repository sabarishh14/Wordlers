import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function WelcomeScreen() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState(''); // NEW: Tracks the PIN
  const [isChecking, setIsChecking] = useState(true);
  const [loading, setLoading] = useState(false); // NEW: Tracks the button loading spinner

  useEffect(() => {
    checkExisting();
  }, []);

  const checkExisting = async () => {
    const stored = await AsyncStorage.getItem('wordlers_name');
    if (stored) {
      router.replace('/(tabs)' as any);
    } else {
      setIsChecking(false);
    }
  };

  const handleLogin = async () => {
    if (name.trim().length < 2 || pin.trim().length < 4) {
      alert('Please enter a valid name and a 4-digit PIN!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name.trim(), pin: pin.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        // Only save to phone if the DB says the PIN is correct!
        await AsyncStorage.setItem('wordlers_name', name.trim());
        router.replace('/(tabs)' as any);
      } else {
        alert(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.log("REAL ERROR:", error); // Look at your terminal for this!
      alert('Network error. Check terminal.');
    } finally {
      setLoading(false);
    }
  };

  // Prevent UI flash by showing a loader while checking storage
  if (isChecking) {
    return (
      <View style={[styles.container, { alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Text style={styles.title}>Wordlers</Text>
      <Text style={styles.subtitle}>Enter your name and secret PIN</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Your Name" 
        placeholderTextColor="#a1a1aa"
        value={name} 
        onChangeText={setName} 
        autoCapitalize="words"
      />

      {/* NEW: The PIN Input Field */}
      <TextInput 
        style={styles.input} 
        placeholder="4-Digit PIN (e.g. 1234)" 
        placeholderTextColor="#a1a1aa"
        value={pin} 
        onChangeText={setPin} 
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry // Hides the numbers like a password
      />

      <TouchableOpacity 
        style={[styles.button, loading && { opacity: 0.7 }]} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Start Playing</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#ffffff' },
  title: { 
    fontSize: 48, 
    fontWeight: '900', 
    marginBottom: 8, 
    textAlign: 'center', 
    letterSpacing: -1.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', // Gives it that classic NYT newspaper vibe
    color: '#121212' 
  },
  subtitle: { fontSize: 16, color: '#6aaa64', fontWeight: '600', marginBottom: 40, textAlign: 'center', letterSpacing: 0.5 },
  input: { 
    borderWidth: 2, 
    borderColor: '#e5e5e5', 
    padding: 18, 
    borderRadius: 16, // Smoother, friendlier curves
    fontSize: 18, 
    fontWeight: '500',
    marginBottom: 20, 
    backgroundColor: '#fafafa',
    color: '#000'
  },
  button: { 
    backgroundColor: '#6aaa64', // Wordle Green 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center',
    shadowColor: '#6aaa64',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 }
});