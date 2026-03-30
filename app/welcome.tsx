import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen() {
  const [name, setName] = useState('');

  useEffect(() => {
    checkExisting();
  }, []);

  const checkExisting = async () => {
    const stored = await AsyncStorage.getItem('wordlers_name');
    if (stored) router.replace('/(tabs)' as any);
  };

  const saveName = async () => {
    if (!name.trim()) return;
    await AsyncStorage.setItem('wordlers_name', name.trim());
    router.replace('/(tabs)' as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wordlers</Text>
      <Text style={styles.subtitle}>Enter your name for the leaderboard</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Your Name" 
        value={name} 
        onChangeText={setName} 
        autoFocus
      />
      <TouchableOpacity style={styles.button} onPress={saveName}>
        <Text style={styles.buttonText}>Start Playing</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 40, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#eee', padding: 18, borderRadius: 12, fontSize: 18, marginBottom: 20, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});